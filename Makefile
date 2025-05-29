default: rating

discipline := longboard
category := men

rating:
	python3 ./scripts/rating/rating.py --config conf/rfs/config.yaml conf/rfs/events.yaml conf/rfs/scoring.yaml conf/rfs/scoring-wsl.yaml conf/rfs/rus/$(discipline)_$(category).yaml | column -t -s ','


kaliningrad:
	python3 ./scripts/rating/rating.py --config conf/rfs/config.yaml conf/rfs/events.yaml conf/rfs/scoring.yaml conf/rfs/scoring-wsl.yaml conf/rfs/kaliningrad/$(discipline)_$(category).yaml | column -t -s ','
