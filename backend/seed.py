import os
import sys
from datetime import datetime, timezone

try:
    from .database import engine, SessionLocal, Base
    from .models import Organization, User, Task, Document, AuditEvent
    from .auth import hash_password
except ImportError:
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from backend.database import engine, SessionLocal, Base
    from backend.models import Organization, User, Task, Document, AuditEvent
    from backend.auth import hash_password

def seed_database(force: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_org = db.query(Organization).first()
        if existing_org and not force:
            print("Database already contains data. Skipping re-seed.")
            return

        if force:
            print("Force re-seeding: clearing existing data...")
            db.query(AuditEvent).delete()
            db.query(Task).delete()
            db.query(Document).delete()
            db.query(User).delete()
            db.query(Organization).delete()
            db.commit()

        print("Seeding SmartCorp AI database...")

        # 1. Organization
        org = Organization(name="Acme Tech Pvt Ltd")
        db.add(org)
        db.commit()
        db.refresh(org)

        # 2. Users (Admin, Manager, HR, Employee)
        admin = User(
            org_id=org.id,
            name="Sid",
            email="sid@acme.com",
            password_hash=hash_password("sid123"),
            role="Admin"
        )
        manager = User(
            org_id=org.id,
            name="Anush",
            email="anush@acme.com",
            password_hash=hash_password("anush123"),
            role="Manager"
        )
        hr = User(
            org_id=org.id,
            name="Nick",
            email="nick@acme.com",
            password_hash=hash_password("nick123"),
            role="HR"
        )
        employee = User(
            org_id=org.id,
            name="Rahul",
            email="rahul@acme.com",
            password_hash=hash_password("rahul123"),
            role="Employee"
        )
        db.add_all([admin, manager, hr, employee])
        db.commit()
        db.refresh(admin)
        db.refresh(manager)
        db.refresh(hr)
        db.refresh(employee)

        # 3. Sample Tasks (configured for What-If Workload Slider & Task Board demo)
        tasks = [
            Task(
                org_id=org.id,
                assignee_id=employee.id,
                title="Implement OAuth2 Token Revocation",
                status="In Progress",
                priority="High",
                est_hours=14.0,
                due_date="2026-11-28"
            ),
            Task(
                org_id=org.id,
                assignee_id=employee.id,
                title="Configure ChromaDB Vector Partitioning",
                status="In Progress",
                priority="High",
                est_hours=16.0,
                due_date="2026-11-30"
            ),
            Task(
                org_id=org.id,
                assignee_id=employee.id,
                title="Resolve RenderFlex Overflow on Mobile",
                status="Todo",
                priority="Medium",
                est_hours=12.0,
                due_date="2026-12-02"
            ),
            Task(
                org_id=org.id,
                assignee_id=employee.id,
                title="Design Glassmorphic Workspace UI",
                status="Todo",
                priority="Medium",
                est_hours=8.0,
                due_date="2026-12-05"
            ),
            Task(
                org_id=org.id,
                assignee_id=manager.id,
                title="Draft Q4 Engineering Roadmap",
                status="In Progress",
                priority="High",
                est_hours=10.0,
                due_date="2026-11-29"
            ),
            Task(
                org_id=org.id,
                assignee_id=manager.id,
                title="Review Sprint Resource Allocation",
                status="Done",
                priority="Medium",
                est_hours=8.0,
                due_date="2026-11-22"
            ),
            Task(
                org_id=org.id,
                assignee_id=hr.id,
                title="Update Employee Remote Work Policy",
                status="In Progress",
                priority="Medium",
                est_hours=6.0,
                due_date="2026-11-27"
            ),
            Task(
                org_id=org.id,
                assignee_id=hr.id,
                title="Review Employee Leave Policy PDF",
                status="Done",
                priority="Low",
                est_hours=8.0,
                due_date="2026-11-20"
            ),
            Task(
                org_id=org.id,
                assignee_id=admin.id,
                title="Audit Cloud Security & IAM Permissions",
                status="Done",
                priority="High",
                est_hours=6.0,
                due_date="2026-11-18"
            ),
            Task(
                org_id=org.id,
                assignee_id=admin.id,
                title="Setup Automated Health Checks & Monitoring",
                status="Done",
                priority="Medium",
                est_hours=6.0,
                due_date="2026-11-19"
            )
        ]
        db.add_all(tasks)

        # 4. Initial Sample Documents Record
        doc1 = Document(
            org_id=org.id,
            filename="Company_Handbook.pdf",
            uploaded_by="Sid (Admin)",
            page_count=18
        )
        doc2 = Document(
            org_id=org.id,
            filename="IT_Security_Guidelines.pdf",
            uploaded_by="Anush (Manager)",
            page_count=12
        )
        doc3 = Document(
            org_id=org.id,
            filename="HR_Remote_Policy.pdf",
            uploaded_by="Nick (HR)",
            page_count=8
        )
        db.add_all([doc1, doc2, doc3])

        # 5. Initial Audit Events for Activity Stream
        audits = [
            AuditEvent(
                org_id=org.id,
                actor_name="Sid",
                action_text="Provisioned enterprise workspace for Acme Tech Pvt Ltd",
                created_at=datetime.now(timezone.utc)
            ),
            AuditEvent(
                org_id=org.id,
                actor_name="Anush",
                action_text="Uploaded IT_Security_Guidelines.pdf into RAG index",
                created_at=datetime.now(timezone.utc)
            ),
            AuditEvent(
                org_id=org.id,
                actor_name="Nick",
                action_text="Published HR_Remote_Policy.pdf to Knowledge Vault",
                created_at=datetime.now(timezone.utc)
            ),
            AuditEvent(
                org_id=org.id,
                actor_name="Rahul",
                action_text="Moved task 'Implement OAuth2 Token Revocation' to In Progress",
                created_at=datetime.now(timezone.utc)
            ),
            AuditEvent(
                org_id=org.id,
                actor_name="Sid",
                action_text="Assigned 'Configure ChromaDB Vector Partitioning' to Rahul",
                created_at=datetime.now(timezone.utc)
            )
        ]
        db.add_all(audits)

        db.commit()
        print("Database seeded successfully with Demo Organization, Users, and Tasks!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
