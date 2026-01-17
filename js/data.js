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
let currentLogFilter = 'all';
let logDisplayLimit = 20; // จำนวนประวัติที่จะแสดงในตอนแรก
let currentImageDate = null; // เก็บวันที่ถ่ายจากไฟล์จริง

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
    try {
        auditLogs = storedLogs ? JSON.parse(storedLogs) : [];
        if (!Array.isArray(auditLogs)) auditLogs = [];
    } catch (e) {
        auditLogs = [];
    }

    // Check for persistent session
    const savedSession = localStorage.getItem('agriSession');
    if (savedSession) {
        currentUser = JSON.parse(savedSession);
    }

    renderCategoryOptions();
}

function saveInventory() { localStorage.setItem('agriInventory', JSON.stringify(inventory)); }
function saveUsers() { localStorage.setItem('agriUsers', JSON.stringify(users)); }
function saveCategories() { localStorage.setItem('agriCategories', JSON.stringify(categories)); }
