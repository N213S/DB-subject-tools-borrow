// --- 6. ADMIN/TEACHER DASHBOARD ---

function renderAdminDashboard() {
    // Performance: Pass once to count all stats
    const stats = inventory.reduce((acc, i) => {
        acc[i.status] = (acc[i.status] || 0) + 1;
        return acc;
    }, {});

    document.getElementById('statPendingApproval').innerText = stats.pending_approval || 0;
    document.getElementById('statBorrowed').innerText = stats.borrowed || 0;
    document.getElementById('statPendingReturn').innerText = stats.pending_return || 0;
    document.getElementById('statAvailable').innerText = stats.available || 0;

    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';

    const searchEl = document.getElementById('adminSearch');
    const searchTerm = searchEl ? searchEl.value.toLowerCase() : '';
    const filtered = inventory.filter(i => {
        const matchesStatus = currentAdminFilter === 'all' || i.status === currentAdminFilter;
        const matchesSearch = i.name.toLowerCase().includes(searchTerm) || i.borrower.toLowerCase().includes(searchTerm);
        return matchesStatus && matchesSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">ไม่พบรายการในสถานะนี้</td></tr>`;
        return;
    }

    let html = '';
    filtered.forEach((item, index) => {
        let statusBadge, actionBtn;
        let borrowerDisplay = item.borrower;
        let nameDisplay = item.name;
        if (item.needsApproval) {
            nameDisplay += ` <span class="badge bg-secondary ms-1" style="font-size: 0.6rem;">ต้องอนุมัติ</span>`;
        }

        if (item.status !== 'available' && item.borrowReason) {
            borrowerDisplay += `<br><small class="text-muted fst-italic" style="font-size:0.8rem">"${item.borrowReason}"</small>`;
        }

        if (item.status === 'available') {
            statusBadge = '<span class="badge bg-success">ว่าง</span>';
            actionBtn = `<button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${item.id})"><i class="fas fa-trash"></i> ลบ</button>`;
        } else if (item.status === 'pending_approval') {
            statusBadge = '<span class="badge bg-info text-dark">ขออนุมัติยืม</span>';
            actionBtn = `
                <div class="d-flex gap-1 btn-action-group">
                    <button class="btn btn-sm btn-success" onclick="adminApproveBorrow(${item.id})" title="อนุมัติ"><i class="fas fa-check"></i> อนุมัติ</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="adminRejectBorrow(${item.id})" title="ปฏิเสธ"><i class="fas fa-times"></i></button>
                </div>
            `;
        } else if (item.status === 'borrowed') {
            statusBadge = '<span class="badge bg-warning text-dark">ถูกยืม</span>';
            actionBtn = `<button class="btn btn-sm btn-outline-success" onclick="adminForceReturn(${item.id})" title="ยืนยันรับคืน (กรณีลืมกดคืน)"><i class="fas fa-undo-alt"></i> ได้ของคืนแล้ว</button>`;
        } else if (item.status === 'pending_return') {
            statusBadge = '<span class="badge bg-primary">รอตรวจคืน</span>';
            actionBtn = `<button class="btn btn-sm btn-success" onclick="adminApproveReturn(${item.id})" title="รับของคืน"><i class="fas fa-box-open"></i> รับคืน</button>`;
        }

        const delay = index * 0.03;
        html += `
            <tr class="animate-in" style="animation-delay: ${delay}s">
                <td data-label="อุปกรณ์" class="ps-4 fw-bold">${nameDisplay}<br><small class="fw-normal text-muted" style="font-size:0.75rem">เพิ่มโดย: ${item.addedBy}</small></td>
                <td data-label="สถานะ">${statusBadge}</td>
                <td data-label="ผู้ยืม / เหตุผล" class="small">${borrowerDisplay}</td>
                <td data-label="จัดการ" style="width: 150px;">${actionBtn}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function setAdminFilter(status, btn) {
    currentAdminFilter = status;
    const btns = document.querySelectorAll('#adminFilters .btn');
    btns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAdminDashboard();
}

function adminApproveBorrow(id) {
    const item = inventory.find(i => i.id === id);
    Swal.fire({
        title: 'อนุญาตให้ยืม?', html: `ผู้ขอ: <b>${item.borrower}</b><br>เหตุผล: <i class="text-muted">"${item.borrowReason}"</i>`,
        icon: 'question', showCancelButton: true, confirmButtonText: 'อนุมัติ'
    }).then((res) => {
        if (res.isConfirmed) {
            item.status = 'borrowed';
            logAction('อนุมัติการยืม', `อนุมัติให้ ${item.borrower} ยืม ${item.name}`);
            saveInventory(); renderAdminDashboard();
            Swal.fire('อนุมัติแล้ว', 'นักเรียนสามารถรับของได้', 'success');
        }
    });
}

function adminRejectBorrow(id) {
    Swal.fire({
        title: 'ปฏิเสธคำขอ?', text: 'รายการนี้จะถูกยกเลิก', icon: 'warning',
        showCancelButton: true, confirmButtonText: 'ใช่, ปฏิเสธ', confirmButtonColor: '#d33'
    }).then((res) => {
        if (res.isConfirmed) {
            const item = inventory.find(i => i.id === id);
            logAction('ปฏิเสธคำขอ', `ปฏิเสธการขอยืม ${item.name} ของ ${item.borrower}`);
            item.status = 'available'; item.borrower = '-'; item.borrowReason = '';
            saveInventory(); renderAdminDashboard();
            Swal.fire('ปฏิเสธแล้ว', 'คำขอถูกยกเลิก', 'success');
        }
    });
}

function adminApproveReturn(id) {
    Swal.fire({ title: 'ของครบถ้วน?', text: 'ยืนยันรับคืนเข้าคลัง', icon: 'warning', showCancelButton: true, confirmButtonText: 'รับคืน' }).then((res) => {
        if (res.isConfirmed) {
            const item = inventory.find(i => i.id === id);
            logAction('รับคืนอุปกรณ์', `รับคืน ${item.name} จาก ${item.borrower}`);
            item.status = 'available'; item.borrower = '-'; item.borrowReason = '';
            saveInventory(); renderAdminDashboard();
            Swal.fire('สำเร็จ', 'ของกลับเข้าคลังแล้ว', 'success');
        }
    });
}

function adminForceReturn(id) {
    const item = inventory.find(i => i.id === id);
    Swal.fire({
        title: 'ยืนยันการรับคืน?',
        html: `คุณกำลังจะรับคืน <b>${item.name}</b> จาก <b>${item.borrower}</b><br><small class="text-danger">*ใช้ในกรณีที่ผู้ยืมลืมกดคืนในระบบ แต่ส่งของตัวจริงคืนแล้ว</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        confirmButtonText: 'ยืนยันว่าได้ของคืนแล้ว',
        cancelButtonText: 'ยกเลิก'
    }).then((res) => {
        if (res.isConfirmed) {
            logAction('ครูบังคับคืน', `ครูกดรับคืน ${item.name} ให้ ${item.borrower} (แมนนวล)`);
            item.status = 'available';
            item.borrower = '-';
            item.borrowReason = '';
            saveInventory();
            renderAdminDashboard();
            Swal.fire('เรียบร้อย', 'สถานะอุปกรณ์กลับเป็นว่างแล้ว', 'success');
        }
    });
}

function openAddItemModal() {
    document.getElementById('newItemName').value = '';
    document.getElementById('newItemApproval').checked = false;
    document.getElementById('newItemImgInput').value = '';
    document.getElementById('newItemImagePreviewContainer').classList.add('d-none');
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('addItemModal'));
    modal.show();
}

async function saveNewItem() {
    const name = document.getElementById('newItemName').value;
    if (!name) return Swal.fire('กรุณาระบุชื่อ', '', 'warning');

    const needsApprove = document.getElementById('newItemApproval').checked;
    const fileInput = document.getElementById('newItemImgInput');
    let imageData = "";

    // จัดการเรื่องรูปภาพ
    if (fileInput.files && fileInput.files[0]) {
        Swal.showLoading();
        imageData = await compressImage(await fileToDataURL(fileInput.files[0]));
        Swal.close();
    }

    const newItem = {
        id: Date.now(), name: name, category: document.getElementById('newItemCat').value,
        status: 'available', borrower: '-', borrowReason: '',
        image: imageData || "https://images.unsplash.com/photo-1615811361523-6bd03c7728d9?auto=format&fit=crop&w=400", // Fallback image
        addedBy: currentUser.name, needsApproval: needsApprove
    };
    inventory.push(newItem);
    logAction('เพิ่มอุปกรณ์', `เพิ่ม ${newItem.name} เข้าสู่ระบบ`);
    saveInventory();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('addItemModal')).hide();
    Swal.fire('เพิ่มสำเร็จ', 'อุปกรณ์เข้าสู่ระบบแล้ว', 'success');
    renderAdminDashboard();
}

// Helper to convert file to DataURL
function fileToDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// Preview Listener for New Item Image
document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'newItemImgInput') {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (ex) {
                document.getElementById('newItemImagePreview').src = ex.target.result;
                document.getElementById('newItemImagePreviewContainer').classList.remove('d-none');
            };
            reader.readAsDataURL(file);
        }
    }
});

function deleteItem(id) {
    Swal.fire({ title: 'ลบรายการ?', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ลบ' }).then((res) => {
        if (res.isConfirmed) {
            const item = inventory.find(i => i.id === id);
            logAction('ลบอุปกรณ์', `ลบอุปกรณ์ ${item.name}`);
            inventory = inventory.filter(i => i.id !== id);
            saveInventory(); renderAdminDashboard();
        }
    });
}

// --- CATEGORY MANAGEMENT ---
function renderCategoryOptions() {
    const userSelect = document.getElementById('userCategoryFilter');
    const prevUserSelectVal = userSelect.value;
    userSelect.innerHTML = '<option value="all">ทุกหมวดหมู่</option>';
    categories.forEach(c => { userSelect.innerHTML += `<option value="${c}">${c}</option>`; });
    if (prevUserSelectVal) userSelect.value = prevUserSelectVal;

    const modalSelect = document.getElementById('newItemCat');
    modalSelect.innerHTML = '';
    categories.forEach(c => { modalSelect.innerHTML += `<option value="${c}">${c}</option>`; });
}

function renderCategoryListInModal() {
    const list = document.getElementById('categoryList');
    list.innerHTML = '';
    categories.forEach((c, index) => {
        list.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">${c}
            <button class="btn btn-sm text-danger" onclick="deleteCategory(${index})"><i class="fas fa-times"></i></button></li>`;
    });
}

function openCategoryModal() {
    renderCategoryListInModal();
    const modalEl = document.getElementById('addCategoryModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
}

function addNewCategory() {
    const input = document.getElementById('newCatInput');
    const val = input.value.trim();
    if (val && !categories.includes(val)) {
        categories.push(val);
        saveCategories();
        input.value = '';
        renderCategoryListInModal();
        renderCategoryOptions();
        logAction('เพิ่มหมวดหมู่', `เพิ่มหมวดหมู่: ${val}`);
    }
}

function deleteCategory(index) {
    const removed = categories[index];
    Swal.fire({
        title: 'ยืนยันการลบหมวดหมู่?',
        text: `คุณกำลังจะลบหมวดหมู่ "${removed}"`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'ลบหมวดหมู่',
        cancelButtonText: 'ยกเลิก'
    }).then((res) => {
        if (res.isConfirmed) {
            categories.splice(index, 1);
            saveCategories();
            renderCategoryListInModal();
            renderCategoryOptions();
            logAction('ลบหมวดหมู่', `ลบหมวดหมู่: ${removed}`);
            Swal.fire('ลบเรียบร้อย', '', 'success');
        }
    });
}

// --- 7. USER MANAGEMENT ---
function renderUserManagement() {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';

    const searchEl = document.getElementById('userManageSearch');
    const searchTerm = searchEl ? searchEl.value.toLowerCase() : '';
    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm) ||
        u.name.toLowerCase().includes(searchTerm) ||
        u.role.toLowerCase().includes(searchTerm)
    );

    if (filteredUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">ไม่พบรายชื่อผู้ใช้</td></tr>`;
        return;
    }

    let html = '';
    filteredUsers.forEach((u, index) => {
        const deleteBtn = u.username === currentUser.username ? '' : `<button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id})">ลบ</button>`;
        const delay = index * 0.03;
        html += `
            <tr class="animate-in" style="animation-delay: ${delay}s">
                <td data-label="Username" class="ps-4 fw-bold text-primary">${u.username}</td>
                <td data-label="ชื่อ-นามสกุล">${u.name}</td>
                <td data-label="ตำแหน่ง"><span class="badge bg-secondary">${u.role}</span></td>
                <td data-label="จัดการ">${deleteBtn}</td>
            </tr>`;
    });
    tbody.innerHTML = html;
}
function openAddUserModal() {
    document.getElementById('newUserUser').value = ''; document.getElementById('newUserPass').value = ''; document.getElementById('newUserName').value = '';
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('addUserModal'));
    modal.show();
}
function saveNewUser() {
    const u = document.getElementById('newUserUser').value; const p = document.getElementById('newUserPass').value; const n = document.getElementById('newUserName').value; const r = document.getElementById('newUserRole').value;
    if (!u || !p || !n) return Swal.fire('ข้อมูลไม่ครบ', '', 'warning');
    if (users.find(user => user.username === u)) return Swal.fire('ซ้ำ', 'Username นี้มีแล้ว', 'error');
    const newUser = { id: Date.now(), username: u, password: p, name: n, role: r };
    users.push(newUser);
    logAction('เพิ่มผู้ใช้งาน', `เพิ่มผู้ใช้ ${newUser.username} (${newUser.role})`);
    saveUsers();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('addUserModal')).hide();
    Swal.fire('สำเร็จ', 'เพิ่มผู้ใช้ใหม่แล้ว', 'success');
    renderUserManagement();
}
function deleteUser(id) {
    Swal.fire({ title: 'ลบผู้ใช้?', showCancelButton: true, confirmButtonColor: '#d33' }).then((res) => {
        if (res.isConfirmed) {
            const user = users.find(u => u.id === id);
            logAction('ลบผู้ใช้งาน', `ลบผู้ใช้ ${user.username}`);
            users = users.filter(u => u.id !== id);
            saveUsers(); renderUserManagement();
        }
    });
}

// --- 10. ACCESSIBILITY FIXES ---
// แก้ไขปัญหา Bootstrap aria-hidden warning ใน Console
document.addEventListener('show.bs.modal', function (event) {
    event.target.removeAttribute('aria-hidden');
});
// --- 8. AUDIT LOG ---
function setLogFilter(filter, btn) {
    currentLogFilter = filter;
    logDisplayLimit = 20; // รีเซ็ตโควตาการแสดงผล
    const btns = document.querySelectorAll('#logFilters .btn');
    btns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAuditLogs();
}

function renderAuditLogs(append = false) {
    const tbody = document.getElementById('auditLogTableBody');
    const logFilterUI = document.getElementById('logFilters');

    // จัดการ UI ตัวกรองสำหรับนักเรียน (ซ่อนตัวกรองอื่น)
    if (currentUser.role === 'student') {
        logFilterUI.classList.add('d-none');
        currentLogFilter = 'borrow'; // บังคับให้ดูแต่เรื่องยืมคืน
    } else {
        logFilterUI.classList.remove('d-none');
    }

    const categoriesFilter = {
        borrow: ['ยืมสำเร็จ', 'คืนสำเร็จ (แนบรูป)', 'อนุมัติการยืม', 'รับคืนอุปกรณ์', 'แจ้งคืน', 'แจ้งคืน (ไม่มีรูป)', 'ขอยืม (รออนุมัติ)', 'ยกเลิกคำขอ', 'ปฏิเสธคำขอ', 'ครูบังคับคืน'],
        manage: ['เพิ่มอุปกรณ์', 'ลบอุปกรณ์', 'เพิ่มหมวดหมู่', 'ลบหมวดหมู่'],
        user: ['เพิ่มผู้ใช้งาน', 'ลบผู้ใช้งาน', 'เข้าสู่ระบบ']
    };

    const searchEl = document.getElementById('logSearch');
    const searchTerm = searchEl ? searchEl.value.toLowerCase() : '';
    const filteredLogs = auditLogs.filter(log => {
        const actor = (log.actor || '').toLowerCase();
        const details = (log.details || '').toLowerCase();
        const action = (log.action || '').toLowerCase();

        const matchesCategory = (currentLogFilter === 'all') || (categoriesFilter[currentLogFilter] && categoriesFilter[currentLogFilter].includes(log.action));
        const matchesSearch = actor.includes(searchTerm) || details.includes(searchTerm) || action.includes(searchTerm);

        if (currentUser && currentUser.role === 'student') {
            return log.actor === currentUser.name && categoriesFilter.borrow.includes(log.action) && matchesSearch;
        }

        return matchesCategory && matchesSearch;
    });

    if (filteredLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-5 text-muted">${currentUser.role === 'student' ? 'คุณยังไม่มีประวัติการยืมอุปกรณ์' : 'ไม่พบประวัติในหมวดหมู่ที่เลือก'}</td></tr>`;
        return;
    }

    // ทำการตัดข้อมูลตาม Limit (Lazy Loading)
    const totalCount = filteredLogs.length;
    // เลือกช่วงข้อมูลที่จะแสดง
    let logsToRender;
    if (append) {
        const start = logDisplayLimit - 30; // โหลดเพิ่มทีละ 30
        logsToRender = filteredLogs.slice(start, logDisplayLimit);
    } else {
        logsToRender = filteredLogs.slice(0, logDisplayLimit);
    }

    const actionMap = {
        'ยืมสำเร็จ': { color: 'success', icon: 'fa-check-circle' },
        'คืนสำเร็จ (แนบรูป)': { color: 'success', icon: 'fa-camera' },
        'อนุมัติการยืม': { color: 'success', icon: 'fa-user-check' },
        'รับคืนอุปกรณ์': { color: 'success', icon: 'fa-box-open' },
        'แจ้งคืน': { color: 'info', icon: 'fa-undo' },
        'แจ้งคืน (ไม่มีรูป)': { color: 'info', icon: 'fa-clock' },
        'ขอยืม (รออนุมัติ)': { color: 'info', icon: 'fa-file-signature' },
        'เข้าสู่ระบบ': { color: 'secondary', icon: 'fa-sign-in-alt' },
        'เพิ่มอุปกรณ์': { color: 'primary', icon: 'fa-plus' },
        'เพิ่มหมวดหมู่': { color: 'primary', icon: 'fa-tag' },
        'เพิ่มผู้ใช้งาน': { color: 'primary', icon: 'fa-user-plus' },
        'ยกเลิกคำขอ': { color: 'warning', icon: 'fa-times-circle' },
        'ปฏิเสธคำขอ': { color: 'danger', icon: 'fa-ban' },
        'ลบอุปกรณ์': { color: 'danger', icon: 'fa-trash-alt' },
        'ลบหมวดหมู่': { color: 'danger', icon: 'fa-folder-minus' },
        'ลบผู้ใช้งาน': { color: 'danger', icon: 'fa-user-minus' },
        'ครูบังคับคืน': { color: 'success', icon: 'fa-gavel' }
    };

    let html = '';
    logsToRender.forEach((log, index) => {
        const dateObj = log.timestamp ? new Date(log.timestamp) : new Date();
        const timeStr = dateObj.toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const dateStr = dateObj.toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        const actInfo = actionMap[log.action] || { color: 'light', icon: 'fa-dot-circle' };

        let imageBtn = '';
        let warningBadge = '';

        if (log.image) {
            imageBtn = `<button class="btn btn-sm btn-success ms-2" style="border-radius:20px; font-size:0.7rem" onclick="viewLogImage('${log.id}')"><i class="fas fa-image"></i> รูป</button>`;

            // ตรวจสอบ Metadata Warning (ถ้าถ่ายเกิน 12 ชม.)
            if (log.imageDate) {
                const diffMs = new Date(log.timestamp) - new Date(log.imageDate);
                const diffHours = diffMs / (1000 * 60 * 60);
                if (diffHours > 12) {
                    const color = diffHours > 48 ? 'danger' : 'warning';
                    warningBadge = `<span class="badge bg-${color} ms-1" style="font-size:0.6rem" title="รูปภาพถ่ายมานานเกิน 12 ชม."><i class="fas fa-exclamation-triangle"></i> รูปเก่า</span>`;
                }
            }
        }

        const delay = Math.min(index * 0.03, 0.6); // 30ms stagger, max 0.6s total delay
        html += `
            <tr class="animate-in" style="animation-delay: ${delay}s">
                <td data-label="ผู้ทำรายการ / เวลา" class="ps-4"><span class="log-actor">${log.actor}</span><span class="log-time">${dateStr} | ${timeStr} น.</span></td>
                <td data-label="กิจกรรม">
                    <span class="log-action-badge bg-${actInfo.color} text-white"><i class="fas ${actInfo.icon} me-1"></i> ${log.action}</span>
                    ${warningBadge}
                </td>
                <td data-label="รายละเอียด" class="log-details">${log.details} ${imageBtn}</td>
            </tr>`;
    });

    // เพิ่มปุ่มโหลดเพิ่มถ้าข้อมูลยังเหลือ
    if (totalCount > logDisplayLimit) {
        html += `
            <tr id="loadMoreRow">
                <td colspan="3" class="text-center py-3">
                    <button class="btn btn-link text-success fw-bold text-decoration-none" onclick="loadMoreLogs()">
                        <i class="fas fa-chevron-down"></i> แสดงเพิ่ม (${totalCount - logDisplayLimit} รายการ)
                    </button>
                </td>
            </tr>`;
    }

    if (append) {
        // ลบแถว "โหลดเพิ่ม" เก่าออก
        const oldRow = document.getElementById('loadMoreRow');
        if (oldRow) oldRow.remove();
        tbody.insertAdjacentHTML('beforeend', html);
    } else {
        tbody.innerHTML = html;
    }
}

function loadMoreLogs() {
    logDisplayLimit += 30; // โหลดเพิ่มทีละ 30
    renderAuditLogs(true);
}

function showLogLegend() {
    const categories = [
        {
            label: 'งานสำเร็จ / รับคืนของ',
            color: 'success',
            icon: 'fa-check-circle',
            details: 'ยืมสำเร็จ, คืนสำเร็จ, อนุมัติยืม, รับคืนอุปกรณ์, ครูบังคับคืน'
        },
        {
            label: 'แจ้งเรื่อง / เพิ่มข้อมูล',
            color: 'info',
            icon: 'fa-info-circle',
            details: 'ขอยืม (รออนุมัติ), แจ้งคืน, เพิ่มอุปกรณ์, เพิ่มหมวดหมู่, เพิ่มผู้ใช้'
        },
        {
            label: 'ยกเลิกคำขอ',
            color: 'warning',
            icon: 'fa-exclamation-circle',
            details: 'ผู้ยืมยกเลิกคำขอยืมเอง'
        },
        {
            label: 'ปฏิเสธ / ลบข้อมูล',
            color: 'danger',
            icon: 'fa-ban',
            details: 'ปฏิเสธคำขอ, ลบอุปกรณ์, ลบหมวดหมู่, ลบผู้ใช้งาน'
        },
        {
            label: 'ระบบ',
            color: 'secondary',
            icon: 'fa-cog',
            details: 'การเข้าสู่ระบบ'
        }
    ];

    let html = '<div class="text-start">';
    categories.forEach(cat => {
        html += `
            <div class="d-flex align-items-start mb-4">
                <span class="badge bg-${cat.color} text-white me-3 d-flex align-items-center justify-content-center shadow-sm" style="width:35px; height:35px; border-radius:10px; flex-shrink:0;">
                    <i class="fas ${cat.icon} fa-lg"></i>
                </span>
                <div style="line-height: 1.4;">
                    <div class="fw-bold text-dark fs-6">${cat.label}</div>
                    <div class="text-muted small" style="margin-top: 2px;">
                        <i class="fas fa-caret-right me-1"></i> ${cat.details}
                    </div>
                </div>
            </div>`;
    });
    html += '</div>';

    Swal.fire({
        title: '<h4 class="fw-bold mb-0">คำอธิบายสีและกิจกรรม</h4>',
        html: html,
        confirmButtonText: 'รับทราบ',
        confirmButtonColor: '#198754',
        width: '500px'
    });
}
