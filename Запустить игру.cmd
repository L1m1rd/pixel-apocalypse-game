@echo off
cd /d "%~dp0"
if exist "output\PixelApocalypse-test-v0.2.0-win32-x64\PixelApocalypse.exe" (
 start "" "output\PixelApocalypse-test-v0.2.0-win32-x64\PixelApocalypse.exe"
) else (
 node tools\launch-desktop.cjs
)
