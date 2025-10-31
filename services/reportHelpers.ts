import type { Invoice, Expense } from '../types';

/**
 * Period helpers
 */
export const getThisMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
};

export const getLastMonth = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonth.getFullYear();
    const month = (lastMonth.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
};

export const getThisQuarter = (): { start: string; end: string } => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const startMonth = quarter * 3 + 1;
    const endMonth = startMonth + 2;
    const year = now.getFullYear();
    
    return {
        start: `${year}-${startMonth.toString().padStart(2, '0')}`,
        end: `${year}-${endMonth.toString().padStart(2, '0')}`
    };
};

export const getThisYear = (): { start: string; end: string } => {
    const year = new Date().getFullYear();
    return {
        start: `${year}-01`,
        end: `${year}-12`
    };
};

/**
 * Get revenue statistics for a given period
 */
export const getRevenueByPeriod = (
    invoices: Invoice[],
    startPeriod: string,
    endPeriod: string
) => {
    const invoicesInPeriod = invoices.filter(inv => 
        inv.period >= startPeriod && inv.period <= endPeriod
    );

    const totalRevenue = invoicesInPeriod.reduce((sum, inv) => sum + inv.total, 0);
    const collected = invoicesInPeriod.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const pending = totalRevenue - collected;

    return {
        total: totalRevenue,
        collected,
        pending,
        count: invoicesInPeriod.length
    };
};

/**
 * Get expenses statistics for a given period
 */
export const getExpensesByPeriod = (
    expenses: Expense[],
    startDate: string,
    endDate: string
) => {
    const expensesInPeriod = expenses.filter(exp => {
        const expDate = exp.date.substring(0, 7); // YYYY-MM
        return expDate >= startDate && expDate <= endDate;
    });

    const totalExpenses = expensesInPeriod.reduce((sum, exp) => sum + exp.amount, 0);

    return {
        total: totalExpenses,
        count: expensesInPeriod.length,
        expenses: expensesInPeriod
    };
};

/**
 * Calculate net profit (revenue - expenses)
 */
export const calculateNetProfit = (
    revenue: number,
    expenses: number
): number => {
    return revenue - expenses;
};

/**
 * Get revenue breakdown by room for a given period
 */
export const getRevenueByRoom = (
    invoices: Invoice[],
    leases: any[],
    rooms: any[],
    startPeriod: string,
    endPeriod: string
) => {
    const invoicesInPeriod = invoices.filter(inv => 
        inv.period >= startPeriod && inv.period <= endPeriod
    );

    const roomStats = rooms.map(room => {
        const roomInvoices = invoicesInPeriod.filter(inv => {
            const lease = leases.find(l => l.id === inv.leaseId);
            return lease && lease.roomId === room.id;
        });

        const total = roomInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const collected = roomInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
        const pending = total - collected;

        return {
            roomId: room.id,
            roomName: room.name,
            total,
            collected,
            pending
        };
    });

    return roomStats.filter(stat => stat.total > 0); // Only rooms with revenue
};

/**
 * Get expenses breakdown by category for a given period
 */
export const getExpensesByCategory = (
    expenses: Expense[],
    startDate: string,
    endDate: string
) => {
    const expensesInPeriod = expenses.filter(exp => {
        const expDate = exp.date.substring(0, 7); // YYYY-MM
        return expDate >= startDate && expDate <= endDate;
    });

    const categoryStats: { [key: string]: number } = {};

    expensesInPeriod.forEach(exp => {
        if (!categoryStats[exp.category]) {
            categoryStats[exp.category] = 0;
        }
        categoryStats[exp.category] += exp.amount;
    });

    return Object.entries(categoryStats).map(([category, amount]) => ({
        category,
        amount
    }));
};

/**
 * Get monthly revenue data for chart (last 6 months)
 */
export const getMonthlyRevenueData = (invoices: Invoice[], months: number = 6) => {
    const now = new Date();
    const data = [];

    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const period = `${year}-${month}`;

        const monthInvoices = invoices.filter(inv => inv.period === period);
        const total = monthInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const collected = monthInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);

        data.push({
            period,
            label: `${month}/${year}`,
            total,
            collected
        });
    }

    return data;
};

/**
 * Format currency with abbreviation (e.g., 5.2M, 300K)
 */
export const formatCurrencyShort = (value: number): string => {
    if (value >= 1000000) {
        const millions = value / 1000000;
        return `${(Math.round(millions * 10) / 10)}M`;
    }
    if (value >= 1000) {
        return `${Math.round(value / 1000)}K`;
    }
    return value.toString();
};

/**
 * Get expense category display name
 */
export const getExpenseCategoryName = (category: string): string => {
    const names: { [key: string]: string } = {
        electric_shared: 'Điện chung',
        internet_shared: 'Internet chung',
        trash_shared: 'Rác chung',
        repair: 'Sửa chữa',
        other: 'Khác'
    };
    return names[category] || category;
};

/**
 * Get expense category icon
 */
export const getExpenseCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
        electric_shared: '⚡',
        internet_shared: '🌐',
        trash_shared: '🗑️',
        repair: '🔧',
        other: '📝'
    };
    return icons[category] || '📋';
};

/**
 * Get expense category colors
 */
export const getExpenseCategoryColors = (category: string): { bg: string; text: string } => {
    const colors: { [key: string]: { bg: string; text: string } } = {
        electric_shared: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
        internet_shared: { bg: 'bg-purple-50', text: 'text-purple-700' },
        trash_shared: { bg: 'bg-green-50', text: 'text-green-700' },
        repair: { bg: 'bg-orange-50', text: 'text-orange-700' },
        other: { bg: 'bg-slate-50', text: 'text-slate-700' }
    };
    return colors[category] || { bg: 'bg-slate-50', text: 'text-slate-700' };
};

