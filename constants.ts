
import { type Room, type Tenant, type Lease, type Meter, type Reading, type Invoice, type Maintenance, type Settings } from './types';

export const PRIMARY_COLOR = '#40BFC1'; // Soft teal

export const INITIAL_ROOMS: Room[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: `Phòng ${String(i + 1).padStart(2, '0')}`,
  baseRent: 1800000,
  deposit: 1800000,
  isActive: true,
}));

export const INITIAL_TENANTS: Tenant[] = [
  { id: 1, fullName: 'Nguyễn Văn An', phone: '0901234567', idNumber: '123456789' },
  { id: 2, fullName: 'Trần Thị Bình', phone: '0902345678', idNumber: '234567890' },
  { id: 3, fullName: 'Lê Hoàng Cường', phone: '0903456789', idNumber: '345678901' },
  { id: 4, fullName: 'Phạm Mỹ Duyên', phone: '0904567890', idNumber: '456789012' },
  { id: 5, fullName: 'Võ Thành Long', phone: '0915678901', idNumber: '567890123' },
  { id: 6, fullName: 'Đỗ Thị Ngọc', phone: '0916789012', idNumber: '678901234' },
];

export const INITIAL_LEASES: Lease[] = [
  { id: 1, roomId: 1, tenantId: 1, startDate: '2023-01-15', monthlyRent: 2500000, wifiFee: 100000, trashFee: 30000, deposit: 1700000, status: 'active' },
  { id: 2, roomId: 2, tenantId: 2, startDate: '2023-03-01', monthlyRent: 2500000, wifiFee: 100000, trashFee: 30000, deposit: 1700000, status: 'active' },
  { id: 3, roomId: 3, tenantId: 3, startDate: '2023-05-20', monthlyRent: 2500000, wifiFee: 100000, trashFee: 30000, deposit: 1700000, status: 'active' },
  { id: 4, roomId: 4, tenantId: 4, startDate: '2022-11-10', monthlyRent: 2500000, wifiFee: 100000, trashFee: 30000, deposit: 1700000, status: 'active' },
  { id: 5, roomId: 5, tenantId: 5, startDate: '2023-08-01', monthlyRent: 2800000, wifiFee: 100000, trashFee: 30000, deposit: 1700000, status: 'active' },
  { id: 6, roomId: 6, tenantId: 6, startDate: '2023-02-12', monthlyRent: 2800000, wifiFee: 100000, trashFee: 30000, deposit: 1700000, status: 'active' },
];

export const INITIAL_SETTINGS: Settings = {
    electricPrice: 3500,
    waterPrice: 20000,
    wifiPrice: 100000,
    trashPrice: 30000,
};

export const INITIAL_METERS: Meter[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: i + 1, roomId: i + 1, type: 'electric' as const, unitPrice: INITIAL_SETTINGS.electricPrice })),
  ...Array.from({ length: 8 }, (_, i) => ({ id: i + 9, roomId: i + 1, type: 'water' as const, unitPrice: INITIAL_SETTINGS.waterPrice })),
];


const lastMonth = new Date();
lastMonth.setMonth(lastMonth.getMonth() - 1);
const lastMonthPeriod = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}`;

const thisMonth = new Date();
const thisMonthPeriod = `${thisMonth.getFullYear()}-${(thisMonth.getMonth() + 1).toString().padStart(2, '0')}`;

export const INITIAL_READINGS: Reading[] = [
  // Room 1 last month
  { id: 1, meterId: 1, period: lastMonthPeriod, value: 100 }, // Elec
  { id: 2, meterId: 9, period: lastMonthPeriod, value: 10 },  // Water
  // Room 1 this month
  { id: 3, meterId: 1, period: thisMonthPeriod, value: 150 }, // Elec
  { id: 4, meterId: 9, period: thisMonthPeriod, value: 15 },   // Water
  // Room 2 last month
  { id: 5, meterId: 2, period: lastMonthPeriod, value: 200 },
  { id: 6, meterId: 10, period: lastMonthPeriod, value: 20 },
  // Room 2 this month
  { id: 7, meterId: 2, period: thisMonthPeriod, value: 270 },
  { id: 8, meterId: 10, period: thisMonthPeriod, value: 28 },
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 1, leaseId: 1, period: thisMonthPeriod, rent: 2500000, 
    electricUsage: 50, electricCost: 50 * INITIAL_SETTINGS.electricPrice,
    waterUsage: 5, waterCost: 5 * INITIAL_SETTINGS.waterPrice,
    otherFees: INITIAL_SETTINGS.wifiPrice + INITIAL_SETTINGS.trashPrice,
    total: 2500000 + (50 * INITIAL_SETTINGS.electricPrice) + (5 * INITIAL_SETTINGS.waterPrice) + INITIAL_SETTINGS.wifiPrice + INITIAL_SETTINGS.trashPrice,
    status: 'unpaid',
  },
  {
    id: 2, leaseId: 2, period: thisMonthPeriod, rent: 2500000, 
    electricUsage: 70, electricCost: 70 * INITIAL_SETTINGS.electricPrice,
    waterUsage: 8, waterCost: 8 * INITIAL_SETTINGS.waterPrice,
    otherFees: INITIAL_SETTINGS.wifiPrice + INITIAL_SETTINGS.trashPrice,
    total: 2500000 + (70 * INITIAL_SETTINGS.electricPrice) + (8 * INITIAL_SETTINGS.waterPrice) + INITIAL_SETTINGS.wifiPrice + INITIAL_SETTINGS.trashPrice,
    status: 'paid',
  },
];

export const INITIAL_MAINTENANCE: Maintenance[] = [
  { id: 1, roomId: 3, title: 'Sửa vòi nước', cost: 150000, payer: 'owner', status: 'open', date: '2023-10-28' },
  { id: 2, roomId: 5, title: 'Thay bóng đèn', cost: 50000, payer: 'tenant', status: 'closed', date: '2023-10-15' },
];
