import hashlib
from typing import Dict, Any

def anonymize_athlete_data(athlete: Dict[str, Any]) -> Dict[str, Any]:
    """Анонимизирует данные спортсмена, заменяя имя на хэш и удаляя день рождения"""

    name_parts = athlete['name'].split()
    first_name = name_parts[1] if len(name_parts) > 1 else ""
    last_name = name_parts[0] if name_parts else ""
    birth_year = str(athlete.get('birth_year', ''))

    hash_input = f"{last_name}_{first_name}_{birth_year}".lower().encode('utf-8')
    hash_value = hashlib.sha256(hash_input).hexdigest()[:12]

    anonymized = athlete.copy()
    anonymized['name'] = f"athlete_{hash_value}"

    # Удаляем чувствительные данные
    if 'birth_year' in anonymized:
        del anonymized['birth_year']

    return anonymized

def apply_anonymization(data: Dict[str, Any], config: Dict) -> Dict[str, Any]:
    """Применяет анонимизацию ко всем спортсменам в данных, если включено в конфиге"""
    if not config.get('anonymization', {}).get('enabled', False):
        return data

    if 'overall_ranking' in data:
        data['overall_ranking'] = [
            anonymize_athlete_data(athlete)
            for athlete in data['overall_ranking']
        ]

    if 'year_rankings' in data:
        for year, year_data in data['year_rankings'].items():
            if 'athletes' in year_data:
                year_data['athletes'] = [
                    anonymize_athlete_data(athlete)
                    for athlete in year_data['athletes']
                ]

    return data
