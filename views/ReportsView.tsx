import React, { useState, useMemo } from 'react';
import { useAppData } from '../hooks/useAppData';
import Header from '../components/Header';
import SimpleLineChart from '../components/SimpleLineChart';
import SimplePieChart from '../components/SimplePieChart';
import AddExpenseModal from '../components/modals/AddExpenseModal';
import type { View, Expense } from '../types';
import {
    getThisMonth,
    getLastMonth,
    getThisQuarter,
    getThisYear,
    getRevenueByPeriod,
    getExpensesByPeriod,
    calculateNetProfit,
    getRevenueByRoom,
    getExpensesByCategory,
    getMonthlyRevenueData,
    formatCurrencyShort,
    getExpenseCategoryIcon,
    getExpenseCategoryName,
    getExpenseCategoryColors
} from '../services/reportHelpers';

interface ReportsViewProps {
    setActiveView: (view: View) => void;
    currentView: View;
}

type PeriodFilter = 'this_month' | 'last_month' | 'this_quarter' | 'this_year';
type Tab = 'revenue' | 'expenses';

const ReportsView: React.FC<ReportsViewProps> = ({ setActiveView, currentView }) => {
    const { rooms, leases, invoices, expenses, deleteExpense } = useAppData();
    const [activeTab, setActiveTab] = useState<Tab>('revenue');
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month');
    const [expenseModal, setExpenseModal] = useState<{ mode: 'add' | 'edit'; expense?: Expense } | null>(null);
    const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');

    // Calculate period range based on filter
    const { startPeriod, endPeriod } = useMemo(() => {
        switch (periodFilter) {
            case 'this_month':
                const thisMonth = getThisMonth();
                return { startPeriod: thisMonth, endPeriod: thisMonth };
            case 'last_month':
                const lastMonth = getLastMonth();
                return { startPeriod: lastMonth, endPeriod: lastMonth };
            case 'this_quarter':
                const quarter = getThisQuarter();
                return { startPeriod: quarter.start, endPeriod: quarter.end };
            case 'this_year':
                const year = getThisYear();
                return { startPeriod: year.start, endPeriod: year.end };
            default:
                return { startPeriod: getThisMonth(), endPeriod: getThisMonth() };
        }
    }, [periodFilter]);

    // Revenue statistics
    const revenueStats = useMemo(() => {
        return getRevenueByPeriod(invoices, startPeriod, endPeriod);
    }, [invoices, startPeriod, endPeriod]);

    // Deduplicate expenses (in case of DB duplicates)
    const uniqueExpenses = useMemo(() => {
        const seen = new Set<number>();
        return expenses.filter(expense => {
            if (seen.has(expense.id)) {
                return false; // Skip duplicate
            }
            seen.add(expense.id);
            return true;
        });
    }, [expenses]);
    
    // Expense statistics
    const expenseStats = useMemo(() => {
        return getExpensesByPeriod(uniqueExpenses, startPeriod, endPeriod);
    }, [uniqueExpenses, startPeriod, endPeriod]);

    // Net profit
    const netProfit = useMemo(() => {
        return calculateNetProfit(revenueStats.collected, expenseStats.total);
    }, [revenueStats, expenseStats]);

    // Revenue by room
    const revenueByRoom = useMemo(() => {
        return getRevenueByRoom(invoices, leases, rooms, startPeriod, endPeriod);
    }, [invoices, leases, rooms, startPeriod, endPeriod]);

    // Monthly chart data
    const monthlyChartData = useMemo(() => {
        return getMonthlyRevenueData(invoices, 6);
    }, [invoices]);

    // Expenses by category (for pie chart)
    const expensesByCategory = useMemo(() => {
        return getExpensesByCategory(uniqueExpenses, startPeriod, endPeriod);
    }, [uniqueExpenses, startPeriod, endPeriod]);

    // Filtered expenses for list
    const filteredExpenses = useMemo(() => {
        let filtered = expenseStats.expenses;

        if (expenseCategoryFilter !== 'all') {
            filtered = filtered.filter(exp => exp.category === expenseCategoryFilter);
        }

        return filtered.sort((a, b) => b.date.localeCompare(a.date)); // Newest first
    }, [expenseStats, expenseCategoryFilter]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const handleDeleteExpense = async (id: number) => {
        if (!confirm('❌ Xác nhận xóa chi phí này?')) return;

        try {
            await deleteExpense(id);
            alert('✅ Đã xóa chi phí!');
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('❌ Có lỗi khi xóa chi phí!');
        }
    };

    return (
        <div>
            <Header title="Báo cáo & Phân tích" />

            <div className="p-3 space-y-3">
                {/* Tabs */}
                <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('revenue')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                            activeTab === 'revenue' ? 'bg-white shadow text-slate-800' : 'text-slate-600'
                        }`}
                    >
                        📊 Doanh thu
                    </button>
                    <button
                        onClick={() => setActiveTab('expenses')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                            activeTab === 'expenses' ? 'bg-white shadow text-slate-800' : 'text-slate-600'
                        }`}
                    >
                        💸 Chi phí
                    </button>
                </div>

                {/* Revenue Tab */}
                {activeTab === 'revenue' && (
                    <div className="space-y-3">
                        {/* Period Filter */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Khoảng thời gian:</label>
                            <select
                                value={periodFilter}
                                onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="this_month">Tháng này</option>
                                <option value="last_month">Tháng trước</option>
                                <option value="this_quarter">Quý này</option>
                                <option value="this_year">Năm nay</option>
                            </select>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Total Revenue */}
                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                                <p className="text-xs text-blue-700 font-semibold mb-1">📊 Tổng thu</p>
                                <p className="text-lg font-bold text-blue-800">{formatCurrencyShort(revenueStats.total)}</p>
                                <p className="text-[10px] text-blue-600 mt-0.5">{formatCurrency(revenueStats.total)}</p>
                            </div>

                            {/* Collected */}
                            <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                                <p className="text-xs text-green-700 font-semibold mb-1">✅ Đã thu</p>
                                <p className="text-lg font-bold text-green-800">{formatCurrencyShort(revenueStats.collected)}</p>
                                <p className="text-[10px] text-green-600 mt-0.5">{formatCurrency(revenueStats.collected)}</p>
                            </div>

                            {/* Pending */}
                            <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
                                <p className="text-xs text-orange-700 font-semibold mb-1">⏳ Còn nợ</p>
                                <p className="text-lg font-bold text-orange-800">{formatCurrencyShort(revenueStats.pending)}</p>
                                <p className="text-[10px] text-orange-600 mt-0.5">{formatCurrency(revenueStats.pending)}</p>
                            </div>

                            {/* Total Expenses */}
                            <div className="bg-red-50 p-3 rounded-xl border border-red-200">
                                <p className="text-xs text-red-700 font-semibold mb-1">💸 Tổng chi</p>
                                <p className="text-lg font-bold text-red-800">{formatCurrencyShort(expenseStats.total)}</p>
                                <p className="text-[10px] text-red-600 mt-0.5">{formatCurrency(expenseStats.total)}</p>
                            </div>
                        </div>
                        
                        {/* Net Profit Card - Full width */}
                        <div className={`p-4 rounded-xl border shadow-md ${netProfit >= 0 ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200' : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <p className={`text-sm font-bold ${netProfit >= 0 ? 'text-purple-800' : 'text-red-800'}`}>
                                    💰 Lợi nhuận ròng (Net Profit)
                                </p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${netProfit >= 0 ? 'bg-purple-200 text-purple-800' : 'bg-red-200 text-red-800'}`}>
                                    {netProfit >= 0 ? '📈 Lãi' : '📉 Lỗ'}
                                </span>
                            </div>
                            <p className={`text-2xl font-bold mb-2 ${netProfit >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                                {formatCurrencyShort(netProfit)}
                            </p>
                            <div className={`text-xs ${netProfit >= 0 ? 'text-purple-700' : 'text-red-700'} space-y-0.5`}>
                                <p>Doanh thu đã thu: {formatCurrency(revenueStats.collected)}</p>
                                <p>Chi phí: {formatCurrency(expenseStats.total)}</p>
                                <div className="border-t border-current opacity-50 my-1"></div>
                                <p className="font-semibold">= {formatCurrency(netProfit)}</p>
                            </div>
                        </div>

                        {/* Chart */}
                        <SimpleLineChart data={monthlyChartData} />

                        {/* Revenue by Room */}
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">📋 Chi tiết theo phòng</h3>
                            {revenueByRoom.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">Chưa có dữ liệu</p>
                            ) : (
                                <div className="space-y-2">
                                    {revenueByRoom.map((stat) => (
                                        <div key={stat.roomId} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                            <span className="text-sm font-semibold text-slate-800">{stat.roomName}</span>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-800">{formatCurrency(stat.total)}</p>
                                                <p className="text-xs text-green-600">Đã thu: {formatCurrency(stat.collected)}</p>
                                                {stat.pending > 0 && (
                                                    <p className="text-xs text-orange-600">Nợ: {formatCurrency(stat.pending)}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Expenses Tab */}
                {activeTab === 'expenses' && (
                    <div className="space-y-3">
                        {/* Add Button */}
                        <button
                            onClick={() => setExpenseModal({ mode: 'add' })}
                            className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                            ➕ Thêm chi phí
                        </button>

                        {/* Filters */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Danh mục:</label>
                                <select
                                    value={expenseCategoryFilter}
                                    onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="electric_shared">⚡ Điện chung</option>
                                    <option value="internet_shared">🌐 Internet chung</option>
                                    <option value="trash_shared">🗑️ Rác chung</option>
                                    <option value="repair">🔧 Sửa chữa</option>
                                    <option value="other">📝 Khác</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Thời gian:</label>
                                <select
                                    value={periodFilter}
                                    onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="this_month">Tháng này</option>
                                    <option value="last_month">Tháng trước</option>
                                    <option value="this_quarter">Quý này</option>
                                    <option value="this_year">Năm nay</option>
                                </select>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Total Expenses */}
                            <div className="bg-red-50 p-3 rounded-xl border border-red-200">
                                <p className="text-xs text-red-700 font-semibold mb-1">💸 Tổng chi</p>
                                <p className="text-lg font-bold text-red-800">{formatCurrencyShort(expenseStats.total)}</p>
                                <p className="text-[10px] text-red-600 mt-0.5">{formatCurrency(expenseStats.total)}</p>
                            </div>
                            
                            {/* Count */}
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <p className="text-xs text-slate-700 font-semibold mb-1">📋 Số lượng</p>
                                <p className="text-lg font-bold text-slate-800">{expenseStats.count}</p>
                                <p className="text-[10px] text-slate-600 mt-0.5">chi phí</p>
                            </div>
                            
                            {/* Revenue */}
                            <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                                <p className="text-xs text-green-700 font-semibold mb-1">✅ Đã thu</p>
                                <p className="text-lg font-bold text-green-800">{formatCurrencyShort(revenueStats.collected)}</p>
                                <p className="text-[10px] text-green-600 mt-0.5">{formatCurrency(revenueStats.collected)}</p>
                            </div>
                            
                            {/* Net Profit - compact */}
                            <div className={`p-3 rounded-xl border ${netProfit >= 0 ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
                                <p className={`text-xs font-semibold mb-1 ${netProfit >= 0 ? 'text-purple-700' : 'text-red-700'}`}>💰 Lợi nhuận</p>
                                <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-purple-800' : 'text-red-800'}`}>
                                    {formatCurrencyShort(netProfit)}
                                </p>
                                <p className={`text-[10px] mt-0.5 ${netProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                                    {netProfit >= 0 ? '📈 Lãi' : '📉 Lỗ'}
                                </p>
                            </div>
                        </div>

                        {/* Pie Chart */}
                        {expensesByCategory.length > 0 && (
                            <SimplePieChart data={expensesByCategory} />
                        )}

                        {/* Expense List */}
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">📋 Danh sách chi phí</h3>
                            {filteredExpenses.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">Chưa có chi phí</p>
                            ) : (
                                <div className="space-y-2">
                                    {filteredExpenses.map((expense) => {
                                        const colors = getExpenseCategoryColors(expense.category);
                                        const room = expense.roomId ? rooms.find(r => r.id === expense.roomId) : null;
                                        
                                        return (
                                            <div key={expense.id} className={`p-3 rounded-lg border ${colors.bg} border-slate-200`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <span className="text-base">{getExpenseCategoryIcon(expense.category)}</span>
                                                            <span className={`text-xs font-semibold ${colors.text}`}>
                                                                {getExpenseCategoryName(expense.category)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-800">{expense.description}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {new Date(expense.date).toLocaleDateString('vi-VN')}
                                                            {room && ` • ${room.name}`}
                                                        </p>
                                                    </div>
                                                    <div className="text-right ml-2">
                                                        <p className="text-sm font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                                                    </div>
                                                </div>
                                                {expense.note && (
                                                    <p className="text-xs text-slate-600 mt-1 italic">💬 {expense.note}</p>
                                                )}
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={() => setExpenseModal({ mode: 'edit', expense })}
                                                        className="flex-1 text-xs py-1.5 bg-blue-100 text-blue-700 rounded-md font-semibold hover:bg-blue-200 transition-colors"
                                                    >
                                                        ✏️ Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteExpense(expense.id)}
                                                        className="flex-1 text-xs py-1.5 bg-red-100 text-red-700 rounded-md font-semibold hover:bg-red-200 transition-colors"
                                                    >
                                                        🗑️ Xóa
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Expense Modal */}
            {expenseModal && (
                <AddExpenseModal
                    expense={expenseModal.expense}
                    onClose={() => setExpenseModal(null)}
                />
            )}
        </div>
    );
};

export default ReportsView;

