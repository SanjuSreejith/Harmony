@echo off
echo ========================================================
echo   🎵 HARMONIQ - 1-CLICK APK BUILD SCRIPT
echo ========================================================
echo.

echo 1. Building React / Vite Web Assets...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Web build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 2. Syncing assets into Android Capacitor container...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Capacitor sync failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 3. Compiling Android APK with Gradle...
cd android
call gradlew.bat assembleDebug
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gradle APK compilation failed.
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
cd ..

copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "Harmoniq.apk"

echo.
echo ========================================================
echo   SUCCESS! FRESH APK READY: Harmoniq.apk
echo ========================================================
echo.
pause
