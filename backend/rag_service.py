import os
import io
from pypdf import PdfReader
from typing import List, Dict, Any, Optional

CHROMA_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
_client = None
_collection = None

def get_chroma_collection():
    global _client, _collection
    if _collection is None:
        import chromadb
        _client = chromadb.PersistentClient(path=CHROMA_DIR)
        _collection = _client.get_or_create_collection(name="company_policies")
    return _collection



def get_gemini_model():
    """Configures and returns the Gemini model using GEMINI_API_KEY environment variable."""
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key, transport="rest")
        for model_name in [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash"
        ]:
            try:
                return genai.GenerativeModel(model_name)
            except Exception:
                continue
        return None
    except Exception as e:
        print(f"Error initializing Gemini: {e}")
        return None


def extract_text_from_bytes(file_content: bytes, filename: str) -> List[tuple]:
    """Extracts pages/sections and text from bytes (PDF, DOCX, TXT, MD, CSV, JSON)."""
    ext = os.path.splitext(filename)[1].lower()
    pages = []

    if ext == ".pdf":
        try:
            reader = PdfReader(io.BytesIO(file_content))
            for i, page in enumerate(reader.pages, start=1):
                txt = page.extract_text() or ""
                if txt.strip():
                    pages.append((i, txt))
        except Exception as e:
            print(f"PDF extraction error for {filename}: {e}")

    elif ext == ".docx":
        try:
            import zipfile
            import xml.etree.ElementTree as ET
            with zipfile.ZipFile(io.BytesIO(file_content)) as docx:
                xml_content = docx.read('word/document.xml')
                tree = ET.fromstring(xml_content)
                namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                paragraphs = []
                for p in tree.iterfind('.//w:p', namespaces):
                    texts = [node.text for node in p.iterfind('.//w:t', namespaces) if node.text]
                    if texts:
                        paragraphs.append(''.join(texts))
                full_text = '\n'.join(paragraphs)
                if full_text.strip():
                    chunk_sz = 1200
                    for idx, start_pos in enumerate(range(0, len(full_text), chunk_sz), start=1):
                        pages.append((idx, full_text[start_pos:start_pos + chunk_sz]))
        except Exception as e:
            print(f"DOCX extraction error for {filename}: {e}")

    else:
        try:
            full_text = file_content.decode("utf-8", errors="ignore")
            if full_text.strip():
                chunk_sz = 1200
                for idx, start_pos in enumerate(range(0, len(full_text), chunk_sz), start=1):
                    pages.append((idx, full_text[start_pos:start_pos + chunk_sz]))
        except Exception as e:
            print(f"Text extraction error for {filename}: {e}")

    return pages


def index_pdf_document(file_content: bytes, filename: str, org_id: int) -> int:
    """Parses any supported document from bytes, chunks pages, and inserts them into ChromaDB."""
    pages = extract_text_from_bytes(file_content, filename)
    if not pages:
        return 1

    total_chunks = 0
    coll = get_chroma_collection()

    for page_num, text in pages:
        if not text.strip():
            continue

        step = 400
        chunk_size = 500
        for idx in range(0, max(1, len(text)), step):
            chunk = text[idx:idx + chunk_size].strip()
            if not chunk:
                continue

            doc_id = f"{org_id}_{filename}_p{page_num}_{idx}"
            coll.upsert(
                documents=[chunk],
                metadatas=[{
                    "org_id": org_id,
                    "filename": filename,
                    "page": page_num
                }],
                ids=[doc_id]
            )
            total_chunks += 1

    return max(len(pages), 1)


def query_rag_with_citations(question: str, org_id: int) -> Dict[str, Any]:
    """
    Queries ChromaDB filtered by org_id, constructs a grounded context,
    and prompts Gemini to answer strictly citing [filename, Page X].
    """
    citations: List[Dict[str, Any]] = []
    context_chunks: List[str] = []

    # 1. Search ChromaDB for relevant passages
    try:
        coll = get_chroma_collection()
        count = coll.count()
        if count > 0:
            hits = coll.query(
                query_texts=[question],
                n_results=min(3, count),
                where={"org_id": org_id}
            )
            if hits and hits.get("documents") and len(hits["documents"][0]) > 0:
                for doc, meta in zip(hits["documents"][0], hits["metadatas"][0]):
                    context_chunks.append(f"[{meta['filename']}, Page {meta['page']}]: {doc}")
                    citations.append({
                        "filename": meta["filename"],
                        "page": meta["page"],
                        "excerpt": doc
                    })
    except Exception as e:
        print(f"ChromaDB query error: {e}")

    # 2. If no context found in ChromaDB, provide helpful response
    if not context_chunks:
        return {
            "answer": "No relevant company documents have been indexed yet for your organization. Please upload a PDF policy document (e.g., Leave Policy, IT Guidelines) on the Documents page.",
            "citations": []
        }

    # 3. Call Gemini
    model = get_gemini_model()
    if not model:
        # Graceful fallback when GEMINI_API_KEY is not yet supplied by the user
        combined_text = "\n\n".join([f"• From {c['filename']} (Page {c['page']}): \"{c['excerpt']}\"" for c in citations])
        return {
            "answer": (
                "*(Notice: GEMINI_API_KEY is not set or invalid in backend/.env)*\n\n"
                f"**Here are the matching passages found in your uploaded documents:**\n\n{combined_text}\n\n"
                "To enable full natural language answers with AI synthesis, please add your `GEMINI_API_KEY` in the `.env` file or environment settings."
            ),
            "citations": citations
        }

    prompt = (
        "You are SmartCorp AI, an enterprise organizational intelligence assistant.\n"
        "Answer the user's question accurately using ONLY the provided document context below.\n"
        "Cite sources inline using the format [Filename, Page X]. If the answer cannot be found in the context, "
        "state clearly that the company documents do not contain this information.\n\n"
        f"Context:\n{chr(10).join(context_chunks)}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )

    try:
        response = model.generate_content(prompt)
        answer_text = response.text if response and response.text else "Unable to generate an answer from the document context."
        return {
            "answer": answer_text,
            "citations": citations
        }
    except Exception as e:
        # Fallback to direct citation excerpts so the user's bot never goes unresponsive!
        return {
            "answer": (
                f"*(Gemini API connection error: {str(e)})*\n\n"
                f"**Extracted relevant document sections:**\n" +
                "\n".join([f"- **{c['filename']} (Page {c['page']})**: {c['excerpt']}" for c in citations])
            ),
            "citations": citations
        }
