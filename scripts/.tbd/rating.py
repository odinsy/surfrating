import csv
import json
import yaml
import glob
import re
import pandas as pd
import argparse
from collections import defaultdict
from pathlib import Path
from typing import Dict, List

def deep_merge(source: Dict, overrides: Dict) -> Dict:
    merged = source.copy()
    for key, value in overrides.items():
        if isinstance(value, dict) and key in merged:
            merged[key] = deep_merge(merged.get(key, {}), value)
        else:
            merged[key] = value
    return merged

def process_scoring_systems(config: Dict) -> None:
    for system in config.get('scoring', {}).values():
        new_keys = {}
        for k in list(system.keys()):
            if '-' in str(k):
                min_max = tuple(map(int, k.split('-')))
                new_keys[min_max] = system.pop(k)
        system.update(new_keys)

def process_event_groups(config: Dict) -> None:
    event_groups = config.get('event_groups', {})
    event_groups.setdefault('default', {'coefficient': 1.0, 'events': []})
    config['event_groups'] = event_groups
    config.setdefault('allowed_events', [])

def load_config(config_paths: list) -> Dict:
    config = {}
    for path in config_paths:
        with open(path, 'r', encoding='utf-8') as f:
            current_config = yaml.safe_load(f) or {}
            config = deep_merge(config, current_config)

    process_scoring_systems(config)
    process_event_groups(config)

    return config

def get_event_group(event_name: str) -> str:
    """Определение группы для события"""
    for group_name, group_data in CONFIG['event_groups'].items():
        patterns = group_data.get('events', [])
        for pattern in patterns:
            if pattern in event_name:
                return group_name
    return 'default'

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

def _validate_csv_columns(reader, file_path: str) -> None:
    required = ['Год', 'Событие', 'ФИО', 'Год рождения', 'Регион', 'Разряд', 'Место']
    if not all(col in reader.fieldnames for col in required):
        raise ValueError(f"Invalid columns in {file_path}")

def _process_row(row: dict, athletes: dict) -> None:
    event = row['Событие'].strip()
    group = get_event_group(event)

    # Фильтрация по разрешенным группам
    if CONFIG.get('allowed_events') and group not in CONFIG['allowed_events']:
        return

    year = int(row['Год'])
    name = ' '.join(row['ФИО'].split()[:2])
    athlete = athletes[name]

    # Обновление данных атлета
    athlete['years'][year][event] = {
        'place': row['Место'].strip().upper(),
        'group': group
    }
    athlete['regions'][year] = row['Регион'].strip()
    athlete['sport_ranks'][year] = row['Разряд'].strip()
    athlete['birthday'] = extract_year(row['Год рождения'])
    athlete['category'] = row.get('Категория', '')
    athlete['last_year'] = max(athlete['last_year'], year)

    # Обновление лучшего места
    place = row['Место'].strip().upper()
    if place.isdigit() and place != 'DNS':
        current_place = int(place)
        if athlete['best_place'] is None or current_place < athlete['best_place']:
            athlete['best_place'] = current_place

def _finalize_athletes_data(athletes: dict) -> None:
    for athlete in athletes.values():
        athlete['region'] = max(athlete['regions'].items(), key=lambda x: x[0])[1] if athlete['regions'] else ''
        athlete['sport_rank'] = max(athlete['sport_ranks'].items(), key=lambda x: x[0])[1] if athlete['sport_ranks'] else ''

def parse_files() -> Dict[str, Dict]:
    athletes = defaultdict(lambda: {
        'years': defaultdict(dict),
        'category': '',
        'birthday': 0,
        'regions': defaultdict(str),
        'sport_ranks': defaultdict(str),
        'best_place': None,
        'last_year': 0
    })

    for pattern in CONFIG['input_paths']:
        for file_path in glob.glob(pattern):
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                _validate_csv_columns(reader, file_path)
                for row in reader:
                    _process_row(row, athletes)

    _finalize_athletes_data(athletes)
    return athletes

def calculate_base_points(place: str, group: str) -> int:
    system = CONFIG['scoring'][CONFIG['scoring_system']]
    coeff = CONFIG['event_groups'][group]['coefficient']

    if place == 'DNS':
        return round(system.get('DNS', 0) * coeff)

    try:
        place_num = int(place)
    except ValueError:
        return 0

    for k, v in system.items():
        if isinstance(k, tuple) and k[0] <= place_num <= k[1]:
            return round(v * coeff)
        elif place_num == k:
            return round(v * coeff)
    return 0

def apply_decay(points: int, year: int) -> int:
    if CONFIG['bonuses']['decay']['enabled']:
        decay = CONFIG['bonuses']['decay']['factor'] ** (CONFIG['current_year'] - year)
        return round(points * decay)
    return points

def apply_participation_bonus(points: int, is_dns: bool) -> int:
    if not is_dns and CONFIG['bonuses']['participation']['enabled']:
        return points + CONFIG['bonuses']['participation']['points']
    return points

def apply_rank_bonus(total: int, rank: str) -> int:
    if CONFIG['bonuses']['rank']['enabled']:
        return total + CONFIG['bonuses']['rank']['values'].get(rank, 0)
    return total

def process_year_points(year: int, event_data: Dict) -> int:
    total = 0
    for event_name, event_info in event_data.items():
        place = event_info['place']
        group = event_info['group']
        is_dns = (place == 'DNS')

        points = calculate_base_points(place, group)
        points = apply_decay(points, year)
        points = apply_participation_bonus(points, is_dns)

        total += points
    return total

def process_athletes(data: Dict) -> List[Dict]:
    results = []

    for name, info in data.items():
        entry = {
            'name': name,
            'birthday': info['birthday'],
            'region': info['region'],
            'category': info['category'],
            'sport_rank': info['sport_rank'],
            'best_place': info['best_place'] or 9999,
            'last_year': info['last_year'],
            'years': {},
            'total_points': 0
        }

        total_points = 0
        for year, year_events in info['years'].items():
            year_points = process_year_points(year, year_events)

            entry['years'][year] = {
                'events': year_events,
                'points': year_points
            }
            total_points += year_points

        total_points = apply_rank_bonus(total_points, entry['sport_rank'])
        entry['total_points'] = total_points
        results.append(entry)

    if CONFIG['sorting']['enabled']:
        return sorted(results, key=lambda x: (-x['total_points'], x['best_place'], -x['last_year']))
    return sorted(results, key=lambda x: -x['total_points'])

def prepare_headers_and_years(results: List[Dict]) -> tuple:
    years = sorted({y for a in results for y in a['years']})
    columns = CONFIG['output']['columns']
    translate = CONFIG['output'].get('translate_columns', False)

    headers = []
    for col in columns:
        if col == 'YearScores':
            headers.extend(map(str, years))
        else:
            headers.append(col if not translate else {
                'Rank': 'Место',
                'Name': 'ФИО',
                'Sport Rank': 'Разряд',
                'Birthday': 'Год рождения',
                'Region': 'Регион',
                'Category': 'Категория',
                'Best Place': 'Лучший результат',
                'Total Points': 'Всего очков'
            }.get(col, col))
    return headers, years

def prepare_row_data(athlete: Dict, years: List[int]) -> list:
    return [
        athlete['rank'],
        athlete['name'],
        athlete['sport_rank'],
        athlete['birthday'],
        athlete['region'],
        athlete['category'],
        athlete['best_place'] if athlete['best_place'] != 9999 else '-',
        *[athlete['years'].get(y, {}).get('points', 0) for y in years],
        athlete['total_points']
    ]

def save_to_csv(results: List[Dict], headers: List[str], years: List[int]) -> None:
    output_path = Path(CONFIG['output']['filename'])
    output_path.parent.mkdir(exist_ok=True)

    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)

        for athlete in results:
            row = prepare_row_data(athlete, years)
            writer.writerow(row)

def save_to_json(results: List[Dict], headers: List[str]) -> None:
    json_path = Path(CONFIG['output']['filename']).with_suffix('.json')
    json_athletes = []

    for athlete in results:
        json_athlete = athlete.copy()
        json_athlete["rank"] = athlete['rank']
        json_athletes.append(json_athlete)

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump({
            'headers': headers,
            'athletes': json_athletes
        }, f, ensure_ascii=False, indent=2)

def print_to_console(results: List[Dict], headers: List[str], years: List[int]) -> None:
    print(','.join(map(str, headers)))
    for athlete in results[:CONFIG['top_n']]:
        row = prepare_row_data(athlete, years)
        print(','.join(map(str, row)))

def generate_output(results: List[Dict]):
    # Добавляем поле rank в результаты
    for idx, athlete in enumerate(results, 1):
        athlete['rank'] = idx

    headers, years = prepare_headers_and_years(results)
    save_to_csv(results, headers, years)
    save_to_json(results, headers)
    print_to_console(results, headers, years)

def setup_arg_parser() -> argparse.Namespace:
    """Настройка и парсинг аргументов командной строки"""
    parser = argparse.ArgumentParser(
        description='Генератор рейтингов для соревнований по серфингу'
    )
    parser.add_argument(
        '--config',
        nargs='+',
        default=['config.yaml'],
        help='Список конфигурационных файлов (приоритет у последних)'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Включить подробный вывод'
    )
    return parser.parse_args()

def main():
    try:
        args = setup_arg_parser()
        global CONFIG
        CONFIG = load_config(args.config)
        data = parse_files()
        results = process_athletes(data)
        generate_output(results)

    except Exception as e:
        print(f"Ошибка: {str(e)}")
        exit(1)

if __name__ == '__main__':
    main()
