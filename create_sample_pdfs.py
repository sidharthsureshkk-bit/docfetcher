import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "docfetcher_project.settings")
django.setup()

from django.conf import settings
from core.models import Document

def make_pdf(filepath, title, sections):
    stream = f"BT /F1 18 Tf 50 750 Td ({title}) Tj ET\n"
    stream += f"BT /F1 10 Tf 50 735 Td (SmartCorp AI Knowledge Document - Confidential) Tj ET\n"
    y = 690
    for header, content in sections:
        stream += f"BT /F1 13 Tf 50 {y} Td ({header}) Tj ET\n"
        y -= 20
        # wrap text into lines
        words = content.split(" ")
        line = ""
        for word in words:
            if len(line) + len(word) + 1 > 70:
                safe_line = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
                stream += f"BT /F1 10 Tf 50 {y} Td ({safe_line}) Tj ET\n"
                y -= 16
                line = word
            else:
                line = (line + " " + word).strip()
        if line:
            safe_line = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            stream += f"BT /F1 10 Tf 50 {y} Td ({safe_line}) Tj ET\n"
            y -= 25

    length = len(stream.encode("latin-1"))
    pdf = f"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length {length} >>
stream
{stream}endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000224 00000 n 
0000000295 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
400
%%EOF"""
    with open(filepath, "wb") as f:
        f.write(pdf.encode("latin-1"))

def generate_all():
    docs_dir = os.path.join(settings.MEDIA_ROOT, "documents")
    os.makedirs(docs_dir, exist_ok=True)

    files_info = {
        "Company_Handbook.pdf": (
            "SmartCorp Company Handbook 2026",
            [
                ("1. Work From Home Policy (Page 12)", "Full-time employees may work remotely up to 2 days per week with prior written approval from their team manager. Core operational hours are 10:00 AM to 5:00 PM local time. Employees must be reachable on Slack and corporate email and use the GlobalProtect VPN."),
                ("2. Office Hours and Attendance (Page 8)", "The standard work week is Monday through Friday, 40 hours per week. Flexible working hours can be arranged between 8:30 AM and 6:30 PM with manager concurrence."),
                ("3. Workplace Conduct (Page 15)", "SmartCorp upholds a zero-tolerance policy against any workplace harassment or discrimination. Outside employment and potential conflicts must be formally disclosed.")
            ]
        ),
        "IT_Security_Guidelines.pdf": (
            "IT Security Guidelines & Standard Protocols",
            [
                ("1. Corporate Password Policy & Reset (Page 4)", "Passwords must be at least 12 characters with mixed case, numbers, and symbols. Passwords expire every 90 days. To reset your corporate password, visit https://auth.acmetech.internal or contact IT Helpdesk extension 4357."),
                ("2. Secure Remote Access & VPN (Page 7)", "All remote network access to internal repositories and database servers must establish an encrypted connection using GlobalProtect VPN client with Multi-Factor Authentication enabled."),
                ("3. Incident and Phishing Reporting (Page 11)", "Suspicious emails and security anomalies must be reported immediately to security@acmetech.internal or via the Outlook Report Phish plugin.")
            ]
        ),
        "HR_Policies.pdf": (
            "Human Resources Operational Policies",
            [
                ("1. Leave and Time-Off Allocation (Page 6)", "Full-time employees receive 18 days of Paid Time Off (PTO), 10 casual leaves, and 12 designated national holidays annually. Up to 5 unused PTO days can be rolled over to the next cycle."),
                ("2. Parental and Family Leave (Page 19)", "Maternity leave provides 26 continuous weeks of fully paid leave for female employees. Paternity leave provides 4 continuous weeks of fully paid leave for new fathers."),
                ("3. Performance Evaluation (Page 22)", "Performance evaluations take place semi-annually in June and December with KPI assessments and manager 1-on-1 reviews.")
            ]
        ),
        "Employee_Benefits.pdf": (
            "Employee Benefits & Wellness Summary",
            [
                ("1. Comprehensive Health Insurance (Page 3)", "SmartCorp provides medical, dental, and optical insurance coverage up to $50,000 annually covering the employee, spouse, and up to two dependent children."),
                ("2. Learning & Development Budget (Page 9)", "Every employee is allotted an annual professional learning stipend of $1,500 for books, online certifications, technical workshops, and conferences."),
                ("3. Wellness & Gym Reimbursement (Page 14)", "Employees can claim up to $75 per month for fitness memberships, gym access, yoga classes, or mental wellness subscriptions via the expensing portal.")
            ]
        )
    }

    for filename, (title, sections) in files_info.items():
        rel_path = os.path.join("documents", filename)
        abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
        make_pdf(abs_path, title, sections)
        print(f"Generated PDF: {abs_path}")

        # Update Document record in DB
        doc = Document.objects.filter(title__icontains=filename).first()
        if doc:
            doc.file = rel_path
            doc.save()
            print(f"Updated Document #{doc.id} with file {rel_path}")

if __name__ == "__main__":
    generate_all()
