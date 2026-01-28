.PHONY: test build dev

test:
	go test ./...

build:
	go build -o bin/sim-api ./cmd/sim-api

dev:
	npm --prefix web install
	(cd web && npm run dev &) \
	&& go run ./cmd/sim-api
