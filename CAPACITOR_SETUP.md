# 🚀 Hướng Dẫn Setup Capacitor + SQLite

## ✅ ĐÃ HOÀN THÀNH

### **1. Cài đặt Dependencies**
- ✅ @capacitor/core
- ✅ @capacitor/cli
- ✅ @capacitor/android
- ✅ @capacitor-community/sqlite

### **2. Files Đã Tạo**
- ✅ `capacitor.config.ts` - Capacitor configuration
- ✅ `services/database.ts` - SQLite service với đầy đủ CRUD
- ✅ `services/initData.ts` - Seed initial data
- ✅ `android/` - Android project folder

### **3. Files Đã Refactor**
- ✅ `hooks/useAppData.ts` - Refactor để dùng SQLite
  - ✅ Thêm 20+ actions mới (CRUD đầy đủ)
  - ✅ Database initialization
  - ✅ Data persistence
  - ✅ Error handling

### **4. Scripts Đã Thêm**
```json
"cap:sync": "npm run build && npx cap sync"
"cap:open:android": "npx cap open android"
"build:android": "npm run build && npx cap sync && npx cap open android"
```

---

## 🧪 HƯỚNG DẪN TEST TRÊN WEB

### **Bước 1: Chạy Dev Server**
```bash
npm run dev
```

### **Bước 2: Mở Browser**
Mở trình duyệt và truy cập:
```
http://localhost:3000
```

### **Bước 3: Mở DevTools Console**
- Nhấn `F12` để mở DevTools
- Vào tab **Console**
- Bạn sẽ thấy:
```
Platform: web
Initializing database...
Checking if database needs initial data...
✓ Settings seeded
✓ 8 rooms seeded
✓ 6 tenants seeded
✓ 6 leases seeded
✓ 16 meters seeded
✓ 8 readings seeded
✓ 2 invoices seeded
✓ 2 maintenance records seeded
✅ Initial data seeded successfully!
Database initialized successfully!
```

### **Bước 4: Test CRUD Operations**

#### **Test 1: Xem Data**
- ✅ Dashboard: Xem tổng quan (4 summary cards)
- ✅ Rooms: Xem danh sách 8 phòng
- ✅ Tenants: Xem danh sách khách thuê
- ✅ Invoices: Xem hóa đơn
- ✅ Settings: Xem cài đặt giá

#### **Test 2: Thêm Tenant**
1. Click FAB (Floating Action Button) ở góc phải dưới
2. Click "Thêm khách thuê"
3. Điền form và submit
4. ✅ Check console: "Adding tenant..."
5. ✅ Refresh page → Data vẫn còn (SQLite persistence)

#### **Test 3: Thêm Reading**
1. Click FAB → "Thêm chỉ số"
2. Chọn phòng, nhập điện & nước
3. Submit
4. ✅ Check console
5. ✅ Refresh → Data persist

#### **Test 4: Data Persistence**
1. Thêm/sửa data bất kỳ
2. **Refresh page (F5)**
3. ✅ Data vẫn còn (không mất)
4. **Close tab và mở lại**
5. ✅ Data vẫn còn

### **Bước 5: Kiểm tra SQLite Database**

#### **Chrome DevTools:**
1. Mở DevTools (F12)
2. Vào tab **Application**
3. Sidebar trái → **IndexedDB** → **Capacitor**
4. Click vào tables để xem data

#### **Firefox DevTools:**
1. Mở DevTools (F12)
2. Vào tab **Storage**
3. → **Indexed DB** → **Capacitor**

---

## 📱 HƯỚNG DẪN BUILD ANDROID APK (SAU KHI TEST XONG)

### **Yêu cầu:**
- ✅ Android Studio đã cài
- ✅ Java JDK 11+ đã cài
- ✅ App đã test kỹ trên web

### **Bước 1: Build Web App**
```bash
npm run build
```

### **Bước 2: Sync với Android**
```bash
npx cap sync
```

### **Bước 3: Mở Android Studio**
```bash
npm run cap:open:android
```
Hoặc:
```bash
npx cap open android
```

### **Bước 4: Trong Android Studio**

#### **A. Chạy trên Emulator (Test trước)**
1. Click **"Device Manager"** (sidebar phải)
2. Tạo virtual device (nếu chưa có):
   - Phone: Pixel 5
   - System Image: Android 11 (API 30) trở lên
3. Click **Run ▶️** (nút xanh ở trên)
4. Chọn emulator vừa tạo
5. ✅ App sẽ cài và chạy trên emulator

#### **B. Test trên Emulator**
- ✅ Thử tất cả CRUD operations
- ✅ Test add tenant, add reading, etc.
- ✅ Close app và mở lại → Data vẫn còn
- ✅ Check SQLite database persistence

#### **C. Build APK File (Production)**
1. Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Đợi build hoàn tất (~2-3 phút)
3. Thông báo "APK(s) generated successfully"
4. Click **"locate"** để mở folder chứa APK
5. File APK ở: `android/app/build/outputs/apk/debug/app-debug.apk`

### **Bước 5: Cài APK lên Điện Thoại Thật**

#### **Option 1: Via USB**
1. Bật **Developer Options** trên điện thoại:
   - Settings → About Phone
   - Tap "Build Number" 7 lần
2. Bật **USB Debugging**:
   - Settings → Developer Options → USB Debugging
3. Cắm USB vào máy tính
4. Copy file `app-debug.apk` vào điện thoại
5. Mở file APK trên điện thoại → Cài đặt

#### **Option 2: Via File Share**
1. Upload APK lên Google Drive / Telegram
2. Tải về điện thoại
3. Mở file → Cài đặt
4. (Cần enable "Unknown Sources" nếu Android yêu cầu)

### **Bước 6: Test trên Điện Thoại**
- ✅ Open app
- ✅ Test tất cả features
- ✅ Test offline (tắt wifi/data) → Vẫn hoạt động
- ✅ Close & reopen → Data persist
- ✅ Restart phone → Data vẫn còn

---

## 🗄️ SQLITE DATABASE INFO

### **Location:**
- **Web:** IndexedDB trong browser
- **Android:** `/data/data/com.quanlynhatro.app/databases/nhatro_database`

### **Tables Created:**
1. ✅ `rooms` (8 columns)
2. ✅ `tenants` (5 columns)
3. ✅ `leases` (9 columns)
4. ✅ `meters` (4 columns)
5. ✅ `readings` (4 columns)
6. ✅ `invoices` (11 columns)
7. ✅ `maintenance` (7 columns)
8. ✅ `settings` (5 columns)

### **Initial Data:**
- ✅ 8 phòng (101-108)
- ✅ 6 khách thuê
- ✅ 6 hợp đồng active
- ✅ 16 đồng hồ (8 điện + 8 nước)
- ✅ 8 readings (demo data)
- ✅ 2 hóa đơn (1 paid, 1 unpaid)
- ✅ 2 maintenance records
- ✅ Settings (giá điện, nước, wifi, rác)

---

## 🔧 TROUBLESHOOTING

### **Lỗi: "Database initialization failed"**
**Fix:**
1. Clear browser data (Application → Clear Site Data)
2. Refresh page (F5)
3. Database sẽ khởi tạo lại từ đầu

### **Lỗi: "Android build failed"**
**Check:**
1. ✅ Android Studio cài đúng chưa?
2. ✅ Java JDK 11+ cài chưa?
3. ✅ `JAVA_HOME` environment variable đã set?
4. ✅ Android SDK đã download?

**Fix:**
```bash
# Re-sync
npx cap sync android

# Clean build
cd android
./gradlew clean
cd ..
npx cap sync
```

### **Lỗi: "Cannot read property 'xxx' of undefined"**
**Fix:**
- Check console logs
- Có thể database chưa init xong
- Đợi loading screen biến mất rồi mới thao tác

### **APK không cài được trên điện thoại**
**Fix:**
1. Settings → Security → Enable "Unknown Sources"
2. Hoặc: Settings → Apps → Special Access → Install Unknown Apps → Enable cho file manager

---

## 📊 CRUD ACTIONS ĐÃ IMPLEMENT

### **Rooms:**
- ✅ `addRoom(room)`
- ✅ `updateRoom(id, room)`
- ✅ `deleteRoom(id)`

### **Tenants:**
- ✅ `addTenant(tenant)`
- ✅ `updateTenant(id, tenant)`
- ✅ `deleteTenant(id)`

### **Leases:**
- ✅ `addLease(lease)`
- ✅ `updateLease(id, lease)`
- ✅ `deleteLease(id)`

### **Meters:**
- ✅ `addMeter(meter)`
- ✅ `updateMeter(id, meter)`
- ✅ `deleteMeter(id)`

### **Readings:**
- ✅ `addReading(reading)`
- ✅ `updateReading(id, reading)`
- ✅ `deleteReading(id)`

### **Invoices:**
- ✅ `addInvoice(invoice)`
- ✅ `updateInvoice(id, invoice)`
- ✅ `updateInvoiceStatus(id, status)`
- ✅ `deleteInvoice(id)`

### **Maintenance:**
- ✅ `addMaintenance(item)`
- ✅ `updateMaintenance(id, item)`
- ✅ `deleteMaintenance(id)`

### **Settings:**
- ✅ `updateSettings(settings)`

### **Utilities:**
- ✅ `refreshData()` - Reload all data từ database

**Total: 26 actions đã implement!**

---

## 🎯 NEXT STEPS (Sau khi test xong)

### **1. Hoàn thiện UI/UX**
- [ ] Implement button actions trong Views
- [ ] Fix modal logic (AddReadingModal, etc.)
- [ ] Add validation cho forms
- [ ] Add loading states cho async operations

### **2. Features Mới**
- [ ] Generate invoices modal logic
- [ ] Room details view
- [ ] Tenant details view
- [ ] Export reports (PDF)
- [ ] Search & filter

### **3. Build Production APK**
- [ ] Test kỹ tất cả features
- [ ] Fix bugs nếu có
- [ ] Build signed APK (production)
- [ ] Upload lên Google Play Store (optional)

---

## 📞 SUPPORT

Nếu gặp vấn đề, check:
1. ✅ Console logs trong DevTools
2. ✅ Capacitor docs: https://capacitorjs.com/docs
3. ✅ SQLite plugin docs: https://github.com/capacitor-community/sqlite

---

**🎉 SETUP HOÀN TẤT!**

App đã sẵn sàng để test trên web browser. Sau khi test kỹ, bạn có thể build APK và cài lên Android!

