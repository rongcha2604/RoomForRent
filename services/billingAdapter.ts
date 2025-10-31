// billingAdapter.ts
// Bridge layer: Convert between App data structures and Billing library types

import {
    buildInvoice,
    type InvoiceDraft,
    type InvoiceResult,
    type Period,
    daysBetween
} from './billing';
import { type Invoice, type Lease, type Reading, type Meter, type Room } from '../types';

interface CreateInvoiceDraftParams {
    lease: Lease;
    room: Room;
    period: Period;
    electricMeter?: Meter;
    waterMeter?: Meter;
    prevElectricReading?: Reading;
    currElectricReading?: Reading;
    prevWaterReading?: Reading;
    currWaterReading?: Reading;
}

/**
 * Convert app data to billing InvoiceDraft format
 */
export function createInvoiceDraft(params: CreateInvoiceDraftParams): InvoiceDraft {
    const {
        lease,
        room,
        period,
        electricMeter,
        waterMeter,
        prevElectricReading,
        currElectricReading,
        prevWaterReading,
        currWaterReading
    } = params;

    const draft: InvoiceDraft = {
        roomId: room.id.toString(),
        period,
        monthlyRent: lease.monthlyRent,
        surcharges: [],
        roundingTo: 1000
    };

    // Add utilities if meters and readings exist
    if (electricMeter && prevElectricReading && currElectricReading) {
        if (!draft.utilities) draft.utilities = {};
        draft.utilities.kwh = {
            prev: prevElectricReading.value,
            curr: currElectricReading.value,
            rate: electricMeter.unitPrice
        };
    }

    if (waterMeter && prevWaterReading && currWaterReading) {
        if (!draft.utilities) draft.utilities = {};
        draft.utilities.m3 = {
            prev: prevWaterReading.value,
            curr: currWaterReading.value,
            rate: waterMeter.unitPrice
        };
    }

    // Add wifi and trash as surcharges
    if (lease.wifiFee > 0) {
        draft.surcharges!.push({
            code: 'WIFI',
            note: 'Phí wifi',
            amount: lease.wifiFee
        });
    }

    if (lease.trashFee > 0) {
        draft.surcharges!.push({
            code: 'TRASH',
            note: 'Phí rác',
            amount: lease.trashFee
        });
    }

    return draft;
}

/**
 * Convert billing InvoiceResult to app Invoice format
 */
export function convertToAppInvoice(
    result: InvoiceResult,
    leaseId: number,
    period: string
): Omit<Invoice, 'id'> {
    // Extract lines
    const rentLine = result.lines.find(l => l.code === 'RENT');
    const electricLine = result.lines.find(l => l.code === 'ELEC');
    const waterLine = result.lines.find(l => l.code === 'WATER');
    
    // Calculate other fees (wifi + trash + any other surcharges)
    const otherFees = result.lines
        .filter(l => !['RENT', 'ELEC', 'WATER'].includes(l.code))
        .reduce((sum, line) => sum + line.amount, 0);

    return {
        leaseId,
        period,
        rent: rentLine?.amount || 0,
        electricUsage: electricLine?.qty,
        electricCost: electricLine?.amount,
        waterUsage: waterLine?.qty,
        waterCost: waterLine?.amount,
        otherFees,
        total: result.total,
        amountPaid: 0, // New invoices start with 0 paid
        status: 'unpaid'
    };
}

/**
 * Helper: Create period from YYYY-MM string
 * Returns full month period by default
 */
export function createPeriodFromMonth(periodStr: string): Period {
    const [year, month] = periodStr.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1)); // First day of next month
    
    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10)
    };
}

/**
 * Helper: Create period for mid-month entry
 * If lease started mid-month, calculate from startDate to end of month
 */
export function createPeriodForNewLease(lease: Lease, periodStr: string): Period {
    // Parse lease start date with UTC to avoid timezone issues
    const leaseStart = new Date(lease.startDate + 'T00:00:00');
    const [year, month] = periodStr.split('-').map(Number);
    
    // Check if lease started this month (compare UTC dates)
    const leaseYear = leaseStart.getUTCFullYear();
    const leaseMonth = leaseStart.getUTCMonth() + 1; // getUTCMonth() returns 0-11
    
    if (leaseYear === year && leaseMonth === month) {
        // Pro-rate from lease start to end of month
        const end = new Date(Date.UTC(year, month, 1)); // First day of next month (exclusive)
        
        return {
            start: lease.startDate, // Use original lease.startDate to preserve exact date
            end: end.toISOString().slice(0, 10)
        };
    }
    
    // Otherwise, full month
    return createPeriodFromMonth(periodStr);
}

/**
 * Helper: Format period for display
 */
export function formatPeriod(period: Period): string {
    const days = daysBetween(period);
    const start = new Date(period.start).toLocaleDateString('vi-VN');
    const end = new Date(period.end);
    end.setDate(end.getDate() - 1); // Exclusive end, so display -1 day
    const endStr = end.toLocaleDateString('vi-VN');
    
    return `${start} → ${endStr} (${days} ngày)`;
}

/**
 * Helper: Check if period is full month
 */
export function isFullMonth(period: Period): boolean {
    const start = new Date(period.start);
    const end = new Date(period.end);
    
    // Check if start is 1st day of month
    if (start.getUTCDate() !== 1) return false;
    
    // Check if end is 1st day of next month
    const nextMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    
    return end.getTime() === nextMonth.getTime();
}

