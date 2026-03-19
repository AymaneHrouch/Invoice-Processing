#!/usr/bin/env bash
set -e

IMAGE="voynich-backend"

echo "Building $IMAGE..."
docker build -t "$IMAGE" .

# docker --env-file doesn't strip quotes, so we export vars ourselves
set -a
# Strip surrounding quotes from values before sourcing
eval "$(sed 's/="\(.*\)"/=\1/' .env)"
set +a

# Stop any container already using port 8000
OLD=$(docker ps -q --filter "publish=8000")
if [ -n "$OLD" ]; then
  echo "Stopping existing container on port 8000..."
  docker stop "$OLD"
fi

echo "Starting $IMAGE on http://localhost:8000 ..."
docker run --rm -p 8000:8888 \
  -e MONGO_URL="$MONGO_URL" \
  -e DB_NAME="$DB_NAME" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e ADMIN_USERNAME="$ADMIN_USERNAME" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_FULL_NAME="$ADMIN_FULL_NAME" \
  -e AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="$AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT" \
  -e AZURE_DOCUMENT_INTELLIGENCE_KEY="$AZURE_DOCUMENT_INTELLIGENCE_KEY" \
  "$IMAGE"
