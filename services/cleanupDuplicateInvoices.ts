/**
 * Cleanup Duplicate Invoices Script
 * Run in browser console: cleanupDuplicateInvoices()
 */

import { localDb } from './localStorageDb';

/**
 * Detect duplicate invoices by ID
 */
export const detectDuplicateInvoices = async () => {
    console.log('🔍 Detecting duplicate invoices...');
    
    const invoices = await localDb.getAllInvoices();
    
    const idCount = new Map<number, number>();
    
    for (const invoice of invoices) {
        const count = idCount.get(invoice.id) || 0;
        idCount.set(invoice.id, count + 1);
    }
    
    const duplicates = Array.from(idCount.entries())
        .filter(([_, count]) => count > 1)
        .map(([id, count]) => ({ id, count }));
    
    if (duplicates.length === 0) {
        console.log('✅ No duplicate invoices found!');
        return null;
    }
    
    console.log(`⚠️ Found ${duplicates.length} duplicate invoice IDs:`);
    duplicates.forEach(({ id, count }) => {
        console.log(`  - Invoice ID ${id}: ${count} copies`);
    });
    
    return duplicates;
};

/**
 * Remove duplicate invoices, keeping only the first occurrence of each ID
 */
export const removeDuplicateInvoices = async (duplicates: { id: number; count: number }[]) => {
    console.log('🗑️ Removing duplicate invoices...');
    
    const invoices = await localDb.getAllInvoices();
    
    // Track which IDs we've already kept
    const keptIds = new Set<number>();
    const idsToRemove: number[] = [];
    
    for (const invoice of invoices) {
        if (duplicates.some(d => d.id === invoice.id)) {
            if (keptIds.has(invoice.id)) {
                // This is a duplicate, mark for removal
                idsToRemove.push(invoice.id);
            } else {
                // This is the first occurrence, keep it
                keptIds.add(invoice.id);
            }
        }
    }
    
    // Remove duplicates (note: we can't actually remove by array position in localStorage,
    // so we need to reload and filter)
    console.log(`🗑️ Removing ${idsToRemove.length} duplicate entries...`);
    
    // For simplicity, we'll reload all invoices, dedupe, and save
    const uniqueInvoices = invoices.filter((invoice, index, self) => 
        self.findIndex(inv => inv.id === invoice.id) === index
    );
    
    // Save back to localStorage
    localStorage.setItem('nhatro_invoices', JSON.stringify(uniqueInvoices));
    
    console.log(`✅ Removed ${invoices.length - uniqueInvoices.length} duplicate invoices`);
    console.log(`📊 Invoices before: ${invoices.length}, after: ${uniqueInvoices.length}`);
    
    return uniqueInvoices.length;
};

/**
 * Main cleanup function
 * Usage: cleanupDuplicateInvoices() in browser console
 */
export const cleanupDuplicateInvoices = async () => {
    console.log('🧹 Starting duplicate invoice cleanup...');
    
    const duplicates = await detectDuplicateInvoices();
    
    if (!duplicates || duplicates.length === 0) {
        console.log('✅ Database is clean, no duplicates found!');
        return;
    }
    
    const confirmed = confirm(
        `⚠️ Found ${duplicates.length} duplicate invoice IDs.\n\n` +
        'Do you want to remove the duplicates?\n' +
        '(This will keep only the first occurrence of each invoice)'
    );
    
    if (!confirmed) {
        console.log('❌ Cleanup cancelled by user');
        return;
    }
    
    await removeDuplicateInvoices(duplicates);
    
    console.log('✅ Cleanup complete! Please refresh the page.');
    alert('✅ Duplicate invoices removed! Please refresh the page to see changes.');
};

// Expose to window for console access
if (typeof window !== 'undefined') {
    (window as any).cleanupDuplicateInvoices = cleanupDuplicateInvoices;
    console.log('💡 To clean up duplicate invoices, run: cleanupDuplicateInvoices()');
}

