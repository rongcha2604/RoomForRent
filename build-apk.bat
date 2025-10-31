@echo off
echo ============================================
echo   Build APK - Quan Ly Nha Tro
echo ============================================
echo.

if "%1"=="" (
    echo Usage: build-apk.bat [debug^|release]
    echo.
    echo Examples:
    echo   build-apk.bat debug   - Build Debug APK (test)
    echo   build-apk.bat release - Build Release APK (production)
    echo.
    pause
    exit /b 1
)

set BUILD_TYPE=%1

echo Buoc 1: Building web app...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo.

echo Buoc 2: Syncing with Capacitor...
call npx cap sync android
if errorlevel 1 (
    echo ERROR: Sync failed!
    pause
    exit /b 1
)
echo.

echo Buoc 3: Building %BUILD_TYPE% APK...
cd android

if "%BUILD_TYPE%"=="debug" (
    call gradlew.bat assembleDebug
    if errorlevel 1 (
        echo ERROR: APK build failed!
        cd ..
        pause
        exit /b 1
    )
    echo.
    echo ============================================
    echo   Build thanh cong!
    echo ============================================
    echo.
    echo APK Debug duoc tao tai:
    echo   android\app\build\outputs\apk\debug\app-debug.apk
    echo.
) else if "%BUILD_TYPE%"=="release" (
    if not exist "app\quanlynhatro-release-key.jks" (
        echo.
        echo ============================================
        echo   CAN TAO KEYSTORE!
        echo ============================================
        echo.
        echo Ban can tao keystore de build Release APK.
        echo.
        echo Chay lenh sau trong thu muc android\app:
        echo   keytool -genkey -v -keystore quanlynhatro-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias quanlynhatro
        echo.
        echo LUU Y: Nho password va backup file .jks!
        echo.
        cd ..
        pause
        exit /b 1
    )
    
    call gradlew.bat assembleRelease
    if errorlevel 1 (
        echo ERROR: APK build failed!
        echo Kiem tra signing config trong build.gradle
        cd ..
        pause
        exit /b 1
    )
    echo.
    echo ============================================
    echo   Build thanh cong!
    echo ============================================
    echo.
    echo APK Release duoc tao tai:
    echo   android\app\build\outputs\apk\release\app-release.apk
    echo.
) else (
    echo ERROR: Unknown build type: %BUILD_TYPE%
    echo Use: debug or release
    cd ..
    pause
    exit /b 1
)

cd ..

echo ============================================
echo   Hoan tat!
echo ============================================
echo.
pause

