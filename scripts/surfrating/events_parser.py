# parse_events.py
import csv
import glob
import json
import re
import argparse
from pathlib import Path
from collections import defaultdict
from config_loader import load_config
from helpers import extract_year

def parse_events(config: dict) -> dict:
    """Парсит информацию о соревнованиях и участниках из CSV файлов"""
    events_info = defaultdict(lambda: {
        'event_year': None,
        'event_name': None,
        'event_location': None,
        'sport_type': None,
        'discipline': None,
        'category': None,
        'total_participants': 0,
        'actual_participants': 0,
        'dns_count': 0,
        'participants': []
    })

    required_columns = [
        'Год',
        'Дата',
        'Событие',
        'Место проведения',
        'Вид спорта',
        'Дисциплина',
        'Категория',
        'ФИО',
        'Место',
        'Регион',
        'Год рождения'
    ]

    for pattern in config['input_paths']:
        for file_path in glob.glob(pattern):
            try:
                rows = read_csv_file(file_path, required_columns)
                for row in rows:
                    if not all(col in reader.fieldnames for col in required_columns):
                        print(f"Пропущен файл {file_path}: отсутствуют необходимые колонки")
                        continue

                    for row in reader:
                        event_key = (
                            row['Год'],
                            row['Дата'],
                            row['Событие'],
                            row['Место проведения'],
                            row['Вид спорта'],
                            row['Дисциплина'],
                            row['Категория']
                        )

                        event = events_info[event_key]
                        event.update({
                            'event_year': row['Год'],
                            'event_date': row['Дата'],
                            'event_name': row['Событие'],
                            'event_location': row['Место проведения'],
                            'sport_type': row['Вид спорта'],
                            'discipline': row['Дисциплина'],
                            'category': row['Категория']
                        })

                        place = row['Место'].strip().upper()
                        participant = {
                            'name': row['ФИО'].strip(),
                            'place': place,
                            'region': row['Регион'].strip(),
                            'birth_year': extract_year(row['Год рождения']),
                            'sport_rank': row.get('Разряд', '').strip()
                        }

                        event['participants'].append(participant)
                        event['total_participants'] += 1

                        if place == 'DNS':
                            event['dns_count'] += 1
                        else:
                            event['actual_participants'] += 1
            except ValueError as e:
                print(f"Пропущен файл {file_path}: {str(e)}")
                continue

    return {k: v for k, v in events_info.items()}

def save_events_json(events_info: dict, output_path: str) -> None:
    """Сохраняет информацию о событиях и участниках в JSON файл"""
    events_list = sorted(
        events_info.values(),
        key=lambda x: (x['event_year'], x['event_name'])
    )

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "events": events_list,
            "total_events": len(events_list),
            "total_participants": sum(e['total_participants'] for e in events_list)
        }, f, ensure_ascii=False, indent=2)
