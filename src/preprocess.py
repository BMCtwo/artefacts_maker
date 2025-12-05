from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

from .data_loader import Submission


@dataclass
class ProcessedSubmission:
    student_id: str
    source_path: str
    tokens: List[str]


def basic_tokenize(text: str) -> List[str]:
    cleaned = re.sub(r"[^\w\s]", " ", text)
    tokens = [token for token in cleaned.split() if token.strip()]
    return tokens


def remove_metadata(text: str) -> str:
    lines = text.splitlines()
    filtered = [line for line in lines if not line.strip().lower().startswith("page ")]
    return "\n".join(filtered)


def preprocess_submissions(submissions: List[Submission]) -> List[ProcessedSubmission]:
    processed: List[ProcessedSubmission] = []
    for submission in submissions:
        text = remove_metadata(submission.text)
        tokens = basic_tokenize(text)
        processed.append(
            ProcessedSubmission(
                student_id=submission.student_id,
                source_path=str(submission.source_path),
                tokens=tokens,
            )
        )
    return processed


__all__ = [
    "ProcessedSubmission",
    "basic_tokenize",
    "remove_metadata",
    "preprocess_submissions",
]
