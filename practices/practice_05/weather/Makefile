.PHONY: run test install-tools browser openspec-check
run:
	PYTHONDONTWRITEBYTECODE=1 python3 server.py
test:
	sh scripts/check.sh
install-tools:
	sh scripts/install_tools.sh
browser:
	npm run test:browser
openspec-check:
	sh scripts/openspec.sh validate --all --strict --no-interactive
