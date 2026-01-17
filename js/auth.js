// --- 2. AUTHENTICATION ---
function handleLogin(e) {
    e.preventDefault();
    const uInput = document.getElementById('loginUser').value.trim();
    const pInput = document.getElementById('loginPass').value.trim();
    const foundUser = users.find(u => u.username === uInput && u.password === pInput);

    if (foundUser) {
        currentUser = foundUser;
        // Save session for persistent login
        localStorage.setItem('agriSession', JSON.stringify(currentUser));

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
    document.getElementById('adminLogMenu').classList.remove('d-none'); // นักเรียนเห็นด้วย

    if (isAdmin || isTeacher) {
        document.getElementById('manageMenuLink').classList.remove('d-none');
    } else {
        document.getElementById('manageMenuLink').classList.add('d-none');
    }

    if (isAdmin) document.getElementById('adminUserMenu').classList.remove('d-none');
    else document.getElementById('adminUserMenu').classList.add('d-none');

    if (isAdmin || isTeacher) switchPage('adminDashboard');
    else switchPage('userView');
}

function logout() {
    Swal.fire({
        title: 'ออกจากระบบ?',
        text: "คุณต้องการออกจากระบบใช่หรือไม่?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ใช่, ออกจากระบบ',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('agriSession');
            location.reload();
        }
    });
}
