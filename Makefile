default: rating

discipline := longboard
category := men

rating:
	python3 ./scripts/rating/rating.py --config conf/rfs/config.yaml conf/rfs/events.yaml conf/scoring/default.yaml conf/scoring/wsl/scoring-wsl-cs.yaml conf/rfs/surfing/rus/$(discipline)_$(category).yaml | column -t -s ','

kaliningrad:
	python3 ./scripts/rating/rating.py --config conf/rfs/config.yaml conf/rfs/events.yaml conf/scoring/default.yaml conf/scoring/wsl/scoring-wsl-cs.yaml conf/rfs/surfing/kaliningrad/$(discipline)_$(category).yaml | column -t -s ','
