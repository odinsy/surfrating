default: rating

discipline := longboard
category := men
conf_decay_system := conf/base/decay/decay-disabled.yaml
conf_years_system := conf/base/years/last5.yaml
conf_scoring_systems := conf/base/scoring/default.yaml conf/base/scoring/wsl/scoring-wsl-qs1000-custom.yaml

rating:
	python3 ./scripts/surfrating/rating.py --config	conf/rfs/config.yaml $(conf_scoring_systems) $(conf_decay_system) $(conf_years_system) conf/rfs/events.yaml conf/rfs/surfing/rus/$(discipline)_$(category).yaml | column -t -s ','

kaliningrad:
	python3 ./scripts/surfrating/rating.py --config	conf/rfs/config.yaml $(conf_scoring_systems) $(conf_decay_system) $(conf_years_system) conf/rfs/events.yaml conf/rfs/surfing/kaliningrad/$(discipline)_$(category).yaml | column -t -s ','

events:
	python3 ./scripts/surfrating/events_parser.py --config conf/rfs/config.yaml conf/rfs/surfing/rus/$(discipline)_$(category).yaml

wake:
	python3 ./scripts/surfrating/rating.py --config conf/rfs/config.yaml $(conf_scoring_systems) $(conf_decay_system) $(conf_years_system) conf/rfs/events.yaml conf/rfs/wakesurfing/rus/$(discipline)_$(category).yaml | column -t -s ','

wake_events:
	python3 ./scripts/surfrating/events_parser.py --config conf/rfs/config.yaml conf/rfs/wakesurfing/rus/$(discipline)_$(category).yaml

balticsurf:
	python3 ./scripts/surfrating/rating.py --config	conf/balticsurf/config.yaml conf/balticsurf/events.yaml $(conf_scoring_systems) $(conf_decay_system) conf/balticsurf/$(discipline)_$(category).yaml | column -t -s ','
