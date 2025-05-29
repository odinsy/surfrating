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
    for system in config.get('scoring', {}).values():
        new_keys = {}
        for k in list(system.keys()):
            if '-' in str(k):
                min_max = tuple(map(int, k.split('-')))
                new_keys[min_max] = system.pop(k)
        system.update(new_keys)

def process_event_groups(config: Dict) -> None:
    event_groups = config.get('event_groups', {})
    event_groups.setdefault('default', {'coefficient': 1.0, 'events': []})
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
