@echo off
setlocal
set "DACHAS_EXE=%~dp0output\PixelApocalypse-northern-dachas-v0.3.0-win32-x64\PixelApocalypse.exe"
if exist "%DACHAS_EXE%" (
  start "" "%DACHAS_EXE%"
  exit /b 0
)
echo Northern Dachas build was not found. Run npm run prepare:desktop and npm run build:desktop first.
pause
