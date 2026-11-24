"""
SmartCorp AI — Unified Project Launcher
Run with: python run.py
"""

import os
import sys
import uvicorn

if __name__ == "__main__":
    print("=" * 65)
    print("🚀 SmartCorp AI: Multi-Tenant Smart Workspace & Intelligence Platform")
    print("   BCA Final Year Capstone Project — Full Stack + RAG + WebSockets")
    print("=" * 65)
    
    # Check for GEMINI_API_KEY
    env_file = os.path.join(os.path.dirname(__file__), "backend", ".env")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            content = f.read()
            if "GEMINI_API_KEY=" in content and not any(line.startswith("GEMINI_API_KEY=AI") for line in content.splitlines()):
                print("💡 Note: You can add your Google Gemini API Key in backend/.env")
                print("   Get a free key at: https://aistudio.google.com/")
    
    # Bind to 0.0.0.0 and dynamically accept $PORT from Render, Railway, etc.
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    # Never use reloader on cloud hosts (Render injects RENDER or PORT)
    is_cloud = bool(os.environ.get("RENDER") or os.environ.get("PORT") or os.environ.get("RAILWAY_ENVIRONMENT"))
    reload = False if is_cloud else (os.environ.get("ENV") != "production")

    print(f"\nStarting Uvicorn Server on http://{host}:{port}")
    print(f"  • Web UI:       http://localhost:{port}")
    print(f"  • Swagger Docs: http://localhost:{port}/docs")
    print(f"  • WebSocket:    ws://localhost:{port}/ws/{{org_id}}")
    print("\nPress Ctrl+C to stop the server.\n", flush=True)

    uvicorn.run("backend.main:app", host=host, port=port, reload=reload)
