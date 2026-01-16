// --- 1. DATA INITIALIZATION ---
const defaultUsers = [
    { id: 1, username: 'admin', password: '1234', name: 'Admin System', role: 'admin' },
    { id: 2, username: 'teacher', password: '1234', name: 'ครูสมศรี', role: 'teacher' },
    { id: 3, username: 'student', password: '1234', name: 'ด.ช.รักเรียน', role: 'student' }
];

const defaultCategories = ["ทั่วไป", "ขุดดิน", "รดน้ำ", "ตัดแต่ง", "เครื่องจักร"];

const defaultItems = [
    { id: 1, name: "จอบขุดดิน", category: "ขุดดิน", status: "available", borrower: "-", borrowReason: "", addedBy: "Admin System", needsApproval: false, image: "https://images.unsplash.com/photo-1615811361523-6bd03c7728d9?auto=format&fit=crop&w=400" },
    { id: 2, name: "โดรนการเกษตร", category: "ทั่วไป", status: "pending_approval", borrower: "ด.ช.รักเรียน", borrowReason: "ใช้ถ่ายภาพมุมสูง", addedBy: "ครูสมศรี", needsApproval: true, image: "https://images.unsplash.com/photo-1508614589041-895b8c2d7da1?auto=format&fit=crop&w=400" }
];

let users = [];
let inventory = [];
let categories = [];
let auditLogs = []; 
let currentUser = null;
let selectedItemId = null;

let currentAdminFilter = 'all';
let currentUserFilter = 'all';

function initSystem() {
    const storedUsers = localStorage.getItem('agriUsers');
    users = storedUsers ? JSON.parse(storedUsers) : defaultUsers;
    localStorage.setItem('agriUsers', JSON.stringify(users));

    const storedItems = localStorage.getItem('agriInventory');
    inventory = storedItems ? JSON.parse(storedItems) : defaultItems;
    localStorage.setItem('agriInventory', JSON.stringify(inventory));

    const storedCats = localStorage.getItem('agriCategories');
    categories = storedCats ? JSON.parse(storedCats) : defaultCategories;
    localStorage.setItem('agriCategories', JSON.stringify(categories));

    const storedLogs = localStorage.getItem('agriAuditLogs');
    auditLogs = storedLogs ? JSON.parse(storedLogs) : [];

    renderCategoryOptions();
}

function saveInventory() { localStorage.setItem('agriInventory', JSON.stringify(inventory)); }
function saveUsers() { localStorage.setItem('agriUsers', JSON.stringify(users)); }
function saveCategories() { localStorage.setItem('agriCategories', JSON.stringify(categories)); }
function logAction(action, details) {
    const newLog = { id: Date.now(), timestamp: new Date().toISOString(), actor: currentUser ? currentUser.name : 'Unknown', action: action, details: details };
    auditLogs.unshift(newLog); 
    localStorage.setItem('agriAuditLogs', JSON.stringify(auditLogs));
}

// --- 2. AUTHENTICATION ---
function handleLogin(e) {
    e.preventDefault();
    const uInput = document.getElementById('loginUser').value.trim();
    const pInput = document.getElementById('loginPass').value.trim();
    const foundUser = users.find(u => u.username === uInput && u.password === pInput);

    if (foundUser) {
        currentUser = foundUser;
        logAction('เข้าสู่ระบบ', `ผู้ใช้ ${currentUser.role} เข้าใช้งาน`);
        loginSuccess();
    } else {
        Swal.fire('ข้อผิดพลาด', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'error');
    }
}

function loginSuccess() {
    document.getElementById('mainNavbar').classList.remove('d-none');
    document.getElementById('userGreeting').innerHTML = `<i class="fas fa-user me-1"></i> ${currentUser.name}`;
    
    const isAdmin = currentUser.role === 'admin';
    const isTeacher = currentUser.role === 'teacher';

    document.getElementById('userMenuLink').classList.remove('d-none');
    
    if (isAdmin || isTeacher) {
        document.getElementById('manageMenuLink').classList.remove('d-none');
        document.getElementById('adminLogMenu').classList.remove('d-none');
    } else {
        document.getElementById('manageMenuLink').classList.add('d-none');
        document.getElementById('adminLogMenu').classList.add('d-none');
    }

    if (isAdmin) document.getElementById('adminUserMenu').classList.remove('d-none');
    else document.getElementById('adminUserMenu').classList.add('d-none');

    if (isAdmin || isTeacher) switchPage('adminDashboard'); 
    else switchPage('userView');
}

function logout() { location.reload(); }

function switchPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active-section'));
    document.getElementById(pageId).classList.add('active-section');
    if (pageId === 'userView') renderUserItems();
    if (pageId === 'adminDashboard') renderAdminDashboard();
    if (pageId === 'userManagePage') renderUserManagement();
    if (pageId === 'auditLogPage') renderAuditLogs();
}

// --- 3. CATEGORY MANAGEMENT (แก้ไขใหม่) ---

function renderCategoryOptions() {
    // อัปเดต Dropdown หน้าเว็บหลัก (เก็บค่าที่เลือกไว้ก่อนหน้าด้วย ถ้ามี)
    const userSelect = document.getElementById('userCategoryFilter');
    const prevUserSelectVal = userSelect.value;
    
    userSelect.innerHTML = '<option value="all">ทุกหมวดหมู่</option>';
    categories.forEach(c => {
        userSelect.innerHTML += `<option value="${c}">${c}</option>`;
    });
    
    // พยายามคืนค่าเดิมที่เลือกไว้ (ถ้าหมวดหมู่นั้นยังอยู่)
    if(prevUserSelectVal) userSelect.value = prevUserSelectVal;

    // อัปเดต Dropdown ใน Modal เพิ่มของ
    const modalSelect = document.getElementById('newItemCat');
    modalSelect.innerHTML = '';
    categories.forEach(c => {
        modalSelect.innerHTML += `<option value="${c}">${c}</option>`;
    });
}

// สร้างฟังก์ชันแยก สำหรับวาดรายการใน Modal โดยเฉพาะ
function renderCategoryListInModal() {
    const list = document.getElementById('categoryList');
    list.innerHTML = '';
    categories.forEach((c, index) => {
        list.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                ${c}
                <button class="btn btn-sm text-danger" onclick="deleteCategory(${index})"><i class="fas fa-times"></i></button>
            </li>
        `;
    });
}

function openCategoryModal() {
    renderCategoryListInModal(); // วาดรายการก่อน
    
    // ใช้ getOrCreateInstance เพื่อป้องกันการสร้าง Instance ซ้ำซ้อน
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
        
        // แก้ไข: เรียกแค่ฟังก์ชันวาดรายการ ไม่เรียก openCategoryModal() ซ้ำ
        renderCategoryListInModal(); 
        
        renderCategoryOptions(); 
        logAction('เพิ่มหมวดหมู่', `เพิ่มหมวดหมู่: ${val}`);
    }
}

function deleteCategory(index) {
    const removed = categories[index];
    categories.splice(index, 1);
    saveCategories();
    
    // แก้ไข: เรียกแค่ฟังก์ชันวาดรายการ ไม่เรียก openCategoryModal() ซ้ำ
    renderCategoryListInModal();
    
    renderCategoryOptions();
    logAction('ลบหมวดหมู่', `ลบหมวดหมู่: ${removed}`);
}

function addNewCategory() {
    const input = document.getElementById('newCatInput');
    const val = input.value.trim();
    if (val && !categories.includes(val)) {
        categories.push(val);
        saveCategories();
        input.value = '';
        openCategoryModal(); 
        renderCategoryOptions(); 
        logAction('เพิ่มหมวดหมู่', `เพิ่มหมวดหมู่: ${val}`);
    }
}

function deleteCategory(index) {
    const removed = categories[index];
    categories.splice(index, 1);
    saveCategories();
    openCategoryModal();
    renderCategoryOptions();
    logAction('ลบหมวดหมู่', `ลบหมวดหมู่: ${removed}`);
}

// --- 4. FILTER LOGIC ---
function setAdminFilter(status, btn) {
    currentAdminFilter = status;
    const btns = document.querySelectorAll('#adminFilters .btn');
    btns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAdminDashboard();
}

function setUserFilter(status, btn) {
    currentUserFilter = status;
    const btns = document.querySelectorAll('#userFilters .btn');
    btns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderUserItems();
}

// --- 5. INVENTORY & BORROW LOGIC ---

function renderUserItems() {
    const container = document.getElementById('userItemContainer');
    const search = document.getElementById('userSearch').value.toLowerCase();
    const catFilter = document.getElementById('userCategoryFilter').value; 
    container.innerHTML = '';
    
    const filtered = inventory.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(search);
        const matchesCategory = catFilter === 'all' || i.category === catFilter;
        let matchesStatus = true;
        if (currentUserFilter === 'available') matchesStatus = i.status === 'available';
        else if (currentUserFilter === 'my_items') matchesStatus = i.borrower === currentUser.name;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted py-5">ไม่พบอุปกรณ์</div>`;
        return;
    }

    filtered.forEach(item => {
        let statusBadge, actionBtn, infoText = '';
        const isMyItem = item.borrower === currentUser.name;
        const ownerText = `<small class="text-muted d-block mt-1" style="font-size:0.75rem"><i class="fas fa-user-edit"></i> เพิ่มโดย: ${item.addedBy}</small>`;

        if (item.status === 'available') {
            statusBadge = '<span class="badge-status bg-success text-white">ว่าง</span>';
            const btnClass = item.needsApproval ? 'btn-outline-warning' : 'btn-outline-success';
            actionBtn = `<button class="btn ${btnClass} w-100 rounded-pill" onclick="prepBorrow(${item.id})">
                ${item.needsApproval ? '<i class="fas fa-file-signature"></i> ขออนุมัติยืม' : '<i class="fas fa-hand-holding"></i> ยืมทันที'}
            </button>`;
        } else if (item.status === 'pending_approval') {
            statusBadge = '<span class="badge-status bg-info text-white">รออนุมัติ</span>';
            if (isMyItem) {
                actionBtn = `<button class="btn btn-outline-danger w-100 rounded-pill fw-bold" onclick="userCancelRequest(${item.id})"><i class="fas fa-times-circle"></i> ยกเลิกคำขอ</button>`;
            } else {
                actionBtn = `<button class="btn btn-secondary w-100 rounded-pill" disabled>มีคนจองแล้ว</button>`;
            }
        } else if (item.status === 'borrowed') {
            statusBadge = '<span class="badge-status bg-warning text-dark">ถูกยืม</span>';
            if (isMyItem) {
                actionBtn = `<button class="btn btn-warning w-100 rounded-pill" onclick="requestReturn(${item.id})">แจ้งคืนอุปกรณ์</button>`;
            } else {
                actionBtn = `<button class="btn btn-secondary w-100 rounded-pill" disabled>ไม่ว่าง</button>`;
                infoText = `<div class="small text-danger mt-1">ผู้ยืม: ${item.borrower}</div>`;
            }
        } else if (item.status === 'pending_return') {
            statusBadge = '<span class="badge-status bg-primary text-white">รอตรวจรับ</span>';
            actionBtn = `<button class="btn btn-secondary w-100 rounded-pill" disabled>กำลังส่งคืน...</button>`;
        }

        container.innerHTML += `
        <div class="col-lg-3 col-md-4 col-sm-6">
            <div class="card h-100 card-item">
                ${statusBadge}
                <img src="${item.image}" class="card-img-top" style="height:180px; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="no-image" style="display:none;">ไม่มีภาพ</div>
                <div class="card-body d-flex flex-column">
                    <h6 class="card-title fw-bold mb-1">${item.name}</h6>
                    <div class="small text-muted">${item.category}</div>
                    ${ownerText}
                    ${infoText}
                    <div class="mt-auto pt-3">${actionBtn}</div>
                </div>
            </div>
        </div>`;
    });
}

function userCancelRequest(id) {
    Swal.fire({
        title: 'ยกเลิกคำขอยืม?', text: "คุณจะไม่ได้รับอุปกรณ์ชิ้นนี้", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ใช่, ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            const item = inventory.find(i => i.id === id);
            logAction('ยกเลิกคำขอ', `ผู้ใช้ยกเลิกการขอยืม ${item.name}`);
            item.status = 'available'; item.borrower = '-'; item.borrowReason = '';
            saveInventory(); renderUserItems();
            Swal.fire('ยกเลิกแล้ว', 'คำขอยืมของคุณถูกยกเลิก', 'success');
        }
    });
}

function prepBorrow(id) {
    selectedItemId = id;
    const item = inventory.find(i => i.id === id);
    document.getElementById('borrowItemName').innerText = item.name;
    document.getElementById('borrowerNameInput').value = currentUser.name;
    document.getElementById('borrowReason').value = ''; 
    const warning = document.getElementById('approvalWarning');
    if (item.needsApproval) warning.classList.remove('d-none'); else warning.classList.add('d-none');
    new bootstrap.Modal(document.getElementById('borrowModal')).show();
}

function confirmBorrow() {
    const item = inventory.find(i => i.id === selectedItemId);
    const reason = document.getElementById('borrowReason').value.trim();
    if (!reason) { Swal.fire('กรุณาระบุเหตุผล', 'เช่น นำไปใช้ทำอะไร เพื่อให้ครูทราบข้อมูล', 'warning'); return; }

    item.borrowReason = reason;

    if (item.needsApproval) {
        item.status = 'pending_approval';
        item.borrower = currentUser.name;
        logAction('ขอยืม (รออนุมัติ)', `ขอยืม ${item.name} เหตุผล: ${reason}`);
        Swal.fire('ส่งคำขอแล้ว', 'กรุณารอครู/Admin อนุมัติคำขอยืมครับ', 'info');
    } else {
        item.status = 'borrowed';
        item.borrower = currentUser.name;
        logAction('ยืมสำเร็จ', `ยืม ${item.name} เรียบร้อย เหตุผล: ${reason}`);
        Swal.fire('สำเร็จ', 'ยืมอุปกรณ์เรียบร้อยแล้ว', 'success');
    }
    saveInventory();
    bootstrap.Modal.getInstance(document.getElementById('borrowModal')).hide();
    renderUserItems();
}

function requestReturn(id) {
    Swal.fire({ title: 'ยืนยันการคืน?', showCancelButton: true, confirmButtonText: 'แจ้งคืน' }).then((res) => {
        if (res.isConfirmed) {
            const item = inventory.find(i => i.id === id);
            item.status = 'pending_return';
            logAction('แจ้งคืน', `แจ้งคืนอุปกรณ์ ${item.name}`);
            saveInventory(); renderUserItems();
            Swal.fire('แจ้งคืนแล้ว', 'รอครูตรวจสอบของ', 'success');
        }
    });
}

// --- 6. ADMIN/TEACHER DASHBOARD ---

function renderAdminDashboard() {
    document.getElementById('statPendingApproval').innerText = inventory.filter(i => i.status === 'pending_approval').length;
    document.getElementById('statBorrowed').innerText = inventory.filter(i => i.status === 'borrowed').length;
    document.getElementById('statPendingReturn').innerText = inventory.filter(i => i.status === 'pending_return').length;
    document.getElementById('statAvailable').innerText = inventory.filter(i => i.status === 'available').length;

    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';

    const filtered = inventory.filter(i => {
        if (currentAdminFilter === 'all') return true;
        return i.status === currentAdminFilter;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">ไม่พบรายการในสถานะนี้</td></tr>`;
        return;
    }

    inventory.forEach(item => {
        if (currentAdminFilter !== 'all' && item.status !== currentAdminFilter) return;

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
            actionBtn = `<span class="text-muted small">รอคืน</span>`;
        } else if (item.status === 'pending_return') {
            statusBadge = '<span class="badge bg-primary">รอตรวจคืน</span>';
            actionBtn = `<button class="btn btn-sm btn-success" onclick="adminApproveReturn(${item.id})" title="รับของคืน"><i class="fas fa-box-open"></i> รับคืน</button>`;
        }

        tbody.innerHTML += `
            <tr>
                <td class="ps-4 fw-bold">${nameDisplay}<br><small class="fw-normal text-muted" style="font-size:0.75rem">เพิ่มโดย: ${item.addedBy}</small></td>
                <td>${statusBadge}</td>
                <td class="small">${borrowerDisplay}</td>
                <td style="width: 150px;">${actionBtn}</td>
            </tr>
        `;
    });
}

function adminApproveBorrow(id) {
    const item = inventory.find(i => i.id === id);
    Swal.fire({ 
        title: 'อนุญาตให้ยืม?', html: `ผู้ขอ: <b>${item.borrower}</b><br>เหตุผล: <i class="text-muted">"${item.borrowReason}"</i>`,
        icon: 'question', showCancelButton: true, confirmButtonText: 'อนุมัติ' 
    }).then((res) => {
        if(res.isConfirmed) {
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
        if(res.isConfirmed) {
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
        if(res.isConfirmed) {
            const item = inventory.find(i => i.id === id);
            logAction('รับคืนอุปกรณ์', `รับคืน ${item.name} จาก ${item.borrower}`);
            item.status = 'available'; item.borrower = '-'; item.borrowReason = ''; 
            saveInventory(); renderAdminDashboard();
            Swal.fire('สำเร็จ', 'ของกลับเข้าคลังแล้ว', 'success');
        }
    });
}

function openAddItemModal() {
    document.getElementById('newItemName').value = '';
    document.getElementById('newItemApproval').checked = false; 
    new bootstrap.Modal(document.getElementById('addItemModal')).show();
}

function saveNewItem() {
    const name = document.getElementById('newItemName').value;
    if(!name) return;
    const needsApprove = document.getElementById('newItemApproval').checked;
    const newItem = {
        id: Date.now(), name: name, category: document.getElementById('newItemCat').value,
        status: 'available', borrower: '-', borrowReason: '',
        image: document.getElementById('newItemImg').value || "",
        addedBy: currentUser.name, needsApproval: needsApprove
    };
    inventory.push(newItem);
    logAction('เพิ่มอุปกรณ์', `เพิ่ม ${newItem.name} เข้าสู่ระบบ`);
    saveInventory();
    bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
    Swal.fire('เพิ่มสำเร็จ', 'อุปกรณ์เข้าสู่ระบบแล้ว', 'success');
    renderAdminDashboard();
}

function deleteItem(id) {
    Swal.fire({ title: 'ลบรายการ?', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ลบ' }).then((res) => {
        if(res.isConfirmed) {
            const item = inventory.find(i => i.id === id);
            logAction('ลบอุปกรณ์', `ลบอุปกรณ์ ${item.name}`);
            inventory = inventory.filter(i => i.id !== id);
            saveInventory(); renderAdminDashboard();
        }
    });
}

// --- 7. USER MANAGEMENT ---
function renderUserManagement() {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';
    users.forEach(u => {
        const deleteBtn = u.username === currentUser.username ? '' : `<button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id})">ลบ</button>`;
        tbody.innerHTML += `<tr><td class="ps-4 fw-bold text-primary">${u.username}</td><td>${u.name}</td><td><span class="badge bg-secondary">${u.role}</span></td><td>${deleteBtn}</td></tr>`;
    });
}
function openAddUserModal() {
    document.getElementById('newUserUser').value = ''; document.getElementById('newUserPass').value = ''; document.getElementById('newUserName').value = '';
    new bootstrap.Modal(document.getElementById('addUserModal')).show();
}
function saveNewUser() {
    const u = document.getElementById('newUserUser').value; const p = document.getElementById('newUserPass').value; const n = document.getElementById('newUserName').value; const r = document.getElementById('newUserRole').value;
    if(!u || !p || !n) return Swal.fire('ข้อมูลไม่ครบ', '', 'warning');
    if(users.find(user => user.username === u)) return Swal.fire('ซ้ำ', 'Username นี้มีแล้ว', 'error');
    const newUser = { id: Date.now(), username: u, password: p, name: n, role: r };
    users.push(newUser);
    logAction('เพิ่มผู้ใช้งาน', `เพิ่มผู้ใช้ ${newUser.username} (${newUser.role})`);
    saveUsers();
    bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
    Swal.fire('สำเร็จ', 'เพิ่มผู้ใช้ใหม่แล้ว', 'success');
    renderUserManagement();
}
function deleteUser(id) {
    Swal.fire({ title: 'ลบผู้ใช้?', showCancelButton: true, confirmButtonColor: '#d33' }).then((res) => {
        if(res.isConfirmed) {
            const user = users.find(u => u.id === id);
            logAction('ลบผู้ใช้งาน', `ลบผู้ใช้ ${user.username}`);
            users = users.filter(u => u.id !== id);
            saveUsers(); renderUserManagement();
        }
    });
}

// --- 8. AUDIT LOG ---
function renderAuditLogs() {
    const tbody = document.getElementById('auditLogTableBody');
    tbody.innerHTML = '';
    if (auditLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">ยังไม่มีประวัติการใช้งาน</td></tr>`;
        return;
    }
    auditLogs.forEach(log => {
        const timeStr = new Date(log.timestamp).toLocaleString('th-TH', { 
            year: 'numeric', month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
        tbody.innerHTML += `<tr><td class="ps-4 log-time">${timeStr}</td><td class="log-actor">${log.actor}</td><td><span class="badge bg-light text-dark border">${log.action}</span></td><td>${log.details}</td></tr>`;
    });
}

initSystem();