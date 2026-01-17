function logAction(action, details, image = null, imageDate = null) {
    const newLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        actor: currentUser ? currentUser.name : 'Unknown',
        action: action,
        details: details,
        image: image,
        imageDate: imageDate // วันที่ถ่ายจริงจาก Metadata ของไฟล์
    };
    auditLogs.unshift(newLog);

    // Performance: Prune logs if they exceed 1000 (More data for education!)
    if (auditLogs.length > 1000) {
        auditLogs = auditLogs.slice(0, 1000);
    }

    localStorage.setItem('agriAuditLogs', JSON.stringify(auditLogs));
}

// Performance: Helper to compress images before saving to LocalStorage
function compressImage(base64Str, maxWidth = 800) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to JPEG
        };
    });
}

function viewInventoryImage(itemId) {
    const item = inventory.find(i => i.id == itemId);
    if (item && item.image) {
        viewFullImage(item.image, item.name, `หมวดหมู่: ${item.category} | เพิ่มโดย: ${item.addedBy}`);
    }
}

function viewLogImage(logId) {
    const log = auditLogs.find(l => l.id == logId);
    if (log && log.image) {
        const captureDate = log.imageDate ? new Date(log.imageDate) : null;
        const submitDate = new Date(log.timestamp);

        const timeStr = (captureDate || submitDate).toLocaleString('th-TH', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        let diffText = "";
        if (captureDate) {
            const diffMs = submitDate - captureDate;
            diffText = ` (ถ่ายก่อนแจ้งคืน ${formatTimeDiff(diffMs)})`;
        }

        const prefix = log.imageDate ? 'วันที่ถ่ายจาก Metadata: ' : 'บันทึกเมื่อ: ';
        viewFullImage(log.image, `หลักฐานจาก: ${log.actor}`, prefix + timeStr + ' น.' + diffText);
    }
}

function formatTimeDiff(ms) {
    if (ms < 0) return "เวลาผิดพลาด";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} วัน ${hours % 24} ชม.`;
    if (hours > 0) return `${hours} ชม. ${minutes % 60} นาที`;
    if (minutes > 0) return `${minutes} นาที`;
    return `${seconds} วินาที`;
}

function viewFullImage(src, title = 'ตัวอย่างรูปภาพ', text = '') {
    if (!src || src === '#') return;
    Swal.fire({
        title: title,
        text: text,
        imageUrl: src,
        imageAlt: 'Full size image',
        confirmButtonText: 'ปิด',
        confirmButtonColor: '#198754',
        width: 'auto'
    });
}
