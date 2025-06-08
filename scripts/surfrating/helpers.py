import string
import hashlib
import csv
import re
import pandas as pd
from datetime import datetime
from typing import Dict, Any

def validate_csv_columns(reader, required_columns: list, file_path: str) -> None:
    if reader.fieldnames is None:
        raise ValueError(f"CSV file {file_path} has no header")
    missing = [col for col in required_columns if col not in reader.fieldnames]
    if missing:
        raise ValueError(f"CSV file {file_path} is missing required columns: {', '.join(missing)}")

def read_csv_file(file_path: str, required_columns: list) -> list:
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='|')
        validate_csv_columns(reader, required_columns, file_path)
        return list(reader)

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

def extract_year(date_str: str) -> int:
    if not date_str or pd.isna(date_str):
        return 0

    try:
        date = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
        if not pd.isnull(date):
            return date.year

        match = re.search(r'\b\d{4}\b', date_str)
        if match:
            year = int(match.group())
            if 1900 <= year <= datetime.now().year:
                return year
        return 0
    except Exception:
        return 0
def get_event_group(event_name: str, config: Dict) -> str:
    for group_name, group_data in config['event_groups'].items():
        patterns = group_data.get('events', [])
        for pattern in patterns:
            if pattern in event_name:
                return group_name
    return 'default'
