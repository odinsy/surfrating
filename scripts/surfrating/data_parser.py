import csv
import glob
import re
import pandas as pd
from collections import defaultdict
from typing import Dict
from helpers import read_csv_file, extract_year, get_event_group, generate_event_id

def _process_row(row: dict, athletes: dict, config: Dict, event_participants: dict, events_info: dict) -> None:
    event_name       = row['Событие'].strip()
    event_year       = int(row['Год'])
    event_date       = row['Дата'].strip()
    event_discipline = row['Дисциплина'].strip()
    event_category   = row['Категория'].strip()
    event_group      = get_event_group(event_name, config)
    event_id         = generate_event_id(event_name, event_date, event_discipline, event_category)

    if event_id not in events_info:
        events_info[event_id] = {
            'name': event_name,
            'year': event_year,
            'discipline': event_discipline,
            'category': event_category,
            'group': event_group,
            'participants_count': 0
        }

    if config.get('allowed_events') and event_group not in config['allowed_events']:
        return

    place              = row['Место'].strip().upper()
    athlete_name       = ' '.join(row['ФИО'].split()[:2])
    athlete_region     = row['Регион'].strip()
    athlete_sport_rank = row['Разряд'].strip()
    athlete_birth_year = extract_year(row['Год рождения'])

    if place != 'DNS':
        event_key = (event_year, event_name)
        event_participants[event_key].add(athlete_name)

    athlete = athletes[athlete_name]
    athlete['years'][event_year][event_name] = {
        'place': place,
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
    events_info = {}
    event_participants = defaultdict(set)

    athletes = defaultdict(lambda: {
        'years': defaultdict(dict),
        'category': '',
        'birth_year': 0,
        'regions': defaultdict(str),
        'sport_ranks': defaultdict(str),
        'last_year': 0
    })

    required_columns = [
        'Год',
        'Дата',
        'Событие',
        'ФИО',
        'Год рождения',
        'Регион',
        'Разряд',
        'Место'
    ]

    for pattern in config['input_paths']:
        for file_path in glob.glob(pattern):
            try:
                rows = read_csv_file(file_path, required_columns)
                for row in rows:
                    _process_row(row, athletes, config, event_participants, events_info)
            except ValueError as e:
                print(f"Пропущен файл {file_path}: {str(e)}")
                continue

    for event_id, event_data in events_info.items():
        participants = set()
        for (year, name), names_set in event_participants.items():
            if year == event_data['year'] and name == event_data['name']:
                participants |= names_set
        event_data['participants_count'] = len(participants)

    for athlete in athletes.values():
        for year, events_dict in athlete['years'].items():
            for event_name, event_info in events_dict.items():
                key = (year, event_name)
                event_info['participants_count'] = len(event_participants.get(key, set()))

    _finalize_athletes_data(athletes)

    return athletes, events_info
