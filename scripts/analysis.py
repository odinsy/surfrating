import pandas as pd
import yaml
from collections import defaultdict
from datetime import datetime

def load_config():
    with open("config.yaml") as f:
        return yaml.safe_load(f)["trends"]

def normalize_region(region):
    REGION_MAPPING = {
        "Москва": "Москва",
        "Московская область": "Москва",
        "Калининград": "Калининград",
        "Калининградская область": "Калининград"
    }
    return REGION_MAPPING.get(region, region)

def load_data(config):
    df = pd.read_csv(config["input_ranking_file"])
    df['BirthYear'] = pd.to_numeric(df['Birthday'], errors='coerce')
    return df

def get_active_athletes(df, years):
    athletes = {}
    for year in years:
        active = df[df[str(year)] > 0]
        athletes[year] = {
            'names': set(active['Name']),
            'birth_years': active.set_index('Name')['BirthYear'].to_dict()
        }
    return athletes

def calculate_general_stats(athletes, years):
    stats = []
    prev_athletes = set()

    for year in sorted(years):
        current = athletes[year]
        current_athletes = current['names']
        new_athletes = current_athletes - prev_athletes

        total = len(current_athletes)
        new_count = len(new_athletes)

        # Расчет среднего возраста
        ages = []
        for name in new_athletes:
            birth_year = current['birth_years'].get(name)
            if not pd.isna(birth_year) and birth_year > 1900:
                ages.append(year - int(birth_year))

        avg_age = round(sum(ages)/len(ages), 1) if ages else 0

        # Для 2017 считаем всех участников новыми для расчета возраста
        if year == 2017:
            ages_all = [year - int(y) for y in current['birth_years'].values()
                       if not pd.isna(y) and y > 1900]
            avg_age = round(sum(ages_all)/len(ages_all), 1) if ages_all else 0
            new_count = 0

        share = round(new_count / total * 100, 1) if total > 0 else 0.0

        stats.append({
            "Год": year,
            "Всего участников": total,
            "Новые": new_count,
            "Доля новых (%)": share,
            "Средний возраст": avg_age
        })

        prev_athletes.update(current_athletes)

    return stats

def calculate_detailed_stats(df, athletes, years, stats):
    region_data = defaultdict(lambda: defaultdict(int))
    all_regions = defaultdict(int)

    for year_stat in stats:
        year = year_stat["Год"]
        if year == 2017:
            continue

        current = athletes[year]
        prev = set().union(*[athletes[y]['names'] for y in years if y < year])
        new_athletes = current['names'] - prev

        for name in new_athletes:
            region = df[df['Name'] == name]['Region'].values[0]
            norm_region = normalize_region(region)
            region_data[year][norm_region] += 1
            all_regions[norm_region] += 1

    # Сортировка регионов
    sorted_regions = sorted(all_regions.keys(),
                          key=lambda x: -all_regions[x])

    # Формирование таблицы
    rows = []
    for year in years + ['All']:
        row = {'Год': year}
        if year == 'All':
            for region in sorted_regions:
                row[region] = all_regions[region]
        else:
            for region in sorted_regions:
                row[region] = region_data.get(year, {}).get(region, 0)
        rows.append(row)

    return pd.DataFrame(rows)

def main():
    config = load_config()
    df = load_data(config)
    years = [2017, 2018, 2019, 2021, 2022, 2023, 2024]

    athletes = get_active_athletes(df, years)
    general_stats = calculate_general_stats(athletes, years)

    # Сохранение общей статистики
    pd.DataFrame(general_stats).to_csv(config["output_general_file"], index=False)

    # Детальная статистика
    detailed_df = calculate_detailed_stats(df, athletes, years, general_stats)
    detailed_df.to_csv(config["output_detailed_file"], index=False)

if __name__ == "__main__":
    main()
