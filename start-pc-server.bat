@echo off
title Harmoniq PC Audio Server
color 0A
cls
echo =============================================================
echo   Harmoniq PC Audio Streaming Engine
echo =============================================================
echo.
echo   [PC Server: RUNNING]
echo.
echo   - When this window is OPEN:
echo     Phone connects to your PC (High-speed, zero mobile data)
echo.
echo   - When you CLOSE this window or SHUT DOWN PC:
echo     Phone automatically switches to 24/7 Cloud!
echo.
echo =============================================================
echo.
node server.js
pause
