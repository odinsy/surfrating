import csv
import yaml
from pathlib import Path
from typing import List, Dict

def load_config(config_path: str = 'config.yaml') -> Dict:
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

CONFIG = load_config()

def parse_ranking(file_path: str) -> List[Dict]:
    athletes = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Обработка Best Place
            best_place = row['Best Place'].strip()
            best_place = int(best_place) if best_place.isdigit() else None

            # Сбор лет участия
            participation_years = []
            for header, value in row.items():
                if header.isdigit() and value.strip().isdigit() and int(value) > 0:
                    participation_years.append(int(header))

            athletes.append({
                'rank': int(row['Rank']),
                'name': row['Name'],
                'region': row['Region'],
                'best_place': best_place,
                'last_year': max(participation_years) if participation_years else 0,
                'participations': len(participation_years),
                'current_rank': int(row['Rank']),
                'total_points': int(row['Total Points']),
                'participation_years': participation_years  # Добавлено ключевое поле
            })
    return athletes

def filter_athletes(athletes: List[Dict]) -> List[Dict]:
    current_year = CONFIG['current_year']
    cfg = CONFIG['wildcard']

    filtered = []
    for athlete in athletes:
        # Проверка топ-N
        if athlete['current_rank'] > cfg['top_n']:
            continue

        # Проверка участий за последние N лет
        valid_years = range(
            current_year - cfg['last_years_period'] + 1,
            current_year + 1
        )
        actual_parts = sum(1 for y in valid_years if y in athlete['participation_years'])
        if actual_parts < cfg['min_participations']:
            continue

        # Проверка лучшего места
        if (athlete['best_place'] is None or
            athlete['best_place'] > cfg['min_best_place']):
            continue

        filtered.append(athlete)

    return sorted(filtered, key=lambda x: (x['best_place'] or 9999, -x['last_year']))

def generate_output(results: List[Dict]):
    output_path = Path(CONFIG['wildcard']['output_file'])
    output_path.parent.mkdir(exist_ok=True)

    headers = ['Wildcard', 'Rank', 'Name', 'Region', 'Best Place', 'Total Points', 'Last Year']

    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for i, athlete in enumerate(results, 1):
            writer.writerow({
                'Wildcard': i,
                'Rank': athlete['current_rank'],
                'Name': athlete['name'],
                'Region': athlete['region'],
                'Best Place': athlete['best_place'] or '-',
                'Total Points': athlete['total_points'] or '-',
                'Last Year': athlete['last_year']
            })

    print(','.join(headers))
    for i, athlete in enumerate(results, 1):
        print(','.join(map(str, [
            i,
            athlete['current_rank'],
            athlete['name'],
            athlete['region'],
            athlete['best_place'] or '-',
            athlete['total_points'],
            athlete['last_year']
        ])))

if __name__ == '__main__':
    try:
        ranking_file = CONFIG['wildcard']['ranking_file']
        athletes = parse_ranking(ranking_file)
        filtered = filter_athletes(athletes)
        generate_output(filtered)
    except Exception as e:
        print(f"Error: {str(e)}")
        exit(1)
