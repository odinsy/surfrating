import json
import csv
import argparse
from pathlib import Path
from typing import List, Dict
import sys
import os

# Добавляем путь к модулям проекта
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from scripts.surfrating.config_loader import load_config

def setup_arg_parser() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Генератор wildcard для соревнований по серфингу'
    )
    parser.add_argument(
        '--config',
        nargs='+',
        default=['config.yaml'],
        help='Список конфигурационных файлов'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Включить подробный вывод'
    )
    return parser.parse_args()

def parse_ranking(file_path: str) -> List[Dict]:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    athletes = []
    for athlete_data in data['overall_ranking']:
        athlete_id = athlete_data['athlete_id']
        athlete_info = data['athletes'][athlete_id]

        # Вычисляем лучшее место и год, когда оно было достигнуто
        best_place = None
        best_place_year = None
        for result in data['results']:
            if result['athlete_id'] == athlete_id:
                place = result['place']
                # Пропускаем нечисловые значения (DNS, DNF и т.д.)
                if isinstance(place, int):
                    # Находим год события
                    event_id = result['event_id']
                    event_year = data['events'][event_id]['year']

                    # Обновляем лучшее место и год
                    if best_place is None or place < best_place:
                        best_place = place
                        best_place_year = event_year
                    # Если место такое же, берем более свежий год
                    elif place == best_place and event_year > best_place_year:
                        best_place_year = event_year

        athletes.append({
            'rank': int(athlete_data['rank']),
            'name': athlete_info['name'],
            'region': athlete_info['region'],
            'best_place': best_place,
            'best_place_year': best_place_year,
            'last_year': int(athlete_data['last_year']),
            'participations': len(athlete_data['years_participated']),
            'current_rank': int(athlete_data['rank']),
            'total_points': int(athlete_data['total_points']),
            'participation_years': [int(year) for year in athlete_data['years_participated']]
        })

    return athletes

def filter_athletes(athletes: List[Dict], config: Dict) -> List[Dict]:
    current_year = int(config['current_year'])
    cfg = config['wildcard']

    filtered = []
    for athlete in athletes:
        # Проверка топ-N
        if athlete['current_rank'] > int(cfg['top_n']):
            continue

        # Проверка участий за последние N лет
        valid_years = range(
            current_year - int(cfg['last_years_period']) + 1,
            current_year + 1
        )
        actual_parts = sum(1 for y in valid_years if y in athlete['participation_years'])
        if actual_parts < int(cfg['min_participations']):
            continue

        # Проверка лучшего места в диапазоне [max_best_place, min_best_place]
        if athlete['best_place'] is None:
            continue

        max_best_place = int(cfg['max_best_place'])
        min_best_place = int(cfg['min_best_place'])

        if not (max_best_place <= athlete['best_place'] <= min_best_place):
            continue

        filtered.append(athlete)

    # Сортировка: сначала по лучшему месту, затем по году лучшего места (свежие выше), затем по последнему году участия
    return sorted(filtered, key=lambda x: (
        x['best_place'] or 9999,
        -x['best_place_year'] if x['best_place_year'] else 0,
        -x['last_year']
    ))

def generate_output(results: List[Dict], config: Dict, verbose: bool = False):
    output_path = Path(config['wildcard']['output_file'])
    output_path.parent.mkdir(exist_ok=True)

    # Подготовка данных для JSON
    output_data = []
    for i, athlete in enumerate(results, 1):
        output_data.append({
            'wildcard': i,
            'rank': athlete['current_rank'],
            'name': athlete['name'],
            'region': athlete['region'],
            'best_place': athlete['best_place'] or '-',
            'best_place_year': athlete['best_place_year'] or '-',
            'total_points': athlete['total_points'],
            'last_year': athlete['last_year']
        })

    # Запись в JSON файл
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    # Запись в CSV файл
    csv_path = output_path.with_suffix('.csv')
    with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['wildcard', 'rank', 'name', 'region', 'best_place', 'best_place_year', 'total_points', 'last_year']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for item in output_data:
            writer.writerow(item)

    # Вывод в консоль в CSV-формате
    headers = ['wildcard', 'rank', 'name', 'region', 'best_place', 'best_place_year', 'total_points', 'last_year']
    print(','.join(headers))
    for item in output_data:
        row = [
            item['wildcard'],
            item['rank'],
            f'"{item["name"]}"',
            f'"{item["region"]}"',
            item['best_place'],
            item['best_place_year'],
            item['total_points'],
            item['last_year']
        ]
        print(','.join(map(str, row)))

    if verbose:
        print(f"\nResults saved to:")
        print(f"JSON: {output_path}")
        print(f"CSV: {csv_path}")
        print(f"Total athletes processed: {len(results)}")

def main():
    try:
        args = setup_arg_parser()
        config = load_config(args.config)

        if args.verbose:
            print(f"Loaded config from: {args.config}")
            print(f"Current year: {config['current_year']}")

        ranking_file = config['wildcard']['ranking_file']
        athletes = parse_ranking(ranking_file)

        if args.verbose:
            print(f"Loaded {len(athletes)} athletes from {ranking_file}")

        filtered = filter_athletes(athletes, config)

        if args.verbose:
            print(f"Filtered to {len(filtered)} athletes meeting wildcard criteria")

        generate_output(filtered, config, args.verbose)

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)

if __name__ == '__main__':
    main()
