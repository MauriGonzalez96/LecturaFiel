@echo off
setlocal
cd /d "%~dp0\.."

echo Build frontend...
call npm run build
if errorlevel 1 exit /b 1

if exist "desktop\static_front" rmdir /s /q "desktop\static_front"
mkdir "desktop\static_front"
xcopy /e /i /y "dist\*" "desktop\static_front\" >nul

cd desktop
python main.py
