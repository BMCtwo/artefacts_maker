# Generador de feedback automático para entregas estudiantiles

Este proyecto procesa carpetas con entregas (TXT, PDF o DOCX), limpia el texto y genera retroalimentación estructurada usando un modelo local o conectable a APIs externas. Incluye una interfaz CLI y pruebas básicas.

## Requisitos

- Python 3.10+
- Dependencias: `pdfplumber`, `python-docx`, `pytest` (para pruebas).

Instalación rápida:

```bash
pip install pdfplumber python-docx pytest
```

## Uso

Ejecuta el flujo completo con:

```bash
python -m src.main --input /ruta/tareas --rubrica rubrica.md --output output/ --token-limit 512 --model local --criteria "Claridad y coherencia"
```

- `--input`: carpeta con las entregas de los alumnos.
- `--rubrica`: archivo de rúbrica (texto/Markdown).
- `--output`: carpeta destino donde se generan los reportes por alumno y `resumen.csv`.
- `--token-limit`: límite para las respuestas del modelo (se pasa al generador elegido).
- `--model`: nombre del modelo (por defecto `local`, se puede reemplazar por OpenAI/HF en `feedback.py`).
- `--criteria`: texto opcional con criterios adicionales.

## Flujo interno

1. **Carga** (`src/data_loader.py`): recorre la carpeta con `pathlib`, lee PDF/TXT/DOCX y normaliza a texto.
2. **Preprocesado** (`src/preprocess.py`): limpia metadatos simples y tokeniza.
3. **Generación de feedback** (`src/feedback.py`): arma un prompt con rúbrica/criterios y produce un JSON de fortalezas, áreas de mejora y calificación. El modelo por defecto es local y seguro para pruebas.
4. **Salida** (`src/main.py`): guarda un Markdown por alumno en `output/<alumno>/feedback.md` y un `resumen.csv` con calificaciones y rutas.

## Seguridad y privacidad

- El modelo local no envía datos a terceros y funciona como plantilla.
- Si se conecta una API externa (OpenAI, HuggingFace, etc.) debe aplicarse anonimización previa de nombres y datos sensibles de los textos antes de enviarlos. Añade ese paso en `feedback.py` o antes de construir el prompt y evita registrar información personal en logs.

## Pruebas

Ejecuta las pruebas con:

```bash
pytest
```

Las pruebas usan muestras de texto para verificar que se generan los archivos de salida.
