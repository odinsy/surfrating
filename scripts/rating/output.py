import csv
import json
from pathlib import Path
from typing import List, Dict

def prepare_headers_and_years(results: List[Dict], config: Dict) -> tuple:
    years = sorted({y for a in results for y in a['years']})
    columns = config['output']['columns']
    translate = config['output'].get('translate_columns', False)

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
        *[athlete['years'].get(y, {}).get('year_total_points', 0) for y in years],
        athlete['total_points']
    ]

def save_to_csv(results: List[Dict], headers: List[str], years: List[int], config: Dict, output_filename: str = None) -> None:
    output_filename = output_filename or config['output']['filename']
    output_path = Path(output_filename)
    output_path.parent.mkdir(exist_ok=True)

    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)

        for athlete in results:
            row = prepare_row_data(athlete, years)
            writer.writerow(row)

def save_to_json(results: List[Dict], headers: List[str], config: Dict, output_filename: str = None) -> None:
    if output_filename:
        json_path = Path(output_filename)
    else:
        json_path = Path(config['output']['filename']).with_suffix('.json')

    json_athletes = []
    for athlete in results:
        json_athlete = {
            'name': athlete['name'],
            'rank': athlete['rank'],
            'birthday': athlete['birthday'],
            'region': athlete['region'],
            'category': athlete['category'],
            'sport_rank': athlete['sport_rank'],
            'last_year': athlete['last_year'],
            'best_result': athlete.get('best_result', {}),
            'years': {
                year: {
                    'year_total_points': data['year_total_points'],
                    'events': data['events']
                } for year, data in athlete['years'].items()
            },
            'total_points': athlete['total_points']
        }
        json_athletes.append(json_athlete)

    json_path.parent.mkdir(exist_ok=True, parents=True)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump({
            'headers': headers,
            'athletes': json_athletes
        }, f, ensure_ascii=False, indent=2)

def print_to_console(results: List[Dict], headers: List[str], years: List[int], config: Dict) -> None:
    print(','.join(map(str, headers)))
    for athlete in results[:config['top_n']]:
        row = prepare_row_data(athlete, years)
        print(','.join(map(str, row)))

def generate_output(results: List[Dict], config: Dict) -> None:
    for idx, athlete in enumerate(results, 1):
        athlete['rank'] = idx

    headers, years = prepare_headers_and_years(results, config)

    save_to_csv(results, headers, years, config)
    save_to_json(results, headers, config)
    print_to_console(results, headers, years, config)

    if 'top5_filename' in config['output']:
        top5 = results[:10]
        csv_path = config['output']['top5_filename']
        json_path = Path(csv_path).with_suffix('.json')

        save_to_csv(top5, headers, years, config, csv_path)
        save_to_json(top5, headers, config, json_path)
        print_to_console(top5, headers, years, config)
