# 📚 Hướng Dẫn Đầy Đủ: Setup Git & Push Code Lên GitHub

## 🎯 Mục Đích
Đưa code của bạn lên GitHub để lưu trữ và có thể deploy lên Vercel tự động.

---

## 📋 BƯỚC 1: Cài Đặt Git (Nếu Chưa Có)

### Kiểm tra Git đã cài chưa:
Mở **Command Prompt** hoặc **PowerShell** và gõ:
```bash
git --version
```

### Nếu chưa có Git:
1. Tải Git tại: https://git-scm.com/download/win
2. Cài đặt với tất cả options mặc định
3. Sau khi cài xong, mở lại Command Prompt

---

## 📋 BƯỚC 2: Cấu Hình Git (Chỉ Làm 1 Lần)

Mở **Command Prompt** và chạy 2 lệnh sau (thay thông tin của bạn):

```bash
git config --global user.name "Tên Của Bạn"
git config --global user.email "email-cua-ban@gmail.com"
```

**Ví dụ:**
```bash
git config --global user.name "Nguyen Van A"
git config --global user.email "nguyenvana@gmail.com"
```

**✅ Kiểm tra:**
```bash
git config --global user.name
git config --global user.email
```

---

## 📋 BƯỚC 3: Khởi Tạo Git Repository Trong Project

### 3.1. Mở Command Prompt tại thư mục project

**Cách 1: Mở trực tiếp**
1. Mở File Explorer
2. Điều hướng đến thư mục: `D:\HocTapLTHT\Dự án đã hoàn tất\QuanLyNhaTro-VIP`
3. Click vào thanh địa chỉ, gõ `cmd` và nhấn Enter

**Cách 2: Dùng cd**
Mở Command Prompt bất kỳ và gõ:
```bash
cd /d "D:\HocTapLTHT\Dự án đã hoàn tất\QuanLyNhaTro-VIP"
```

### 3.2. Khởi tạo Git repository

```bash
git init
```

**Kết quả:** Sẽ hiện: `Initialized empty Git repository in ...`

### 3.3. Thêm tất cả files vào Git

```bash
git add .
```

**Giải thích:** Lệnh này thêm TẤT CẢ files trong project vào staging area (chuẩn bị commit)

### 3.4. Commit lần đầu

```bash
git commit -m "Initial commit: QuanLyNhaTro app"
```

**Giải thích:** 
- `commit` = Lưu lại snapshot của code tại thời điểm này
- `-m "..."` = Message mô tả commit này

---

## 📋 BƯỚC 4: Tạo Repository Trên GitHub

### 4.1. Đăng nhập GitHub
1. Mở trình duyệt: https://github.com
2. Đăng nhập vào tài khoản của bạn (hoặc tạo tài khoản mới)

### 4.2. Tạo repository mới
1. Click nút **"+"** ở góc trên bên phải
2. Chọn **"New repository"**

### 4.3. Điền thông tin
- **Repository name:** `QuanLy-NhaTro` (hoặc tên khác bạn muốn)
- **Description:** `Ứng dụng quản lý nhà trọ - React + Vite + Capacitor` (tùy chọn)
- **Visibility:** Chọn **Public** hoặc **Private** (tùy bạn)
- ⚠️ **QUAN TRỌNG:** 
  - ❌ **KHÔNG** check "Add a README file"
  - ❌ **KHÔNG** check "Add .gitignore" 
  - ❌ **KHÔNG** check "Choose a license"
  - (Vì project đã có sẵn các file này rồi)

### 4.4. Click **"Create repository"**

Sau khi tạo xong, GitHub sẽ hiện trang hướng dẫn. **ĐỪNG LÀM THEO**, chúng ta sẽ dùng cách khác ở bước tiếp theo.

---

## 📋 BƯỚC 5: Kết Nối Local Repository Với GitHub

### 5.1. Copy URL repository trên GitHub

Sau khi tạo repository, bạn sẽ thấy URL như này:
```
https://github.com/USERNAME/QuanLy-NhaTro.git
```

**Ví dụ:** `https://github.com/rongcha2604/QuanLy-NhaTro.git`

### 5.2. Thêm remote origin

Quay lại Command Prompt và chạy (thay URL bằng URL của bạn):

```bash
git remote add origin https://github.com/USERNAME/QuanLy-NhaTro.git
```

**Ví dụ:**
```bash
git remote add origin https://github.com/rongcha2604/QuanLy-NhaTro.git
```

### 5.3. Kiểm tra remote đã thêm chưa

```bash
git remote -v
```

**Kết quả mong đợi:**
```
origin  https://github.com/USERNAME/QuanLy-NhaTro.git (fetch)
origin  https://github.com/USERNAME/QuanLy-NhaTro.git (push)
```

---

## 📋 BƯỚC 6: Đổi Branch Thành "main" (Nếu Cần)

Git mặc định dùng branch `master`, nhưng GitHub mới dùng `main`. Để đồng bộ:

```bash
git branch -M main
```

**Giải thích:** Đổi tên branch hiện tại thành `main`

**Kiểm tra:**
```bash
git branch
```

Sẽ thấy: `* main`

---

## 📋 BƯỚC 7: Push Code Lên GitHub

### 7.1. Push lần đầu

```bash
git push -u origin main
```

**Giải thích:**
- `push` = Đẩy code lên GitHub
- `-u origin main` = Set upstream branch (lần sau chỉ cần `git push`)

### 7.2. GitHub sẽ yêu cầu đăng nhập

Có 2 cách:

**Cách 1: Dùng Personal Access Token (Khuyến nghị)**
1. GitHub sẽ hỏi username và password
2. Username: Nhập username GitHub của bạn
3. Password: **KHÔNG** dùng password GitHub, mà dùng **Personal Access Token**

**Tạo Personal Access Token:**
1. Vào GitHub → Settings (góc trên bên phải, click avatar)
2. Ở menu bên trái, scroll xuống, click **"Developer settings"**
3. Click **"Personal access tokens"** → **"Tokens (classic)"**
4. Click **"Generate new token"** → **"Generate new token (classic)"**
5. Đặt tên: `QuanLyNhaTro` (hoặc tên khác)
6. Chọn **expiration**: `90 days` (hoặc `No expiration`)
7. Check các quyền:
   - ✅ `repo` (Full control of private repositories)
8. Click **"Generate token"**
9. **QUAN TRỌNG:** Copy token ngay (chỉ hiện 1 lần!), ví dụ: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
10. Dán token này khi Git hỏi password

**Cách 2: Dùng GitHub Desktop (Dễ hơn)**
1. Tải GitHub Desktop: https://desktop.github.com
2. Cài đặt và đăng nhập
3. Dùng GitHub Desktop để push code (UI dễ dùng hơn)

### 7.3. Chờ upload xong

Git sẽ upload từng file, chờ đến khi thấy:
```
Enumerating objects: XX, done.
Counting objects: 100% (XX/XX), done.
Delta compression using up to X threads
Compressing objects: 100% (XX/XX), done.
Writing objects: 100% (XX/XX), XXX KiB | XXX.XX MiB/s, done.
To https://github.com/USERNAME/QuanLy-NhaTro.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

**✅ Thành công!** Code đã lên GitHub!

---

## 📋 BƯỚC 8: Kiểm Tra Trên GitHub

1. Mở trình duyệt, vào: `https://github.com/USERNAME/QuanLy-NhaTro`
2. Bạn sẽ thấy tất cả code của mình trên đó!

---

## 🔄 CÁC LẦN SAU: Cập Nhật Code Lên GitHub

Khi bạn thay đổi code và muốn cập nhật lên GitHub:

### Bước 1: Kiểm tra thay đổi
```bash
git status
```

### Bước 2: Thêm files thay đổi
```bash
git add .
```

### Bước 3: Commit
```bash
git commit -m "Mô tả thay đổi"
```

**Ví dụ:**
```bash
git commit -m "Fix: Sửa lỗi đăng nhập"
git commit -m "Feat: Thêm tính năng backup"
```

### Bước 4: Push
```bash
git push
```

**Xong!** Code mới đã được cập nhật lên GitHub.

---

## 🐛 XỬ LÝ LỖI THƯỜNG GẶP

### ❌ Lỗi: "fatal: not a git repository"

**Nguyên nhân:** Bạn đang ở thư mục sai

**Giải pháp:**
```bash
cd /d "D:\HocTapLTHT\Dự án đã hoàn tất\QuanLyNhaTro-VIP"
git status
```

### ❌ Lỗi: "error: remote origin already exists"

**Nguyên nhân:** Đã thêm remote rồi

**Giải pháp:** Xóa và thêm lại
```bash
git remote remove origin
git remote add origin https://github.com/USERNAME/QuanLy-NhaTro.git
```

### ❌ Lỗi: "Permission denied (publickey)" hoặc "Authentication failed"

**Nguyên nhân:** Chưa đăng nhập đúng

**Giải pháp:**
1. Dùng Personal Access Token (xem Bước 7.2)
2. Hoặc cấu hình SSH key (phức tạp hơn)

### ❌ Lỗi: "Updates were rejected because the remote contains work..."

**Nguyên nhân:** GitHub có code mới mà local chưa có

**Giải pháp:**
```bash
git pull origin main --allow-unrelated-histories
git push
```

Nếu vẫn lỗi, có thể force push (cẩn thận!):
```bash
git push -u origin main --force
```

---

## 📝 TÓM TẮT QUY TRÌNH (Quick Reference)

### Lần đầu setup:
```bash
# 1. Cấu hình Git (1 lần duy nhất)
git config --global user.name "Tên Bạn"
git config --global user.email "email@example.com"

# 2. Khởi tạo repository
cd /d "D:\HocTapLTHT\Dự án đã hoàn tất\QuanLyNhaTro-VIP"
git init
git add .
git commit -m "Initial commit"

# 3. Kết nối với GitHub
git remote add origin https://github.com/USERNAME/REPO-NAME.git
git branch -M main
git push -u origin main
```

### Cập nhật code (các lần sau):
```bash
git add .
git commit -m "Mô tả thay đổi"
git push
```

---

## ✅ CHECKLIST

Trước khi push, đảm bảo:
- [ ] Đã cấu hình Git (user.name và user.email)
- [ ] Đã khởi tạo repository (`git init`)
- [ ] Đã thêm remote origin (URL đúng)
- [ ] Đã commit code
- [ ] Đã có Personal Access Token (nếu dùng HTTPS)
- [ ] Đã kiểm tra code không có lỗi

---

## 💡 TIPS

1. **Commit thường xuyên:** Mỗi khi hoàn thành một tính năng, commit ngay
2. **Commit message rõ ràng:** 
   - ✅ Tốt: `"Fix: Sửa lỗi tính tiền sai"`
   - ❌ Xấu: `"update"`
3. **Không commit file nhạy cảm:** `.env`, passwords, keys, etc.
4. **Dùng `.gitignore`:** File này đã có trong project, sẽ tự động bỏ qua `node_modules/`, `.env`, etc.
5. **Branch:** Nếu làm việc nhóm, nên tạo branch mới cho mỗi feature

---

## 🎓 HỌC THÊM

- **Git Basics:** https://git-scm.com/book/en/v2
- **GitHub Guide:** https://guides.github.com
- **Git Commands Cheat Sheet:** https://education.github.com/git-cheat-sheet-education.pdf

---

**🎉 Chúc bạn thành công!**

Nếu gặp vấn đề, hãy đọc lại phần "XỬ LÝ LỖI THƯỜNG GẶP" hoặc tìm kiếm trên Google với từ khóa lỗi.

