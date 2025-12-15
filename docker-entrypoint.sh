#!/bin/sh
set -e

echo "=========================================="
echo "ForexAI - Environment Validation"
echo "=========================================="

MISSING_VARS=""

# Required variables
if [ -z "$DATABASE_URL" ]; then
  MISSING_VARS="$MISSING_VARS DATABASE_URL"
fi

if [ -z "$SESSION_SECRET" ]; then
  MISSING_VARS="$MISSING_VARS SESSION_SECRET"
fi

if [ -z "$GROQ_API_KEY" ] && [ -z "$CUSTOM_OPENAI_API_KEY" ]; then
  MISSING_VARS="$MISSING_VARS GROQ_API_KEY_or_CUSTOM_OPENAI_API_KEY"
fi

# Optional but recommended
if [ -z "$RESEND_API_KEY" ]; then
  echo "WARNING: RESEND_API_KEY not set - email features will not work"
fi

if [ -z "$PAYSTACK_SECRET_KEY" ]; then
  echo "WARNING: PAYSTACK_SECRET_KEY not set - payment features will not work"
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

echo "All required environment variables are set."
echo "Starting ForexAI..."
echo "=========================================="

# Execute the main command
exec "$@"
