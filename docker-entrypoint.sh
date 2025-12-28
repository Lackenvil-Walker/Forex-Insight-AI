#!/bin/sh
set -e

echo "=========================================="
echo "Forex Edge - Environment Validation"
echo "=========================================="

# Load environment from /root/forex.env if it exists
if [ -f /root/forex.env ]; then
  echo "Loading environment from /root/forex.env"
  set -a
  . /root/forex.env
  set +a
elif [ -f /app/.env ]; then
  echo "Loading environment from /app/.env"
  set -a
  . /app/.env
  set +a
fi

MISSING_VARS=""

# Required variables
if [ -z "$DATABASE_URL" ]; then
  MISSING_VARS="$MISSING_VARS DATABASE_URL"
fi

if [ -z "$SESSION_SECRET" ]; then
  MISSING_VARS="$MISSING_VARS SESSION_SECRET"
fi

# API keys are now optional at startup - can be configured via Admin panel
if [ -z "$GROQ_API_KEY" ] && [ -z "$CUSTOM_OPENAI_API_KEY" ] && [ -z "$GEMINI_API_KEY" ]; then
  echo "INFO: No AI API keys set in environment"
  echo "      You can configure API keys in Admin > Settings after login"
fi

# Optional but recommended
if [ -z "$RESEND_API_KEY" ]; then
  echo "INFO: RESEND_API_KEY not set - configure in Admin panel for email features"
fi

if [ -z "$PAYSTACK_SECRET_KEY" ]; then
  echo "INFO: PAYSTACK_SECRET_KEY not set - configure in Admin panel for payments"
fi

# Check for missing required variables
if [ -n "$MISSING_VARS" ]; then
  echo ""
  echo "ERROR: Missing required environment variables:"
  for var in $MISSING_VARS; do
    echo "  - $var"
  done
  echo ""
  echo "Please set these variables and restart the container."
  echo "See .env.example for reference."
  exit 1
fi

echo ""
echo "Required environment variables are set."
echo ""

# Wait for database to be ready
echo "Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until PGPASSWORD="${PGPASSWORD:-}" psql -h "${PGHOST:-db}" -U "${PGUSER:-postgres}" -d "${PGDATABASE:-forexai}" -c "SELECT 1" > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "ERROR: Database not ready after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "  Attempt $RETRY_COUNT/$MAX_RETRIES - waiting..."
  sleep 2
done
echo "Database is ready!"

# Check if tables exist, if not run init script
echo "Checking database tables..."
TABLE_EXISTS=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "${PGHOST:-db}" -U "${PGUSER:-postgres}" -d "${PGDATABASE:-forexai}" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users');")

if [ "$TABLE_EXISTS" = "f" ]; then
  echo "Tables not found - initializing database..."
  if [ -f /app/scripts/init-db.sql ]; then
    PGPASSWORD="${PGPASSWORD:-}" psql -h "${PGHOST:-db}" -U "${PGUSER:-postgres}" -d "${PGDATABASE:-forexai}" -f /app/scripts/init-db.sql
    echo "Database initialized successfully!"
  else
    echo "WARNING: init-db.sql not found, tables will be created by ORM"
  fi
else
  echo "Database tables already exist."
fi

echo ""
echo "Starting Forex Edge..."
echo "=========================================="

# Execute the main command
exec "$@"
