// cleanupDuplicates.ts
// Utility to clean up duplicate tenants from database
// Run this once to fix existing duplicate data

import { localDb } from './localStorageDb';

interface DuplicateInfo {
    key: string; // fullName + phone
    ids: number[];
    count: number;
}

export async function detectDuplicateTenants() {
    const tenants = await localDb.getAllTenants();
    
    const groupedByKey = new Map<string, number[]>();
    
    tenants.forEach(tenant => {
        const key = `${tenant.fullName.toLowerCase()}_${tenant.phone || 'no-phone'}`;
        const existing = groupedByKey.get(key) || [];
        groupedByKey.set(key, [...existing, tenant.id]);
    });
    
    const duplicates: DuplicateInfo[] = [];
    
    groupedByKey.forEach((ids, key) => {
        if (ids.length > 1) {
            duplicates.push({ key, ids, count: ids.length });
        }
    });
    
    return duplicates;
}

export async function removeDuplicateTenants() {
    const tenants = await localDb.getAllTenants();
    const duplicates = await detectDuplicateTenants();
    
    if (duplicates.length === 0) {
        console.log('✅ No duplicates found!');
        return { removed: 0, kept: 0 };
    }
    
    console.log(`Found ${duplicates.length} groups of duplicates`);
    
    const idsToRemove = new Set<number>();
    
    // For each duplicate group, keep the first (oldest) and remove others
    duplicates.forEach(dup => {
        const [keepId, ...removeIds] = dup.ids.sort((a, b) => a - b);
        removeIds.forEach(id => idsToRemove.add(id));
        console.log(`Keeping ID ${keepId}, removing: ${removeIds.join(', ')}`);
    });
    
    // Delete duplicates one by one
    for (const id of idsToRemove) {
        await localDb.deleteTenant(id);
    }
    
    const remainingTenants = tenants.filter(tenant => !idsToRemove.has(tenant.id));
    
    console.log(`✅ Removed ${idsToRemove.size} duplicate tenants`);
    console.log(`✅ Kept ${remainingTenants.length} unique tenants`);
    
    return {
        removed: idsToRemove.size,
        kept: remainingTenants.length
    };
}

// Console helper - User can run this in browser console
(window as any).cleanupDuplicateTenants = async () => {
    console.log('🔍 Detecting duplicate tenants...');
    const duplicates = await detectDuplicateTenants();
    
    if (duplicates.length === 0) {
        console.log('✅ No duplicates found!');
        return;
    }
    
    console.log(`⚠️ Found ${duplicates.length} groups of duplicates:`);
    duplicates.forEach(dup => {
        console.log(`  - ${dup.key}: ${dup.count} copies (IDs: ${dup.ids.join(', ')})`);
    });
    
    const confirm = window.confirm(
        `Phát hiện ${duplicates.length} nhóm người thuê bị trùng lặp.\n\n` +
        `Xóa ${duplicates.map(d => d.count - 1).reduce((a, b) => a + b, 0)} bản sao?\n\n` +
        `(Sẽ giữ lại bản cũ nhất của mỗi người)`
    );
    
    if (!confirm) {
        console.log('❌ Cancelled');
        return;
    }
    
    const result = await removeDuplicateTenants();
    alert(`✅ Đã xóa ${result.removed} người thuê trùng lặp!\n\nGiữ lại ${result.kept} người duy nhất.`);
    
    // Reload page to update UI
    window.location.reload();
};

console.log('💡 To clean up duplicate tenants, run: cleanupDuplicateTenants()');

