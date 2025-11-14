import os
from functools import lru_cache
from typing import Final

from dotenv import load_dotenv
from google import genai

load_dotenv()

PLACEHOLDER_KEY: Final[str] = "gen-lang-client-0162616239"
DEFAULT_MODEL: Final[str] = "gemini-2.5-flash"
TONE_PRESETS: Final[dict[str, dict[str, str]]] = {
    "natural": {
        "label": "Natural",
        "description": "Balanced & authentic",
        "prompt": "Use a natural, authentic voice that feels human and approachable.",
    },
    "casual": {
        "label": "Casual",
        "description": "Friendly & relaxed",
        "prompt": "Keep the tone light, conversational, and friendly.",
    },
    "professional": {
        "label": "Professional",
        "description": "Polished & formal",
        "prompt": "Write with a polished, professional tone appropriate for business communication.",
    },
    "creative": {
        "label": "Creative",
        "description": "Expressive & unique",
        "prompt": "Infuse the writing with expressive, vivid language while staying clear.",
    },
    "concise": {
        "label": "Concise",
        "description": "Clear & to the point",
        "prompt": "Make the writing crisp and concise without losing important information.",
    },
}
DEFAULT_TONE_KEY: Final[str] = "natural"


def _resolve_api_key() -> str:
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "No API key found. Set GOOGLE_API_KEY or GEMINI_API_KEY in your environment or .env file."
        )
    if api_key == PLACEHOLDER_KEY:
        raise ValueError(
            "The API key in .env is a placeholder. Replace it with a valid key from Google AI Studio."
        )
    return api_key


@lru_cache(maxsize=1)
def get_client() -> genai.Client:
    api_key = _resolve_api_key()
    return genai.Client(api_key=api_key)


def list_tones() -> list[dict[str, str]]:
    """Return available tone presets with labels and descriptions."""
    return [
        {"key": key, "label": data["label"], "description": data["description"]}
        for key, data in TONE_PRESETS.items()
    ]


def _normalize_tone(tone: str | None) -> str:
    if not tone:
        return DEFAULT_TONE_KEY

    normalized = tone.strip().lower()
    if normalized in TONE_PRESETS:
        return normalized

    # Allow matching by display label (e.g., "Natural")
    for key, data in TONE_PRESETS.items():
        if normalized == data["label"].lower():
            return key

    available = ", ".join(data["label"] for data in TONE_PRESETS.values())
    raise ValueError(f"Unsupported tone '{tone}'. Choose from: {available}.")


def humanize_text(ai_text: str, tone: str | None = None) -> str:
    """Rewrite AI-generated text to sound more natural, honoring the requested tone."""
    if not ai_text or not ai_text.strip():
        raise ValueError("Input text cannot be empty.")

    tone_key = _normalize_tone(tone)
    tone_data = TONE_PRESETS[tone_key]
    prompt = (
        "Humanize the following AI-generated text so it sounds natural, engaging, and easy to read. "
        f"{tone_data['prompt']} Preserve the original meaning and key details. "
        "Respond with the rewritten text only.\n\n"
        f"Input:\n{ai_text.strip()}\n\nHumanized version:"
    )

    client = get_client()
    response = client.models.generate_content(model=DEFAULT_MODEL, contents=prompt)
    if not getattr(response, "text", "").strip():
        raise RuntimeError("Empty response from Gemini model.")
    return response.text.strip()
