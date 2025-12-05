from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Dict, List, Protocol

from .preprocess import ProcessedSubmission


@dataclass
class FeedbackResult:
    student_id: str
    source_path: str
    strengths: List[str]
    improvements: List[str]
    grade: float
    raw_response: str


class FeedbackModel(Protocol):
    def generate(self, prompt: str, *, token_limit: int | None = None) -> str:  # pragma: no cover - interface
        ...


class LocalTemplateModel:
    def __init__(self, rubric: str, criteria: str | None = None):
        self.rubric = rubric
        self.criteria = criteria or "Claridad, coherencia y cumplimiento de la consigna."

    def generate(self, prompt: str, *, token_limit: int | None = None) -> str:
        del token_limit
        summary = {
            "strengths": ["Entrega procesada localmente", f"Criterios: {self.criteria}"],
            "improvements": ["Sustituye este modelo por uno conectado a la API deseada."],
            "grade": 0.0,
        }
        return json.dumps(summary, ensure_ascii=False)


def build_prompt(submission: ProcessedSubmission, rubric: str, criteria: str | None = None) -> str:
    criteria_text = criteria or "Claridad, coherencia y cumplimiento de la consigna."
    instruction = (
        "Eres un asistente que evalúa trabajos estudiantiles. Usa la rúbrica proporcionada "
        "para ofrecer retroalimentación estructurada en formato JSON con 'strengths', "
        "'improvements' y 'grade'."
    )
    context = f"Rubrica:\n{rubric}\nCriterios adicionales: {criteria_text}"
    tokens_preview = " ".join(submission.tokens[:200])
    return (
        f"{instruction}\n\n{context}\n\nTexto del estudiante:\n{tokens_preview}\n\n"
        "Responde únicamente con un JSON válido."
    )


def generate_feedback(
    submissions: List[ProcessedSubmission],
    rubric: str,
    model: FeedbackModel,
    *,
    token_limit: int | None = None,
    criteria: str | None = None,
) -> List[FeedbackResult]:
    results: List[FeedbackResult] = []
    for submission in submissions:
        prompt = build_prompt(submission, rubric, criteria)
        raw_response = model.generate(prompt, token_limit=token_limit)
        try:
            parsed: Dict[str, object] = json.loads(raw_response)
            strengths = [str(item) for item in parsed.get("strengths", [])]
            improvements = [str(item) for item in parsed.get("improvements", [])]
            grade = float(parsed.get("grade", 0.0))
        except (json.JSONDecodeError, TypeError, ValueError):
            strengths, improvements, grade = [], [], 0.0
        results.append(
            FeedbackResult(
                student_id=submission.student_id,
                source_path=submission.source_path,
                strengths=strengths,
                improvements=improvements,
                grade=grade,
                raw_response=raw_response,
            )
        )
    return results


__all__ = [
    "FeedbackResult",
    "FeedbackModel",
    "LocalTemplateModel",
    "build_prompt",
    "generate_feedback",
]
