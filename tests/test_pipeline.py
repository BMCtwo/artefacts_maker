import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.data_loader import load_submissions
from src.feedback import LocalTemplateModel, generate_feedback
from src.preprocess import preprocess_submissions
from src.main import write_markdown_feedback, write_summary_csv


def create_sample_files(tmp_path: Path) -> Path:
    student_dir = tmp_path / "alumno1"
    student_dir.mkdir(parents=True, exist_ok=True)
    (student_dir / "tarea.txt").write_text("Este es un ejemplo de entrega para pruebas.", encoding="utf-8")
    (tmp_path / "alumno2.txt").write_text("Segunda entrega de prueba para el pipeline.", encoding="utf-8")
    return tmp_path


def test_full_pipeline(tmp_path: Path):
    input_dir = create_sample_files(tmp_path / "input")
    rubric = "Criterios: claridad, coherencia y ortografía."

    submissions = load_submissions(input_dir)
    assert len(submissions) == 2

    processed = preprocess_submissions(submissions)
    model = LocalTemplateModel(rubric)
    feedback = generate_feedback(processed, rubric, model)

    output_dir = tmp_path / "output"
    for result in feedback:
        md_path = write_markdown_feedback(result, output_dir)
        assert md_path.exists()
        content = md_path.read_text(encoding="utf-8")
        assert result.student_id in content

    csv_path = write_summary_csv(feedback, output_dir)
    assert csv_path.exists()
    csv_text = csv_path.read_text(encoding="utf-8")
    assert "alumno1" in csv_text and "alumno2" in csv_text
