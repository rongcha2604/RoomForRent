# Hướng dẫn Build APK cho Android

## Yêu cầu:

1. ✅ **Java JDK 17** (đã có trong project)
2. ✅ **Android Studio** (để build release APK) hoặc **Gradle command line**
3. ✅ **Android SDK** (thường đi kèm Android Studio)

## Cách 1: Build Debug APK (Nhanh - Test)

### Bước 1: Build web app
```bash
npm run build
```

### Bước 2: Sync với Capacitor
```bash
npx cap sync android
```

### Bước 3: Build Debug APK
```bash
cd android
.\gradlew assembleDebug
```

**APK sẽ có tại:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Cách 2: Build Release APK (Để publish/install)

### Bước 1: Build web app
```bash
npm run build
```

### Bước 2: Sync với Capacitor
```bash
npx cap sync android
```

### Bước 3: Tạo keystore (chỉ lần đầu)

**QUAN TRỌNG:** Lưu lại password và file keystore này!

```bash
cd android/app
keytool -genkey -v -keystore quanlynhatro-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias quanlynhatro
```

Sẽ hỏi:
- Password: [Nhập password, nhớ lại!]
- Name: [Tên bạn]
- Organizational Unit: [Tùy chọn]
- Organization: [Tùy chọn]
- City: [Tùy chọn]
- Country: [VN]

### Bước 4: Cấu hình signing trong build.gradle

Mở file `android/app/build.gradle` và thêm vào phần `android {`:

```gradle
signingConfigs {
    release {
        storeFile file('quanlynhatro-release-key.jks')
        storePassword System.getenv("KEYSTORE_PASSWORD") ?: "your-keystore-password"
        keyAlias "quanlynhatro"
        keyPassword System.getenv("KEY_PASSWORD") ?: "your-key-password"
    }
}
```

Và thêm vào `buildTypes { release {`:
```gradle
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### Bước 5: Build Release APK

```bash
cd android
.\gradlew assembleRelease
```

**APK sẽ có tại:**
```
android/app/build/outputs/apk/release/app-release.apk
```

## Cách 3: Build bằng Android Studio (Khuyến nghị)

### Bước 1: Mở project trong Android Studio
```bash
npm run build
npx cap open android
```

### Bước 2: Trong Android Studio:
1. **Build** → **Generate Signed Bundle / APK**
2. Chọn **APK**
3. Click **Next**
4. Chọn keystore (hoặc tạo mới)
5. Nhập passwords
6. Click **Next**
7. Chọn **release** build variant
8. Click **Finish**

### Bước 3: APK sẽ được tạo tại:
```
android/app/release/app-release.apk
```

## Cách 4: Build APK bằng script (Dễ nhất)

Tôi đã tạo script `build-apk.bat` để tự động:

```bash
# Build Debug APK
build-apk.bat debug

# Build Release APK (cần keystore)
build-apk.bat release
```

## Lưu ý quan trọng:

1. **Keystore:**
   - Lưu file `quanlynhatro-release-key.jks` cẩn thận
   - Nếu mất keystore, không thể update app trên Play Store
   - Backup keystore + password ở nơi an toàn

2. **Google Login trên Android:**
   - Cần thêm SHA-1 fingerprint vào Google Cloud Console
   - Lấy SHA-1:
     ```bash
     cd android
     .\gradlew signingReport
     ```
   - Thêm SHA-1 vào OAuth Client ID trong Google Cloud Console

3. **APK Debug vs Release:**
   - **Debug:** Dễ build, không cần signing, chỉ để test
   - **Release:** Cần signing, dùng để publish/install trên thiết bị thật

4. **Kích thước APK:**
   - Thường ~10-20MB
   - Có thể giảm bằng cách enable ProGuard/R8 (minifyEnabled = true)

## Troubleshooting:

### Lỗi: "SDK location not found"
- Cài Android Studio
- Hoặc set ANDROID_HOME environment variable

### Lỗi: "Gradle sync failed"
- Mở Android Studio → Sync Project
- Check internet connection (Gradle cần download dependencies)

### Lỗi: "Keytool not found"
- Cài Java JDK
- Add Java bin vào PATH

### APK quá lớn
- Enable minifyEnabled = true trong build.gradle
- Sử dụng App Bundle (.aab) thay vì APK

## Build App Bundle (.aab) cho Play Store:

```bash
cd android
.\gradlew bundleRelease
```

File `.aab` sẽ có tại:
```
android/app/build/outputs/bundle/release/app-release.aab
```

