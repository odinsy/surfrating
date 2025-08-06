import pandas as pd
import json

df_10 = pd.read_csv('./tmp/0.8/shortboard/men-08.csv')
df_08 = pd.read_csv('./tmp/1.0/shortboard/men-10.csv')
top_20 = df_10.head(20)
rank_dict_08 = dict(zip(df_08['Name'], df_08['Rank']))

comparison_data = []
for _, row in top_20.iterrows():
    name = row['Name']
    rank_10 = row['Rank']
    rank_08 = rank_dict_08.get(name)

    if rank_08 is not None:
        position_change = rank_08 - rank_10
        comparison_data.append({
            'name': name,
            'rank_10': rank_10,
            'rank_08': rank_08,
            'position_change': position_change
        })

with open('./output/diff.json', 'w', encoding='utf-8') as f:
    json.dump(comparison_data, f, ensure_ascii=False)
