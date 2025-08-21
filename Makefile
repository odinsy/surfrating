default: rating

discipline := longboard
category := men
# conf_decay_system := conf/base/decay/decay-disabled.yaml
# conf_years_system := conf/base/years/last3.yaml
conf_scoring_systems := conf/base/scoring/default.yaml conf/base/scoring/wsl/scoring-wsl-cs.yaml conf/base/scoring/wsl/scoring-wsl-qs6000.yaml

rating_rfs_surf_main:
	python3 ./scripts/surfrating/main.py --config	conf/rfs/config.yaml $(conf_scoring_systems) conf/rfs/events.yaml conf/rfs/surfing/rus/$(discipline)_$(category).yaml | column -t -s ','

rating_rfs_surf_kaliningrad:
	python3 ./scripts/surfrating/main.py --config	conf/rfs/conf.d/config-kaliningrad.yaml $(conf_scoring_systems) $(conf_decay_system) $(conf_years_system) conf/rfs/events.yaml conf/rfs/surfing/kaliningrad/$(discipline)_$(category).yaml | column -t -s ','

rating_rfs_surf_spb:
	python3 ./scripts/surfrating/main.py --config	conf/rfs/conf.d/config-spb.yaml $(conf_scoring_systems) $(conf_decay_system) $(conf_years_system) conf/rfs/events.yaml conf/rfs/surfing/spb/$(discipline)_$(category).yaml | column -t -s ','

rating_rfs_wake_main:
	python3 ./scripts/surfrating/main.py --config conf/rfs/config.yaml $(conf_scoring_systems) $(conf_decay_system) $(conf_years_system) conf/rfs/events.yaml conf/rfs/wakesurfing/rus/$(discipline)_$(category).yaml | column -t -s ','

wake_events:
	python3 ./scripts/surfrating/events_parser.py --config conf/rfs/config.yaml conf/rfs/wakesurfing/rus/$(discipline)_$(category).yaml

tvoisurf39:
	python3 ./scripts/surfrating/main.py --config	conf/tvoisurf39/config.yaml conf/tvoisurf39/events.yaml conf/base/scoring/wsl/scoring-wsl-cs-per3.yaml $(conf_decay_system) conf/tvoisurf39/$(discipline)_$(category).yaml | column -t -s ','

events:
	python3 ./scripts/surfrating/events_parser.py --config conf/rfs/config.yaml conf/rfs/surfing/rus/$(discipline)_$(category).yaml
