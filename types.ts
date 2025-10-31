
export type View = 'dashboard' | 'rooms' | 'invoices' | 'tenants' | 'settings' | 'reports';
export type ModalType = 'addReading' | 'addTenant' | 'addMaintenance' | 'generateInvoices' | 'addLease' | 'editLease' | 'addRoom' | 'editRoom' | 'roomDetail' | 'editTenant' | 'addSubTenant' | 'partialPayment' | 'addExpense' | 'editExpense' | 'setupSecurity' | 'verifyPassword';

export interface Room {
  id: number;
  name: string;
  baseRent: number;
  deposit: number;
  note?: string;
  isActive: boolean;
}

export interface Tenant {
  id: number;
  fullName: string;
  phone?: string;
  idNumber?: string;
  note?: string;
}

// Người tham gia thuê (chính + ở ghép)
export interface LeaseParticipant {
  tenantId: number;
  joinDate: string;      // ISO date: Ngày vào
  leaveDate?: string;    // ISO date: Ngày ra (undefined = còn ở)
  isPrimary: boolean;    // Người thuê chính hay người ở ghép
}

export interface Lease {
  id: number;
  roomId: number;
  tenantId: number;          // DEPRECATED: Giữ để backward compatibility
  participants?: LeaseParticipant[];  // NEW: Danh sách người ở (chính + ghép)
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  monthlyRent: number;
  wifiFee: number;
  trashFee: number;
  deposit: number; // Tiền cọc (có thể khác room.deposit)
  numberOfPeople?: number;   // NEW: Tổng số người (auto-calculate)
  paymentMode?: 'advance' | 'deposit'; // NEW: Kiểu thanh toán (Đóng trước vs Cọc cố định)
  status: 'active' | 'inactive';
}

export interface Meter {
  id: number;
  roomId: number;
  type: 'electric' | 'water';
  unitPrice: number;
}

export interface Reading {
  id: number;
  meterId: number;
  period: string; // "YYYY-MM"
  value: number;
}

export interface Invoice {
  id: number;
  leaseId: number;
  period: string; // "YYYY-MM"
  rent: number;
  electricUsage?: number;
  electricCost?: number;
  waterUsage?: number;
  waterCost?: number;
  otherFees: number;
  total: number;
  amountPaid: number; // Số tiền đã trả (0 = chưa trả, < total = nợ 1 phần, >= total = đã trả đủ)
  status: 'unpaid' | 'partial' | 'paid';
}

export interface Maintenance {
  id: number;
  roomId: number;
  title: string;
  cost: number;
  payer: 'owner' | 'tenant';
  status: 'open' | 'closed';
  date: string; // ISO date string
}

export interface Settings {
    electricPrice: number;
    waterPrice: number;
    wifiPrice: number;
    trashPrice: number;
    defaultPaymentMode?: 'advance' | 'deposit'; // NEW: Phương thức thanh toán mặc định
}

export type ExpenseCategory = 'electric_shared' | 'internet_shared' | 'trash_shared' | 'repair' | 'other';

export interface Expense {
    id: number;
    category: ExpenseCategory;
    amount: number;
    date: string; // ISO date string (YYYY-MM-DD)
    period: string; // "YYYY-MM" - Tháng phát sinh chi phí
    description: string;
    isRecurring: boolean; // Chi phí cố định hàng tháng
    roomId?: number; // Optional: if expense is for specific room
    note?: string;
}

export interface SecuritySettings {
    isSetup: boolean;
    passwordHash: string; // SHA-256 hash
    securityQuestion: string;
    securityAnswerHash: string; // SHA-256 hash
}
