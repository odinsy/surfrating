import os
import json
from datetime import datetime

def generate_index(root_path):
    index = {
        "last_updated": datetime.utcnow().isoformat() + "Z",
        "rankings": []
    }

    for dirpath, dirnames, filenames in os.walk(root_path):
        if not filenames:
            continue

        parts = os.path.relpath(dirpath, root_path).split(os.sep)
        if len(parts) < 3:
            continue

        organizer   = parts[0]
        competition = parts[1]
        discipline  = parts[2]

        for filename in filenames:
            if filename.startswith('ranking_') and filename.endswith('.json'):
                gender_str = filename.replace('ranking_', '').replace('.json', '')
                gender = "Мужчины" if gender_str == "men" else "Женщины"

                discipline_names = {
                    "shortboard": "Короткая доска",
                    "longboard": "Длинная доска",
                    "wakeskim": "Вейкским",
                    "wakesurfing": "Вейксерфинг"
                }

                entry = {
                    "id": f"{organizer}_{competition}_{discipline}_{gender_str}",
                    "path": os.path.join(organizer, competition, discipline, filename),
                    "competition": competition.replace('_', ' ').title(),
                    "organizer": organizer.upper(),
                    "discipline": discipline_names.get(discipline, discipline),
                    "gender": gender
                }

                index["rankings"].append(entry)

    with open(os.path.join(root_path, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    generate_index("output/rankings")
