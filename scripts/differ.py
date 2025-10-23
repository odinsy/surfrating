#!/usr/bin/env python3
"""
Скрипт для сравнения двух рейтингов и генерации отчета об изменениях
"""

import json
import argparse
from pathlib import Path
from typing import Dict, List, Any
import csv
from datetime import datetime

def load_ranking_file(filepath: str) -> Dict[str, Any]:
    """Загружает файл рейтинга"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def create_athlete_lookup(ranking_data: Dict) -> Dict[str, Dict]:
    """Создает словарь для быстрого поиска спортсменов по ID"""
    lookup = {}

    # Основные данные спортсменов находятся в объекте athletes
    if 'athletes' in ranking_data:
        for athlete_id, athlete_data in ranking_data['athletes'].items():
            lookup[athlete_id] = athlete_data.copy()  # Делаем копию чтобы не менять исходные данные

    # Дополняем рейтинговыми данными из overall_ranking
    if 'overall_ranking' in ranking_data:
        for athlete in ranking_data['overall_ranking']:
            athlete_id = athlete['athlete_id']
            if athlete_id in lookup:
                # Объединяем данные из athletes и overall_ranking
                lookup[athlete_id].update({
                    'rank': athlete.get('rank'),
                    'total_points': athlete.get('total_points', 0)
                })
            else:
                # Если спортсмена нет в athletes, создаем запись
                lookup[athlete_id] = {
                    'name': '',
                    'region': '',
                    'sport_rank': '',
                    'rank': athlete.get('rank'),
                    'total_points': athlete.get('total_points', 0)
                }

    return lookup

def compare_rankings(old_ranking_path: str, new_ranking_path: str) -> List[Dict]:
    """Сравнивает два рейтинга и возвращает список с изменениями"""

    # Загружаем данные
    old_data = load_ranking_file(old_ranking_path)
    new_data = load_ranking_file(new_ranking_path)

    # Создаем lookup таблицы
    old_lookup = create_athlete_lookup(old_data)
    new_lookup = create_athlete_lookup(new_data)

    results = []

    # Обрабатываем спортсменов из нового рейтинга
    for athlete_id, new_athlete in new_lookup.items():
        old_athlete = old_lookup.get(athlete_id)

        result = {
            'athlete_id': athlete_id,
            'name': new_athlete.get('name', ''),
            'current_rank': new_athlete.get('rank'),
            'current_points': new_athlete.get('total_points', 0),
            'region': new_athlete.get('region', ''),
            'sport_rank': new_athlete.get('sport_rank', ''),
            'trend': 'new',
            'rank_change': None,
            'points_change': None
        }

        if old_athlete:
            result.update({
                'previous_rank': old_athlete.get('rank'),
                'previous_points': old_athlete.get('total_points', 0),
                'trend': 'stable'
            })

            # Расчет изменений (только если оба рейтинга существуют)
            if (result['previous_rank'] is not None and
                result['current_rank'] is not None):

                rank_change = result['previous_rank'] - result['current_rank']
                result['rank_change'] = rank_change

                if rank_change > 0:
                    result['trend'] = 'up'
                elif rank_change < 0:
                    result['trend'] = 'down'
                else:
                    result['trend'] = 'stable'

            # Расчет изменения очков
            if (result['previous_points'] is not None and
                result['current_points'] is not None):

                result['points_change'] = result['current_points'] - result['previous_points']

        results.append(result)

    # Добавляем спортсменов, которые выбыли из рейтинга
    for athlete_id, old_athlete in old_lookup.items():
        if athlete_id not in new_lookup:
            results.append({
                'athlete_id': athlete_id,
                'name': old_athlete.get('name', ''),
                'previous_rank': old_athlete.get('rank'),
                'previous_points': old_athlete.get('total_points', 0),
                'current_rank': None,
                'current_points': 0,
                'region': old_athlete.get('region', ''),
                'sport_rank': old_athlete.get('sport_rank', ''),
                'rank_change': None,
                'points_change': -old_athlete.get('total_points', 0) if old_athlete.get('total_points') else 0,
                'trend': 'dropped'
            })

    # Сортируем по текущему рейтингу (спортсмены без текущего рейтинга в конце)
    results.sort(key=lambda x: x['current_rank'] if x['current_rank'] is not None else 9999)

    return results

def generate_comparison_report(comparison_data: List[Dict], output_path: str) -> None:
    """Генерирует CSV отчет с сравнением"""

    headers = [
        'Текущая позиция', 'Спортсмен', 'Регион', 'Разряд',
        'Предыдущая позиция', 'Изменение позиции',
        'Текущие очки', 'Предыдущие очки', 'Изменение очков',
        'Тренд'
    ]

    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)

        for athlete in comparison_data:
            # Форматируем изменения для красивого отображения
            rank_change = athlete.get('rank_change')
            points_change = athlete.get('points_change', 0)

            if rank_change is not None:
                if rank_change > 0:
                    rank_change_str = f"+{rank_change}"
                elif rank_change < 0:
                    rank_change_str = f"{rank_change}"
                else:
                    rank_change_str = "0"
            else:
                rank_change_str = ""

            if points_change is not None and points_change != 0:
                if points_change > 0:
                    points_change_str = f"+{points_change}"
                else:
                    points_change_str = f"{points_change}"
            else:
                points_change_str = ""

            # Перевод тренда на русский
            trend_translation = {
                'up': '↑ Улучшение',
                'down': '↓ Ухудшение',
                'stable': '➔ Стабильно',
                'new': '🆕 Новый',
                'dropped': '📉 Выбыл'
            }

            writer.writerow([
                athlete['current_rank'] if athlete['current_rank'] is not None else '-',
                athlete['name'],
                athlete['region'],
                athlete['sport_rank'],
                athlete.get('previous_rank', '-'),
                rank_change_str,
                athlete['current_points'],
                athlete.get('previous_points', '-'),
                points_change_str,
                trend_translation.get(athlete['trend'], athlete['trend'])
            ])

def generate_summary_stats(comparison_data: List[Dict]) -> Dict:
    """Генерирует сводную статистику по изменениям"""

    stats = {
        'total_athletes': len([a for a in comparison_data if a['current_rank'] is not None]),
        'new_athletes': len([a for a in comparison_data if a['trend'] == 'new']),
        'dropped_athletes': len([a for a in comparison_data if a['trend'] == 'dropped']),
        'improved_rank': len([a for a in comparison_data if a.get('rank_change') is not None and a['rank_change'] > 0]),
        'declined_rank': len([a for a in comparison_data if a.get('rank_change') is not None and a['rank_change'] < 0]),
        'stable_rank': len([a for a in comparison_data if a.get('rank_change') is not None and a['rank_change'] == 0]),
        'biggest_improvement': None,
        'biggest_decline': None,
        'most_points_gained': None
    }

    # Находим самые значительные изменения
    for athlete in comparison_data:
        rank_change = athlete.get('rank_change')
        points_change = athlete.get('points_change')

        # Обрабатываем rank_change (может быть None)
        if rank_change is not None:
            if not stats['biggest_improvement'] or rank_change > stats['biggest_improvement']['change']:
                stats['biggest_improvement'] = {'name': athlete['name'], 'change': rank_change}

            if not stats['biggest_decline'] or rank_change < stats['biggest_decline']['change']:
                stats['biggest_decline'] = {'name': athlete['name'], 'change': rank_change}

        # Обрабатываем points_change (может быть None)
        if points_change is not None:
            if not stats['most_points_gained'] or points_change > stats['most_points_gained']['change']:
                stats['most_points_gained'] = {'name': athlete['name'], 'change': points_change}

    return stats

def save_comparison_json(comparison_data: List[Dict], stats: Dict, output_path: str) -> None:
    """Сохраняет полные данные сравнения в JSON"""

    report = {
        'generated_at': datetime.now().isoformat(),
        'summary': stats,
        'comparison_data': comparison_data
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

def main():
    parser = argparse.ArgumentParser(description='Сравнение рейтингов за разные периоды')
    parser.add_argument('--old', required=True, help='Файл старого рейтинга (JSON)')
    parser.add_argument('--new', required=True, help='Файл нового рейтинга (JSON)')
    parser.add_argument('--output', required=True, help='Путь для сохранения отчета')
    parser.add_argument('--format', choices=['csv', 'json', 'both'], default='both',
                       help='Формат вывода (по умолчанию: оба)')

    args = parser.parse_args()

    # Проверяем существование файлов
    if not Path(args.old).exists():
        print(f"Ошибка: файл {args.old} не существует")
        return

    if not Path(args.new).exists():
        print(f"Ошибка: файл {args.new} не существует")
        return

    # Сравниваем рейтинги
    print("Загружаем данные...")
    comparison_data = compare_rankings(args.old, args.new)

    # Генерируем статистику
    stats = generate_summary_stats(comparison_data)

    # Сохраняем результаты
    output_path = Path(args.output)

    if args.format in ['csv', 'both']:
        csv_path = output_path.with_suffix('.csv')
        generate_comparison_report(comparison_data, csv_path)
        print(f"CSV отчет сохранен: {csv_path}")

    if args.format in ['json', 'both']:
        json_path = output_path.with_suffix('.json')
        save_comparison_json(comparison_data, stats, json_path)
        print(f"JSON отчет сохранен: {json_path}")

    # Выводим краткую статистику
    print("\n📊 Сводная статистика:")
    print(f"   Всего спортсменов: {stats['total_athletes']}")
    print(f"   Новые спортсмены: {stats['new_athletes']}")
    print(f"   Выбывшие спортсмены: {stats['dropped_athletes']}")
    print(f"   Улучшили позицию: {stats['improved_rank']}")
    print(f"   Ухудшили позицию: {stats['declined_rank']}")
    print(f"   Остались на месте: {stats['stable_rank']}")

    if stats['biggest_improvement']:
        print(f"   Самый большой прогресс: {stats['biggest_improvement']['name']} (+{stats['biggest_improvement']['change']} позиций)")

    if stats['most_points_gained']:
        print(f"   Наибольший прирост очков: {stats['most_points_gained']['name']} (+{stats['most_points_gained']['change']} очков)")

if __name__ == '__main__':
    main()
