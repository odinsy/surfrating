import string
import hashlib
from typing import Dict, Any

def normalize_string(s: str) -> str:
    s = s.strip().lower()
    s = s.replace('ё', 'е')
    s = s.translate(str.maketrans('', '', string.punctuation))
    s = s.replace(' ', '_')
    return s

def generate_athlete_id(name: str, birth_year: int) -> str:
    normalized_name = normalize_string(name)
    base_string = f"{normalized_name}_{birth_year}"
    return hashlib.md5(base_string.encode('utf-8')).hexdigest()[:8]

def generate_event_id(event_name: str, event_date: str, discipline: str, category: str) -> str:
    normalized_name = normalize_string(event_name)
    normalized_date = normalize_string(event_date)
    normalized_discipline = normalize_string(discipline)
    normalized_category = normalize_string(category)

    base_string = f"{normalized_name}_{normalized_date}_{normalized_discipline}_{normalized_category}"
    return hashlib.md5(base_string.encode('utf-8')).hexdigest()[:8]
