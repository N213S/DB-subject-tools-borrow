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

    let html = '';
    filtered.forEach((item, index) => {
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

        const delay = index * 0.05; // 50ms stagger
        html += `
        <div class="col-lg-3 col-md-4 col-sm-6 animate-in" style="animation-delay: ${delay}s">
            <div class="card h-100 card-item">
                ${statusBadge}
                <img src="${item.image}" class="card-img-top" style="height:180px; object-fit:cover; cursor: zoom-in;" 
                    loading="lazy" 
                    onclick="viewInventoryImage(${item.id})" 
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
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
    container.innerHTML = html;
}

function setUserFilter(status, btn) {
    currentUserFilter = status;
    const btns = document.querySelectorAll('#userFilters .btn');
    btns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderUserItems();
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
    bootstrap.Modal.getOrCreateInstance(document.getElementById('borrowModal')).show();
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
    bootstrap.Modal.getOrCreateInstance(document.getElementById('borrowModal')).hide();
    renderUserItems();
}

function requestReturn(id) {
    selectedItemId = id;
    const item = inventory.find(i => i.id === id);
    document.getElementById('returnItemName').innerText = item.name;
    document.getElementById('returnImageInput').value = '';
    document.getElementById('imagePreviewContainer').classList.add('d-none');
    document.getElementById('btnConfirmReturnWithImg').disabled = true;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('returnModal')).show();
}

function confirmReturnWithImage() {
    const item = inventory.find(i => i.id === selectedItemId);
    const fileInput = document.getElementById('returnImageInput');

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = async function (e) {
            Swal.showLoading();
            const compressedImageData = await compressImage(e.target.result);

            item.status = 'available';
            item.borrower = '-';
            item.borrowReason = '';

            logAction('คืนสำเร็จ (แนบรูป)', `คืน ${item.name} เรียบร้อย`, compressedImageData, currentImageDate);

            saveInventory();
            renderUserItems();
            bootstrap.Modal.getOrCreateInstance(document.getElementById('returnModal')).hide();
            Swal.fire('สำเร็จ', 'คืนอุปกรณ์เรียบร้อยแล้ว (มีหลักฐานรูปภาพ)', 'success');
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

function confirmReturnNoImage() {
    const item = inventory.find(i => i.id === selectedItemId);
    item.status = 'pending_return';
    logAction('แจ้งคืน (ไม่มีรูป)', `แจ้งคืนอุปกรณ์ ${item.name} รอครูตรวจสอบ`);
    saveInventory();
    renderUserItems();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('returnModal')).hide();
    Swal.fire('แจ้งคืนแล้ว', 'กรุณานำอุปกรณ์ไปคืนที่ครู เพื่อให้ครูตรวจสอบและยืนยันการรับคืน', 'info');
}

// Event Listener สำหรับ Preview รูป
document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'returnImageInput') {
        const file = e.target.files[0];
        if (file) {
            // ดึง Metadata เบื้องต้น: วันที่แก้ไขไฟล์ล่าสุด (มักจะเป็นเวลาที่ถ่ายรูป)
            currentImageDate = file.lastModified;

            const reader = new FileReader();
            reader.onload = function (ex) {
                document.getElementById('returnImagePreview').src = ex.target.result;
                document.getElementById('imagePreviewContainer').classList.remove('d-none');
                document.getElementById('btnConfirmReturnWithImg').disabled = false;

                // อัปเดตเวลาในรูปพรีวิวให้ตรงกับไฟล์
                const displayTime = new Date(currentImageDate).toLocaleString('th-TH');
                document.getElementById('returnImagePreview').setAttribute('onclick', `viewFullImage(this.src, 'รูปภาพหลักฐานการคืน', 'วันที่ถ่ายจากไฟล์: ${displayTime}')`);
            };
            reader.readAsDataURL(file);
        }
    }
});
