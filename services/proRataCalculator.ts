import { type LeaseParticipant } from '../types';
import { daysBetween } from './billing';

/**
 * Pro-rata Configuration
 */
export interface ProRataConfig {
    monthlyRent: number;
    participants: LeaseParticipant[];
    billingPeriod: {
        start: string;  // ISO date
        end: string;    // ISO date
    };
}

/**
 * Pro-rata Result for each participant
 */
export interface ProRataResult {
    tenantId: number;
    days: number;           // Số ngày ở
    rentShare: number;      // Phần tiền phòng phải trả
    ratio: number;          // Tỷ lệ % của tổng
}

/**
 * Helper: Get max date
 */
function maxDate(date1: string, date2: string): string {
    return date1 > date2 ? date1 : date2;
}

/**
 * Helper: Get min date
 */
function minDate(date1: string, date2: string): string {
    return date1 < date2 ? date1 : date2;
}

/**
 * Calculate pro-rata rent for each participant
 * 
 * Công thức:
 * 1. Tính tổng "person-days" (người-ngày)
 * 2. Giá 1 person-day = monthlyRent / totalPersonDays
 * 3. Mỗi người trả = days * pricePerPersonDay
 * 
 * @example
 * ```
 * Phòng 3.000.000đ, tháng 6 (30 ngày)
 * - Người A: 30 ngày
 * - Người B: 20 ngày (vào ngày 11)
 * - Người C: 10 ngày (vào ngày 21)
 * 
 * Total person-days: 60
 * Price per person-day: 50.000đ
 * 
 * Result:
 * - A: 30 × 50k = 1.500.000đ
 * - B: 20 × 50k = 1.000.000đ
 * - C: 10 × 50k =   500.000đ
 * Total: 3.000.000đ ✅
 * ```
 */
export function calculateProRataRent(config: ProRataConfig): ProRataResult[] {
    const { monthlyRent, participants, billingPeriod } = config;
    
    if (!participants || participants.length === 0) {
        return [];
    }
    
    // 1. Calculate total person-days
    let totalPersonDays = 0;
    
    const participantDays = participants.map(p => {
        // Start = max(joinDate, billingPeriod.start)
        const start = maxDate(p.joinDate, billingPeriod.start);
        
        // End = min(leaveDate or billingPeriod.end, billingPeriod.end)
        const end = p.leaveDate 
            ? minDate(p.leaveDate, billingPeriod.end)
            : billingPeriod.end;
        
        // Calculate days for this participant
        const days = daysBetween({ start, end });
        totalPersonDays += days;
        
        return { participant: p, days };
    });
    
    // Edge case: No days (shouldn't happen but handle it)
    if (totalPersonDays === 0) {
        return participants.map(p => ({
            tenantId: p.tenantId,
            days: 0,
            rentShare: 0,
            ratio: 0
        }));
    }
    
    // 2. Calculate price per person-day
    const pricePerPersonDay = monthlyRent / totalPersonDays;
    
    // 3. Calculate each person's share
    const results = participantDays.map(({ participant, days }) => ({
        tenantId: participant.tenantId,
        days,
        rentShare: Math.round(days * pricePerPersonDay),
        ratio: (days / totalPersonDays) * 100
    }));
    
    // 4. Adjust for rounding errors (ensure total = monthlyRent)
    const totalCalculated = results.reduce((sum, r) => sum + r.rentShare, 0);
    const diff = monthlyRent - totalCalculated;
    
    if (diff !== 0 && results.length > 0) {
        // Add difference to first person (usually primary tenant)
        results[0].rentShare += diff;
    }
    
    return results;
}

/**
 * Calculate pro-rata utilities (electric/water)
 * Simple approach: Split equally among ACTIVE participants in billing period
 * 
 * @param utilityCost - Total utility cost (electric or water)
 * @param participants - All participants
 * @param billingPeriod - Billing period
 * @returns Array of utility shares per tenant
 */
export function calculateProRataUtilities(
    utilityCost: number,
    participants: LeaseParticipant[],
    billingPeriod: { start: string, end: string }
): ProRataResult[] {
    if (!participants || participants.length === 0) {
        return [];
    }
    
    // Find active participants during billing period
    const activeParticipants = participants.filter(p => {
        // Check if participant was active during billing period
        const joinedBefore = p.joinDate <= billingPeriod.end;
        const leftAfter = !p.leaveDate || p.leaveDate >= billingPeriod.start;
        return joinedBefore && leftAfter;
    });
    
    if (activeParticipants.length === 0) {
        return [];
    }
    
    // Split equally
    const sharePerPerson = Math.round(utilityCost / activeParticipants.length);
    
    const results = activeParticipants.map((p, index) => ({
        tenantId: p.tenantId,
        days: 0,  // Not applicable for utilities
        rentShare: sharePerPerson,
        ratio: 100 / activeParticipants.length
    }));
    
    // Adjust for rounding
    const totalCalculated = results.reduce((sum, r) => sum + r.rentShare, 0);
    const diff = utilityCost - totalCalculated;
    
    if (diff !== 0 && results.length > 0) {
        results[0].rentShare += diff;
    }
    
    return results;
}

/**
 * Get active participants count for a specific period
 */
export function getActiveParticipantsCount(
    participants: LeaseParticipant[],
    billingPeriod: { start: string, end: string }
): number {
    if (!participants) return 0;
    
    return participants.filter(p => {
        const joinedBefore = p.joinDate <= billingPeriod.end;
        const leftAfter = !p.leaveDate || p.leaveDate >= billingPeriod.start;
        return joinedBefore && leftAfter;
    }).length;
}

/**
 * Check if a lease has multiple people (ở ghép)
 */
export function hasMultiplePeople(participants?: LeaseParticipant[]): boolean {
    return (participants?.length || 0) > 1;
}

/**
 * Get primary tenant from participants
 */
export function getPrimaryParticipant(participants?: LeaseParticipant[]): LeaseParticipant | undefined {
    return participants?.find(p => p.isPrimary);
}

/**
 * Get sub-tenants (người ở ghép) from participants
 */
export function getSubParticipants(participants?: LeaseParticipant[]): LeaseParticipant[] {
    return participants?.filter(p => !p.isPrimary) || [];
}

