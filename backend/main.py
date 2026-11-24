import os
from typing import List, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import func

from .database import engine, get_db, Base
from .models import Organization, User, Task, Document, AuditEvent
from .auth import hash_password, verify_password, create_access_token, get_current_user
from .rag_service import index_pdf_document, query_rag_with_citations
from .meeting_service import extract_tasks_from_meeting
from .websocket_manager import ws_manager
from .seed import seed_database

# Initialize database schema
Base.metadata.create_all(bind=engine)
# Run seed data if first time
seed_database()

app = FastAPI(
    title="SmartCorp AI API",
    version="1.0.0",
    description="Multi-Tenant Smart Workspace & Organizational Intelligence Platform"
)

# Enable CORS for local dev and frontend Vite/React/HTML clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Helper: Log Audit Event & Push via WebSocket
# ---------------------------------------------------------
async def log_event(db: Session, org_id: int, actor_name: str, action_text: str):
    event = AuditEvent(
        org_id=org_id,
        actor_name=actor_name,
        action_text=action_text,
        created_at=datetime.now(timezone.utc)
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Broadcast to all live WebSockets in this organization room
    await ws_manager.broadcast(org_id, {
        "type": "AUDIT_EVENT",
        "data": {
            "id": event.id,
            "actor_name": event.actor_name,
            "action_text": event.action_text,
            "created_at": event.created_at.isoformat()
        }
    })


# ---------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    name: str
    email: str
    role: str
    org_id: int
    org_name: str

class AskQuestionRequest(BaseModel):
    question: str

class MeetingExtractRequest(BaseModel):
    notes: str

class TaskItemCreate(BaseModel):
    title: str
    assignee_name: Optional[str] = "Unassigned"
    priority: Optional[str] = "Medium"
    est_hours: Optional[float] = 4.0
    due_date: Optional[str] = None

class BatchTasksRequest(BaseModel):
    tasks: List[TaskItemCreate]

class TaskStatusUpdate(BaseModel):
    status: str


# ---------------------------------------------------------
# Authentication Routes
# ---------------------------------------------------------
@app.post("/api/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    # Map legacy / shortcut aliases
    alias_map = {
        "admin@acme.com": "sid@acme.com",
        "manager@acme.com": "anush@acme.com",
        "hr@acme.com": "nick@acme.com",
        "employee@acme.com": "rahul@acme.com",
        "sid": "sid@acme.com",
        "anush": "anush@acme.com",
        "nick": "nick@acme.com",
        "rahul": "rahul@acme.com",
    }
    target_email = alias_map.get(email_clean, email_clean)
    user = db.query(User).filter((User.email == target_email) | (User.email == email_clean)).first()

    # Allow password match with hash or preset quick passwords
    valid_pass = False
    if user:
        if verify_password(req.password, user.password_hash):
            valid_pass = True
        elif req.password in ["sid123", "admin123", "anush123", "manager123", "nick123", "hr123", "rahul123", "employee123"]:
            valid_pass = True

    if not user or not valid_pass:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token({
        "sub": str(user.id),
        "org_id": user.org_id,
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "org_id": user.org_id,
        "org_name": user.organization.name if user.organization else "Acme Tech"
    }


@app.get("/api/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "org_id": current_user.org_id,
        "org_name": current_user.organization.name if current_user.organization else "Acme Tech"
    }


# ---------------------------------------------------------
# Dashboard & Analytics Routes (Control Tower & What-If)
# ---------------------------------------------------------
@app.get("/api/dashboard/summary")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "Employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Executive Control Tower is restricted to Admins and Managers."
        )
    org_id = current_user.org_id

    # 1. Tasks by status
    total_tasks = db.query(Task).filter(Task.org_id == org_id).count()
    todo_count = db.query(Task).filter(Task.org_id == org_id, Task.status == "Todo").count()
    in_prog_count = db.query(Task).filter(Task.org_id == org_id, Task.status == "In Progress").count()
    done_count = db.query(Task).filter(Task.org_id == org_id, Task.status == "Done").count()

    # 2. Total workload hours
    total_hours = db.query(func.sum(Task.est_hours)).filter(Task.org_id == org_id).scalar() or 0.0

    # 3. Workload per team member (for Recharts BarChart & What-If Slider)
    users = db.query(User).filter(User.org_id == org_id).all()
    workload = []
    for u in users:
        u_hours = db.query(func.sum(Task.est_hours)).filter(
            Task.org_id == org_id,
            Task.assignee_id == u.id,
            Task.status != "Done"
        ).scalar() or 0.0

        u_task_count = db.query(Task).filter(
            Task.org_id == org_id,
            Task.assignee_id == u.id,
            Task.status != "Done"
        ).count()

        workload.append({
            "user_id": u.id,
            "name": u.name,
            "role": u.role,
            "hours": float(u_hours),
            "pending_tasks": u_task_count
        })

    # 4. Status distribution for Donut Chart
    status_distribution = [
        {"name": "Todo", "value": todo_count, "color": "#f59e0b"},
        {"name": "In Progress", "value": in_prog_count, "color": "#3b82f6"},
        {"name": "Done", "value": done_count, "color": "#10b981"}
    ]

    # 5. Total documents
    doc_count = db.query(Document).filter(Document.org_id == org_id).count()

    return {
        "kpis": {
            "total_tasks": total_tasks,
            "pending_tasks": todo_count + in_prog_count,
            "completed_tasks": done_count,
            "total_documents": doc_count,
            "total_workload_hours": float(total_hours),
            "team_size": len(users)
        },
        "status_distribution": status_distribution,
        "workload": workload
    }


# ---------------------------------------------------------
# Document Management & RAG Pipeline
# ---------------------------------------------------------
@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "Employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Document upload is restricted to Admin and HR."
        )
    valid_exts = [".pdf", ".docx", ".txt", ".md", ".csv", ".json", ".rtf"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in valid_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{ext}'. Supported: {', '.join(valid_exts)}")

    content = await file.read()
    page_count = index_pdf_document(content, file.filename, current_user.org_id)

    # Save to media/documents for download
    media_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "media", "documents"))
    os.makedirs(media_dir, exist_ok=True)
    file_path = os.path.join(media_dir, file.filename)
    try:
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        print(f"Could not write file to media dir: {e}")

    # Save record in SQLite
    doc = Document(
        org_id=current_user.org_id,
        filename=file.filename,
        uploaded_by=current_user.name,
        page_count=page_count
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Log audit event & broadcast
    action_text = f"uploaded {file.filename} ({page_count} pages) into RAG index"
    await log_event(db, current_user.org_id, current_user.name, action_text)
    await ws_manager.broadcast(current_user.org_id, {
        "type": "DOCUMENT_SYNC",
        "action": "upload",
        "filename": file.filename,
        "page_count": page_count
    })

    return {
        "id": doc.id,
        "filename": doc.filename,
        "page_count": doc.page_count,
        "message": f"Successfully indexed {file.filename} into ChromaDB vector store."
    }


@app.get("/api/documents")
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    docs = db.query(Document).filter(Document.org_id == current_user.org_id).order_by(Document.id.desc()).all()
    return [
        {
            "id": d.id,
            "name": d.filename,
            "uploaded_by": d.uploaded_by,
            "page_count": d.page_count,
            "created_at": d.created_at.strftime("%b %d, %Y") if d.created_at else "Recently"
        }
        for d in docs
    ]


@app.delete("/api/documents/{doc_id}")
async def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "Employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Document deletion is restricted to Admin and HR."
        )
    doc = db.query(Document).filter(Document.id == doc_id, Document.org_id == current_user.org_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    filename = doc.filename
    db.delete(doc)
    db.commit()

    # Log audit event
    action_text = f"removed document '{filename}' from workspace vault"
    await log_event(db, current_user.org_id, current_user.name, action_text)

    # Broadcast WebSocket update
    await ws_manager.broadcast(current_user.org_id, {
        "type": "DOCUMENT_SYNC",
        "action": "delete",
        "doc_id": doc_id,
        "filename": filename
    })

    return {"message": f"Successfully deleted document '{filename}'", "id": doc_id}


from fastapi.responses import FileResponse

@app.get("/api/documents/{doc_id}/download")
async def download_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.org_id == current_user.org_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    media_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "media", "documents"))
    file_path = os.path.join(media_dir, doc.filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, filename=doc.filename)

    # Check media root
    media_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "media"))
    for root, _, files in os.walk(media_root):
        if doc.filename in files:
            return FileResponse(os.path.join(root, doc.filename), filename=doc.filename)

    raise HTTPException(status_code=404, detail="File content not found on server")


@app.get("/api/documents/download/by-name")
async def download_by_name(
    filename: str,
    current_user: User = Depends(get_current_user)
):
    clean_name = os.path.basename(filename)
    media_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "media"))
    for root, _, files in os.walk(media_root):
        for f in files:
            if f.lower() == clean_name.lower():
                return FileResponse(os.path.join(root, f), filename=f)
    raise HTTPException(status_code=404, detail=f"File {clean_name} not found")


@app.post("/api/knowledge/ask")
async def ask_rag(
    req: AskQuestionRequest,
    current_user: User = Depends(get_current_user)
):
    result = query_rag_with_citations(req.question, current_user.org_id)
    return result


# ---------------------------------------------------------
# Meeting-to-Task Extraction & Tasks API
# ---------------------------------------------------------
@app.post("/api/meetings/extract")
async def extract_meeting_tasks(
    req: MeetingExtractRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "Employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Meeting Task Workflow is restricted to Admin and Manager."
        )
    users = db.query(User).filter(User.org_id == current_user.org_id).all()
    roster_names = [u.name for u in users]

    tasks = extract_tasks_from_meeting(req.notes, roster_names)
    return {"tasks": tasks}


@app.post("/api/tasks/batch")
async def batch_create_tasks(
    req: BatchTasksRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(User.org_id == current_user.org_id).all()
    user_map = {u.name.lower(): u.id for u in users}

    created_tasks = []
    for item in req.tasks:
        assignee_id = None
        if item.assignee_name:
            assignee_id = user_map.get(item.assignee_name.strip().lower())

        task = Task(
            org_id=current_user.org_id,
            assignee_id=assignee_id,
            title=item.title,
            status="Todo",
            priority=item.priority or "Medium",
            est_hours=float(item.est_hours or 4.0),
            due_date=item.due_date
        )
        db.add(task)
        created_tasks.append(task)

    db.commit()

    # Log audit event
    action_text = f"converted {len(created_tasks)} meeting action items into live tasks"
    await log_event(db, current_user.org_id, current_user.name, action_text)

    # Broadcast WebSocket update
    await ws_manager.broadcast(current_user.org_id, {
        "type": "TASK_SYNC",
        "action": "batch_create",
        "count": len(created_tasks)
    })

    return {"message": f"Successfully created {len(created_tasks)} tasks."}


@app.post("/api/tasks")
async def create_single_task(
    req: TaskItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "Employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee role does not have permission to create or assign tasks."
        )

    assignee_id = None
    assignee = None
    if req.assignee_name and req.assignee_name != "Unassigned":
        assignee = db.query(User).filter(
            User.org_id == current_user.org_id,
            (func.lower(User.name) == req.assignee_name.strip().lower()) |
            (func.lower(User.email) == req.assignee_name.strip().lower())
        ).first()
        if assignee:
            assignee_id = assignee.id

    task = Task(
        org_id=current_user.org_id,
        assignee_id=assignee_id,
        title=req.title.strip(),
        status="Todo",
        priority=req.priority or "Medium",
        est_hours=float(req.est_hours or 4.0),
        due_date=req.due_date
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    assignee_display = assignee.name if assignee else (req.assignee_name or "Unassigned")
    action_text = f"assigned new task '{task.title}' to {assignee_display}"
    await log_event(db, current_user.org_id, current_user.name, action_text)

    # Broadcast real-time WebSocket event
    await ws_manager.broadcast(current_user.org_id, {
        "type": "TASK_CREATED",
        "action": "create",
        "task": {
            "id": task.id,
            "title": task.title,
            "assignee_name": assignee_display,
            "assignee_id": task.assignee_id,
            "priority": task.priority,
            "est_hours": task.est_hours,
            "due_date": task.due_date,
            "status": task.status
        },
        "created_by": current_user.name,
        "assignee_name": assignee_display
    })

    return {
        "id": task.id,
        "title": task.title,
        "assignee_name": assignee_display,
        "priority": task.priority,
        "est_hours": task.est_hours,
        "due_date": task.due_date,
        "status": task.status,
        "message": f"Task created and assigned to {assignee_display}"
    }


@app.get("/api/tasks")
async def list_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Task).filter(Task.org_id == current_user.org_id)
    # Role-Based Access Control: Employees only see tasks assigned to them
    if current_user.role == "Employee":
        query = query.filter(Task.assignee_id == current_user.id)

    tasks = query.order_by(Task.id.desc()).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "est_hours": t.est_hours,
            "due_date": t.due_date,
            "assignee_name": t.assignee.name if t.assignee else "Unassigned"
        }
        for t in tasks
    ]


@app.patch("/api/tasks/{task_id}/status")
async def update_task_status(
    task_id: int,
    req: TaskStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id, Task.org_id == current_user.org_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.status
    task.status = req.status
    db.commit()

    assignee_name = task.assignee.name if task.assignee else "Unassigned"
    action_text = f"marked task '{task.title}' as {req.status}"
    await log_event(db, current_user.org_id, current_user.name, action_text)

    await ws_manager.broadcast(current_user.org_id, {
        "type": "TASK_STATUS_UPDATED",
        "action": "status_update",
        "task_id": task.id,
        "title": task.title,
        "status": task.status,
        "old_status": old_status,
        "updated_by": current_user.name,
        "assignee_name": assignee_name
    })

    return {"id": task.id, "status": task.status, "message": "Status updated successfully"}


# ---------------------------------------------------------
# Team Members & Audit Activity Feed
# ---------------------------------------------------------
@app.get("/api/users")
async def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(User.org_id == current_user.org_id).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role} for u in users]


@app.get("/api/audit-events")
async def get_audit_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.org_id == current_user.org_id)
        .order_by(AuditEvent.id.desc())
        .limit(25)
        .all()
    )
    return [
        {
            "id": e.id,
            "actor_name": e.actor_name,
            "action_text": e.action_text,
            "created_at": e.created_at.isoformat() if e.created_at else None
        }
        for e in events
    ]


# ---------------------------------------------------------
# Real-Time WebSocket Channel
# ---------------------------------------------------------
@app.websocket("/ws/{org_id}")
async def websocket_endpoint(websocket: WebSocket, org_id: int):
    await ws_manager.connect(org_id, websocket)
    try:
        while True:
            # Keep socket alive and receive any ping from client
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(org_id, websocket)
    except Exception:
        ws_manager.disconnect(org_id, websocket)


# ---------------------------------------------------------
# Static Frontend Serving (Single-command deployment)
# ---------------------------------------------------------
from fastapi.staticfiles import StaticFiles

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static_frontend")

