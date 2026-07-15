# Lenon Agent Guide

- Treat `.specify/memory/constitution.md` as the governing rules for Lenon work.
- Treat `specs/` as the source of truth for intended product behavior.
- For meaningful feature or behavior changes, create or update the relevant Spec Kit feature directory before implementation.
- Keep Lenon open-source safe. Never commit secrets, child personal data, private registry values, generated runtime registry files, provider credentials, `.env*` files, Codex auth caches such as `~/.codex/auth.json`, Codex access tokens, OpenAI/API keys, Hermes API keys, or deployment-only config.
- Before committing or pushing, run a secret-looking pattern scan over touched files. Runtime/provider state belongs in `.local/`, local environment variables, Hermes profile secret configuration, or a secret manager, not in git.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
