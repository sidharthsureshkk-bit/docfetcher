@echo off
title SmartCorp AI Platform Server
echo ===================================================
echo   Starting SmartCorp AI Full-Stack Platform
echo ===================================================
echo.
echo Opening FastAPI server at http://127.0.0.1:8000/
echo Swagger API Docs at       http://127.0.0.1:8000/docs
echo WebSocket stream at       ws://127.0.0.1:8000/ws/{org_id}
echo.
echo Press CTRL+C to stop the server.
echo.
python run.py
pause
