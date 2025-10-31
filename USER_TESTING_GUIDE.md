# 🎯 HƯỚNG DẪN TEST CHO USER - Quản Lý Nhà Trọ VIP

**Ngày:** 2025-10-29  
**Trạng thái:** ✅ **READY TO TEST**

---

## ✅ ĐÃ FIX XONG!

### **Vấn đề đã được giải quyết:**
- ✅ Thêm `jeep-sqlite` web component vào `index.html`
- ✅ Cập nhật `database.ts` để khởi tạo đúng cách
- ✅ Build thành công
- ✅ Dev server đang chạy với code mới (HMR tự động update)

---

## 🧪 CÁCH TEST NGAY (5 PHÚT)

### **Bước 1: Refresh Browser** 🔄

```
1. Đang mở tab localhost:3000 không?
2. Nhấn Ctrl + Shift + R (Hard refresh)
3. Hoặc F5 (Normal refresh)
```

### **Bước 2: Mở Console để Xem Logs** 📋

```
1. Nhấn F12 (mở DevTools)
2. Click tab "Console"
3. Xem logs hiển thị
```

**✅ LOGS ĐÚNG sẽ giống thế này:**

```
Platform: web
Initializing jeep-sqlite for web...
jeep-sqlite element ready
Web store initialized
Initializing database...
Checking if database needs initial data...
Seeding initial data...
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
✅ Database initialized successfully
```

**❌ NẾU VẪN BỊ LỖI:** Báo mình ngay, mình sẽ debug tiếp!

### **Bước 3: Kiểm tra UI Hiển thị** 👀

**✅ Dashboard phải hiện:**
- 4 Summary Cards:
  - Phòng đang thuê: 6/8
  - Khách thuê: 6
  - Hóa đơn chưa thu: (số lượng)
  - Công nợ: (số tiền)
- Danh sách hóa đơn cần thu (nếu có)

**✅ Bottom Navigation phải có 5 tabs:**
- Tổng quan (active - màu xanh)
- Phòng
- Hóa đơn
- Khách
- Cài đặt

**✅ FAB (nút tròn góc phải dưới) phải hiện**

---

## 🧪 TEST NHANH (3 TEST CASES QUAN TRỌNG)

### **TEST 1: Navigation** ⏱️ 30 giây

```
1. Click "Phòng" → Xem 8 phòng hiện ra
2. Click "Khách" → Xem danh sách khách
3. Click "Hóa đơn" → Xem danh sách hóa đơn
4. Click "Cài đặt" → Xem form cài đặt giá
5. Click "Tổng quan" → Về Dashboard

✅ PASS: Tất cả views load được, không lỗi
❌ FAIL: View nào không load hoặc bị lỗi
```

### **TEST 2: Add Tenant** ⏱️ 1 phút

```
1. Click FAB (nút góc phải dưới)
2. Click "Thêm khách thuê"
3. Điền form:
   - Họ tên: Nguyễn Văn Test
   - Số điện thoại: 0909123456
   - CMND: 123456789012
4. Click "Lưu lại"
5. Check Console: Không có lỗi đỏ
6. Click tab "Khách" → Xem có "Nguyễn Văn Test" không

✅ PASS: Tenant được thêm, hiện trong list
❌ FAIL: Lỗi hoặc không thấy tenant mới
```

### **TEST 3: Data Persistence** ⏱️ 30 giây

```
1. Sau khi add tenant (TEST 2)
2. Nhấn F5 (refresh page)
3. Đợi app load lại
4. Check Console: Phải thấy "Database already has data, skipping seed"
5. Click tab "Khách" → Xem "Nguyễn Văn Test" còn không

✅ PASS: Data vẫn còn sau refresh!
❌ FAIL: Data mất sau refresh
```

---

## 🔍 CHECK DATABASE (BONUS)

**Để xem SQLite database:**

```
1. DevTools đang mở (F12)
2. Click tab "Application" (Chrome) hoặc "Storage" (Firefox)
3. Sidebar trái → "IndexedDB"
4. Mở "Capacitor"
5. Xem các tables:
   - rooms (8 rows)
   - tenants (6+ rows)
   - leases (6 rows)
   - meters (16 rows)
   - readings (8+ rows)
   - invoices (2+ rows)
   - maintenance (2 rows)
   - settings (1 row)
```

**✅ Thấy tables + data = SQLite hoạt động perfect!**

---

## 📊 CHECKLIST CUỐI CÙNG

```
☐ App load thành công (không stuck)
☐ Dashboard hiện đầy đủ
☐ Bottom Nav hoạt động
☐ Console không có lỗi đỏ
☐ Add Tenant thành công
☐ Data persist sau refresh
☐ Thấy IndexedDB có data
```

**✅ Tất cả check = PASS → Ready to use!**

---

## 🎉 NẾU PASS TẤT CẢ

**Chúc mừng! App đã hoạt động hoàn hảo!** 🎊

**Bạn có thể:**
1. ✅ Tiếp tục test các features khác
2. ✅ Thêm/sửa/xóa data thử
3. ✅ Build APK cho Android (khi sẵn sàng)

**Hướng dẫn build APK:** Xem file `CAPACITOR_SETUP.md`

---

## ❌ NẾU FAIL BẤT KỲ TEST NÀO

**Báo mình ngay với thông tin:**

1. Test case nào fail? (TEST 1, 2, hoặc 3)
2. Console có lỗi gì? (Copy paste toàn bộ lỗi đỏ)
3. Screenshot màn hình

Mình sẽ debug và fix tiếp!

---

## 📞 SUPPORT

**Nếu cần help:**
- ✅ Paste console logs
- ✅ Screenshot UI
- ✅ Mô tả chi tiết vấn đề

Mình sẽ giúp bạn resolve ngay!

---

**🚀 GOOD LUCK & HAPPY TESTING!**

*P/S: File QA_TEST_REPORT.md có 12 test cases chi tiết nếu bạn muốn test kỹ hơn!*

