@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

for /f "usebackq delims=" %%v in (`node -p "require('./package.json').version"`) do set APP_VER=%%v
if "%APP_VER%"=="" (
  echo No se pudo leer la version de package.json
  exit /b 1
)

echo === Version %APP_VER% ===
echo %APP_VER%> desktop\VERSION

echo === 1/4 Build frontend (Vite) ===
call npm run build
if errorlevel 1 goto :fail

echo === 2/4 Copiar dist a desktop\static_front ===
if exist "desktop\static_front" rmdir /s /q "desktop\static_front"
mkdir "desktop\static_front"
xcopy /e /i /y "dist\*" "desktop\static_front\" >nul
if errorlevel 1 goto :fail
echo %APP_VER%> desktop\VERSION
echo {"version":"%APP_VER%"}> desktop\static_front\version.json

echo === 3/4 Dependencias Python del launcher ===
python -m pip install -r desktop\requirements.txt
if errorlevel 1 goto :fail

echo === 4/4 PyInstaller -^> LecturaFiel-v%APP_VER%.exe ===
pushd desktop
python -m PyInstaller --noconfirm ..\build_specs\lectura-fiel.spec
if errorlevel 1 (
  popd
  goto :fail
)
popd

set EXE_BUILT=LecturaFiel-v%APP_VER%.exe
set OUT_DIR=release\v%APP_VER%
if not exist "release" mkdir release
if exist "%OUT_DIR%" rmdir /s /q "%OUT_DIR%"
mkdir "%OUT_DIR%"

copy /y "desktop\dist\%EXE_BUILT%" "%OUT_DIR%\LecturaFiel.exe" >nul
if errorlevel 1 goto :fail
copy /y "desktop\dist\%EXE_BUILT%" "%OUT_DIR%\%EXE_BUILT%" >nul
echo %APP_VER%> "%OUT_DIR%\VERSION.txt"
echo v%APP_VER%> release\LATEST.txt

echo.
echo Listo: %OUT_DIR%\
echo   - LecturaFiel.exe
echo   - %EXE_BUILT%
echo   - VERSION.txt
echo Cada version queda en su carpeta (release\vX.Y.Z). Envia esa carpeta o el .exe de adentro.
echo Al cerrar con el boton (o confirmando la X) se terminan todos los procesos.
exit /b 0

:fail
echo.
echo Build fallo.
exit /b 1
