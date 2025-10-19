import hashlib
from typing import Dict, Any

def anonymize_athlete_data(athlete: Dict[str, Any]) -> Dict[str, Any]:
    anonymized = athlete.copy()

    name_parts = anonymized['name'].split()
    first_name = name_parts[1] if len(name_parts) > 1 else ""
    last_name = name_parts[0] if name_parts else ""
    birth_year = str(anonymized.get('birth_year', ''))

    hash_input = f"{last_name}_{first_name}_{birth_year}".lower().encode('utf-8')
    hash_value = hashlib.sha256(hash_input).hexdigest()[:12]

    anonymized['name'] = f"athlete_{hash_value}"
    anonymized.pop('birth_year', None)

    return anonymized

def apply_anonymization(data: Dict[str, Any], config: Dict) -> Dict[str, Any]:
    if not config.get('anonymization', {}).get('enabled', False):
        return data

    if 'athletes' in data:
        for athlete_id, athlete_data in data['athletes'].items():
            data['athletes'][athlete_id] = anonymize_athlete_data(athlete_data)

    def anonymize_ranking_entry(entry):
        if 'name' in entry:
            entry.pop('name')
        if 'birth_year' in entry:
            entry.pop('birth_year')
        return entry

    if 'overall_ranking' in data:
        data['overall_ranking'] = [
            anonymize_ranking_entry(athlete)
            for athlete in data['overall_ranking']
        ]

    if 'year_rankings' in data:
        for year_data in data['year_rankings'].values():
            if 'athletes' in year_data:
                year_data['athletes'] = [
                    anonymize_ranking_entry(athlete)
                    for athlete in year_data['athletes']
                ]

    return data
