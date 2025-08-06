import pandas as pd
import json

df_10 = pd.read_csv('./tmp/0.8/shortboard/men-08.csv')
df_08 = pd.read_csv('./tmp/1.0/shortboard/men-10.csv')

rank_dict_10 = dict(zip(df_10['Name'], df_10['Rank']))
rank_dict_08 = dict(zip(df_08['Name'], df_08['Rank']))

comparison_data = []
for name in set(df_10['Name']).intersection(df_08['Name']):
    rank_10 = rank_dict_10[name]
    rank_08 = rank_dict_08[name]
    position_change = rank_10 - rank_08
    comparison_data.append({
        'name': name,
        'rank_10': rank_10,
        'rank_08': rank_08,
        'position_change': position_change
    })

with open('./output/diff.json', 'w', encoding='utf-8') as f:
    json.dump(comparison_data, f, ensure_ascii=False)
