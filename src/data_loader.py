from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List


@dataclass
class Submission:
    student_id: str
    source_path: Path
    text: str


SUPPORTED_EXTENSIONS = {".txt", ".pdf", ".docx"}


def read_text_file(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def read_pdf_file(path: Path) -> str:
    import pdfplumber

    with pdfplumber.open(path) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n".join(pages)


def read_docx_file(path: Path) -> str:
    from docx import Document

    document = Document(path)
    paragraphs = [p.text for p in document.paragraphs]
    return "\n".join(paragraphs)


def normalise_to_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".txt":
        return read_text_file(path)
    if suffix == ".pdf":
        return read_pdf_file(path)
    if suffix == ".docx":
        return read_docx_file(path)
    raise ValueError(f"Unsupported file type: {path.suffix}")


def infer_student_id(path: Path) -> str:
    if path.parent and path.parent.name not in {"", "."}:
        return path.parent.name
    stem = path.stem
    parts = stem.split("_")
    return parts[0] if parts else stem


def load_submissions(root_dir: Path) -> List[Submission]:
    if not root_dir.exists():
        raise FileNotFoundError(f"Input directory not found: {root_dir}")

    submissions: List[Submission] = []
    for path in root_dir.rglob("*"):
        if path.is_dir() or path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        text = normalise_to_text(path)
        submissions.append(
            Submission(
                student_id=infer_student_id(path),
                source_path=path,
                text=text,
            )
        )
    return submissions


__all__ = [
    "Submission",
    "load_submissions",
    "infer_student_id",
    "normalise_to_text",
]
