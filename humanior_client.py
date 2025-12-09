import os
import re
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
    tone_instruction = tone_data['prompt']

    prompt = (
        "TASK: Rewrite the provided 'AI Text' below to sound like it was written by a real, engaging human, not a formal algorithm. The goal is to eliminate all traces of robotic or stiff prose while strictly preserving the core meaning and all factual information.\n\n"
        "--- STYLISTIC MANDATES (CRITICAL RULES) ---\n"
        "1. Contractions Mandatory: Use contractions frequently (e.g., it's, don't, we'll). This is a primary differentiator.\n"
        "2. Sentence Rhythm: Dramatically vary sentence length. Mix very short, punchy sentences with longer, more complex ones.\n"
        "3. Conversational Vocabulary: Use simple, everyday words. Replace formal words (utilize, numerous, subsequently) with informal ones (use, many, later).\n"
        "4. Natural Pauses: Add subtle filler words occasionally (well, actually, basically, honestly).\n"
        "5. Remove Clunky Transitions: Eliminate stiff transitions (Furthermore, Moreover, In conclusion). Connect ideas organically.\n"
        "6. Human Touch: Add personal opinion, enthusiasm, rhetorical questions, or relatable asides.\n"
        "7. Structure: Break rigid paragraph uniformity. Use shorter, organic paragraphs.\n"
        "8. Voice: Use active voice over passive voice.\n"
        f"9. Tone: {tone_instruction}\n\n"
        "--- OUTPUT CONSTRAINTS ---\n"
        "a. Do NOT use any markdown formatting (no bold, italics, bullets, headings).\n"
        "b. Output plain text only.\n\n"
        f"--- INPUT TEXT ---\n{ai_text.strip()}\n\n"
        "Human-sounding version:"
    )

    client = get_client()
    response = client.models.generate_content(model=DEFAULT_MODEL, contents=prompt)
    if not getattr(response, "text", "").strip():
        raise RuntimeError("Empty response from Gemini model.")
    
    # Strip markdown formatting while preserving legitimate character uses
    result = response.text.strip()
    
    # Remove bold: **text** -> text
    result = re.sub(r'\*\*(.+?)\*\*', r'\1', result)
    # Remove italic: *text* -> text (but not standalone * like in math)
    result = re.sub(r'(?<!\*)\*([^\s*][^*]*?)\*(?!\*)', r'\1', result)
    # Remove headings: # at start of line
    result = re.sub(r'^#{1,6}\s*', '', result, flags=re.MULTILINE)
    # Remove code blocks: ```text``` -> text
    result = re.sub(r'```[\s\S]*?```', lambda m: m.group(0).strip('`').strip(), result)
    # Remove inline code: `text` -> text
    result = re.sub(r'`([^`]+)`', r'\1', result)
    
    return result


def detect_ai_content(text: str) -> dict:
    """
    Analyzes text to determine if it was generated by AI.
    Returns a dictionary with 'score' (0-100) and 'analysis'.
    """
    if not text or not text.strip():
        return {"score": 0, "analysis": "No text provided.", "segments": []}

    prompt = (
        "You are an expert linguistic forensics analyst specializing in AI-generated text detection. "
        "Analyze this text for AI generation markers with high precision and assign a final confidence score.\n\n"
        "Evaluate SYSTEMATICALLY:\n"
        "1. **Vocabulary & Phrasing**: Look for overused phrases like 'In today\\'s world', 'It is important to note', 'Furthermore', 'In conclusion'. AI favors predictable transitions.\n"
        "2. **Sentence Structure**: AI produces uniform sentence lengths with minimal variation. Humans show natural burstiness - short punchy sentences mixed with longer complex ones.\n"
        "3. **Perplexity Score**: Does every word follow naturally? AI text flows too smoothly with predictable word choices. Human text has unexpected word choices, slang, contractions, hesitations.\n"
        "4. **Emotional Markers**: Detect authentic emotion vs artificial sentiment. AI lacks personal anecdotes, humor nuance, sarcasm, real frustration. Look for generic emotional language.\n"
        "5. **Specificity**: Human writing includes specific numbers, names, timestamps, personal details. AI tends toward vague generalizations.\n"
        "6. **Repetition**: AI repeats key terms unnecessarily. Humans use pronouns and varied references.\n"
        "7. **Paragraph Structure**: AI follows rigid structures (intro, 3 points, conclusion). Human writing is more organic.\n\n"
        "Provide output as valid JSON with these EXACT keys:\n"
        "- 'score': Integer 0-100 (0=definitely human, 100=definitely AI). Be aggressive - penalize unnatural patterns heavily.\n"
        "- 'analysis': String explaining your score in 2-3 sentences, citing specific indicators found.\n"
        "- 'segments': Array of sentence-level analysis objects with 'text' (the sentence) and 'aiProbability' (number 0-1) based on markers in that specific sentence.\n\n"
        f"TEXT TO ANALYZE:\n{text.strip()}\n\nRESPONSE (valid JSON only):"
    )

    client = get_client()
    # Enforce JSON response
    response = client.models.generate_content(
        model=DEFAULT_MODEL,
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )

    if not response.text:
        raise RuntimeError("Empty response from Gemini detection.")

    import json
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        # Fallback if JSON parsing fails (rare with response_mime_type set)
        return {"score": 50, "analysis": "Error parsing detection result.", "segments": []}
