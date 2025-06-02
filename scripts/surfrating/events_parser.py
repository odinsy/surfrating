# parse_events.py
import csv
import glob
import json
import re
import argparse
from pathlib import Path
from collections import defaultdict
from config_loader import load_config

def extract_year(date_str: str) -> int:
    """Извлекает год из строки с датой рождения"""
    try:
        match = re.search(r'\b(\d{4})\b', date_str)
        return int(match.group(1)) if match else 0
    except Exception:
        return 0

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
        'participants': []  # Список участников
    })

    required_columns = [
        'Год',
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
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)

                if not all(col in reader.fieldnames for col in required_columns):
                    print(f"Пропущен файл {file_path}: отсутствуют необходимые колонки")
                    continue

                for row in reader:
                    event_key = (
                        row['Год'],
                        row['Событие'],
                        row['Место проведения'],
                        row['Вид спорта'],
                        row['Дисциплина'],
                        row['Категория']
                    )

                    event = events_info[event_key]
                    event.update({
                        'event_year': row['Год'],
                        'event_name': row['Событие'],
                        'event_location': row['Место проведения'],
                        'sport_type': row['Вид спорта'],
                        'discipline': row['Дисциплина'],
                        'category': row['Категория']
                    })

                    # Обрабатываем участника
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

    # Конвертируем в обычный словарь
    return {k: v for k, v in events_info.items()}

def save_events_json(events_info: dict, output_path: str) -> None:
    """Сохраняет информацию о событиях и участниках в JSON файл"""
    # Преобразуем в список и сортируем
    events_list = sorted(
        events_info.values(),
        key=lambda x: (x['event_year'], x['event_name'])
    )

    # Создаем директорию если нужно
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Сохраняем в JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "events": events_list,
            "total_events": len(events_list),
            "total_participants": sum(e['total_participants'] for e in events_list)
        }, f, ensure_ascii=False, indent=2)

def main():
    parser = argparse.ArgumentParser(
        description='Парсер информации о соревнованиях и участниках'
    )
    parser.add_argument(
        '--config',
        nargs='+',
        default=['config.yaml'],
        help='Список конфигурационных файлов'
    )
    args = parser.parse_args()

    try:
        # Загружаем конфигурацию
        config = load_config(args.config)

        # Парсим события и участников
        events_info = parse_events(config)

        # Определяем путь для сохранения
        output_path = config['output'].get('events_json', 'events.json')

        # Сохраняем результат
        save_events_json(events_info, output_path)

        print(f"Сохранена информация о {len(events_info)} событиях в {output_path}")
        print(f"Общее количество участников: {sum(e['total_participants'] for e in events_info.values())}")

    except Exception as e:
        print(f"Ошибка: {str(e)}")
        exit(1)

if __name__ == '__main__':
    main()
