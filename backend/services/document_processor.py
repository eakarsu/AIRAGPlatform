import os
from pathlib import Path
from langchain_text_splitters import RecursiveCharacterTextSplitter
from config import settings


def extract_text_from_pdf(file_path: str) -> str:
    from pypdf import PdfReader
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text.strip()


def extract_text_from_docx(file_path: str) -> str:
    from docx import Document
    doc = Document(file_path)
    text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
    return text.strip()


def extract_text_from_txt(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read().strip()


def extract_text(file_path: str, file_type: str) -> str:
    file_type = file_type.lower()
    if file_type == "pdf":
        return extract_text_from_pdf(file_path)
    elif file_type == "docx":
        return extract_text_from_docx(file_path)
    elif file_type in ("txt", "md", "markdown", "text"):
        return extract_text_from_txt(file_path)
    else:
        return extract_text_from_txt(file_path)


def chunk_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)
    return chunks


def get_file_type(filename: str) -> str:
    ext = Path(filename).suffix.lower().lstrip(".")
    type_map = {
        "pdf": "pdf",
        "docx": "docx",
        "doc": "docx",
        "txt": "txt",
        "md": "md",
        "markdown": "md",
        "text": "txt",
    }
    return type_map.get(ext, "txt")
