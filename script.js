function switchPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active-section'));
    document.getElementById(pageId).classList.add('active-section');
    if (pageId === 'userView') renderUserItems();
    if (pageId === 'adminDashboard') renderAdminDashboard();
    if (pageId === 'userManagePage') renderUserManagement();
    if (pageId === 'auditLogPage') renderAuditLogs();
}

initSystem();

// Auto login if session exists
if (currentUser) {
    loginSuccess();
}