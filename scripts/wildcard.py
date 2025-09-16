import json
import yaml
from pathlib import Path
from typing import List, Dict

def load_config(config_path: str = 'config.yaml') -> Dict:
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

CONFIG = load_config()

def parse_ranking(file_path: str) -> List[Dict]:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    athletes = []
    for athlete_data in data['overall_ranking']:
        athlete_id = athlete_data['athlete_id']
        athlete_info = data['athletes'][athlete_id]

        # Вычисляем лучшее место из всех результатов (только числовые значения)
        best_place = None
        for result in data['results']:
            if result['athlete_id'] == athlete_id:
                place = result['place']
                # Пропускаем нечисловые значения (DNS, DNF и т.д.)
                if isinstance(place, int):
                    if best_place is None or place < best_place:
                        best_place = place

        athletes.append({
            'rank': int(athlete_data['rank']),
            'name': athlete_info['name'],
            'region': athlete_info['region'],
            'best_place': best_place,
            'last_year': int(athlete_data['last_year']),
            'participations': len(athlete_data['years_participated']),
            'current_rank': int(athlete_data['rank']),
            'total_points': int(athlete_data['total_points']),
            'participation_years': [int(year) for year in athlete_data['years_participated']]
        })

    return athletes

def filter_athletes(athletes: List[Dict]) -> List[Dict]:
    current_year = int(CONFIG['current_year'])
    cfg = CONFIG['wildcard']

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

        # Проверка лучшего места (только если есть числовой результат)
        if (athlete['best_place'] is None or
            athlete['best_place'] > int(cfg['min_best_place'])):
            continue

        filtered.append(athlete)

    # Сортировка по лучшему месту и последнему году участия
    return sorted(filtered, key=lambda x: (x['best_place'] or 9999, -x['last_year']))

def generate_output(results: List[Dict]):
    output_path = Path(CONFIG['wildcard']['output_file'])
    output_path.parent.mkdir(exist_ok=True)

    # Подготовка данных для JSON
    output_data = []
    for i, athlete in enumerate(results, 1):
        output_data.append({
            'Wildcard': i,
            'Rank': athlete['current_rank'],
            'Name': athlete['name'],
            'Region': athlete['region'],
            'Best Place': athlete['best_place'] or '-',
            'Total Points': athlete['total_points'],
            'Last Year': athlete['last_year']
        })

    # Запись в JSON файл
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    # Вывод в консоль в CSV-формате
    headers = ['Wildcard', 'Rank', 'Name', 'Region', 'Best Place', 'Total Points', 'Last Year']
    print(','.join(headers))
    for item in output_data:
        row = [
            item['Wildcard'],
            item['Rank'],
            f'"{item["Name"]}"',
            f'"{item["Region"]}"',
            item['Best Place'],
            item['Total Points'],
            item['Last Year']
        ]
        print(','.join(map(str, row)))

if __name__ == '__main__':
    try:
        ranking_file = CONFIG['wildcard']['ranking_file']
        athletes = parse_ranking(ranking_file)
        filtered = filter_athletes(athletes)
        generate_output(filtered)
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
