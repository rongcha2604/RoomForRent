/**
 * Backup Reminder Utilities
 * Nhắc nhở user backup data định kỳ
 */

const LAST_BACKUP_KEY = 'nhatro_last_backup_date';
const BACKUP_REMINDER_DAYS = 7; // Nhắc sau 7 ngày

/**
 * Lưu thời điểm backup cuối cùng
 */
export function setLastBackupDate(): void {
    try {
        const now = new Date().toISOString();
        localStorage.setItem(LAST_BACKUP_KEY, now);
        console.log('✅ Last backup date saved:', now);
    } catch (error) {
        console.error('Error saving last backup date:', error);
    }
}

/**
 * Lấy thời điểm backup cuối cùng
 */
export function getLastBackupDate(): Date | null {
    try {
        const dateStr = localStorage.getItem(LAST_BACKUP_KEY);
        if (!dateStr) return null;
        return new Date(dateStr);
    } catch (error) {
        console.error('Error getting last backup date:', error);
        return null;
    }
}

/**
 * Tính số ngày từ lần backup cuối
 */
export function getDaysSinceLastBackup(): number {
    const lastBackup = getLastBackupDate();
    if (!lastBackup) return Infinity; // Chưa bao giờ backup
    
    const now = new Date();
    const diffTime = now.getTime() - lastBackup.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

/**
 * Kiểm tra có cần nhắc backup không
 */
export function shouldShowBackupReminder(): boolean {
    const daysSinceBackup = getDaysSinceLastBackup();
    return daysSinceBackup >= BACKUP_REMINDER_DAYS;
}

/**
 * Format số ngày thành text
 */
export function formatDaysSinceBackup(): string {
    const days = getDaysSinceLastBackup();
    
    if (days === Infinity) {
        return 'Chưa bao giờ backup';
    }
    
    if (days === 0) {
        return 'Hôm nay';
    }
    
    if (days === 1) {
        return 'Hôm qua';
    }
    
    if (days < 30) {
        return `${days} ngày trước`;
    }
    
    const months = Math.floor(days / 30);
    if (months < 12) {
        return `${months} tháng trước`;
    }
    
    const years = Math.floor(days / 365);
    return `${years} năm trước`;
}

/**
 * Lấy thông tin backup status
 */
export function getBackupStatus(): {
    lastBackup: Date | null;
    daysSince: number;
    shouldRemind: boolean;
    statusText: string;
    isHealthy: boolean;
} {
    const lastBackup = getLastBackupDate();
    const daysSince = getDaysSinceLastBackup();
    const shouldRemind = shouldShowBackupReminder();
    const statusText = formatDaysSinceBackup();
    const isHealthy = daysSince < BACKUP_REMINDER_DAYS;
    
    return {
        lastBackup,
        daysSince,
        shouldRemind,
        statusText,
        isHealthy
    };
}
