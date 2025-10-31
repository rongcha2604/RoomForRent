import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    type Room, type Tenant, type Lease, type Meter, type Reading, type Invoice, type Maintenance, type Settings, type Expense
} from '../types';
import { INITIAL_SETTINGS } from '../constants';
import { localDb as database } from '../services/localStorageDb';
import { seedInitialData } from '../services/initData';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { backupService } from '../services/backupService';

interface AppDataContextType {
    rooms: Room[];
    tenants: Tenant[];
    leases: Lease[];
    meters: Meter[];
    readings: Reading[];
    invoices: Invoice[];
    maintenance: Maintenance[];
    expenses: Expense[];
    settings: Settings;
    isLoading: boolean;
    // Rooms
    addRoom: (room: Omit<Room, 'id'>) => Promise<void>;
    updateRoom: (id: number, room: Partial<Room>) => Promise<void>;
    deleteRoom: (id: number) => Promise<void>;
    // Tenants
    addTenant: (tenant: Omit<Tenant, 'id'>) => Promise<void>;
    updateTenant: (id: number, tenant: Partial<Tenant>) => Promise<void>;
    deleteTenant: (id: number) => Promise<void>;
    // Leases
    addLease: (lease: Omit<Lease, 'id'>) => Promise<void>;
    updateLease: (id: number, lease: Partial<Lease>) => Promise<void>;
    deleteLease: (id: number) => Promise<void>;
    // Meters
    addMeter: (meter: Omit<Meter, 'id'>) => Promise<void>;
    updateMeter: (id: number, meter: Partial<Meter>) => Promise<void>;
    deleteMeter: (id: number) => Promise<void>;
    // Readings
    addReading: (reading: Omit<Reading, 'id'>) => Promise<void>;
    updateReading: (id: number, reading: Partial<Reading>) => Promise<void>;
    deleteReading: (id: number) => Promise<void>;
    // Invoices
    addInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<void>;
    updateInvoice: (id: number, invoice: Partial<Invoice>) => Promise<void>;
    updateInvoiceStatus: (invoiceId: number, status: 'paid' | 'unpaid') => Promise<void>;
    deleteInvoice: (id: number) => Promise<void>;
    // Maintenance
    addMaintenance: (item: Omit<Maintenance, 'id'>) => Promise<void>;
    updateMaintenance: (id: number, item: Partial<Maintenance>) => Promise<void>;
    deleteMaintenance: (id: number) => Promise<void>;
    // Expenses
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (id: number, expense: Partial<Expense>) => Promise<void>;
    deleteExpense: (id: number) => Promise<void>;
    // Settings
    updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
    // Utilities
    refreshData: () => Promise<void>;
    // Backup & Restore
    exportToDownloads: () => Promise<void>;
    shareDatabase: () => Promise<void>;
    importDatabase: (file: File) => Promise<void>;
    // Auto Backup & Reminder
    showBackupReminder: boolean;
    handleAutoBackup: () => Promise<void>;
    handleRestoreFromBackup: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [leases, setLeases] = useState<Lease[]>([]);
    const [meters, setMeters] = useState<Meter[]>([]);
    const [readings, setReadings] = useState<Reading[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [showBackupReminder, setShowBackupReminder] = useState(false);

    // Initialize database and load data
    useEffect(() => {
        const initDatabase = async () => {
            try {
                setIsLoading(true);
                console.log('Initializing database...');
                
                // Initialize database
                await database.init();
                
                // Seed initial data if needed
                await seedInitialData();
                
                // Load all data
                await loadAllData();
                
                console.log('Database initialized successfully!');
            } catch (error) {
                console.error('Error initializing database:', error);
                alert('Lỗi khởi tạo database. Vui lòng refresh lại trang!');
            } finally {
                setIsLoading(false);
            }
        };

        initDatabase();
    }, []);

    // Check backup reminder on app load
    useEffect(() => {
        const checkReminder = () => {
            const reminderResult = backupService.checkBackupReminder();
            setShowBackupReminder(reminderResult.shouldRemind);
        };
        
        checkReminder();
        // Check every hour
        const interval = setInterval(checkReminder, 60 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, []);

    // Load all data from database
    const loadAllData = async () => {
        try {
            const [
                roomsData,
                tenantsData,
                leasesData,
                metersData,
                readingsData,
                invoicesData,
                maintenanceData,
                expensesData,
                settingsData
            ] = await Promise.all([
                database.getAllRooms(),
                database.getAllTenants(),
                database.getAllLeases(),
                database.getAllMeters(),
                database.getAllReadings(),
                database.getAllInvoices(),
                database.getAllMaintenance(),
                database.getAllExpenses(),
                database.getSettings()
            ]);

            setRooms(roomsData);
            
            // Deduplicate tenants (defensive measure)
            const uniqueTenants = tenantsData.filter((tenant, index, self) => 
                self.findIndex(t => t.id === tenant.id) === index
            );
            if (uniqueTenants.length !== tenantsData.length) {
                console.warn(`⚠️ Removed ${tenantsData.length - uniqueTenants.length} duplicate tenants from data`);
            }
            setTenants(uniqueTenants);
            
            setLeases(leasesData);
            setMeters(metersData);
            
            // Reload readings to sync state
            setReadings(readingsData);
            
            // Deduplicate invoices (defensive measure)
            const uniqueInvoices = invoicesData.filter((invoice, index, self) => 
                self.findIndex(inv => inv.id === invoice.id) === index
            );
            if (uniqueInvoices.length !== invoicesData.length) {
                console.warn(`⚠️ Removed ${invoicesData.length - uniqueInvoices.length} duplicate invoices from data`);
            }
            setInvoices(uniqueInvoices);
            
            setMaintenance(maintenanceData);
            setExpenses(expensesData);
            setSettings(settingsData || INITIAL_SETTINGS);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    // OLD loadAllData function (keeping structure for reference)
    const loadAllDataOld = async () => {
        try {
            const [
                roomsData,
                tenantsData,
                leasesData,
                metersData,
                readingsData,
                invoicesData,
                maintenanceData,
                settingsData
            ] = await Promise.all([
                database.getAllRooms(),
                database.getAllTenants(),
                database.getAllLeases(),
                database.getAllMeters(),
                database.getAllReadings(),
                database.getAllInvoices(),
                database.getAllMaintenance(),
                database.getSettings()
            ]);

            setRooms(roomsData);
            
            // Defensive: Deduplicate tenants by ID before setting state
            const uniqueTenants = tenantsData.filter((tenant, index, self) => 
                self.findIndex(t => t.id === tenant.id) === index
            );
            if (uniqueTenants.length !== tenantsData.length) {
                console.warn(`⚠️ Removed ${tenantsData.length - uniqueTenants.length} duplicate tenants from data`);
            }
            setTenants(uniqueTenants);
            
            setLeases(leasesData);
            setMeters(metersData);
            setReadings(readingsData);
            
            // Defensive: Deduplicate invoices by ID before setting state
            const uniqueInvoices = invoicesData.filter((invoice, index, self) => 
                self.findIndex(inv => inv.id === invoice.id) === index
            );
            if (uniqueInvoices.length !== invoicesData.length) {
                console.warn(`⚠️ Removed ${invoicesData.length - uniqueInvoices.length} duplicate invoices from data`);
            }
            setInvoices(uniqueInvoices);
            setMaintenance(maintenanceData);
            if (settingsData) setSettings(settingsData);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const refreshData = async () => {
        await loadAllData();
    };

    // ============ BACKUP & RESTORE ============
    
    // OPTION 1: Save to device storage (Documents folder)
    const exportToDownloads = async () => {
        try {
            const jsonData = await database.exportAllData();
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '-');
            const filename = `nhatro-backup-${timestamp}.json`;
            
            if (Capacitor.isNativePlatform()) {
                // Android/iOS: Save to Documents folder
                await Filesystem.writeFile({
                    path: filename,
                    data: jsonData,
                    directory: Directory.Documents,
                    encoding: Encoding.UTF8
                });
                
                console.log('✅ File saved to Documents:', filename);
                alert(
                    `✅ Đã lưu vào bộ nhớ máy!\n\n` +
                    `📁 File: ${filename}\n\n` +
                    `📂 Vị trí: Documents/\n\n` +
                    `Mở "File Manager" → "Documents" để xem file.`
                );
            } else {
                // Browser: Fallback to blob download
                const blob = new Blob([jsonData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                console.log('✅ File downloaded:', filename);
                alert(`✅ Đã tải về!\n\nFile: ${filename}\n\nKiểm tra thư mục Downloads.`);
            }
        } catch (error) {
            console.error('❌ Export to Downloads failed:', error);
            alert('❌ Lỗi khi lưu file!\n\nVui lòng thử lại.');
        }
    };

    // OPTION 2: Share backup file (Drive, Email, WhatsApp...)
    const shareDatabase = async () => {
        try {
            const jsonData = await database.exportAllData();
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '-');
            const filename = `nhatro-backup-${timestamp}.json`;
            
            if (Capacitor.isNativePlatform()) {
                // Write to cache first
                await Filesystem.writeFile({
                    path: filename,
                    data: jsonData,
                    directory: Directory.Cache,
                    encoding: Encoding.UTF8
                });
                
                // Get file URI
                const fileUri = await Filesystem.getUri({
                    path: filename,
                    directory: Directory.Cache
                });
                
                // Share file
                await Share.share({
                    title: 'Sao lưu dữ liệu Nhà Trọ',
                    text: `Backup file: ${filename}`,
                    url: fileUri.uri,
                    dialogTitle: 'Chọn nơi lưu backup'
                });
                
                console.log('✅ Share successful');
            } else {
                // Browser: Copy to clipboard
                await navigator.clipboard.writeText(jsonData);
                alert(
                    '✅ Đã copy JSON vào clipboard!\n\n' +
                    'Bạn có thể:\n' +
                    '• Paste vào file text để lưu\n' +
                    '• Gửi qua email/chat'
                );
            }
        } catch (error) {
            console.error('❌ Share failed:', error);
            alert('❌ Lỗi khi chia sẻ!\n\nVui lòng thử lại.');
        }
    };

    const importDatabase = async (file: File) => {
        try {
            // Confirm before overwriting
            const confirmImport = window.confirm(
                '⚠️ XÁC NHẬN KHÔI PHỤC DỮ LIỆU\n\n' +
                'Thao tác này sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại!\n\n' +
                'Tất cả dữ liệu hiện tại (phòng, khách, hóa đơn...) sẽ bị THAY THẾ bằng dữ liệu từ file backup.\n\n' +
                '❌ KHÔNG THỂ HOÀN TÁC!\n\n' +
                'Bạn có chắc chắn muốn tiếp tục?'
            );
            
            if (!confirmImport) {
                return;
            }
            
            // Read file content
            const text = await file.text();
            
            // Import to database
            await database.importAllData(text);
            
            // Reload all data from database
            await loadAllData();
            
            alert(
                '✅ KHÔI PHỤC THÀNH CÔNG!\n\n' +
                'Dữ liệu đã được nhập từ file backup.\n\n' +
                'Trang sẽ tải lại để cập nhật giao diện.'
            );
            
            // Reload page to ensure clean state
            window.location.reload();
        } catch (error) {
            console.error('❌ Import failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(
                '❌ LỖI KHI KHÔI PHỤC DỮ LIỆU!\n\n' +
                `Chi tiết: ${errorMessage}\n\n` +
                'Vui lòng kiểm tra file backup và thử lại.'
            );
        }
    };

    // ============ AUTO BACKUP & REMINDER ============
    
    const handleAutoBackup = async () => {
        try {
            const result = await backupService.autoBackup();
            
            if (result.success) {
                alert(result.message);
                // Hide reminder after successful backup
                setShowBackupReminder(false);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Auto backup error:', error);
            alert('❌ Lỗi khi backup!\n\nVui lòng thử lại.');
        }
    };

    const handleRestoreFromBackup = async () => {
        try {
            // Confirm before restore
            const confirmRestore = window.confirm(
                '⚠️ XÁC NHẬN KHÔI PHỤC DỮ LIỆU\n\n' +
                'Thao tác này sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại!\n\n' +
                'Tất cả dữ liệu hiện tại sẽ bị THAY THẾ bằng dữ liệu từ file backup đã lưu.\n\n' +
                '❌ KHÔNG THỂ HOÀN TÁC!\n\n' +
                'Bạn có chắc chắn muốn tiếp tục?'
            );
            
            if (!confirmRestore) {
                return;
            }

            const result = await backupService.restoreFromBackup();
            
            if (result.success) {
                alert(result.message);
                
                // Reload all data
                await loadAllData();
                
                // Reload page to ensure clean state
                window.location.reload();
            } else {
                // If restore failed because file not found (web) or other reason
                // On web, fallback to manual file selection
                if (Capacitor.getPlatform() === 'web') {
                    alert(
                        'Trên web, vui lòng chọn file backup thủ công.\n\n' +
                        'Sử dụng nút "Khôi phục dữ liệu (Chọn file JSON)" ở trên.'
                    );
                } else {
                    alert(result.message);
                }
            }
        } catch (error) {
            console.error('Restore from backup error:', error);
            alert('❌ Lỗi khi khôi phục!\n\nVui lòng thử lại.');
        }
    };

    // ============ ROOMS ============
    const addRoom = async (room: Omit<Room, 'id'>) => {
        try {
            const id = await database.addRoom(room);
            setRooms(prev => [...prev, { ...room, id }]);
        } catch (error) {
            console.error('Error adding room:', error);
            alert('Lỗi thêm phòng!');
        }
    };

    const updateRoom = async (id: number, room: Partial<Room>) => {
        try {
            await database.updateRoom(id, room);
            setRooms(prev => prev.map(r => r.id === id ? { ...r, ...room } : r));
        } catch (error) {
            console.error('Error updating room:', error);
            alert('Lỗi cập nhật phòng!');
        }
    };

    const deleteRoom = async (id: number) => {
        try {
            await database.deleteRoom(id);
            setRooms(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting room:', error);
            alert('Lỗi xóa phòng!');
        }
    };

    // ============ TENANTS ============
    const addTenant = async (tenant: Omit<Tenant, 'id'>) => {
        console.log('🟡 [CONTEXT] addTenant() called:', tenant.fullName);
        console.log('🟡 [CONTEXT] Current tenants in state:', tenants.length);
        
        try {
            console.log('🟡 [CONTEXT] Calling database.addTenant()...');
            const id = await database.addTenant(tenant);
            console.log('🟡 [CONTEXT] Database returned ID:', id);
            
            // FIX: Reload data from database instead of manual state update
            // This prevents React Strict Mode from causing duplicate state updates
            console.log('🟡 [CONTEXT] Reloading all data from database...');
            await loadAllData();
            console.log('✅ [CONTEXT] Data reloaded, tenant added successfully');
            
            return id;
        } catch (error) {
            console.error('❌ [CONTEXT] Error adding tenant:', error);
            throw error; // Re-throw để modal có thể catch
        }
    };

    const updateTenant = async (id: number, tenant: Partial<Tenant>) => {
        try {
            await database.updateTenant(id, tenant);
            setTenants(prev => prev.map(t => t.id === id ? { ...t, ...tenant } : t));
        } catch (error) {
            console.error('Error updating tenant:', error);
            alert('Lỗi cập nhật khách thuê!');
        }
    };

    const deleteTenant = async (id: number) => {
        try {
            await database.deleteTenant(id);
            setTenants(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting tenant:', error);
            alert('Lỗi xóa khách thuê!');
        }
    };

    // ============ LEASES ============
    const addLease = async (lease: Omit<Lease, 'id'>) => {
        try {
            const id = await database.addLease(lease);
            setLeases(prev => [...prev, { ...lease, id }]);
        } catch (error) {
            console.error('Error adding lease:', error);
            alert('Lỗi thêm hợp đồng!');
        }
    };

    const updateLease = async (id: number, lease: Partial<Lease>) => {
        try {
            await database.updateLease(id, lease);
            setLeases(prev => prev.map(l => l.id === id ? { ...l, ...lease } : l));
        } catch (error) {
            console.error('Error updating lease:', error);
            alert('Lỗi cập nhật hợp đồng!');
        }
    };

    const deleteLease = async (id: number) => {
        try {
            await database.deleteLease(id);
            setLeases(prev => prev.filter(l => l.id !== id));
        } catch (error) {
            console.error('Error deleting lease:', error);
            alert('Lỗi xóa hợp đồng!');
        }
    };

    // ============ METERS ============
    const addMeter = async (meter: Omit<Meter, 'id'>) => {
        try {
            const id = await database.addMeter(meter);
            setMeters(prev => [...prev, { ...meter, id }]);
        } catch (error) {
            console.error('Error adding meter:', error);
            alert('Lỗi thêm đồng hồ!');
        }
    };

    const updateMeter = async (id: number, meter: Partial<Meter>) => {
        try {
            await database.updateMeter(id, meter);
            setMeters(prev => prev.map(m => m.id === id ? { ...m, ...meter } : m));
        } catch (error) {
            console.error('Error updating meter:', error);
            alert('Lỗi cập nhật đồng hồ!');
        }
    };

    const deleteMeter = async (id: number) => {
        try {
            await database.deleteMeter(id);
            setMeters(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error('Error deleting meter:', error);
            alert('Lỗi xóa đồng hồ!');
        }
    };

    // ============ READINGS ============
    const addReading = async (reading: Omit<Reading, 'id'>) => {
        try {
            console.log('🟡 [CONTEXT] Adding reading...');
            const id = await database.addReading(reading);
            console.log('🟡 [CONTEXT] Reading added to DB with ID:', id);
            
            // Reload all data to sync state (prevents stale data)
            await loadAllData();
            console.log('🟡 [CONTEXT] All data reloaded after addReading');
        } catch (error) {
            console.error('Error adding reading:', error);
            alert('Lỗi thêm chỉ số!');
        }
    };

    const updateReading = async (id: number, reading: Partial<Reading>) => {
        try {
            await database.updateReading(id, reading);
            setReadings(prev => prev.map(r => r.id === id ? { ...r, ...reading } : r));
        } catch (error) {
            console.error('Error updating reading:', error);
            alert('Lỗi cập nhật chỉ số!');
        }
    };

    const deleteReading = async (id: number) => {
        try {
            await database.deleteReading(id);
            setReadings(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting reading:', error);
            alert('Lỗi xóa chỉ số!');
        }
    };

    // ============ INVOICES ============
    const addInvoice = async (invoice: Omit<Invoice, 'id'>) => {
        try {
            console.log('🟡 [CONTEXT] Adding invoice...');
            const id = await database.addInvoice(invoice);
            console.log('🟡 [CONTEXT] Invoice added to DB with ID:', id);
            
            // Reload all data to sync state (prevents duplicates)
            await loadAllData();
            console.log('🟡 [CONTEXT] All data reloaded after addInvoice');
        } catch (error) {
            console.error('Error adding invoice:', error);
            alert('Lỗi thêm hóa đơn!');
        }
    };

    const updateInvoice = async (id: number, invoice: Partial<Invoice>) => {
        try {
            await database.updateInvoice(id, invoice);
            setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...invoice } : inv));
        } catch (error) {
            console.error('Error updating invoice:', error);
            alert('Lỗi cập nhật hóa đơn!');
        }
    };

    const updateInvoiceStatus = async (invoiceId: number, status: 'paid' | 'unpaid') => {
        await updateInvoice(invoiceId, { status });
    };

    const deleteInvoice = async (id: number) => {
        try {
            await database.deleteInvoice(id);
            setInvoices(prev => prev.filter(inv => inv.id !== id));
        } catch (error) {
            console.error('Error deleting invoice:', error);
            alert('Lỗi xóa hóa đơn!');
        }
    };

    // ============ MAINTENANCE ============
    const addMaintenance = async (item: Omit<Maintenance, 'id'>) => {
        try {
            const id = await database.addMaintenance(item);
            setMaintenance(prev => [...prev, { ...item, id }]);
        } catch (error) {
            console.error('Error adding maintenance:', error);
            alert('Lỗi thêm bảo trì!');
        }
    };

    const updateMaintenance = async (id: number, item: Partial<Maintenance>) => {
        try {
            await database.updateMaintenance(id, item);
            setMaintenance(prev => prev.map(m => m.id === id ? { ...m, ...item } : m));
        } catch (error) {
            console.error('Error updating maintenance:', error);
            alert('Lỗi cập nhật bảo trì!');
        }
    };

    const deleteMaintenance = async (id: number) => {
        try {
            await database.deleteMaintenance(id);
            setMaintenance(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error('Error deleting maintenance:', error);
            alert('Lỗi xóa bảo trì!');
        }
    };

    // ============ EXPENSES ============
    const addExpense = async (expense: Omit<Expense, 'id'>) => {
        try {
            const id = await database.addExpense(expense);
            setExpenses(prev => [...prev, { ...expense, id }]);
        } catch (error) {
            console.error('Error adding expense:', error);
            alert('Lỗi thêm chi phí!');
        }
    };

    const updateExpense = async (id: number, expense: Partial<Expense>) => {
        try {
            await database.updateExpense(id, expense);
            setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...expense } : e));
        } catch (error) {
            console.error('Error updating expense:', error);
            alert('Lỗi cập nhật chi phí!');
        }
    };

    const deleteExpense = async (id: number) => {
        try {
            await database.deleteExpense(id);
            setExpenses(prev => prev.filter(e => e.id !== id));
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Lỗi xóa chi phí!');
        }
    };

    // ============ SETTINGS ============
    const updateSettings = async (newSettings: Partial<Settings>) => {
        try {
            const updatedSettings = { ...settings, ...newSettings };
            await database.updateSettings(updatedSettings);
            setSettings(updatedSettings);
        } catch (error) {
            console.error('Error updating settings:', error);
            alert('Lỗi cập nhật cài đặt!');
        }
    };

    const value = {
        rooms,
        tenants,
        leases,
        meters,
        readings,
        invoices,
        maintenance,
        expenses,
        settings,
        isLoading,
        // Rooms
        addRoom,
        updateRoom,
        deleteRoom,
        // Tenants
        addTenant,
        updateTenant,
        deleteTenant,
        // Leases
        addLease,
        updateLease,
        deleteLease,
        // Meters
        addMeter,
        updateMeter,
        deleteMeter,
        // Readings
        addReading,
        updateReading,
        deleteReading,
        // Invoices
        addInvoice,
        updateInvoice,
        updateInvoiceStatus,
        deleteInvoice,
        // Maintenance
        addMaintenance,
        updateMaintenance,
        deleteMaintenance,
        // Expenses
        addExpense,
        updateExpense,
        deleteExpense,
        // Settings
        updateSettings,
        // Utilities
        refreshData,
        // Backup & Restore
        exportToDownloads,
        shareDatabase,
        importDatabase,
        // Auto Backup & Reminder
        showBackupReminder,
        handleAutoBackup,
        handleRestoreFromBackup,
    };

    // Show loading state
    if (isLoading) {
        return React.createElement('div', { 
            style: { 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '18px',
                color: '#40BFC1'
            } 
        }, 'Đang khởi tạo ứng dụng...');
    }

    // FIX: Replaced JSX with React.createElement to fix compilation error in a .ts file.
    return React.createElement(AppDataContext.Provider, { value }, children);
};

export const useAppData = (): AppDataContextType => {
    const context = useContext(AppDataContext);
    if (context === undefined) {
        throw new Error('useAppData must be used within an AppProvider');
    }
    return context;
};