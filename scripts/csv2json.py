import csv
import json

def csv_to_json(csv_path, json_path):
    data = []
    with open(csv_path, 'r') as csv_file:
        csv_reader = csv.DictReader(csv_file)
        for row in csv_reader:
            data.append(row)

    with open(json_path, 'w') as json_file:
        json.dump(data, json_file, indent=2)  # indent для читаемости

csv_to_json('data.csv', 'data.json')
