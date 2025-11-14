from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from humanior_client import humanize_text, list_tones

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


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_BUILD_DIR = BASE_DIR / "build"
ASSETS_DIR = FRONTEND_BUILD_DIR / "assets"
INDEX_FILE = FRONTEND_BUILD_DIR / "index.html"

if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


def _frontend_ready() -> bool:
    return INDEX_FILE.is_file()


@app.get("/tones")
def get_tones():
    return list_tones()


@app.post("/humanize")
def create_humanization(request: HumanizeRequest):
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
