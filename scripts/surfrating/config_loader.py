import yaml
from typing import Dict

def deep_merge(source: Dict, overrides: Dict) -> Dict:
    merged = source.copy()
    for key, value in overrides.items():
        if isinstance(value, dict) and key in merged:
            merged[key] = deep_merge(merged.get(key, {}), value)
        else:
            merged[key] = value
    return merged

def process_scoring_systems(config: Dict) -> None:
    for system_name, system_config in config.get('scoring', {}).items():
        if 'mode' not in system_config:
            system_config['mode'] = 'mixed'

        if 'place_based' in system_config:
            process_range_keys(system_config['place_based'])

        if 'round_based' in system_config:
            for round_config in system_config['round_based'].values():
                process_range_keys(round_config)

def process_range_keys(config_dict: Dict) -> None:
    new_keys = {}
    keys_to_remove = []

    for k in config_dict.keys():
        if isinstance(k, str) and '-' in k:
            try:
                min_val, max_val = map(int, k.split('-'))
                new_keys[(min_val, max_val)] = config_dict[k]
                keys_to_remove.append(k)
            except ValueError:
                print(f"Ошибка при обработке диапазона '{k}'")

    for k in keys_to_remove:
        del config_dict[k]
    config_dict.update(new_keys)

def process_event_groups(config: Dict) -> None:
    event_groups = config.get('event_groups', {})
    event_groups.setdefault('default', {
        'coefficient': 1.0,
        'scoring_system': config.get('scoring_system', 'default'),
        'scoring_mode': config.get('scoring_mode', 'mixed'),
        'events': []
    })

    for group_name, group_data in event_groups.items():
        if 'scoring_system' not in group_data:
            group_data['scoring_system'] = config.get('scoring_system', 'default')
        if 'scoring_mode' not in group_data:
            group_data['scoring_mode'] = config.get('scoring_mode', 'mixed')

    config['event_groups'] = event_groups
    config.setdefault('allowed_events', [])

def load_config(config_paths: list) -> Dict:
    config = {}
    for path in config_paths:
        with open(path, 'r', encoding='utf-8') as f:
            current_config = yaml.safe_load(f) or {}
            config = deep_merge(config, current_config)

    process_scoring_systems(config)
    process_event_groups(config)

    if 'allowed_years' in config:
        config['allowed_years'] = set(config['allowed_years'])

    return config
