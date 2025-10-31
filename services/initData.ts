import { localDb as database } from './localStorageDb';
import {
    INITIAL_ROOMS, INITIAL_TENANTS, INITIAL_LEASES, INITIAL_METERS, 
    INITIAL_READINGS, INITIAL_INVOICES, INITIAL_MAINTENANCE, INITIAL_SETTINGS
} from '../constants';

/**
 * Seed initial data vào database
 * Chỉ chạy khi database còn trống
 */
export async function seedInitialData(): Promise<void> {
    try {
        console.log('Checking if database needs initial data...');

        // Check if data already exists (MUST check first to avoid race condition)
        const existingRooms = await database.getAllRooms();
        if (existingRooms.length > 0) {
            console.log('Database already has data, skipping seed');
            // Clean up skip seed flag if it exists
            localStorage.removeItem('nhatro_skip_seed');
            return;
        }

        // Check skip seed flag (set when user manually clears all data)
        const skipSeed = localStorage.getItem('nhatro_skip_seed');
        if (skipSeed) {
            console.log('🚫 Skip seed flag detected - user wants empty database');
            // DON'T remove flag here - it will be removed when user adds first room/tenant
            console.log('✅ Database will remain empty (user preference)');
            return;
        }

        console.log('Seeding initial data...');

        // Seed Settings first
        await database.updateSettings(INITIAL_SETTINGS);
        console.log('✓ Settings seeded');

        // Seed Rooms
        for (const room of INITIAL_ROOMS) {
            await database.addRoom(room);
        }
        console.log(`✓ ${INITIAL_ROOMS.length} rooms seeded`);

        // Seed Meters (đồng hồ điện/nước cho mỗi phòng)
        for (const meter of INITIAL_METERS) {
            await database.addMeter(meter);
        }
        console.log(`✓ ${INITIAL_METERS.length} meters seeded`);

        // NOTE: Không seed tenants, leases, readings, invoices, maintenance
        // Chỉ tạo 8 phòng trống, user sẽ thêm khách thuê và hợp đồng sau

        console.log('✅ Initial data seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding initial data:', error);
        throw error;
    }
}

