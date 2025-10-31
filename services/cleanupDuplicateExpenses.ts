import { localDb } from './localStorageDb';

/**
 * Cleanup duplicate expenses in localStorage
 * Keeps the first occurrence of each expense ID
 */
async function cleanupDuplicateExpenses() {
    try {
        const allExpenses = await localDb.getAllExpenses();
        
        console.log('🔍 Checking for duplicate expenses...');
        console.log(`Total expenses: ${allExpenses.length}`);
        
        // Find duplicates
        const seen = new Map<number, any>();
        const duplicates: any[] = [];
        
        allExpenses.forEach(expense => {
            if (seen.has(expense.id)) {
                duplicates.push(expense);
                console.log(`⚠️ Found duplicate expense ID ${expense.id}:`, {
                    first: seen.get(expense.id),
                    duplicate: expense
                });
            } else {
                seen.set(expense.id, expense);
            }
        });
        
        if (duplicates.length === 0) {
            console.log('✅ No duplicate expenses found!');
            return;
        }
        
        console.log(`🗑️ Found ${duplicates.length} duplicate expense(s)`);
        
        // Ask for confirmation
        const confirm = window.confirm(
            `Tìm thấy ${duplicates.length} chi phí bị trùng lặp.\n\n` +
            `Bạn có muốn xóa các bản sao và chỉ giữ lại bản gốc?\n\n` +
            `⚠️ Hành động này KHÔNG THỂ HOÀN TÁC!`
        );
        
        if (!confirm) {
            console.log('❌ User cancelled cleanup');
            return;
        }
        
        // Get unique expenses (keep first occurrence)
        const uniqueExpenses = Array.from(seen.values());
        
        // Direct access to localStorage to replace data
        const STORAGE_KEY = 'nhatro_data';
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            console.error('❌ No data found in localStorage');
            return;
        }
        
        const data = JSON.parse(stored);
        const oldCount = data.expenses?.length || 0;
        data.expenses = uniqueExpenses;
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        console.log('✅ Cleanup completed!');
        console.log(`📊 Before: ${oldCount} expenses`);
        console.log(`📊 After: ${uniqueExpenses.length} expenses`);
        console.log(`🗑️ Removed: ${duplicates.length} duplicates`);
        
        alert(
            `✅ Đã xóa ${duplicates.length} chi phí trùng lặp!\n\n` +
            `Trước: ${oldCount} chi phí\n` +
            `Sau: ${uniqueExpenses.length} chi phí\n\n` +
            `Vui lòng F5 để tải lại dữ liệu.`
        );
        
        // Reload page
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        alert('❌ Có lỗi xảy ra khi dọn dẹp dữ liệu!');
    }
}

// Make it globally available
(window as any).cleanupDuplicateExpenses = cleanupDuplicateExpenses;

// Log hint on import
console.log('💡 To clean up duplicate expenses, run: cleanupDuplicateExpenses()');

export { cleanupDuplicateExpenses };

