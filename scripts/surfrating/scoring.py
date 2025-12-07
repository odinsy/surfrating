from typing import Dict, Optional

def normalize_round_name(round_name: str) -> str:
    if not round_name:
        return 'final'

    round_name = round_name.lower().replace(' ', '_')

    round_aliases = {
        'round_of_16': 'quarterfinal',
        'last_16': 'quarterfinal',
        'round_of_32': 'r32',
        'last_32': 'r32',
        'round_of_64': 'r64',
        'last_64': 'r64'
    }

    return round_aliases.get(round_name, round_name)

def calculate_round_based_points(heat_place: str, round_name: str, system: Dict) -> Optional[int]:
    round_based_system = system.get('round_based', {})
    round_name         = normalize_round_name(round_name)

    if round_name not in round_based_system:
        # print(f"DEBUG: Раунд '{round_name}' не найден в round_based системе")
        return None

    round_system = round_based_system[round_name]

    try:
        place_num = int(heat_place)
    except ValueError:
        # print(f"DEBUG: Некорректное место в раунде: '{heat_place}'")
        return None

    for k, v in round_system.items():
        if isinstance(k, tuple) and k[0] <= place_num <= k[1]:
            print(f"DEBUG: Найдены очки {v} для места {place_num} в диапазоне {k}")
            return v
        elif place_num == k:
            print(f"DEBUG: Найдены очки {v} для места {place_num}")
            return v

    print(f"DEBUG: Не найдены очки для места {place_num} в раунде {round_name}")
    return None

def calculate_place_based_points(place: str, system: Dict, coeff: float) -> int:
    place_based_system = system.get('place_based', {})

    try:
        place_num = int(place)
    except ValueError:
        print(f"DEBUG: Некорректное общее место: '{place}'")
        return 0

    if place_num in place_based_system:
        points = round(place_based_system[place_num] * coeff)
        print(f"DEBUG: Place-based: точное место {place_num} -> {place_based_system[place_num]} * {coeff} = {points}")
        return points

    for k, v in place_based_system.items():
        if isinstance(k, tuple) and k[0] <= place_num <= k[1]:
            points = round(v * coeff)
            print(f"DEBUG: Place-based: место {place_num} в диапазоне {k} -> {v} * {coeff} = {points}")
            return points

    print(f"DEBUG: Не найдены очки для общего места {place_num}")
    return 0

def calculate_base_points(place: str, group: str, config: Dict, round_name: str = None, heat_place: str = None) -> int:
    group_config        = config['event_groups'][group]
    scoring_system_name = group_config.get('scoring_system', config['scoring_system'])
    system              = config['scoring'][scoring_system_name]
    coeff               = group_config['coefficient']

    scoring_mode = group_config.get(
        'scoring_mode',
        system.get('mode', 'mixed')
    )

    print(f"DEBUG: scoring_mode = {scoring_mode}")
    print(f"DEBUG: round_name = {round_name}, heat_place = {heat_place}")

    if place == 'DNS':
        dns_points = round(system.get('DNS', 0) * coeff)
        print(f"DEBUG: DNS -> {dns_points} очков")
        return dns_points

    if scoring_mode == 'round_based':
        if round_name and heat_place and 'round_based' in system:
            print(f"DEBUG: Используем round_based режим")
            points = calculate_round_based_points(heat_place, round_name, system)
            if points is not None:
                final_points = round(points * coeff)
                print(f"DEBUG: Round-based результат: {points} * {coeff} = {final_points}")
                return final_points
            else:
                print(f"DEBUG: Round-based не дал результатов, возвращаем 0")
                return 0
        else:
            print(f"DEBUG: Нет данных о раунде в round_based режиме, возвращаем 0")
            return 0

    elif scoring_mode == 'place_based':
        print(f"DEBUG: Используем place_based режим с местом '{place}'")
        return calculate_place_based_points(place, system, coeff)

    elif scoring_mode == 'mixed':
        if round_name and heat_place and 'round_based' in system:
            print(f"DEBUG: Используем mixed: сначала round-based")
            points = calculate_round_based_points(heat_place, round_name, system)
            if points is not None:
                final_points = round(points * coeff)
                print(f"DEBUG: Round-based результат: {points} * {coeff} = {final_points}")
                return final_points
            else:
                print(f"DEBUG: Round-based не дал результатов, переключаемся на place-based")

        print(f"DEBUG: Используем place-based с местом '{place}'")
        return calculate_place_based_points(place, system, coeff)

    else:
        print(f"WARNING: Неизвестный scoring_mode '{scoring_mode}', используем mixed")
        if round_name and heat_place and 'round_based' in system:
            points = calculate_round_based_points(heat_place, round_name, system)
            if points is not None:
                return round(points * coeff)

        return calculate_place_based_points(place, system, coeff)
