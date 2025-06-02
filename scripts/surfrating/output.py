import csv
import json
from datetime import datetime
from collections import defaultdict
from pathlib import Path
from typing import List, Dict, Optional, Union

def _resolve_output_path(
    output_filename: Optional[str],
    config: Dict,
    key: Optional[str] = None,
    default_suffix: Optional[str] = None
) -> Path:
    """Обрабатывает пути для выходных файлов с учетом конфигурации"""
    if output_filename:
        path = Path(output_filename)
    elif key:
        path = Path(config['output'][key])
    else:
        csv_path = Path(config['output']['filename'])
        path = csv_path.with_suffix(default_suffix) if default_suffix else csv_path

    path.parent.mkdir(parents=True, exist_ok=True)
    return path

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
    output_path = _resolve_output_path(output_filename, config)

    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)

        for athlete in results:
            row = prepare_row_data(athlete, years)
            writer.writerow(row)

def save_to_json(results: List[Dict], headers: List[str], config: Dict, output_filename: str = None) -> None:
    output_path = _resolve_output_path(
        output_filename,
        config,
        default_suffix='.json'
    )

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

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            'headers': headers,
            'athletes': json_athletes
        }, f, ensure_ascii=False, indent=2)

def save_ranking_json(results: List[Dict], headers: List[str], config: Dict, output_filename: str = None) -> None:
    output_path = _resolve_output_path(
        output_filename,
        config,
        key='ranking_json'
    )

    transformed = {
        "discipline": config.get("discipline", "unknown"),
        "gender": config.get("gender", "unknown"),
        "last_updated": datetime.now().isoformat(),
        "year_rankings": {},
        "overall_ranking": []
    }

    year_athletes = defaultdict(list)
    for athlete in results:
        overall_entry = {
            "rank": athlete["rank"],
            "name": athlete["name"],
            "region": athlete["region"],
            "sport_rank": athlete["sport_rank"],
            "birthday": athlete["birthday"],
            "total_points": athlete["total_points"],
            "best_result": athlete.get("best_result", {}),
            "last_year": athlete["last_year"],
            "years_participated": list(athlete["years"].keys())
        }
        transformed["overall_ranking"].append(overall_entry)

        for year, year_data in athlete.get("years", {}).items():
            year_entry = {
                "name": athlete["name"],
                "year_points": year_data["year_total_points"],
                "total_points": athlete["total_points"],
                "events": year_data["events"]
            }
            year_athletes[year].append(year_entry)

    for year, athletes in year_athletes.items():
        athletes.sort(key=lambda x: x["year_points"], reverse=True)

        current_rank = 1
        prev_points = None
        for i, athlete in enumerate(athletes):
            if athlete["year_points"] != prev_points:
                current_rank = i + 1
            athlete["rank"] = current_rank
            prev_points = athlete["year_points"]

        transformed["year_rankings"][year] = {"athletes": athletes}

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            'headers': headers,
            'rankings': transformed
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
    save_ranking_json(results, headers, config)
    print_to_console(results, headers, years, config)

    if 'top5_filename' in config['output']:
        top5 = results[:10]
        csv_path = config['output']['top5_filename']
        json_path = Path(csv_path).with_suffix('.json')

        save_to_csv(top5, headers, years, config, csv_path)
        save_to_json(top5, headers, config, json_path)
        print_to_console(top5, headers, years, config)
