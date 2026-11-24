# How to Open and Run This Project in VS Code

Your project is completely set up and ready in this folder (`docfetcher`).

---

### Step 1: Open the Project in VS Code
1. Open **VS Code**.
2. Click **File** > **Open Folder...** (or press `Ctrl + K`, `Ctrl + O`).
3. Select this folder:  
   `C:\Users\sidharth\Downloads\docfetcher\docfetcher`
4. Click **Select Folder**.

---

### Step 2: Add Your Gemini API Key
1. Open the [`.env`](file:///c:/Users/sidharth/Downloads/docfetcher/docfetcher/.env) file located in the root of the project.
2. Paste your Google Gemini API key:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
   *(You can get a free API key at [Google AI Studio](https://aistudio.google.com/))*

---

### Step 3: Run the Server (Choose Any of the 3 Easy Methods)

#### Method A: Just Press `F5` in VS Code (Recommended)
* We have configured [.vscode/launch.json](file:///c:/Users/sidharth/Downloads/docfetcher/docfetcher/.vscode/launch.json) to launch the SmartCorp AI platform.
* Simply press **`F5`** on your keyboard (or click the green **Play** button in the Run & Debug tab).
* VS Code will launch the FastAPI server serving the React 19 UI and open the browser automatically.

#### Method B: Double-Click `start_server.bat`
* Double-click [`start_server.bat`](file:///c:/Users/sidharth/Downloads/docfetcher/docfetcher/start_server.bat) in the project folder to start the server.

#### Method C: Run from the VS Code Terminal
1. Open the terminal in VS Code (`Ctrl + ~` or **Terminal** > **New Terminal**).
2. Run:
   ```bash
   python run.py
   ```

---

### Step 4: Open in Your Browser
Go to: **[http://127.0.0.1:8000/](http://127.0.0.1:8000/)**
* **Interactive API Docs (Swagger):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **WebSocket Channel:** `ws://127.0.0.1:8000/ws/1`

---

### 🔑 Demo Login Accounts

| Name | Role | Email | Password | What You Can Access |
| :--- | :--- | :--- | :--- | :--- |
| **Sid** | **Admin** | `sid@acme.com` | `sid123` | Full access: Control Tower, What-If Simulator, Task Board (assign to anyone), Meeting Workflow, Knowledge Vault |
| **Anush** | **Manager** | `anush@acme.com` | `anush123` | Control Tower, What-If Workload Simulator, Task Board, Meeting-to-Task Workflow |
| **Nick** | **HR** | `nick@acme.com` | `nick123` | Knowledge Vault (policy upload/indexing), AI Assistant, Task Board |
| **Rahul** | **Employee** | `rahul@acme.com` | `rahul123` | **My Tasks Only** (assigned to Rahul), Status updating (`Done`), AI Assistant |

---

### 📁 Key Files in the Architecture

* **`run.py`**: The main entry point launching the Uvicorn server (`http://127.0.0.1:8000`).
* **`backend/main.py`**: FastAPI REST API, WebSocket room manager, and static frontend mounting.
* **`backend/rag_service.py`**: ChromaDB vector store search and Google Gemini API with page citation grounding.
* **`backend/meeting_service.py`**: Autonomous Meeting-to-Task converter with JSON mode schema extraction.
* **`frontend/src/`**: React 19 + TypeScript + Tailwind CSS UI:
  - **`components/Dashboard.tsx`**: Control Tower with Recharts and the **What-If Workload Simulator** (Algorithm 2).
  - **`components/TaskBoard.tsx`**: Live task board with Role-Based filtering and status updates.
  - **`components/KnowledgeChat.tsx`**: AI Assistant with Prompt Chips and Citation Popovers.
  - **`components/MeetingToTasks.tsx`**: AI Meeting Action Item extractor.
