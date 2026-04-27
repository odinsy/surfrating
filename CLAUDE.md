# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common commands

Default variables: `discipline=longboard category=men org=rus`. Override on the command line.

```bash
# National surfing rating (RFS)
make rating_rfs_surf_main discipline=shortboard category=women

# Regional rating — replace <reg> with kgd|spb|vdk|krd|ptk|mmk|dfo
make rating_rfs_surf_kgd discipline=longboard category=men

# Wakesurfing national rating
make rating_rfs_wake_main discipline=longboard category=men

# Separate organizer (tvoysurf39)
make tvoysurf39 discipline=longboard category=men

# Parse/rebuild events catalog for a pool
make events org=kgd discipline=longboard category=men

# Rank-trend diff (hardcoded snapshot paths in Makefile — stage JSONs in tmp/ first)
make diff
```

Scripts with **no Make target** — invoke directly:

```bash
# Wildcard candidates from a ranking JSON
python3 scripts/wildcard.py --config conf/rfs/config.yaml \
    conf/rfs/surfing/rus/<discipline>_<category>.yaml

# Compare two ranking snapshots (old/new are ranking_*.json paths)
python3 scripts/differ.py --old tmp/old.json --new tmp/new.json \
    --output output/trends/rfs/rus/<discipline>/trends_<gender> --format json

# Participant growth / region / age trends (reads config.yaml from CWD)
python3 scripts/analysis.py

# Rebuild output/rankings/index.json for the frontend
python3 scripts/indexer.py
```

To see the full expanded command for any Make target without running it: `make -n <target>`.

---

## Config layering

`scripts/surfrating/config_loader.py` loads `--config` paths in left-to-right order and **deep-merges last-wins** (dicts recurse, scalars/lists overwrite). Typical layer order:

1. `conf/rfs/config.yaml` (or per-region `conf/rfs/conf.d/config-<reg>.yaml`) — root settings, bonus factors, output paths base, wildcard thresholds.
2. `conf/base/scoring/default.yaml` + any TH/WSL variants — these merge into the `scoring:` map, so multiple files can each define different named scoring tables without collision.
3. `conf/base/decay/decay-*.yaml` and `conf/base/years/last{2,3,5}.yaml` — optional; commented out by default in the Makefile `conf_decay_system`/`conf_years_system` vars.
4. `conf/rfs/events.yaml` — defines `event_groups` (name patterns) and `allowed_events`.
5. Per-pool file `conf/rfs/<sport>/<region>/<discipline>_<category>.yaml` — sets `discipline`, `gender`, `input_paths` globs, and `output.*` filenames. This is always last and controls what data is read and where output lands.

After merge, `config_loader` normalises: scoring range keys like `"5-8"` become tuples `(5, 8)`, and `allowed_years` becomes a `set`.

---

## Pipeline and code map

Input CSVs are **pipe-delimited** (`data/rfs/surfing/<region>/<discipline>/<discipline>_<category>_<year>.csv`, columns: year, date, event name, athlete name, birth year, region, sport rank, place, optional round/heat fields).

`scripts/surfrating/main.py` orchestrates the pipeline:

1. `config_loader.load_config` — builds merged config.
2. `data_parser.parse_files` — reads globs from `input_paths`, groups rows by athlete name, tags each event with an `event_group` via substring matching against `event_groups[*].events` patterns (`helpers.py`).
3. `calculations.process_athletes` — for each athlete calls `scoring.calculate_base_points` (modes: `place_based`, `round_based`, `mixed`, selected per `event_group`), then layers bonuses: `participant_factor` (tiered by heat size), exponential `decay` over years, flat `participation` bonus, `sport_rank` total bonus.
4. Sort key: total points → best points in a year → best place → year → last-year result.
5. `output.generate_output` — writes `ranking_<gender>.csv`, `ranking_<gender>.json` (with `events` / `athletes` / `results` / `year_rankings` / `overall_ranking` keys), optional `t5_ranking_*.csv`, prints CSV to stdout (`| column -t -s ','` in Make for aligned display).

Core files: `main.py`, `config_loader.py`, `scoring.py`, `calculations.py`, `output.py`.

---

## Repo layout quirks

- `docs` is a **symlink to `src/`** — this is the GitHub Pages root. Do not delete it.
- `config.yaml` at the repo root is a **symlink to `conf/rfs/config.yaml`**.
- `output/` and `src/data/` must be **kept in sync manually** after regenerating rankings — the static frontend (`src/pages/rankings/rfs/app.js`) fetches JSON from `src/data/rankings/`.
- The `README.md` references `surf_rating.py` and `generate_wildcard.py` — these are **obsolete names**. The actual entry points are `scripts/surfrating/main.py` and `scripts/wildcard.py`.
- `todo.md` and `prompts/` are in `.gitignore` and may exist locally; ignore them.
