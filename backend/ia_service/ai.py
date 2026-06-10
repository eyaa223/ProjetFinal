#!/usr/bin/env python3
"""
AI Service — Don'Act Feedback
SDK : google-genai
Appelé par Node.js via child_process stdin/stdout
"""

import os
import sys
import json
import traceback
from pathlib import Path

# ── Charger le .env ────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    for candidate in [
        Path(__file__).parent / '.env',
        Path(__file__).parent.parent / '.env',
    ]:
        if candidate.exists():
            load_dotenv(dotenv_path=candidate)
            break
except ImportError:
    pass

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print(json.dumps({
        "success": False,
        "error":   "GEMINI_API_KEY non configurée dans .env"
    }, ensure_ascii=False))
    sys.exit(1)

# ── Charger le SDK google-genai ────────────────────────────────────────────────
try:
    from google import genai
    client = genai.Client(api_key=API_KEY)
except ImportError:
    print(json.dumps({
        "success": False,
        "error":   "SDK manquant. Exécutez : pip install google-genai python-dotenv"
    }, ensure_ascii=False))
    sys.exit(1)

# ── Labels ─────────────────────────────────────────────────────────────────────
ROLE_LABELS = {
    'donor':         'donneur',
    'beneficiary':   'bénéficiaire',
    'association':   'association',
    # accepte aussi les valeurs françaises directement
    'utilisateur':   'donneur',
    'beneficiaire':  'bénéficiaire',
}

RATING_LABELS = {
    1: 'très insatisfait',
    2: 'insatisfait',
    3: 'neutre',
    4: 'satisfait',
    5: 'très satisfait',
}

# Modèles à essayer dans l'ordre (fallback automatique sur erreur temporaire)
MODELS = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.5-pro'
]

# ── Fonction principale ────────────────────────────────────────────────────────
def improve_feedback(message: str, rating: int, role: str) -> dict:
    role_label   = ROLE_LABELS.get(role, 'utilisateur')
    rating_label = RATING_LABELS.get(rating, 'neutre')

    prompt = f"""Tu es un assistant qui améliore les messages de feedback pour la plateforme de don "Don'Act".

Contexte :
- Rôle de l'utilisateur : {role_label}
- Note donnée : {rating}/5 ({rating_label})
- Message original : "{message}"

Tâche :
- Améliore le message pour le rendre plus clair et professionnel
- Garde le ton authentique et sincère
- Corrige les fautes d'orthographe et de grammaire
- Garde une longueur similaire (maximum 500 caractères)
- Ne change pas le sens du message
- Adapte le ton à la note (enthousiaste si 4-5, constructif et bienveillant si 1-3)

Retourne UNIQUEMENT le message amélioré, sans explication ni guillemets."""

    last_error = None
    error_code = None

    for model_name in MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )

            improved = response.text.strip()

            # Nettoyer les guillemets éventuels
            if improved.startswith('"') and improved.endswith('"'):
                improved = improved[1:-1].strip()
            if improved.startswith("'") and improved.endswith("'"):
                improved = improved[1:-1].strip()

            # Limiter à 500 caractères
            if len(improved) > 500:
                improved = improved[:497] + "..."

            return {
                "success":         True,
                "message":         improved,
                "model":           model_name,
                "original_length": len(message),
                "improved_length": len(improved),
            }

        except Exception as e:
            err_str = str(e)
            err_lower = err_str.lower()
            last_error = err_str

            # ✅ NOUVEAU : Erreur 503 - Service indisponible/surchargé
            if ('503' in err_str or 
                'unavailable' in err_lower or 
                'high demand' in err_lower or
                'temporarily' in err_lower or
                'overloaded' in err_lower):
                print(f"[AI] Service surchargé pour {model_name}, essai suivant...", file=sys.stderr)
                error_code = 503
                continue

            # Quota dépassé → essayer le modèle suivant
            if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or 'quota' in err_lower:
                print(f"[AI] Quota dépassé pour {model_name}, essai suivant...", file=sys.stderr)
                error_code = 429
                continue

            # Modèle non trouvé → essayer le suivant
            if '404' in err_str or 'not found' in err_lower:
                print(f"[AI] Modèle {model_name} non disponible, essai suivant...", file=sys.stderr)
                error_code = 404
                continue

            # Erreur 400 - Requête invalide
            if '400' in err_str or 'invalid' in err_lower or 'bad request' in err_lower:
                error_code = 400
                raise  # Erreur fatale, ne pas essayer d'autres modèles

            # Erreur 401/403 - Problème d'authentification
            if '401' in err_str or '403' in err_str or 'unauthorized' in err_lower or 'forbidden' in err_lower:
                error_code = 401
                raise  # Erreur fatale

            # Autre erreur → sortir directement
            error_code = 500
            raise

    # Tous les modèles ont échoué
    error_messages = {
        503: "Service IA temporairement surchargé. Tous les modèles sont indisponibles.",
        429: "Quota API dépassé sur tous les modèles. Créez une nouvelle clé sur aistudio.google.com.",
        404: "Aucun modèle IA disponible.",
    }
    
    final_message = error_messages.get(error_code, f"Tous les modèles ont échoué. Dernière erreur: {last_error}")
    raise Exception(final_message)


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            raise ValueError("Aucune donnée reçue sur stdin")

        data    = json.loads(raw)
        message = data.get("message", "").strip()
        rating  = int(data.get("rating", 5))
        role    = data.get("role", "donor")

        if not message:
            raise ValueError("Message vide")
        if not (1 <= rating <= 5):
            raise ValueError("Rating doit être entre 1 et 5")

        # Normaliser le rôle (accepte français et anglais)
        if role not in ROLE_LABELS:
            role = "donor"

        result = improve_feedback(message, rating, role)
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)

    except Exception as e:
        err_msg = str(e)
        err_lower = err_msg.lower()
        
        # ✅ Déterminer le code d'erreur pour Node.js
        error_code = None
        if '503' in err_msg or 'surchargé' in err_lower or 'unavailable' in err_lower:
            error_code = 503
        elif '429' in err_msg or 'quota' in err_lower:
            error_code = 429
        elif '400' in err_msg or 'invalide' in err_lower:
            error_code = 400
        elif '401' in err_msg or '403' in err_msg:
            error_code = 401
        
        print(json.dumps({
            "success":    False,
            "error":      err_msg,
            "error_code": error_code,
            "trace":      traceback.format_exc() if os.getenv("DEBUG") == "true" else None
        }, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()