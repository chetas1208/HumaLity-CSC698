"""
Advanced ML-based AI Text Detection Module

Uses an ensemble of multiple detection methods:
1. RoBERTa-based classifier (ChatGPT-trained)
2. Linguistic feature analysis (sentence variation, contractions, etc.)
3. Perplexity-inspired metrics

This provides much more accurate detection, especially for humanized text.
"""

import re
import math
from functools import lru_cache
from typing import Final
from collections import Counter

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# Use ChatGPT-specific detector for better accuracy on modern AI text
MODEL_NAME: Final[str] = "Hello-SimpleAI/chatgpt-detector-roberta"
FALLBACK_MODEL: Final[str] = "roberta-base-openai-detector"

# Device configuration
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Weights for ensemble scoring
# Linguistic features are most reliable for detecting humanized text
WEIGHTS = {
    "model_score": 0.35,       # ML model contribution (reduced - not great at humanized text)
    "linguistic_score": 0.45,  # Linguistic features contribution (increased - best signal)
    "burstiness_score": 0.20   # Sentence variation contribution
}

# Common AI phrases that indicate AI-generated text
AI_PHRASES = [
    r'\bin conclusion\b',
    r'\bfurthermore\b',
    r'\bmoreover\b',
    r'\bconsequently\b',
    r'\bnevertheless\b',
    r'\bnonetheless\b',
    r'\bit is important to note\b',
    r'\bit should be noted\b',
    r'\bin today\'?s world\b',
    r'\bin the realm of\b',
    r'\bleverage\b',
    r'\butilize\b',
    r'\bfacilitate\b',
    r'\boptimize\b',
    r'\bparamount\b',
    r'\bpivotal\b',
    r'\bcrucial\b',
    r'\bessential\b',
    r'\bfundamental\b',
    r'\bdelve\b',
    r'\bembark\b',
    r'\bnavigate\b',
    r'\bunlock\b',
    r'\bseamlessly\b',
    r'\bholistic\b',
    r'\bsynergy\b',
    r'\brobust\b',
    r'\bcomprehensive\b',
    r'\binnovative\b',
    r'\bcutting-edge\b',
    r'\bstate-of-the-art\b',
    r'\bgroundbreaking\b',
]

# Human-like indicators
HUMAN_INDICATORS = [
    r'\bi think\b',
    r'\bi feel\b',
    r'\bi believe\b',
    r'\bi guess\b',
    r'\bi mean\b',
    r'\bhonestly\b',
    r'\bbasically\b',
    r'\bactually\b',
    r'\bliterally\b',
    r'\bkinda\b',
    r'\bsorta\b',
    r'\bgonna\b',
    r'\bwanna\b',
    r'\byou know\b',
    r'\blike,?\s',
    r'\bright\?',
    r'\bdoesn\'t it\b',
    r'\bisn\'t it\b',
    r'\baren\'t\b',
    r'\bwon\'t\b',
    r'\bcan\'t\b',
    r'\bdon\'t\b',
    r'\bdidn\'t\b',
    r'\bwouldn\'t\b',
    r'\bcouldn\'t\b',
    r'\bshouldn\'t\b',
    r'\bi\'m\b',
    r'\bi\'ve\b',
    r'\bi\'ll\b',
    r'\bi\'d\b',
    r'\bwe\'re\b',
    r'\bwe\'ve\b',
    r'\bthey\'re\b',
    r'\bit\'s\b',
    r'\bthat\'s\b',
    r'\bwhat\'s\b',
    r'\bhere\'s\b',
    r'\bthere\'s\b',
    r'\blet\'s\b',
]


@lru_cache(maxsize=1)
def get_model_and_tokenizer():
    """Load and cache the model and tokenizer."""
    try:
        print(f"Loading AI detection model: {MODEL_NAME}...")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
    except Exception as e:
        print(f"Failed to load {MODEL_NAME}, falling back to {FALLBACK_MODEL}: {e}")
        tokenizer = AutoTokenizer.from_pretrained(FALLBACK_MODEL)
        model = AutoModelForSequenceClassification.from_pretrained(FALLBACK_MODEL)
    
    model.to(DEVICE)
    model.eval()
    print(f"Model loaded on {DEVICE}")
    return model, tokenizer


def split_into_sentences(text: str) -> list[str]:
    """Split text into sentences for segment-level analysis."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip() and len(s.strip()) > 5]


def calculate_burstiness(text: str) -> float:
    """
    Calculate sentence length burstiness (variation).
    Humans write with more varied sentence lengths.
    Returns 0-1 where higher = more human-like variation.
    """
    sentences = split_into_sentences(text)
    if len(sentences) < 2:
        return 0.5
    
    lengths = [len(s.split()) for s in sentences]
    mean_len = sum(lengths) / len(lengths)
    
    if mean_len == 0:
        return 0.5
    
    # Calculate coefficient of variation
    variance = sum((l - mean_len) ** 2 for l in lengths) / len(lengths)
    std_dev = math.sqrt(variance)
    cv = std_dev / mean_len if mean_len > 0 else 0
    
    # Normalize to 0-1 (higher CV = more human-like)
    # Typical human CV is 0.4-0.8, AI is 0.2-0.4
    normalized = min(cv / 0.8, 1.0)
    return normalized


def analyze_linguistic_features(text: str) -> dict:
    """
    Analyze linguistic features to detect AI vs human writing.
    Returns scores and detected features.
    """
    text_lower = text.lower()
    
    # Count AI phrases
    ai_phrase_count = 0
    detected_ai_phrases = []
    for pattern in AI_PHRASES:
        matches = re.findall(pattern, text_lower)
        ai_phrase_count += len(matches)
        if matches:
            detected_ai_phrases.extend(matches)
    
    # Count human indicators
    human_indicator_count = 0
    detected_human_indicators = []
    for pattern in HUMAN_INDICATORS:
        matches = re.findall(pattern, text_lower)
        human_indicator_count += len(matches)
        if matches:
            detected_human_indicators.extend(matches)
    
    # Calculate word count for normalization
    word_count = len(text.split())
    
    # Normalize scores per 100 words
    ai_score = (ai_phrase_count / max(word_count, 1)) * 100
    human_score = (human_indicator_count / max(word_count, 1)) * 100
    
    # Calculate final linguistic score (0 = human, 1 = AI)
    # More AI phrases = higher score, more human indicators = lower score
    linguistic_ai_probability = max(0, min(1, (ai_score * 5 - human_score * 3) / 10 + 0.5))
    
    return {
        "ai_probability": linguistic_ai_probability,
        "ai_phrases_found": len(detected_ai_phrases),
        "human_indicators_found": len(detected_human_indicators),
        "ai_phrases": detected_ai_phrases[:5],  # Limit for display
        "human_indicators": detected_human_indicators[:5]
    }


def detect_with_model(text: str, model, tokenizer) -> float:
    """
    Detect AI probability using the ML model.
    Returns probability 0-1 (0 = human, 1 = AI).
    """
    if not text or not text.strip():
        return 0.0
    
    # Tokenize with truncation for long texts
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding=True
    ).to(DEVICE)
    
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.softmax(logits, dim=-1)
        
        # Check model output format
        # Some models use [Human, AI], others use [AI, Human]
        # We need to determine which based on the model
        if probs.shape[1] == 2:
            # Assume [Real/Human, Fake/AI] format
            ai_probability = probs[0][1].item()
        else:
            ai_probability = probs[0][0].item()
    
    return ai_probability


def detect_ai_content_ml(text: str) -> dict:
    """
    Advanced AI detection using ensemble of methods.
    
    Returns:
        dict with:
        - 'score': Integer 0-100 (0=definitely human, 100=definitely AI)
        - 'analysis': String explanation of the detection
        - 'segments': List of per-sentence analysis
    """
    if not text or not text.strip():
        return {
            "score": 0,
            "analysis": "No text provided.",
            "segments": []
        }
    
    model, tokenizer = get_model_and_tokenizer()
    
    # 1. ML Model Score
    model_prob = detect_with_model(text, model, tokenizer)
    
    # 2. Linguistic Analysis
    linguistic = analyze_linguistic_features(text)
    linguistic_prob = linguistic["ai_probability"]
    
    # 3. Burstiness Score (sentence variation)
    burstiness = calculate_burstiness(text)
    burstiness_prob = 1 - burstiness  # High burstiness = more human = lower AI prob
    
    # 4. Ensemble Score (weighted combination)
    ensemble_prob = (
        WEIGHTS["model_score"] * model_prob +
        WEIGHTS["linguistic_score"] * linguistic_prob +
        WEIGHTS["burstiness_score"] * burstiness_prob
    )
    
    # Apply calibration for humanized text
    # If text has many human indicators, reduce the score more aggressively
    human_count = linguistic["human_indicators_found"]
    if human_count >= 2:
        ensemble_prob *= 0.75
    if human_count >= 4:
        ensemble_prob *= 0.7
    if human_count >= 6:
        ensemble_prob *= 0.65
    
    # If burstiness is high (varied sentences), reduce score
    if burstiness > 0.5:
        ensemble_prob *= 0.9
    if burstiness > 0.7:
        ensemble_prob *= 0.85
    
    # Boost score if AI phrases found and few human indicators
    ai_count = linguistic["ai_phrases_found"]
    if ai_count >= 2 and human_count < 2:
        ensemble_prob = min(1.0, ensemble_prob * 1.3)
    
    overall_score = int(ensemble_prob * 100)
    overall_score = max(0, min(100, overall_score))  # Clamp to 0-100
    
    # Analyze individual sentences
    sentences = split_into_sentences(text)
    segments = []
    
    for sentence in sentences:
        if len(sentence) > 15:
            sent_model_prob = detect_with_model(sentence, model, tokenizer)
            sent_linguistic = analyze_linguistic_features(sentence)
            
            # Weighted sentence score
            sent_prob = (sent_model_prob * 0.6 + sent_linguistic["ai_probability"] * 0.4)
            
            segments.append({
                "text": sentence,
                "aiProbability": round(sent_prob, 3)
            })
    
    # Generate analysis text
    analysis_parts = []
    
    if overall_score >= 70:
        analysis_parts.append(f"High AI probability ({overall_score}%).")
        analysis_parts.append("The text shows strong AI patterns.")
    elif overall_score >= 40:
        analysis_parts.append(f"Moderate AI probability ({overall_score}%).")
        analysis_parts.append("Mixed signals detected.")
    elif overall_score >= 20:
        analysis_parts.append(f"Low AI probability ({overall_score}%).")
        analysis_parts.append("Text appears mostly human-written.")
    else:
        analysis_parts.append(f"Very low AI probability ({overall_score}%).")
        analysis_parts.append("Strong human writing indicators detected.")
    
    # Add specific findings
    if linguistic["ai_phrases_found"] > 0:
        analysis_parts.append(f"Found {linguistic['ai_phrases_found']} AI-typical phrases.")
    if linguistic["human_indicators_found"] > 0:
        analysis_parts.append(f"Found {linguistic['human_indicators_found']} human indicators (contractions, fillers).")
    
    if burstiness > 0.5:
        analysis_parts.append("Good sentence length variation (human-like).")
    else:
        analysis_parts.append("Uniform sentence structure (AI-like).")
    
    return {
        "score": overall_score,
        "analysis": " ".join(analysis_parts),
        "segments": segments,
        "details": {
            "model_score": int(model_prob * 100),
            "linguistic_score": int(linguistic_prob * 100),
            "burstiness_score": int(burstiness_prob * 100),
            "ai_phrases": linguistic["ai_phrases"],
            "human_indicators": linguistic["human_indicators"]
        }
    }


def preload_model():
    """Pre-load the model to avoid cold start delays."""
    try:
        get_model_and_tokenizer()
    except Exception as e:
        print(f"Warning: Could not preload AI detection model: {e}")


if __name__ == "__main__":
    # Test the detector
    test_texts = [
        # Human-like text
        "I really think this whole AI thing is getting out of hand, you know? Like, honestly, it's kinda scary how fast it's moving. But hey, that's just my take on it.",
        
        # AI-generated text
        "Artificial intelligence systems leverage advanced algorithms and large datasets to perform tasks that traditionally require human intelligence. These systems can analyze patterns, make predictions, and automate decision-making across diverse fields such as healthcare, finance, and transportation. Furthermore, AI continues to evolve, offering innovative solutions to complex problems.",
        
        # Humanized AI text (should score LOW)
        "So, technology's evolution just keeps pushing the limits, doesn't it? It's constantly redefining what we can create and how productive we can actually be. Year after year, new innovations just get more and more connected. And get this: these systems can actually learn, adapt, and respond in real time. It's pretty wild.",
    ]
    
    print("Testing Advanced AI Detection\n" + "="*60)
    for i, text in enumerate(test_texts):
        result = detect_ai_content_ml(text)
        print(f"\nTest {i+1}:")
        print(f"Text: {text[:80]}...")
        print(f"Score: {result['score']}% AI")
        print(f"Analysis: {result['analysis']}")
        if "details" in result:
            print(f"Details: Model={result['details']['model_score']}%, "
                  f"Linguistic={result['details']['linguistic_score']}%, "
                  f"Burstiness={result['details']['burstiness_score']}%")
