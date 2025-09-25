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

import csv
import glob
import json
import re
import argparse
from pathlib import Path
from collections import defaultdict
import yaml

def extract_year(year_str):
    if not year_str:
        return None
    try:
        year = int(year_str)
        if 1900 <= year <= 2100:
            return year
    except (ValueError, TypeError):
        pass
    match = re.search(r'\b(19|20)\d{2}\b', str(year_str))
    if match:
        return int(match.group(0))
    return None

def load_config(config_paths: list) -> dict:
    config = {}
    for path in config_paths:
        with open(path, 'r', encoding='utf-8') as f:
            file_config = yaml.safe_load(f)
            if file_config:
                config.update(file_config)
    return config

def parse_events(input_paths: list) -> dict:
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

    for pattern in input_paths:
        for file_path in glob.glob(pattern):
            print(f"Processing file: {file_path}")
            try:
                rows = read_csv_file(file_path, required_columns)
                if not rows:
                    print(f"Warning: No valid rows found in {file_path}.")
                    continue

                for row in rows:
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
                print(f"Error processing file {file_path}: {str(e)}")
                continue
            except Exception as e:
                print(f"Unexpected error processing file {file_path}: {str(e)}")
                continue

    return {k: v for k, v in events_info.items()}

def read_csv_file(file_path, required_columns):
    rows = []
    encodings_to_try = ['utf-8', 'utf-8-sig', 'cp1251', 'latin1']

    for encoding in encodings_to_try:
        try:
            with open(file_path, mode='r', newline='', encoding=encoding) as csvfile:
                reader = csv.DictReader(csvfile, delimiter='|')

                if not all(col in reader.fieldnames for col in required_columns):
                    missing = [col for col in required_columns if col not in reader.fieldnames]
                    raise ValueError(f"Missing required columns: {missing}. Available: {reader.fieldnames}")

                for row in reader:
                    rows.append(row)
                print(f"Successfully read {len(rows)} rows from {file_path} using encoding {encoding}.")
                break
        except UnicodeDecodeError:
            continue
        except FileNotFoundError:
            print(f"File not found: {file_path}")
            return []
        except Exception as e:
            if encoding == encodings_to_try[-1]:
                raise e
    return rows

def save_events_json(events_info: dict, output_path: str) -> None:
    events_list = sorted(
        events_info.values(),
        key=lambda x: (int(x['event_year']), x['event_name'])
    )

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "events": events_list,
            "total_events": len(events_list),
            "total_participants": sum(e['total_participants'] for e in events_list)
        }, f, ensure_ascii=False, indent=2)
    print(f"Results saved to {output_path}")

def main():
    parser = argparse.ArgumentParser(description='Parse competition results from CSV files.')
    parser.add_argument('--config', type=str, nargs='+', required=True)
    args = parser.parse_args()

    config_paths = args.config
    config = load_config(config_paths)

    input_paths = config.get('input_paths', [])
    if not input_paths:
        print("Error: 'input_paths' not found or empty in the combined config.")
        return

    output_path = config.get('output', {}).get('events_json', 'default_output.json')
    if not output_path:
        print("Error: 'output.events_json' not found or empty in the combined config.")
        return

    events_data = parse_events(input_paths)
    save_events_json(events_data, output_path)

if __name__ == "__main__":
    main()
