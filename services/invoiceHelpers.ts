// invoiceHelpers.ts
// Helper functions for invoice operations

import { type Invoice, type Reading, type Lease, type Meter } from '../types';

/**
 * Get the last invoice for a specific lease
 */
export function getLastInvoice(
    leaseId: number,
    invoices: Invoice[]
): Invoice | undefined {
    return invoices
        .filter(inv => inv.leaseId === leaseId)
        .sort((a, b) => b.period.localeCompare(a.period))[0];
}

/**
 * Get the last reading for a specific meter (from all readings)
 * ⚠️ WARNING: This may not be accurate for invoicing!
 * Use getLastReadingFromInvoice instead for invoice calculations
 */
export function getLastReading(
    meterId: number,
    readings: Reading[]
): Reading | undefined {
    return readings
        .filter(r => r.meterId === meterId)
        .sort((a, b) => {
            // Sort by period desc, then by id desc
            const periodCompare = b.period.localeCompare(a.period);
            if (periodCompare !== 0) return periodCompare;
            return b.id - a.id;
        })[0];
}

/**
 * Get the last reading from the last invoice (CORRECT for invoice calculations)
 * This is the reading that was used in the most recent invoice
 */
export function getLastReadingFromInvoice(
    leaseId: number,
    meterId: number | undefined,
    invoices: Invoice[],
    readings: Reading[]
): Reading | undefined {
    if (!meterId) return undefined;
    
    // Get last invoice for this lease
    const lastInvoice = getLastInvoice(leaseId, invoices);
    if (!lastInvoice) return undefined;
    
    // Find reading from that invoice period
    const reading = readings.find(
        r => r.meterId === meterId && r.period === lastInvoice.period
    );
    
    return reading;
}

/**
 * Get next day from a date string (for period start)
 */
export function getNextDay(dateStr: string): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
}

/**
 * Get last day of month from YYYY-MM format
 */
export function getLastDayOfMonth(periodStr: string): string {
    const [year, month] = periodStr.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
}

/**
 * Get period start date for next invoice
 * If last invoice exists, start from next day
 * Otherwise, start from lease start date
 */
export function getNextInvoicePeriodStart(
    lease: Lease,
    invoices: Invoice[]
): string {
    const lastInvoice = getLastInvoice(lease.id, invoices);
    
    if (lastInvoice) {
        // Start from the day after last invoice period
        const lastDay = getLastDayOfMonth(lastInvoice.period);
        return getNextDay(lastDay);
    }
    
    // No invoice yet, start from lease start date
    return lease.startDate;
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
    }).format(value);
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('vi-VN');
}

/**
 * Get period string (YYYY-MM) from date
 */
export function getPeriodString(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Check if lease has unpaid invoices
 */
export function hasUnpaidInvoices(
    leaseId: number,
    invoices: Invoice[]
): boolean {
    return invoices.some(inv => 
        inv.leaseId === leaseId && inv.status === 'unpaid'
    );
}

/**
 * Get count of unpaid invoices
 */
export function getUnpaidInvoiceCount(
    leaseId: number,
    invoices: Invoice[]
): number {
    return invoices.filter(inv => 
        inv.leaseId === leaseId && inv.status === 'unpaid'
    ).length;
}

/**
 * Calculate total unpaid amount
 */
export function getTotalUnpaidAmount(
    leaseId: number,
    invoices: Invoice[]
): number {
    return invoices
        .filter(inv => inv.leaseId === leaseId && inv.status === 'unpaid')
        .reduce((sum, inv) => sum + inv.total, 0);
}

