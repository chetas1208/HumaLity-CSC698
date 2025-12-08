from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from humanior_client import humanize_text, list_tones, detect_ai_content

app = FastAPI()

# Allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HumanizeRequest(BaseModel):
    text: str
    tone: str


class DetectRequest(BaseModel):
    text: str


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_BUILD_DIR = BASE_DIR / "dist"
ASSETS_DIR = FRONTEND_BUILD_DIR / "assets"
INDEX_FILE = FRONTEND_BUILD_DIR / "index.html"

if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


def _frontend_ready() -> bool:
    return INDEX_FILE.is_file()


@app.get("/tones")
def get_tones():
    return list_tones()


@app.post("/detect-ai")
def detect_ai(request: DetectRequest):
    try:
        result = detect_ai_content(request.text)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/humanize-with-detection")
def create_humanization_with_detection(request: HumanizeRequest):
    try:
        # 1. Detect AI on input
        input_detection = detect_ai_content(request.text)
        
        # 2. Humanize
        humanized_text = humanize_text(ai_text=request.text, tone=request.tone)
        
        # 3. Detect AI on output
        output_detection = detect_ai_content(humanized_text)
        
        return {
            "humanized_text": humanized_text,
            "input_detection": input_detection,
            "output_detection": output_detection
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(exc)}",
        ) from exc


@app.post("/humanize")
def create_humanization(request: HumanizeRequest):
    # Keeping the old endpoint for backward compatibility if needed, 
    # but we should prefer the new one.
    try:
        humanized_text = humanize_text(ai_text=request.text, tone=request.tone)
        return {"humanized_text": humanized_text}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(exc)}",
        ) from exc


@app.get("/", include_in_schema=False)
def serve_frontend_root():
    if not _frontend_ready():
        raise HTTPException(status_code=404, detail="Frontend build not found. Run `npm run build`.")
    return FileResponse(INDEX_FILE)


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend_app(full_path: str):  # noqa: ARG001 - required by FastAPI
    if not _frontend_ready():
        raise HTTPException(status_code=404, detail="Frontend build not found. Run `npm run build`.")
    return FileResponse(INDEX_FILE)
