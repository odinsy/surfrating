# surfra

Система автоматизации рейтинга серфинга: парсинг результатов соревнований из CSV, расчёт рейтинга по очкам, публикация через статический сайт на GitHub Pages.

Используется для российского серфинга (РФС — нац. и региональные пулы, вейксёрфинг) и отдельного организатора tvoysurf39.

---

## Архитектура: три этапа

```
data/rfs/**/*.csv
      │
      ▼  [1] Парсинг
scripts/surfrating/main.py  ←  conf/**/*.yaml
      │
      ▼  [2] Расчёт рейтинга
output/rankings/.../ranking_<gender>.{json,csv}
      │
      ▼  [3] Веб (GitHub Pages)
src/pages/rankings/...  ←  src/data → output/  (симлинк)
```

---

### Этап 1. Парсинг CSV

**Входные данные** — pipe-delimited UTF-8 CSV в `data/rfs/surfing/<регион>/<дисциплина>/<дисциплина>_<категория>_<год>.csv`.

16 обязательных колонок:

```
Год | Дата | Событие | Место проведения | Вид спорта | Дисциплина | Категория
Место | round_name | round_order | heat_number | heat_place | ФИО | Год рождения | Разряд | Регион
```

**Конфиг** загружается через `scripts/surfrating/config_loader.py`:
- Принимает список YAML-файлов (`--config a.yaml b.yaml …`) и мёрджит их слева направо (last-wins; dicts рекурсивно).
- Типичный порядок слоёв: `conf/rfs/config.yaml` → таблицы очков → `conf/rfs/events.yaml` → per-pool файл (`conf/rfs/<вид>/<регион>/<дисциплина>_<категория>.yaml`).
- Нормализация: ключи диапазонов `"5-8"` → кортежи `(5, 8)`, `allowed_years` → `set`.

**Парсинг** (`scripts/surfrating/data_parser.py`):
1. `parse_files(config)` разворачивает globs из `input_paths`, валидирует обязательные колонки.
2. Каждая строка получает метку `event_group` через подстрочный матч названия события в `helpers.get_event_group`: `main` / `cross_regional` / `regional` / `local` / `default` (порядок объявления в `events.yaml` — первое совпадение выигрывает).
3. Спортсмен идентифицируется первыми двумя токенами ФИО (отчество отбрасывается); ключ — md5[:8] от нормализованного имени.
4. DNS-результат записывается в данные спортсмена, но не учитывается в `participants_count`.

---

### Этап 2. Расчёт рейтинга

Оркестрация в `scripts/surfrating/main.py`. Расчёт — в `scripts/surfrating/calculations.py`.

`process_athletes` для каждого спортсмена:

1. **Фильтр по годам** — оставляет только события из `allowed_years`.
2. **Базовые очки** (`scripts/surfrating/scoring.py`) — три режима, выбирается по `event_group`:
   - `place_based` — место → очки по таблице.
   - `round_based` — раунд + место в хите → очки (нужны `round_name` и `heat_place`).
   - `mixed` — сначала `round_based`, при отсутствии раунда — fallback на `place_based`.
   - Результат умножается на `coefficient` группы (например, 0.5 для регионального старта).
3. **Бонусы** (каждый включается/отключается в конфиге):
   - `participant_factor` — коэффициент по размеру хита (1–5 уч. → ×0.5, 6–8 → ×0.75, 9+ → ×1.0).
   - `decay` — экспоненциальное затухание по годам: `очки × factor ^ (текущий_год − год_старта)`.
   - `participation` — фиксированный бонус (по умолчанию 50) за любой финиш (не DNS).
   - `sport_rank` — прибавляется один раз ко всему итогу спортсмена (МС: 80, КМС: 50, …).
4. **Сортировка**: `−total_points` → `−best_year_points` → `best_place` → `−год лучшего результата` → `−last_year`.

**Таблицы очков** в `conf/base/scoring/`:
- `default.yaml` — базовая таблица и WSL-вариант (1, 2, 3, 4, 5–8, 9–16, 17–24, 25–32, DNS).
- `th/scoring-th{1000,2000,3000,10000}.yaml` — TH-серии с режимом `round_based` + fallback.
- `wsl/` — WSL QS/JR аналоги.

**Прочие тюнеры**: `conf/base/decay/decay-{05,08,09,disabled}.yaml`, `conf/base/years/last{2,3,5}.yaml`.

**Вывод** (`scripts/surfrating/output.py`):

```
output/rankings/<орг>/<регион>/<дисциплина>/
    ranking_men.json      # основной JSON рейтинга
    ranking_men.csv       # CSV (колонки: Rank, Name, …, YearScores, Total Points)
    t5_ranking_men.json   # топ-5 (если включено)
    t5_ranking_men.csv
```

Структура `ranking_<gender>.json`:
```json
{
  "discipline": "longboard", "gender": "men", "last_updated": "...",
  "events":   { "<event_id>": { "name", "year", "date", "group", "participants_count" } },
  "athletes": { "<athlete_id>": { "name", "region", "sport_rank", "birth_year" } },
  "results":  [ { "athlete_id", "event_id", "place", "points", "round_name", "heat_place" } ],
  "year_rankings": { "<year>": { "athletes": [ { "athlete_id", "year_points", "events", "rank" } ] } },
  "overall_ranking": [ { "athlete_id", "rank", "total_points", "best_result", "last_year", "years_participated" } ]
}
```

---

### Этап 3. Веб (статический фронтенд на GitHub Pages)

Бэкенда нет. Данные публикуются двумя симлинками без копирования:

```
docs   →  src/             # корень GitHub Pages
src/data → ../output/     # данные прямо из output/
```

Любая регенерация в `output/` сразу видна на сайте после коммита.

**Страницы** в `src/pages/`:

| Путь | Что показывает | Данные |
|------|---------------|--------|
| `rankings/rfs/` | Рейтинговая таблица (RFS) | `ranking_<gender>.json` |
| `rankings/tvoysurf39/` | Рейтинг tvoysurf39 | `ranking_<gender>.json` |
| `top5/rfs/` | Карточки топ-5 | `t5_ranking_<gender>.json` |
| `trends/` | График роста участников / возраста | `*_stats.csv` (Chart.js) |
| `trends/diff/` | Изменение позиций (diff) | `output/diff.json` (D3) |

Фильтры дисциплин и регионов зашиты в объект `COMPETITIONS` в `app.js`. `output/rankings/index.json` (генерирует `indexer.py`) подготовлен под динамическую загрузку, но пока фронтом не используется.

---

## Постпроцессинг

| Скрипт | Что делает | Куда пишет |
|--------|-----------|-----------|
| `scripts/wildcard.py` | Отбор кандидатов на wildcard по `top_n`, `min_participations`, диапазону `[max_best_place, min_best_place]` за `last_years_period` лет | `output/wildcard/<дисц>_<кат>.{json,csv}` |
| `scripts/differ.py` | Diff двух JSON-снимков рейтинга → позиции и очки изменились, trend `up/down/stable/new/dropped` + summary | `output/trends/rfs/…/trends_<gender>.{json,csv}` |
| `scripts/analysis.py` | Тренды числа участников и среднего возраста по годам и регионам (читает CSV рейтинга) | `output/trends/general_*_stats.csv`, `detailed_*_stats.csv` |
| `scripts/indexer.py` | Индексирует все `ranking_*.json` в `output/rankings/` → один каталог | `output/rankings/index.json` |

---

## Конфигурация

Слои мёрджатся в следующем типичном порядке (последний выигрывает):

1. `conf/rfs/config.yaml` — корневые настройки: `scoring_system`, `scoring_mode`, `current_year`, `allowed_years`, бонусы, `wildcard.*`, `trends.*`.
2. `conf/base/scoring/<система>.yaml` — таблицы очков; несколько файлов сосуществуют без конфликтов (добавляются в `scoring:` под разными ключами).
3. `conf/base/decay/decay-*.yaml` и `conf/base/years/last{2,3,5}.yaml` — опциональные оверрайды (по умолчанию закомментированы в Makefile).
4. `conf/rfs/events.yaml` — `event_groups` (паттерны подстрок) и `allowed_events`.
5. Per-pool файл `conf/rfs/<вид>/<регион>/<дисциплина>_<категория>.yaml` — `discipline`, `gender`, `input_paths`, пути `output.*`. Этот файл всегда последний.

Увидеть итоговую развёртку команды без запуска: `make -n <target>`.

---

## Раскладка репозитория

```
surfra/
├── data/rfs/surfing/<регион>/<дисц>/   # входные CSV (pipe-delimited)
├── conf/
│   ├── base/scoring/                   # таблицы очков (th, wsl, default)
│   ├── base/decay/                     # коэффициенты затухания
│   ├── base/years/                     # фильтры по годам
│   └── rfs/
│       ├── config.yaml                 # корневой конфиг
│       ├── events.yaml                 # event_groups, allowed_events
│       ├── surfing/<регион>/            # per-pool конфиги
│       └── wakesurfing/
├── scripts/
│   ├── surfrating/                     # ядро pipeline
│   │   ├── main.py                     # точка входа
│   │   ├── config_loader.py
│   │   ├── data_parser.py
│   │   ├── scoring.py
│   │   ├── calculations.py
│   │   └── output.py
│   ├── wildcard.py
│   ├── differ.py
│   ├── analysis.py
│   └── indexer.py
├── output/                             # генерируемые артефакты
│   ├── rankings/
│   ├── trends/
│   └── wildcard/
├── src/                                # статический фронтенд
│   ├── data -> ../output              # симлинк (данные для JS)
│   ├── pages/
│   │   ├── rankings/
│   │   ├── top5/
│   │   └── trends/
│   └── styles/
├── docs -> src                         # симлинк (GitHub Pages root)
└── config.yaml -> conf/rfs/config.yaml # симлинк для удобства
```

---

## Команды

Переменные по умолчанию: `discipline=longboard category=men org=rus`.

```bash
# Национальный рейтинг серфинга (РФС)
make rating_rfs_surf_main discipline=shortboard category=women

# Региональный рейтинг — <reg>: kgd | spb | vdk | krd | ptk | mmk | dfo
make rating_rfs_surf_kgd discipline=longboard category=men

# Вейксёрфинг
make rating_rfs_wake_main discipline=longboard category=men

# Отдельный организатор tvoysurf39
make tvoysurf39 discipline=longboard category=men

# Пересборка каталога событий пула
make events org=kgd discipline=longboard category=men

# Diff двух снимков рейтинга (пути снимков — в Makefile)
make diff
```

Скрипты без Make-цели — запускаются напрямую:

```bash
# Отбор wildcard-кандидатов
python3 scripts/wildcard.py --config conf/rfs/config.yaml \
    conf/rfs/surfing/rus/<дисц>_<кат>.yaml

# Diff двух JSON-снимков рейтинга
python3 scripts/differ.py --old tmp/old.json --new tmp/new.json \
    --output output/trends/rfs/rus/<дисц>/trends_<пол> --format json

# Тренды участников / регионов / возраста
python3 scripts/analysis.py

# Пересборка output/rankings/index.json для фронтенда
python3 scripts/indexer.py
```

---

## Стек

- **Python 3.10+** — `pyyaml`, `pandas` (нормализация дат рождения).
- **Фронтенд** — Bootstrap 5.3, Chart.js (тренды), D3 (diff), transliteration UMD. Без сборщика, только CDN.
- **Хостинг** — GitHub Pages (статика, без сервера).

---

**Репозиторий:** https://github.com/odinsy/surfra
