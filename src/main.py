from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import List

from .data_loader import load_submissions
from .feedback import FeedbackResult, LocalTemplateModel, generate_feedback
from .preprocess import preprocess_submissions


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluador automático de tareas.")
    parser.add_argument("--input", required=True, type=Path, help="Ruta a la carpeta con las entregas.")
    parser.add_argument("--rubrica", required=True, type=Path, help="Archivo de rúbrica en texto o Markdown.")
    parser.add_argument("--output", default=Path("output"), type=Path, help="Carpeta destino para los informes.")
    parser.add_argument("--model", default="local", help="Modelo a utilizar (local, openai, hf, etc.).")
    parser.add_argument("--token-limit", type=int, default=None, help="Límite de tokens para la respuesta del modelo.")
    parser.add_argument("--criteria", type=str, default=None, help="Criterios adicionales de evaluación.")
    return parser.parse_args()


def read_rubric(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"No se encontró la rúbrica en {path}")
    return path.read_text(encoding="utf-8", errors="ignore")


def select_model(name: str, rubric: str, criteria: str | None = None):
    return LocalTemplateModel(rubric=rubric, criteria=criteria)


def write_markdown_feedback(result: FeedbackResult, output_dir: Path) -> Path:
    student_dir = output_dir / result.student_id
    student_dir.mkdir(parents=True, exist_ok=True)
    file_path = student_dir / "feedback.md"
    strengths_md = "\n".join(f"- {item}" for item in result.strengths) or "- Sin fortalezas registradas"
    improvements_md = "\n".join(f"- {item}" for item in result.improvements) or "- Sin áreas de mejora registradas"
    content = (
        f"# Retroalimentación para {result.student_id}\n\n"
        f"**Archivo original**: {result.source_path}\n\n"
        f"## Fortalezas\n{strengths_md}\n\n"
        f"## Áreas de mejora\n{improvements_md}\n\n"
        f"## Calificación estimada\n{result.grade}\n\n"
    )
    file_path.write_text(content, encoding="utf-8")
    return file_path


def write_summary_csv(results: List[FeedbackResult], output_dir: Path) -> Path:
    csv_path = output_dir / "resumen.csv"
    output_dir.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["student_id", "grade", "source_path", "feedback_path"])
        for result in results:
            feedback_path = str((output_dir / result.student_id / "feedback.md").resolve())
            writer.writerow([result.student_id, result.grade, result.source_path, feedback_path])
    return csv_path


def main() -> None:
    args = parse_args()
    submissions = load_submissions(args.input)
    processed = preprocess_submissions(submissions)
    rubric_text = read_rubric(args.rubrica)
    model = select_model(args.model, rubric_text, args.criteria)
    feedback_results = generate_feedback(
        processed, rubric_text, model, token_limit=args.token_limit, criteria=args.criteria
    )

    args.output.mkdir(parents=True, exist_ok=True)
    for result in feedback_results:
        write_markdown_feedback(result, args.output)
    write_summary_csv(feedback_results, args.output)


if __name__ == "__main__":
    main()
