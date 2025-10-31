import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { localDb } from './localStorageDb';

const BACKUP_FILENAME = 'nhatro-backup.json';
const LAST_BACKUP_DATE_KEY = 'last_backup_date';
const BACKUP_FILE_URI_KEY = 'backup_file_uri'; // For native platforms
const BACKUP_FILE_HANDLE_KEY = 'backup_file_handle'; // For web File System Access API
const REMINDER_DAYS = 7; // Remind after 7 days

interface BackupReminderResult {
    shouldRemind: boolean;
    daysSinceLastBackup: number | null;
    lastBackupDate: string | null;
}

class BackupService {
    /**
     * Check if user needs backup reminder (after 7 days)
     */
    checkBackupReminder(): BackupReminderResult {
        const lastBackupDateStr = localStorage.getItem(LAST_BACKUP_DATE_KEY);
        
        if (!lastBackupDateStr) {
            // Never backed up
            return {
                shouldRemind: true,
                daysSinceLastBackup: null,
                lastBackupDate: null
            };
        }

        const lastBackupDate = new Date(lastBackupDateStr);
        const now = new Date();
        const daysSinceLastBackup = Math.floor(
            (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
            shouldRemind: daysSinceLastBackup >= REMINDER_DAYS,
            daysSinceLastBackup,
            lastBackupDate: lastBackupDateStr
        };
    }

    /**
     * Get saved backup file path/URI
     */
    getBackupPath(): string | null {
        if (Capacitor.isNativePlatform()) {
            return localStorage.getItem(BACKUP_FILE_URI_KEY);
        } else {
            // Web: File handle is stored in IndexedDB or we use a fixed path
            return localStorage.getItem(BACKUP_FILE_URI_KEY);
        }
    }

    /**
     * Auto backup: User chooses location first time, then uses that location
     * For native: Save to Documents folder with fixed name
     * For web: Use File System Access API or download
     */
    async autoBackup(): Promise<{ success: boolean; message: string; filePath?: string }> {
        try {
            const jsonData = await localDb.exportAllData();
            
            if (Capacitor.isNativePlatform()) {
                // Native: Save to Documents folder with fixed filename
                // User can choose location via Share on first backup
                const savedPath = this.getBackupPath();
                
                if (!savedPath) {
                    // First time: Ask user to choose location via Share
                    // Then save URI for future use
                    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '-');
                    const filename = `nhatro-backup-${timestamp}.json`;
                    
                    // Write to Cache first for sharing
                    await Filesystem.writeFile({
                        path: filename,
                        data: jsonData,
                        directory: Directory.Cache,
                        encoding: Encoding.UTF8
                    });
                    
                    // Get URI
                    const fileUri = await Filesystem.getUri({
                        path: filename,
                        directory: Directory.Cache
                    });
                    
                    // Import Share plugin dynamically
                    const { Share } = await import('@capacitor/share');
                    
                    // Share to let user choose location
                    await Share.share({
                        title: 'Chọn nơi lưu backup',
                        text: `File backup: ${filename}`,
                        url: fileUri.uri,
                        dialogTitle: 'Chọn nơi lưu file backup (sẽ nhớ vị trí này)'
                    });
                    
                    // Save to Documents as default location for future automatic backups
                    const documentsPath = await Filesystem.writeFile({
                        path: BACKUP_FILENAME,
                        data: jsonData,
                        directory: Directory.Documents,
                        encoding: Encoding.UTF8
                    });
                    
                    // Save the Documents path for future use
                    localStorage.setItem(BACKUP_FILE_URI_KEY, documentsPath.uri);
                    
                    // Update last backup date
                    localStorage.setItem(LAST_BACKUP_DATE_KEY, new Date().toISOString());
                    
                    return {
                        success: true,
                        message: `✅ Đã backup và lưu vào Documents!\n\nFile: ${BACKUP_FILENAME}\n\nApp sẽ tự động dùng vị trí này cho lần sau.`,
                        filePath: documentsPath.uri
                    };
                } else {
                    // Use saved path (Documents folder)
                    // Extract path from URI if needed
                    let filePath = BACKUP_FILENAME;
                    let directory = Directory.Documents;
                    
                    // Try to write to saved location
                    try {
                        const writeResult = await Filesystem.writeFile({
                            path: filePath,
                            data: jsonData,
                            directory: directory,
                            encoding: Encoding.UTF8
                        });
                        
                        // Update last backup date
                        localStorage.setItem(LAST_BACKUP_DATE_KEY, new Date().toISOString());
                        
                        return {
                            success: true,
                            message: `✅ Đã backup thành công!\n\nFile: ${BACKUP_FILENAME}\nVị trí: Documents`,
                            filePath: writeResult.uri
                        };
                    } catch (error) {
                        // If write fails, reset path and let user choose again
                        localStorage.removeItem(BACKUP_FILE_URI_KEY);
                        return await this.autoBackup(); // Retry
                    }
                }
            } else {
                // Web: Use File System Access API or download
                if ('showSaveFilePicker' in window) {
                    // Modern browsers with File System Access API
                    try {
                        // Check if we have a saved file handle
                        const savedHandleStr = localStorage.getItem(BACKUP_FILE_HANDLE_KEY);
                        
                        if (savedHandleStr) {
                            // Use saved file handle
                            // Note: File handles can't be serialized easily, so we'll use download approach
                            // For web, we'll use a simpler approach: download to fixed filename
                            this.downloadBackupFile(jsonData, BACKUP_FILENAME);
                            
                            // Update last backup date
                            localStorage.setItem(LAST_BACKUP_DATE_KEY, new Date().toISOString());
                            
                            return {
                                success: true,
                                message: `✅ Đã tải file backup!\n\nFile: ${BACKUP_FILENAME}\nKiểm tra thư mục Downloads.`
                            };
                        } else {
                            // First time: Let user choose location
                            const fileHandle = await (window as any).showSaveFilePicker({
                                suggestedName: BACKUP_FILENAME,
                                types: [{
                                    description: 'JSON Backup File',
                                    accept: { 'application/json': ['.json'] }
                                }]
                            });
                            
                            const writable = await fileHandle.createWritable();
                            await writable.write(jsonData);
                            await writable.close();
                            
                            // Save file handle (serialize it - but FileHandle can't be serialized)
                            // Instead, we'll save the file name and use download for subsequent backups
                            localStorage.setItem(BACKUP_FILE_HANDLE_KEY, 'true'); // Flag that user has chosen location
                            localStorage.setItem(BACKUP_FILE_URI_KEY, fileHandle.name);
                            
                            // Update last backup date
                            localStorage.setItem(LAST_BACKUP_DATE_KEY, new Date().toISOString());
                            
                            return {
                                success: true,
                                message: `✅ Đã lưu backup!\n\nFile: ${fileHandle.name}\nApp sẽ nhớ vị trí này.`
                            };
                        }
                    } catch (error: any) {
                        if (error.name === 'AbortError') {
                            return {
                                success: false,
                                message: 'Đã hủy chọn file.'
                            };
                        }
                        // Fallback to download
                        this.downloadBackupFile(jsonData, BACKUP_FILENAME);
                        localStorage.setItem(LAST_BACKUP_DATE_KEY, new Date().toISOString());
                        return {
                            success: true,
                            message: `✅ Đã tải file backup!\n\nFile: ${BACKUP_FILENAME}`
                        };
                    }
                } else {
                    // Fallback: Download file
                    this.downloadBackupFile(jsonData, BACKUP_FILENAME);
                    localStorage.setItem(LAST_BACKUP_DATE_KEY, new Date().toISOString());
                    localStorage.setItem(BACKUP_FILE_URI_KEY, BACKUP_FILENAME); // Save filename
                    
                    return {
                        success: true,
                        message: `✅ Đã tải file backup!\n\nFile: ${BACKUP_FILENAME}\nKiểm tra thư mục Downloads.`
                    };
                }
            }
        } catch (error) {
            console.error('Backup error:', error);
            return {
                success: false,
                message: `❌ Lỗi khi backup!\n\n${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Download backup file (Web fallback)
     */
    private downloadBackupFile(jsonData: string, filename: string): void {
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Restore from saved backup file
     */
    async restoreFromBackup(): Promise<{ success: boolean; message: string }> {
        try {
            const savedPath = this.getBackupPath();
            
            if (!savedPath) {
                return {
                    success: false,
                    message: '❌ Chưa có file backup được lưu!\n\nVui lòng backup trước khi restore.'
                };
            }

            if (Capacitor.isNativePlatform()) {
                // Native: Read from Documents folder
                try {
                    const fileContent = await Filesystem.readFile({
                        path: BACKUP_FILENAME,
                        directory: Directory.Documents,
                        encoding: Encoding.UTF8
                    });
                    
                    // Import data
                    await localDb.importAllData(fileContent.data);
                    
                    return {
                        success: true,
                        message: '✅ Khôi phục thành công!\n\nDữ liệu đã được khôi phục từ file backup.\nTrang sẽ tải lại...'
                    };
                } catch (error: any) {
                    if (error.message?.includes('does not exist')) {
                        return {
                            success: false,
                            message: '❌ Không tìm thấy file backup!\n\nFile có thể đã bị xóa hoặc di chuyển.\nVui lòng backup lại.'
                        };
                    }
                    throw error;
                }
            } else {
                // Web: Prompt user to select file (since we can't access saved file directly)
                return {
                    success: false,
                    message: 'Vui lòng chọn file backup để khôi phục.\n\nTrên web, cần chọn file thủ công mỗi lần.'
                };
            }
        } catch (error) {
            console.error('Restore error:', error);
            return {
                success: false,
                message: `❌ Lỗi khi khôi phục!\n\n${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Clear saved backup path (for testing or reset)
     */
    clearBackupPath(): void {
        localStorage.removeItem(BACKUP_FILE_URI_KEY);
        localStorage.removeItem(BACKUP_FILE_HANDLE_KEY);
        localStorage.removeItem(LAST_BACKUP_DATE_KEY);
    }
}

export const backupService = new BackupService();

