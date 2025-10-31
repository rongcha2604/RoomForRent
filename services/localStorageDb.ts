import {
    type Room, type Tenant, type Lease, type Meter, type Reading, 
    type Invoice, type Maintenance, type Settings, type Expense, type SecuritySettings
} from '../types';

const STORAGE_KEY = 'nhatro_data';

interface StorageData {
    rooms: Room[];
    tenants: Tenant[];
    leases: Lease[];
    meters: Meter[];
    readings: Reading[];
    invoices: Invoice[];
    maintenance: Maintenance[];
    settings: Settings | null;
    expenses: Expense[];
    security: SecuritySettings | null;
}

class LocalStorageDatabase {
    private data: StorageData;
    private isInitialized = false;

    constructor() {
        this.data = {
            rooms: [],
            tenants: [],
            leases: [],
            meters: [],
            readings: [],
            invoices: [],
            maintenance: [],
            settings: null,
            expenses: [],
            security: null
        };
    }

    async init(): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.data = JSON.parse(stored);
                console.log('✅ Data loaded from localStorage');
                
                // Migration: Backfill deposit, participants & amountPaid for old data
                let needsSave = false;
                
                // Migrate leases
                this.data.leases.forEach((lease: any) => {
                    // Migration 1: Deposit
                    if (lease.deposit === undefined) {
                        const room = this.data.rooms.find(r => r.id === lease.roomId);
                        lease.deposit = room?.deposit || 0;
                        needsSave = true;
                        console.log(`🔄 Migrated deposit for lease ${lease.id}: ${lease.deposit}`);
                    }
                    
                    // Migration 2: Participants (người ở ghép)
                    if (!lease.participants || lease.participants.length === 0) {
                        lease.participants = [{
                            tenantId: lease.tenantId,
                            isPrimary: true,
                            joinDate: lease.startDate,
                            leaveDate: lease.status === 'inactive' && lease.endDate ? lease.endDate : undefined
                        }];
                        lease.numberOfPeople = 1;
                        needsSave = true;
                        console.log(`🔄 Migrated participants for lease ${lease.id}`);
                    }
                    
                    // Migration 3: Payment Mode
                    if (!lease.paymentMode) {
                        lease.paymentMode = 'advance'; // Default to advance mode
                        needsSave = true;
                        console.log(`🔄 Migrated paymentMode for lease ${lease.id}: advance`);
                    }
                });
                
                // Migrate invoices: Backfill amountPaid
                this.data.invoices.forEach((invoice: any) => {
                    if (invoice.amountPaid === undefined) {
                        // If already paid, set amountPaid = total; otherwise 0
                        invoice.amountPaid = invoice.status === 'paid' ? invoice.total : 0;
                        needsSave = true;
                        console.log(`🔄 Migrated amountPaid for invoice ${invoice.id}: ${invoice.amountPaid}`);
                    }
                });
                
                // Migrate settings: Add defaultPaymentMode
                if (this.data.settings && !(this.data.settings as any).defaultPaymentMode) {
                    (this.data.settings as any).defaultPaymentMode = 'advance';
                    needsSave = true;
                    console.log('🔄 Migrated settings: defaultPaymentMode = advance');
                }
                
                // Migration 4: Expenses array (ensure it exists)
                if (!this.data.expenses) {
                    this.data.expenses = [];
                    needsSave = true;
                    console.log('🔄 Migrated expenses: initialized empty array');
                }
                
                // Migration 5: Expense fields (period, isRecurring)
                this.data.expenses.forEach((expense: any) => {
                    if (!expense.period) {
                        // Calculate period from date (YYYY-MM)
                        expense.period = expense.date?.slice(0, 7) || new Date().toISOString().slice(0, 7);
                        needsSave = true;
                        console.log(`🔄 Migrated period for expense ${expense.id}: ${expense.period}`);
                    }
                    if (expense.isRecurring === undefined) {
                        expense.isRecurring = false;
                        needsSave = true;
                        console.log(`🔄 Migrated isRecurring for expense ${expense.id}: false`);
                    }
                });
                
                if (needsSave) {
                    this.save();
                    console.log('✅ Migration complete: deposits, participants, amountPaid, paymentMode & expenses backfilled');
                }
            } else {
                console.log('✅ Initialized empty storage');
            }
            this.isInitialized = true;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.isInitialized = true;
        }
    }

    private save(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    private getNextId(array: any[]): number {
        const ids = array.map(item => item.id);
        const maxId = ids.length > 0 ? Math.max(...ids) : 0;
        const nextId = maxId + 1;
        console.log('🔵 [DB] getNextId():', { 
            itemCount: array.length, 
            existingIds: ids, 
            maxId, 
            nextId 
        });
        return nextId;
    }

    // ROOMS
    async getAllRooms(): Promise<Room[]> {
        return this.data.rooms;
    }

    async addRoom(room: Omit<Room, 'id'>): Promise<number> {
        // Check for duplicate room name
        const existingRoom = this.data.rooms.find(r => r.name === room.name);
        if (existingRoom) {
            throw new Error(`Phòng "${room.name}" đã tồn tại!`);
        }
        
        const id = this.getNextId(this.data.rooms);
        this.data.rooms.push({ ...room, id });
        this.save();
        return id;
    }

    async updateRoom(id: number, room: Partial<Room>): Promise<void> {
        const index = this.data.rooms.findIndex(r => r.id === id);
        if (index !== -1) {
            this.data.rooms[index] = { ...this.data.rooms[index], ...room };
            this.save();
        }
    }

    async deleteRoom(id: number): Promise<void> {
        this.data.rooms = this.data.rooms.filter(r => r.id !== id);
        this.save();
    }

    // TENANTS
    async getAllTenants(): Promise<Tenant[]> {
        return this.data.tenants;
    }

    async addTenant(tenant: Omit<Tenant, 'id'>): Promise<number> {
        console.log('🔵 [DB] addTenant() called:', tenant.fullName);
        console.log('🔵 [DB] Current tenants count:', this.data.tenants.length);
        console.log('🔵 [DB] Existing tenant IDs:', this.data.tenants.map(t => `${t.id}:${t.fullName}`));
        
        // CRITICAL: Check for duplicates BEFORE inserting
        // Check by phone number (if provided)
        if (tenant.phone && tenant.phone.trim()) {
            const existingByPhone = this.data.tenants.find(
                t => t.phone && t.phone.trim() === tenant.phone.trim()
            );
            if (existingByPhone) {
                console.error('❌ [DB] Duplicate phone detected:', tenant.phone);
                throw new Error(`DUPLICATE_PHONE: Số điện thoại "${tenant.phone}" đã tồn tại (${existingByPhone.fullName})`);
            }
        }
        
        // Check by ID number/CCCD (if provided)
        if (tenant.idNumber && tenant.idNumber.trim()) {
            const existingByCCCD = this.data.tenants.find(
                t => t.idNumber && t.idNumber.trim() === tenant.idNumber.trim()
            );
            if (existingByCCCD) {
                console.error('❌ [DB] Duplicate CCCD detected:', tenant.idNumber);
                throw new Error(`DUPLICATE_CCCD: Số CCCD "${tenant.idNumber}" đã tồn tại (${existingByCCCD.fullName})`);
            }
        }
        
        const id = this.getNextId(this.data.tenants);
        console.log('🔵 [DB] Generated ID:', id);
        
        // CRITICAL: Check for ID collision (defensive)
        const existingById = this.data.tenants.find(t => t.id === id);
        if (existingById) {
            console.error('❌ [DB] CRITICAL: ID collision detected!', { id, existing: existingById });
            throw new Error(`ID_COLLISION: ID ${id} đã tồn tại cho ${existingById.fullName}!`);
        }
        
        console.log('🔵 [DB] Pushing tenant to array...');
        this.data.tenants.push({ ...tenant, id });
        console.log('🔵 [DB] Tenant added to array, new count:', this.data.tenants.length);
        
        console.log('🔵 [DB] Saving to localStorage...');
        this.save();
        console.log('🔵 [DB] Save complete!');
        console.log('🔵 [DB] Final tenant IDs:', this.data.tenants.map(t => `${t.id}:${t.fullName}`));
        console.log(`✅ [DB] Successfully added tenant: ${tenant.fullName} (ID: ${id})`);
        
        return id;
    }

    async updateTenant(id: number, tenant: Partial<Tenant>): Promise<void> {
        const index = this.data.tenants.findIndex(t => t.id === id);
        if (index !== -1) {
            this.data.tenants[index] = { ...this.data.tenants[index], ...tenant };
            this.save();
        }
    }

    async deleteTenant(id: number): Promise<void> {
        this.data.tenants = this.data.tenants.filter(t => t.id !== id);
        this.save();
    }

    // LEASES
    async getAllLeases(): Promise<Lease[]> {
        return this.data.leases;
    }

    async addLease(lease: Omit<Lease, 'id'>): Promise<number> {
        const id = this.getNextId(this.data.leases);
        this.data.leases.push({ ...lease, id });
        this.save();
        return id;
    }

    async updateLease(id: number, lease: Partial<Lease>): Promise<void> {
        const index = this.data.leases.findIndex(l => l.id === id);
        if (index !== -1) {
            this.data.leases[index] = { ...this.data.leases[index], ...lease };
            this.save();
        }
    }

    async deleteLease(id: number): Promise<void> {
        this.data.leases = this.data.leases.filter(l => l.id !== id);
        this.save();
    }

    // METERS
    async getAllMeters(): Promise<Meter[]> {
        return this.data.meters;
    }

    async addMeter(meter: Omit<Meter, 'id'>): Promise<number> {
        const id = this.getNextId(this.data.meters);
        this.data.meters.push({ ...meter, id });
        this.save();
        return id;
    }

    async updateMeter(id: number, meter: Partial<Meter>): Promise<void> {
        const index = this.data.meters.findIndex(m => m.id === id);
        if (index !== -1) {
            this.data.meters[index] = { ...this.data.meters[index], ...meter };
            this.save();
        }
    }

    async deleteMeter(id: number): Promise<void> {
        this.data.meters = this.data.meters.filter(m => m.id !== id);
        this.save();
    }

    // READINGS
    async getAllReadings(): Promise<Reading[]> {
        return this.data.readings;
    }

    async addReading(reading: Omit<Reading, 'id'>): Promise<number> {
        const id = this.getNextId(this.data.readings);
        this.data.readings.push({ ...reading, id });
        this.save();
        return id;
    }

    async updateReading(id: number, reading: Partial<Reading>): Promise<void> {
        const index = this.data.readings.findIndex(r => r.id === id);
        if (index !== -1) {
            this.data.readings[index] = { ...this.data.readings[index], ...reading };
            this.save();
        }
    }

    async deleteReading(id: number): Promise<void> {
        this.data.readings = this.data.readings.filter(r => r.id !== id);
        this.save();
    }

    // INVOICES
    async getAllInvoices(): Promise<Invoice[]> {
        return this.data.invoices;
    }

    async addInvoice(invoice: Omit<Invoice, 'id'>): Promise<number> {
        const id = this.getNextId(this.data.invoices);
        this.data.invoices.push({ ...invoice, id });
        this.save();
        return id;
    }

    async updateInvoice(id: number, invoice: Partial<Invoice>): Promise<void> {
        const index = this.data.invoices.findIndex(inv => inv.id === id);
        if (index !== -1) {
            this.data.invoices[index] = { ...this.data.invoices[index], ...invoice };
            this.save();
        }
    }

    async deleteInvoice(id: number): Promise<void> {
        this.data.invoices = this.data.invoices.filter(inv => inv.id !== id);
        this.save();
    }

    // MAINTENANCE
    async getAllMaintenance(): Promise<Maintenance[]> {
        return this.data.maintenance;
    }

    async addMaintenance(item: Omit<Maintenance, 'id'>): Promise<number> {
        const id = this.getNextId(this.data.maintenance);
        this.data.maintenance.push({ ...item, id });
        this.save();
        return id;
    }

    async updateMaintenance(id: number, item: Partial<Maintenance>): Promise<void> {
        const index = this.data.maintenance.findIndex(m => m.id === id);
        if (index !== -1) {
            this.data.maintenance[index] = { ...this.data.maintenance[index], ...item };
            this.save();
        }
    }

    async deleteMaintenance(id: number): Promise<void> {
        this.data.maintenance = this.data.maintenance.filter(m => m.id !== id);
        this.save();
    }

    // SETTINGS
    async getSettings(): Promise<Settings | null> {
        return this.data.settings;
    }

    async updateSettings(settings: Settings): Promise<void> {
        this.data.settings = settings;
        this.save();
    }

    // EXPENSES
    async getAllExpenses(): Promise<Expense[]> {
        return this.data.expenses || [];
    }

    async addExpense(expense: Omit<Expense, 'id'>): Promise<number> {
        // Ensure expenses array exists
        if (!this.data.expenses) {
            this.data.expenses = [];
        }
        const id = this.getNextId(this.data.expenses);
        const newExpense: Expense = { ...expense, id };
        this.data.expenses.push(newExpense);
        this.save();
        return id;
    }

    async updateExpense(id: number, updates: Partial<Expense>): Promise<void> {
        if (!this.data.expenses) {
            this.data.expenses = [];
            return;
        }
        const index = this.data.expenses.findIndex(e => e.id === id);
        if (index !== -1) {
            this.data.expenses[index] = { ...this.data.expenses[index], ...updates };
            this.save();
        }
    }

    async deleteExpense(id: number): Promise<void> {
        if (!this.data.expenses) {
            this.data.expenses = [];
            return;
        }
        this.data.expenses = this.data.expenses.filter(e => e.id !== id);
        this.save();
    }

    // SECURITY
    async getSecuritySettings(): Promise<SecuritySettings | null> {
        return this.data.security;
    }

    async setSecuritySettings(settings: SecuritySettings): Promise<void> {
        this.data.security = settings;
        this.save();
    }

    // UTILITIES
    async clearAllData(): Promise<void> {
        // Keep security settings when clearing data
        const security = this.data.security;
        this.data = {
            rooms: [],
            tenants: [],
            leases: [],
            meters: [],
            readings: [],
            invoices: [],
            maintenance: [],
            settings: null,
            expenses: [],
            security: security // Preserve security
        };
        this.save();
    }

    async clearAllDataOld(): Promise<void> {
        this.data = {
            rooms: [],
            tenants: [],
            leases: [],
            meters: [],
            readings: [],
            invoices: [],
            maintenance: [],
            settings: null
        };
        this.save();
        console.log('All data cleared');
    }

    async close(): Promise<void> {
        // Nothing to close for localStorage
    }

    // BACKUP & RESTORE
    async exportAllData(): Promise<string> {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: {
                rooms: this.data.rooms,
                tenants: this.data.tenants,
                leases: this.data.leases,
                invoices: this.data.invoices,
                readings: this.data.readings,
                meters: this.data.meters,
                maintenance: this.data.maintenance,
                expenses: this.data.expenses,
                settings: this.data.settings,
                security: this.data.security
            }
        };
        return JSON.stringify(exportData, null, 2);
    }

    async importAllData(jsonString: string): Promise<void> {
        try {
            // 1. Parse JSON
            const importData = JSON.parse(jsonString);
            
            // 2. Validate structure
            if (!importData.data || !importData.version) {
                throw new Error('❌ File backup không hợp lệ! Thiếu thông tin phiên bản hoặc dữ liệu.');
            }
            
            // 3. Validate data structure
            const requiredFields = ['rooms', 'tenants', 'leases', 'invoices', 'readings', 'meters', 'maintenance'];
            for (const field of requiredFields) {
                if (!Array.isArray(importData.data[field])) {
                    throw new Error(`❌ File backup không hợp lệ! Thiếu hoặc sai định dạng: ${field}`);
                }
            }
            
            // 4. Overwrite current data
            this.data = {
                rooms: importData.data.rooms || [],
                tenants: importData.data.tenants || [],
                leases: importData.data.leases || [],
                invoices: importData.data.invoices || [],
                readings: importData.data.readings || [],
                meters: importData.data.meters || [],
                maintenance: importData.data.maintenance || [],
                expenses: importData.data.expenses || [],
                settings: importData.data.settings || null,
                security: importData.data.security || null
            };
            
            // 5. Save to localStorage
            this.save();
            
            console.log('✅ Import successful! Data loaded from backup:', {
                rooms: this.data.rooms.length,
                tenants: this.data.tenants.length,
                leases: this.data.leases.length,
                invoices: this.data.invoices.length,
                expenses: this.data.expenses.length
            });
        } catch (error) {
            console.error('❌ Import failed:', error);
            throw error;
        }
    }
}

export const localDb = new LocalStorageDatabase();

