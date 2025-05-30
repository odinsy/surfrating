default: rating

discipline := longboard
category := men
conf_scoring_systems := conf/base/scoring/default.yaml conf/base/scoring/wsl/scoring-wsl-cs.yaml

rating:
	python3 ./scripts/rating/rating.py --config	conf/rfs/config.yaml $(conf_scoring_systems) conf/rfs/events.yaml conf/rfs/surfing/rus/$(discipline)_$(category).yaml | column -t -s ','

kaliningrad:
	python3 ./scripts/rating/rating.py --config	conf/rfs/config.yaml $(conf_scoring_systems) conf/rfs/events.yaml conf/rfs/surfing/kaliningrad/$(discipline)_$(category).yaml | column -t -s ','

wake:
	python3 ./scripts/rating/rating.py --config conf/rfs/config.yaml $(conf_scoring_systems) conf/base/decay/decay-disabled.yaml conf/rfs/events.yaml conf/rfs/wakesurfing/rus/wakesurfing_$(category).yaml | column -t -s ','
