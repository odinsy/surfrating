import csv
import glob
import re
import pandas as pd
from collections import defaultdict
from typing import Dict

def extract_year(date_str: str) -> int:
    try:
        date = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
        if not pd.isnull(date):
            return date.year

        match = re.search(r'\b\d{4}\b', date_str)
        if match:
            return int(match.group())

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

def _validate_csv_columns(reader, file_path: str) -> None:
    required = ['Год', 'Событие', 'ФИО', 'Год рождения', 'Регион', 'Разряд', 'Место']
    if not all(col in reader.fieldnames for col in required):
        raise ValueError(f"Invalid columns in {file_path}")

def _process_row(row: dict, athletes: dict, config: Dict, event_participants: dict) -> None:
    event_name         = row['Событие'].strip()
    event_group        = get_event_group(event_name, config)

    if config.get('allowed_events') and event_group not in config['allowed_events']:
        return

    event_year         = int(row['Год'])
    event_date         = row['Дата'].strip()
    event_place        = row['Место'].strip().upper()
    event_category     = row.get('Категория', '')
    athlete_name       = ' '.join(row['ФИО'].split()[:2])
    athlete_region     = row['Регион'].strip()
    athlete_sport_rank = row['Разряд'].strip()
    athlete_birth_year = extract_year(row['Год рождения'])

    if event_place != 'DNS':
        event_key = (event_year, event_name)
        event_participants[event_key].add(athlete_name)

    athlete = athletes[athlete_name]
    athlete['years'][event_year][event_name] = {
        'place': event_place,
        'group': event_group
    }
    athlete['regions'][event_year]     = athlete_region
    athlete['sport_ranks'][event_year] = athlete_sport_rank
    athlete['birth_year']              = athlete_birth_year
    athlete['category']                = event_category
    athlete['last_year']               = max(athlete['last_year'], event_year)

def _finalize_athletes_data(athletes: dict) -> None:
    for athlete in athletes.values():
        athlete['region'] = max(athlete['regions'].items(), key=lambda x: x[0])[1] if athlete['regions'] else ''
        athlete['sport_rank'] = max(athlete['sport_ranks'].items(), key=lambda x: x[0])[1] if athlete['sport_ranks'] else ''

def parse_files(config: Dict) -> Dict[str, Dict]:
    athletes = defaultdict(lambda: {
        'years': defaultdict(dict),
        'category': '',
        'birth_year': 0,
        'regions': defaultdict(str),
        'sport_ranks': defaultdict(str),
        'last_year': 0
    })
    event_participants = defaultdict(set)

    for pattern in config['input_paths']:
        for file_path in glob.glob(pattern):
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f, delimiter='|')
                _validate_csv_columns(reader, file_path)
                for row in reader:
                    _process_row(row, athletes, config, event_participants)

    for athlete in athletes.values():
        for year, events_dict in athlete['years'].items():
            for event_name, event_info in events_dict.items():
                key = (year, event_name)
                event_info['participants_count'] = len(event_participants.get(key, set()))

    _finalize_athletes_data(athletes)
    return athletes
