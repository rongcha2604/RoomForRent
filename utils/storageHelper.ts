/**
 * Storage Helper Utilities
 * Quản lý và monitor localStorage usage
 */

const STORAGE_KEY = 'nhatro_data';
const WARNING_THRESHOLD = 0.8; // 80% capacity
const CRITICAL_THRESHOLD = 0.95; // 95% capacity

/**
 * Ước tính localStorage limit (tùy browser)
 * Chrome/Firefox: ~5-10MB
 * Safari: ~5MB
 * 
 * Sử dụng giá trị ước tính an toàn để tránh test (gây lag)
 */
function getStorageLimit(): number {
    // Sử dụng giá trị ước tính an toàn: 5MB (bảo thủ nhất)
    // Điều này đảm bảo không bao giờ bị lag do test storage
    return 5 * 1024 * 1024; // 5MB
}

/**
 * Tính kích thước của một object/string (bytes)
 */
function getSizeInBytes(str: string): number {
    return new Blob([str]).size;
}

/**
 * Lấy kích thước hiện tại của localStorage
 * Tối ưu: Chỉ tính một lần và cache nếu có thể
 */
export function getCurrentStorageSize(): number {
    try {
        let totalSize = 0;
        const length = localStorage.length;
        
        // Limit số lượng keys để tính (tránh lag với quá nhiều keys)
        const maxKeys = 100;
        const keysToCheck = Math.min(length, maxKeys);
        
        for (let i = 0; i < keysToCheck; i++) {
            try {
                const key = localStorage.key(i);
                if (key) {
                    const value = localStorage.getItem(key);
                    if (value) {
                        totalSize += getSizeInBytes(key + value);
                    }
                }
            } catch (err) {
                // Skip key nếu có lỗi
                console.warn('Error reading localStorage key:', err);
            }
        }
        
        // Nếu có nhiều keys hơn maxKeys, ước tính thêm
        if (length > maxKeys) {
            const avgSize = totalSize / keysToCheck;
            totalSize += avgSize * (length - keysToCheck);
        }
        
        return totalSize;
    } catch (error) {
        console.error('Error calculating storage size:', error);
        return 0;
    }
}

/**
 * Lấy kích thước của app data cụ thể
 */
export function getAppDataSize(): number {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return 0;
        return getSizeInBytes(data);
    } catch (error) {
        console.error('Error calculating app data size:', error);
        return 0;
    }
}

/**
 * Lấy storage usage information
 */
export function getStorageUsage(): {
    used: number; // bytes
    limit: number; // bytes
    percentage: number; // 0-1
    appDataSize: number; // bytes
    otherSize: number; // bytes
    status: 'healthy' | 'warning' | 'critical';
    statusText: string;
} {
    const used = getCurrentStorageSize();
    const limit = getStorageLimit();
    const percentage = limit > 0 ? used / limit : 0;
    const appDataSize = getAppDataSize();
    const otherSize = used - appDataSize;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let statusText = 'Bình thường';
    
    if (percentage >= CRITICAL_THRESHOLD) {
        status = 'critical';
        statusText = '⚠️ Sắp đầy!';
    } else if (percentage >= WARNING_THRESHOLD) {
        status = 'warning';
        statusText = '⚠️ Gần đầy';
    }
    
    return {
        used,
        limit,
        percentage,
        appDataSize,
        otherSize,
        status,
        statusText
    };
}

/**
 * Format bytes thành readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Kiểm tra có thể lưu thêm data không
 */
export function canStoreData(estimatedSize: number): {
    canStore: boolean;
    availableSpace: number;
    willExceedLimit: boolean;
} {
    const usage = getStorageUsage();
    const availableSpace = usage.limit - usage.used;
    const willExceedLimit = estimatedSize > availableSpace;
    const canStore = !willExceedLimit && usage.status !== 'critical';
    
    return {
        canStore,
        availableSpace,
        willExceedLimit
    };
}

/**
 * Lấy storage health check
 */
export function getStorageHealth(): {
    healthy: boolean;
    message: string;
    recommendation: string;
    usage: ReturnType<typeof getStorageUsage>;
} {
    const usage = getStorageUsage();
    
    let healthy = true;
    let message = 'Bộ nhớ đang sử dụng bình thường';
    let recommendation = '';
    
    if (usage.status === 'critical') {
        healthy = false;
        message = '⚠️ Bộ nhớ sắp đầy! Cần backup và dọn dẹp ngay!';
        recommendation = 'Xuất dữ liệu backup và xóa dữ liệu cũ không cần thiết';
    } else if (usage.status === 'warning') {
        healthy = false;
        message = '⚠️ Bộ nhớ gần đầy. Nên backup sớm.';
        recommendation = 'Xuất dữ liệu backup để giải phóng không gian';
    }
    
    return {
        healthy,
        message,
        recommendation,
        usage
    };
}
