# Contributing to Aurix

Thanks for your interest in improving Aurix! This guide keeps contributions smooth and consistent.

## Quick start
- Fork or create a feature branch from `main`.
- Run `make test` (Go) and `cd web && npm run build` before sending changes.
- Keep PRs focused and small; explain the user-visible impact.

## Code style
- Go: follow `gofmt`, keep dependencies minimal.
- Web: prefer existing components/styles; run `npm run lint` if available.
- Add or update tests when fixing bugs or adding features.

## Commit hygiene
- Clear commit messages describing the change and motivation.
- Avoid committing generated artifacts or local environment files.

## Reporting issues
- Include steps to reproduce, expected vs actual behavior, and environment details.
- Attach logs or screenshots when relevant.

## License
- By contributing, you agree that your contributions are licensed under the MIT License (see `LICENSE`).
