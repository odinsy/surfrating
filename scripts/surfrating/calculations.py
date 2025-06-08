from typing import Dict, List, Tuple
from helpers import generate_event_id, generate_athlete_id

def calculate_base_points(place: str, group: str, config: Dict) -> int:
    system = config['scoring'][config['scoring_system']]
    coeff = config['event_groups'][group]['coefficient']

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

def apply_participant_factor(points: int, participants_count: int, config: Dict) -> int:
    if not config['bonuses']['participant_factor']['enabled']:
        return points

    rules = config['bonuses']['participant_factor']['rules']
    for rule in rules:
        min_p = rule['min']
        max_p = rule['max'] if rule['max'] != "inf" else float('inf')
        if min_p <= participants_count <= max_p:
            return round(points * rule['factor'])
    return points

def apply_decay(points: int, year: int, config: Dict) -> int:
    if config['bonuses']['decay']['enabled']:
        decay = config['bonuses']['decay']['factor'] ** (config['current_year'] - year)
        return round(points * decay)
    return points

def apply_participation_bonus(points: int, is_dns: bool, config: Dict) -> int:
    if not is_dns and config['bonuses']['participation']['enabled']:
        return points + config['bonuses']['participation']['points']
    return points

def apply_sport_rank_bonus(total: int, sport_rank: str, config: Dict) -> int:
    if config['bonuses']['sport_rank']['enabled']:
        return total + config['bonuses']['sport_rank']['values'].get(rank, 0)
    return total

def process_year_points(year: int, event_data: Dict, config: Dict, athlete_id: str) -> Tuple[Dict, List]:
    year_info = {'year_total_points': 0, 'events': []}
    event_results = []

    for event_name, event_info in event_data.items():
        place              = event_info['place']
        group              = event_info['group']
        event_id           = event_info.get('event_id', '')
        participants_count = event_info.get('participants_count', 0)
        is_dns             = (place == 'DNS')

        points = calculate_base_points(place, group, config)
        points = apply_participant_factor(points, participants_count, config)
        points = apply_decay(points, year, config)
        points = apply_participation_bonus(points, is_dns, config)

        year_info['year_total_points'] += points
        year_info['events'].append({
            'event_name': event_name,
            'place': int(place) if place.isdigit() else place,
            'points': points,
            'group': group,
            'participants_count': participants_count
        })

        event_results.append({
            'athlete_id': athlete_id,
            'event_id': event_id,
            'place': int(place) if place.isdigit() else place,
            'points': points
        })

    return year_info, event_results

def process_athletes(data: Dict, config: Dict) -> Tuple[List[Dict], List[Dict]]:
    allowed_years = config.get('allowed_years')
    results = []
    all_results = []

    for name, info in data.items():
        athlete_id = generate_athlete_id(name, info['birth_year'])
        filtered_years = {}
        if allowed_years:
            for year, year_events in info['years'].items():
                if int(year) in allowed_years:
                    filtered_years[year] = year_events
        else:
            filtered_years = info['years']

        last_year = max(map(int, filtered_years.keys())) if filtered_years else 0

        entry = {
            'name': name,
            'birth_year': info['birth_year'],
            'region': info['region'],
            'category': info['category'],
            'sport_rank': info['sport_rank'],
            'last_year': last_year,
            'years': {},
            'total_points': 0,
            'best_result': None,
            'athlete_id': athlete_id
        }
        all_events = []
        total_points = 0

        for year, year_events in filtered_years.items():
            year_info, year_event_results = process_year_points(
                int(year), year_events, config, athlete_id
            )
            entry['years'][int(year)] = year_info
            total_points += year_info['year_total_points']
            all_results.extend(year_event_results)

            for event in year_info['events']:
                all_events.append({
                    **event,
                    'event_year': int(year)
                })

        if all_events:
            numeric_events = [e for e in all_events if isinstance(e['place'], int)]

            if numeric_events:
                best_event = min(
                    numeric_events,
                    key=lambda x: (x['place'], -x['event_year'], -x['points'])
                )
            else:
                best_event = max(all_events, key=lambda x: x['points'])

            entry['best_result'] = {
                'event_name': best_event['event_name'],
                'event_year': str(best_event['event_year']),
                'place': best_event['place'],
                'points': best_event['points']
            }

        total_points = apply_sport_rank_bonus(total_points, entry['sport_rank'], config)
        entry['total_points'] = total_points
        results.append(entry)

    if config['sorting']['enabled']:
        sorted_results = sorted(results, key=lambda x: (
            -x['total_points'],
            x['best_result']['place'] if x['best_result'] and isinstance(x['best_result']['place'], int) else 9999,
            -x['last_year'],
            -int(x['best_result']['event_year']) if x['best_result'] and x['best_result'].get('event_year') else 0
        ))
    else:
        sorted_results = sorted(results, key=lambda x: -x['total_points'])

    for rank, athlete in enumerate(sorted_results, 1):
        athlete['rank'] = rank

    return sorted_results, all_results
