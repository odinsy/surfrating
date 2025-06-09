import argparse
from config_loader import load_config
from data_parser import parse_files
from calculations import process_athletes
from output import generate_output

def setup_arg_parser() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Генератор рейтингов для соревнований по серфингу'
    )
    parser.add_argument(
        '--config',
        nargs='+',
        default=['config.yaml'],
        help='Список конфигурационных файлов'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Включить подробный вывод'
    )
    return parser.parse_args()

def main():
    try:
        args                 = setup_arg_parser()
        config               = load_config(args.config)
        data, events_info    = parse_files(config)
        results, all_results = process_athletes(data, config)

        generate_output(results, config, events_info, all_results)

    except Exception as e:
        print(f"Ошибка: {str(e)}")
        exit(1)

if __name__ == '__main__':
    main()
