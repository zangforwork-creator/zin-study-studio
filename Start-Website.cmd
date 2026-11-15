@echo off
cd /d "%~dp0"
echo Opening Zin's Study Studio at http://127.0.0.1:4173
echo Keep this window open while using the website. Press Ctrl+C to stop.
node scripts\serve.mjs
pause
