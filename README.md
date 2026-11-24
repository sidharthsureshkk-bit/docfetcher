
**BCA Final Year Project —
Architecture: 3-Tier Full-Stack + RAG Vector Pipeline + WebSockets  

## 🌟 Overview & Key Features

SmartCorp AI unifies organizational knowledge retrieval, real-time collaboration, and executive resource analytics into a single responsive web platform.

### The 5 Foundational Core Pillars
1. **Multi-Tenancy & Role-Based Access Control (RBAC)**: Strict data isolation per organization (`org_id`). Role separation across **Admin**, **Manager**, and **Employee** with stateless JWT authentication.
2. **Chat with Your Documents (AI RAG Pipeline)**: Upload company policy PDFs (e.g. Leave Rules, IT Guidelines). Uses `pypdf` to parse text into 500-character chunks indexed in a local `chromadb` persistent vector store. Google Gemini generates answers strictly grounded in document context.
3. **Automatic To-Do List Maker**: Transcribes raw meeting notes and voice transcripts into actionable tasks with inferred deadlines and assignees.
4. **Live Updates (Real-Time WebSockets)**: Native FastAPI WebSocket channel (`ws://127.0.0.1:8000/ws/{org_id}`) synchronizes task mutations, status changes, and activity logs across open browser tabs without refreshing.
5. **Visual Progress Charts (Executive Control Tower)**: Recharts interactive Donut Chart for task status distribution and Bar Chart for team workload hours.

### The 5 High-Impact Interactive Features
1. **One-Click Meeting-to-Task Converter**: Split-screen workspace with human-in-the-loop review cards before batch-inserting into the live task board.
2. **Visual "What-If" Workload Slider**: Real-time interactive simulation slider (0–30 hours) allowing managers to simulate rebalancing overloaded employees and calculating projected sprint days saved.
3. **AI Answer Citations ("Click to Verify" Popover)**: Clickable inline source badges (`[Filename • Page X]`). Clicking any citation opens a popover displaying the exact verbatim excerpt extracted from that PDF.
4. **Interactive Audit Trail Feed**: Chronological activity feed showing real-time workspace actions with actor initials and timestamps.
5. **Prompt Template Chips**: One-click quick prompt shortcuts below the AI chat bar.

---

