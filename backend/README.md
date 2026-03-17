# Voynich — Backend

FastAPI backend for the Voynich invoice management platform.

## Quickstart

```bash
# 1. Copy and fill in environment variables
cp .env.example .env

# 2. Build and run (Docker required on Windows — weasyprint needs system libs)
bash dev.sh
```

API available at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

## Environment Variables

```env
MONGO_URL=mongodb+srv://...
DB_NAME=invoice_processing
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://...
AZURE_DOCUMENT_INTELLIGENCE_KEY=...
JWT_SECRET=...                   # generate: python -c "import secrets; print(secrets.token_hex(32))"
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
ADMIN_EMAIL=...
ADMIN_FULL_NAME=...
```

## Database

```bash
# Wipe + insert realistic demo data
uv run python scripts/reset.py --seed

# Wipe only (clean slate for demos)
uv run python scripts/reset.py --empty

# Via Docker container
docker exec <container> uv run python scripts/reset.py --seed
```

## Linting

```bash
uv run ruff check
```

## Further Reading

See `../CLAUDE.md` for full architecture, conventions, and roadmap references.
