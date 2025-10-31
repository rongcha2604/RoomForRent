import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import {
    type Room, type Tenant, type Lease, type Meter, type Reading, 
    type Invoice, type Maintenance, type Settings
} from '../types';

// Database name
const DB_NAME = 'nhatro_database';
const STORAGE_KEY = 'nhatro_storage_v1';

class DatabaseService {
    private sqlite: SQLiteConnection;
    private db: SQLiteDBConnection | null = null;
    private isInitialized = false;
    private useLocalStorage = false;
    private localData: any = {};

    constructor() {
        this.sqlite = new SQLiteConnection(CapacitorSQLite);
    }

    // Initialize database
    async init(): Promise<void> {
        if (this.isInitialized) return;

        try {
            const platform = Capacitor.getPlatform();
            console.log('Platform:', platform);

            // For web, use localStorage instead of SQLite
            if (platform === 'web') {
                console.log('Using localStorage for web platform...');
                this.useLocalStorage = true;
                this.loadFromLocalStorage();
                this.isInitialized = true;
                console.log('✅ LocalStorage initialized successfully');
                return;
            }

            // For native platforms, use SQLite
            console.log('Using SQLite for native platform...');
            
            // Create connection
            const ret = await this.sqlite.checkConnectionsConsistency();
            const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result;

            if (ret.result && isConn) {
                this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
            } else {
                this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
            }

            // Open database
            await this.db.open();

            // Create tables
            await this.createTables();

            this.isInitialized = true;
            console.log('✅ SQLite Database initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing database:', error);
            throw error;
        }
    }

    // LocalStorage helpers
    private loadFromLocalStorage(): void {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                this.localData = JSON.parse(data);
                console.log('Loaded data from localStorage');
            } else {
                this.localData = {
                    rooms: [],
                    tenants: [],
                    leases: [],
                    meters: [],
                    readings: [],
                    invoices: [],
                    maintenance: [],
                    settings: null
                };
                console.log('Initialized empty localStorage');
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.localData = {
                rooms: [],
                tenants: [],
                leases: [],
                meters: [],
                readings: [],
                invoices: [],
                maintenance: [],
                settings: null
            };
        }
    }

    private saveToLocalStorage(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.localData));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    private getNextId(array: any[]): number {
        if (array.length === 0) return 1;
        return Math.max(...array.map(item => item.id)) + 1;
    }

    // Create tables
    private async createTables(): Promise<void> {
        const queries = `
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                baseRent REAL NOT NULL,
                deposit REAL NOT NULL,
                note TEXT,
                isActive INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS tenants (
                id INTEGER PRIMARY KEY,
                fullName TEXT NOT NULL,
                phone TEXT,
                idNumber TEXT,
                note TEXT
            );

            CREATE TABLE IF NOT EXISTS leases (
                id INTEGER PRIMARY KEY,
                roomId INTEGER NOT NULL,
                tenantId INTEGER NOT NULL,
                startDate TEXT NOT NULL,
                endDate TEXT,
                monthlyRent REAL NOT NULL,
                wifiFee REAL NOT NULL,
                trashFee REAL NOT NULL,
                status TEXT NOT NULL,
                FOREIGN KEY (roomId) REFERENCES rooms(id),
                FOREIGN KEY (tenantId) REFERENCES tenants(id)
            );

            CREATE TABLE IF NOT EXISTS meters (
                id INTEGER PRIMARY KEY,
                roomId INTEGER NOT NULL,
                type TEXT NOT NULL,
                unitPrice REAL NOT NULL,
                FOREIGN KEY (roomId) REFERENCES rooms(id)
            );

            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY,
                meterId INTEGER NOT NULL,
                period TEXT NOT NULL,
                value REAL NOT NULL,
                FOREIGN KEY (meterId) REFERENCES meters(id)
            );

            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY,
                leaseId INTEGER NOT NULL,
                period TEXT NOT NULL,
                rent REAL NOT NULL,
                electricUsage REAL,
                electricCost REAL,
                waterUsage REAL,
                waterCost REAL,
                otherFees REAL NOT NULL,
                total REAL NOT NULL,
                status TEXT NOT NULL,
                FOREIGN KEY (leaseId) REFERENCES leases(id)
            );

            CREATE TABLE IF NOT EXISTS maintenance (
                id INTEGER PRIMARY KEY,
                roomId INTEGER NOT NULL,
                title TEXT NOT NULL,
                cost REAL NOT NULL,
                payer TEXT NOT NULL,
                status TEXT NOT NULL,
                date TEXT NOT NULL,
                FOREIGN KEY (roomId) REFERENCES rooms(id)
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                electricPrice REAL NOT NULL,
                waterPrice REAL NOT NULL,
                wifiPrice REAL NOT NULL,
                trashPrice REAL NOT NULL
            );
        `;

        try {
            await this.db!.execute(queries);
            console.log('Tables created successfully');
        } catch (error) {
            console.error('Error creating tables:', error);
            throw error;
        }
    }

    // ============ ROOMS ============
    async getAllRooms(): Promise<Room[]> {
        if (this.useLocalStorage) {
            return this.localData.rooms || [];
        }
        
        try {
            const result = await this.db!.query('SELECT * FROM rooms ORDER BY name');
            return result.values || [];
        } catch (error) {
            console.error('Error getting rooms:', error);
            return [];
        }
    }

    async addRoom(room: Omit<Room, 'id'>): Promise<number> {
        if (this.useLocalStorage) {
            const id = this.getNextId(this.localData.rooms);
            this.localData.rooms.push({ ...room, id });
            this.saveToLocalStorage();
            return id;
        }
        
        try {
            const query = 'INSERT INTO rooms (name, baseRent, deposit, note, isActive) VALUES (?, ?, ?, ?, ?)';
            const result = await this.db!.run(query, [
                room.name,
                room.baseRent,
                room.deposit,
                room.note || null,
                room.isActive ? 1 : 0
            ]);
            return result.changes?.lastId || 0;
        } catch (error) {
            console.error('Error adding room:', error);
            throw error;
        }
    }

    async updateRoom(id: number, room: Partial<Room>): Promise<void> {
        if (this.useLocalStorage) {
            const index = this.localData.rooms.findIndex((r: Room) => r.id === id);
            if (index !== -1) {
                this.localData.rooms[index] = { ...this.localData.rooms[index], ...room };
                this.saveToLocalStorage();
            }
            return;
        }
        
        try {
            const fields: string[] = [];
            const values: any[] = [];

            if (room.name !== undefined) { fields.push('name = ?'); values.push(room.name); }
            if (room.baseRent !== undefined) { fields.push('baseRent = ?'); values.push(room.baseRent); }
            if (room.deposit !== undefined) { fields.push('deposit = ?'); values.push(room.deposit); }
            if (room.note !== undefined) { fields.push('note = ?'); values.push(room.note); }
            if (room.isActive !== undefined) { fields.push('isActive = ?'); values.push(room.isActive ? 1 : 0); }

            if (fields.length === 0) return;

            values.push(id);
            const query = `UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`;
            await this.db!.run(query, values);
        } catch (error) {
            console.error('Error updating room:', error);
            throw error;
        }
    }

    async deleteRoom(id: number): Promise<void> {
        if (this.useLocalStorage) {
            this.localData.rooms = this.localData.rooms.filter((r: Room) => r.id !== id);
            this.saveToLocalStorage();
            return;
        }
        
        try {
            await this.db!.run('DELETE FROM rooms WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting room:', error);
            throw error;
        }
    }

    // ============ TENANTS ============
    async getAllTenants(): Promise<Tenant[]> {
        try {
            const result = await this.db!.query('SELECT * FROM tenants ORDER BY fullName');
            return result.values || [];
        } catch (error) {
            console.error('Error getting tenants:', error);
            return [];
        }
    }

    async addTenant(tenant: Omit<Tenant, 'id'>): Promise<number> {
        try {
            const query = 'INSERT INTO tenants (fullName, phone, idNumber, note) VALUES (?, ?, ?, ?)';
            const result = await this.db!.run(query, [
                tenant.fullName,
                tenant.phone || null,
                tenant.idNumber || null,
                tenant.note || null
            ]);
            return result.changes?.lastId || 0;
        } catch (error) {
            console.error('Error adding tenant:', error);
            throw error;
        }
    }

    async updateTenant(id: number, tenant: Partial<Tenant>): Promise<void> {
        try {
            const fields: string[] = [];
            const values: any[] = [];

            if (tenant.fullName !== undefined) { fields.push('fullName = ?'); values.push(tenant.fullName); }
            if (tenant.phone !== undefined) { fields.push('phone = ?'); values.push(tenant.phone); }
            if (tenant.idNumber !== undefined) { fields.push('idNumber = ?'); values.push(tenant.idNumber); }
            if (tenant.note !== undefined) { fields.push('note = ?'); values.push(tenant.note); }

            if (fields.length === 0) return;

            values.push(id);
            const query = `UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`;
            await this.db!.run(query, values);
        } catch (error) {
            console.error('Error updating tenant:', error);
            throw error;
        }
    }

    async deleteTenant(id: number): Promise<void> {
        try {
            await this.db!.run('DELETE FROM tenants WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting tenant:', error);
            throw error;
        }
    }

    // ============ LEASES ============
    async getAllLeases(): Promise<Lease[]> {
        try {
            const result = await this.db!.query('SELECT * FROM leases ORDER BY startDate DESC');
            return result.values || [];
        } catch (error) {
            console.error('Error getting leases:', error);
            return [];
        }
    }

    async addLease(lease: Omit<Lease, 'id'>): Promise<number> {
        try {
            const query = 'INSERT INTO leases (roomId, tenantId, startDate, endDate, monthlyRent, wifiFee, trashFee, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
            const result = await this.db!.run(query, [
                lease.roomId,
                lease.tenantId,
                lease.startDate,
                lease.endDate || null,
                lease.monthlyRent,
                lease.wifiFee,
                lease.trashFee,
                lease.status
            ]);
            return result.changes?.lastId || 0;
        } catch (error) {
            console.error('Error adding lease:', error);
            throw error;
        }
    }

    async updateLease(id: number, lease: Partial<Lease>): Promise<void> {
        try {
            const fields: string[] = [];
            const values: any[] = [];

            if (lease.roomId !== undefined) { fields.push('roomId = ?'); values.push(lease.roomId); }
            if (lease.tenantId !== undefined) { fields.push('tenantId = ?'); values.push(lease.tenantId); }
            if (lease.startDate !== undefined) { fields.push('startDate = ?'); values.push(lease.startDate); }
            if (lease.endDate !== undefined) { fields.push('endDate = ?'); values.push(lease.endDate); }
            if (lease.monthlyRent !== undefined) { fields.push('monthlyRent = ?'); values.push(lease.monthlyRent); }
            if (lease.wifiFee !== undefined) { fields.push('wifiFee = ?'); values.push(lease.wifiFee); }
            if (lease.trashFee !== undefined) { fields.push('trashFee = ?'); values.push(lease.trashFee); }
            if (lease.status !== undefined) { fields.push('status = ?'); values.push(lease.status); }

            if (fields.length === 0) return;

            values.push(id);
            const query = `UPDATE leases SET ${fields.join(', ')} WHERE id = ?`;
            await this.db!.run(query, values);
        } catch (error) {
            console.error('Error updating lease:', error);
            throw error;
        }
    }

    async deleteLease(id: number): Promise<void> {
        try {
            await this.db!.run('DELETE FROM leases WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting lease:', error);
            throw error;
        }
    }

    // ============ METERS ============
    async getAllMeters(): Promise<Meter[]> {
        try {
            const result = await this.db!.query('SELECT * FROM meters ORDER BY roomId, type');
            return result.values || [];
        } catch (error) {
            console.error('Error getting meters:', error);
            return [];
        }
    }

    async addMeter(meter: Omit<Meter, 'id'>): Promise<number> {
        try {
            const query = 'INSERT INTO meters (roomId, type, unitPrice) VALUES (?, ?, ?)';
            const result = await this.db!.run(query, [meter.roomId, meter.type, meter.unitPrice]);
            return result.changes?.lastId || 0;
        } catch (error) {
            console.error('Error adding meter:', error);
            throw error;
        }
    }

    async updateMeter(id: number, meter: Partial<Meter>): Promise<void> {
        try {
            const fields: string[] = [];
            const values: any[] = [];

            if (meter.roomId !== undefined) { fields.push('roomId = ?'); values.push(meter.roomId); }
            if (meter.type !== undefined) { fields.push('type = ?'); values.push(meter.type); }
            if (meter.unitPrice !== undefined) { fields.push('unitPrice = ?'); values.push(meter.unitPrice); }

            if (fields.length === 0) return;

            values.push(id);
            const query = `UPDATE meters SET ${fields.join(', ')} WHERE id = ?`;
            await this.db!.run(query, values);
        } catch (error) {
            console.error('Error updating meter:', error);
            throw error;
        }
    }

    async deleteMeter(id: number): Promise<void> {
        try {
            await this.db!.run('DELETE FROM meters WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting meter:', error);
            throw error;
        }
    }

    // ============ READINGS ============
    async getAllReadings(): Promise<Reading[]> {
        try {
            const result = await this.db!.query('SELECT * FROM readings ORDER BY period DESC, meterId');
            return result.values || [];
        } catch (error) {
            console.error('Error getting readings:', error);
            return [];
        }
    }

    async addReading(reading: Omit<Reading, 'id'>): Promise<number> {
        try {
            const query = 'INSERT INTO readings (meterId, period, value) VALUES (?, ?, ?)';
            const result = await this.db!.run(query, [reading.meterId, reading.period, reading.value]);
            return result.changes?.lastId || 0;
        } catch (error) {
            console.error('Error adding reading:', error);
            throw error;
        }
    }

    async updateReading(id: number, reading: Partial<Reading>): Promise<void> {
        try {
            const fields: string[] = [];
            const values: any[] = [];

            if (reading.meterId !== undefined) { fields.push('meterId = ?'); values.push(reading.meterId); }
            if (reading.period !== undefined) { fields.push('period = ?'); values.push(reading.period); }
            if (reading.value !== undefined) { fields.push('value = ?'); values.push(reading.value); }

            if (fields.length === 0) return;

            values.push(id);
            const query = `UPDATE readings SET ${fields.join(', ')} WHERE id = ?`;
            await this.db!.run(query, values);
        } catch (error) {
            console.error('Error updating reading:', error);
            throw error;
        }
    }

    async deleteReading(id: number): Promise<void> {
        try {
            await this.db!.run('DELETE FROM readings WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting reading:', error);
            throw error;
        }
    }

    // ============ INVOICES ============
    async getAllInvoices(): Promise<Invoice[]> {
        try {
            const result = await this.db!.query('SELECT * FROM invoices ORDER BY period DESC');
            return result.values || [];
        } catch (error) {
            console.error('Error getting invoices:', error);
            return [];
        }
    }

    async addInvoice(invoice: Omit<Invoice, 'id'>): Promise<number> {
        try {
            const query = `INSERT INTO invoices 
                (leaseId, period, rent, electricUsage, electricCost, waterUsage, waterCost, otherFees, total, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const result = await this.db!.run(query, [
                invoice.leaseId,
                invoice.period,
                invoice.rent,
                invoice.electricUsage || null,
                invoice.electricCost || null,
                invoice.waterUsage || null,
                invoice.waterCost || null,
                invoice.otherFees,
                invoice.total,
                invoice.status
            ]);
            return result.changes?.lastId || 0;
        } catch (error) {
            console.error('Error adding invoice:', error);
            throw error;
        }
    }

    async updateInvoice(id: number, invoice: Partial<Invoice>): Promise<void> {
        try {
            const fields: string[] = [];
            const values: any[] = [];

            if (invoice.leaseId !== undefined) { fields.push('leaseId = ?'); values.push(invoice.leaseId); }
            if (invoice.period !== undefined) { fields.push('period = ?'); values.push(invoice.period); }
            if (invoice.rent !== undefined) { fields.push('rent = ?'); values.push(invoice.rent); }
            if (invoice.electricUsage !== undefined) { fields.push('electricUsage = ?'); values.push(invoice.electricUsage); }
            if (invoice.electricCost !== undefined) { fields.push('electricCost = ?'); values.push(invoice.electricCost); }
            if (invoice.waterUsage !== undefined) { fields.push('waterUsage = ?'); values.push(invoice.waterUsage); }
            if (invoice.waterCost !== undefined) { fields.push('waterCost = ?'); values.push(invoice.waterCost); }
            if (invoice.otherFees !== undefined) { fields.push('otherFees = ?'); values.push(invoice.otherFees); }
            if (invoice.total !== undefined) { fields.push('total = ?'); values.push(invoice.total); }
            if (invoice.status !== undefined) { fields.push('status = ?'); values.push(invoice.status); }

            if (fields.length === 0) return;

            values.push(id);
            const query = `UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`;
            await this.db!.run(query, values);
        } catch (error) {
            console.error('Error updating invoice:', error);
            throw error;
        }
    }

    async deleteInvoice(id: number): Promise<void> {
        try {
            await this.db!.run('DELETE FROM invoices WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting invoice:', error);
            throw error;
        }
    }

    // ============ MAINTENANCE ============
    async getAllMaintenance(): Promise<Maintenance[]> {
        try {
            const result = await this.db!.query('SELECT * FROM maintenance ORDER BY date DESC');
            return result.values || [];
        } catch (error) {
            console.error('Error getting maintenance:', error);
            return [];
        }
    }

    async addMaintenance(maintenance: Omit<Maintenance, 'id'>): Promise<number> {
        try {
            const query = 'INSERT INTO maintenance (roomId, title, cost, payer, status, date) VALUES (?, ?, ?, ?, ?, ?)';
            const result = await this.db!.run(query, [
                maintenance.roomId,
                maintenance.title,
                maintenance.cost,
                maintenance.payer,
                maintenance.status,
                maintenance.date
            ]);
            return result.changes?.lastId || 0;
        } catch (error) {
            console.error('Error adding maintenance:', error);
            throw error;
        }
    }

    async updateMaintenance(id: number, maintenance: Partial<Maintenance>): Promise<void> {
        try {
            const fields: string[] = [];
            const values: any[] = [];

            if (maintenance.roomId !== undefined) { fields.push('roomId = ?'); values.push(maintenance.roomId); }
            if (maintenance.title !== undefined) { fields.push('title = ?'); values.push(maintenance.title); }
            if (maintenance.cost !== undefined) { fields.push('cost = ?'); values.push(maintenance.cost); }
            if (maintenance.payer !== undefined) { fields.push('payer = ?'); values.push(maintenance.payer); }
            if (maintenance.status !== undefined) { fields.push('status = ?'); values.push(maintenance.status); }
            if (maintenance.date !== undefined) { fields.push('date = ?'); values.push(maintenance.date); }

            if (fields.length === 0) return;

            values.push(id);
            const query = `UPDATE maintenance SET ${fields.join(', ')} WHERE id = ?`;
            await this.db!.run(query, values);
        } catch (error) {
            console.error('Error updating maintenance:', error);
            throw error;
        }
    }

    async deleteMaintenance(id: number): Promise<void> {
        try {
            await this.db!.run('DELETE FROM maintenance WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting maintenance:', error);
            throw error;
        }
    }

    // ============ SETTINGS ============
    async getSettings(): Promise<Settings | null> {
        try {
            const result = await this.db!.query('SELECT * FROM settings WHERE id = 1');
            return result.values && result.values.length > 0 ? result.values[0] : null;
        } catch (error) {
            console.error('Error getting settings:', error);
            return null;
        }
    }

    async updateSettings(settings: Settings): Promise<void> {
        try {
            // Check if settings exist
            const existing = await this.getSettings();
            
            if (existing) {
                const query = 'UPDATE settings SET electricPrice = ?, waterPrice = ?, wifiPrice = ?, trashPrice = ? WHERE id = 1';
                await this.db!.run(query, [settings.electricPrice, settings.waterPrice, settings.wifiPrice, settings.trashPrice]);
            } else {
                const query = 'INSERT INTO settings (id, electricPrice, waterPrice, wifiPrice, trashPrice) VALUES (1, ?, ?, ?, ?)';
                await this.db!.run(query, [settings.electricPrice, settings.waterPrice, settings.wifiPrice, settings.trashPrice]);
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    }

    // ============ UTILITIES ============
    async clearAllData(): Promise<void> {
        try {
            await this.db!.execute(`
                DELETE FROM readings;
                DELETE FROM invoices;
                DELETE FROM maintenance;
                DELETE FROM leases;
                DELETE FROM meters;
                DELETE FROM tenants;
                DELETE FROM rooms;
                DELETE FROM settings;
            `);
            console.log('All data cleared successfully');
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    }

    async close(): Promise<void> {
        try {
            if (this.db) {
                await this.sqlite.closeConnection(DB_NAME, false);
                this.db = null;
                this.isInitialized = false;
            }
        } catch (error) {
            console.error('Error closing database:', error);
        }
    }
}

// Export singleton instance
export const database = new DatabaseService();

