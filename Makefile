default: rating

discipline := longboard
category := men
# conf_decay_system := conf/base/decay/decay-disabled.yaml
# conf_years_system := conf/base/years/last3.yaml
conf_scoring_systems := conf/base/scoring/default.yaml conf/base/scoring/scoring-isa.yaml conf/base/scoring/wsl/scoring-wsl-cs.yaml conf/base/scoring/wsl/scoring-wsl-qs1000.yaml conf/base/scoring/wsl/scoring-wsl-qs2000.yaml conf/base/scoring/wsl/scoring-wsl-qs3000.yaml conf/base/scoring/wsl/scoring-wsl-qs4000.yaml conf/base/scoring/wsl/scoring-wsl-qs5000.yaml conf/base/scoring/wsl/scoring-wsl-qs6000.yaml

rating_rfs_surf_main:
	python3 ./scripts/surfrating/main.py --config	conf/rfs/config.yaml $(conf_scoring_systems) conf/rfs/events.yaml conf/rfs/surfing/rus/$(discipline)_$(category).yaml | column -t -s ','

rating_rfs_surf_main_isa:
	python3 ./scripts/surfrating/main.py --config	conf/rfs/config.yaml $(conf_scoring_systems) conf/rfs/events-isa.yaml conf/rfs/surfing/rus/$(discipline)_$(category)_isa.yaml | column -t -s ','

rating_rfs_surf_kgd:
	python3 ./scripts/surfrating/main.py --config	conf/rfs/conf.d/config-kgd.yaml $(conf_scoring_systems) $(conf_decay_system) $(conf_years_system) conf/rfs/events.yaml conf/rfs/surfing/kgd/$(discipline)_$(category).yaml | column -t -s ','

rating_rfs_surf_spb:
	python3 ./scripts/surfrating/main.py --config	conf/rfs/conf.d/config-spb.yaml $(conf_scoring_systems) $(conf_decay_system) $(conf_years_system) conf/rfs/events.yaml conf/rfs/surfing/spb/$(discipline)_$(category).yaml | column -t -s ','

rating_rfs_surf_vdk:
	python3 ./scripts/surfrating/main.py --config	conf/rfs/conf.d/config-vdk.yaml $(conf_scoring_systems) $(conf_decay_system) $(conf_years_system) conf/rfs/events.yaml conf/rfs/surfing/vdk/$(discipline)_$(category).yaml | column -t -s ','

rating_rfs_surf_krd:
	python3 ./scripts/surfrating/main.py --config	conf/rfs/conf.d/config-krd.yaml $(conf_scoring_systems) $(conf_decay_system) $(conf_years_system) conf/rfs/events.yaml conf/rfs/surfing/krd/$(discipline)_$(category).yaml | column -t -s ','

rating_rfs_surf_dfo:
	python3 ./scripts/surfrating/main.py --config	conf/rfs/conf.d/config-dfo.yaml $(conf_scoring_systems) $(conf_decay_system) $(conf_years_system) conf/rfs/events.yaml conf/rfs/surfing/dfo/$(discipline)_$(category).yaml | column -t -s ','

rating_rfs_wake_main:
	python3 ./scripts/surfrating/main.py --config conf/rfs/config.yaml $(conf_scoring_systems) $(conf_decay_system) $(conf_years_system) conf/rfs/events.yaml conf/rfs/wakesurfing/rus/$(discipline)_$(category).yaml | column -t -s ','

tvoysurf39:
	python3 ./scripts/surfrating/main.py --config	conf/tvoysurf39/config.yaml conf/tvoysurf39/events.yaml conf/base/scoring/wsl/scoring-wsl-jr1000.yaml conf/tvoysurf39/$(discipline)_$(category).yaml | column -t -s ','

wake_events:
	python3 ./scripts/surfrating/events_parser.py --config conf/rfs/config.yaml conf/rfs/wakesurfing/rus/$(discipline)_$(category).yaml

events:
	python3 ./scripts/surfrating/events_parser.py --config conf/rfs/config.yaml conf/rfs/surfing/rus/$(discipline)_$(category).yaml
