# Forex Edge Docker Deployment Guide

This guide explains how to deploy Forex Edge to your own server using Docker.

## Prerequisites

- Docker and Docker Compose installed on your server
- Git access to clone the repository
- API keys for at least one AI provider (Groq recommended) - can be added via Admin panel after deployment

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd forexai
```

### 2. Create Environment File

The app automatically looks for environment files in this order:
1. `/root/forex.env` (recommended for production servers)
2. `.env` in the project directory

**Option A: Use /root/forex.env (Recommended for Production)**

```bash
sudo nano /root/forex.env
```

**Option B: Use project .env file**

```bash
cp .env.example .env
```

Edit your environment file with these values:

```bash
# Required - Generate with: openssl rand -hex 32
SESSION_SECRET=your_generated_secret_here

# Database password (change this!)
POSTGRES_PASSWORD=your_secure_db_password

# Admin email(s)
ADMIN_EMAILS=admin@yourdomain.com

# API keys - OPTIONAL here, can be added via Admin panel instead
# GROQ_API_KEY=gsk_your_groq_key
# RESEND_API_KEY=re_your_resend_key
# PAYSTACK_SECRET_KEY=sk_live_your_paystack_key
```

**Note:** API keys can be added either:
1. In the `.env` file (before deployment)
2. Via Admin > Settings > Configure API Keys (after deployment)

### 3. Build and Start

```bash
docker-compose up -d --build
```

The app will be available at `http://your-server:5000`

### 4. Check Logs

```bash
# All services
docker-compose logs -f

# Just the app
docker-compose logs -f app
```

## Database Migration

If you're migrating data from Replit:

### Export from Replit

1. Go to your Replit project
2. Open the Database tab
3. Export your data as SQL or use pg_dump

### Import to Docker

```bash
# Copy your export file
docker cp backup.sql forexai_db_1:/tmp/

# Import
docker-compose exec db psql -U postgres -d forexai -f /tmp/backup.sql
```

## Configuration

### AI Providers

The app supports multiple AI providers. You can configure API keys in two ways:

**Option 1: Environment Variables**
Set in your `.env` file before deployment:

| Provider | Environment Variable | Recommended |
|----------|---------------------|-------------|
| Groq | `GROQ_API_KEY` | Yes (fast, reliable) |
| OpenAI | `CUSTOM_OPENAI_API_KEY` | Yes (high quality) |
| Gemini | `GEMINI_API_KEY` | Yes (good alternative) |

**Option 2: Admin Panel (Recommended for Docker)**
1. Start the app without API keys
2. Log in as admin
3. Go to Admin > Settings > Configure API Keys
4. Enter your API keys - they are encrypted and stored securely

You can switch providers in the Admin Settings without restarting.

### Optional Features

| Feature | Environment Variable | Purpose |
|---------|---------------------|---------|
| Email | `RESEND_API_KEY` | Email notifications |
| Payments | `PAYSTACK_SECRET_KEY` | Credit purchases (ZAR) |

## Useful Commands

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes database!)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build

# View database
docker-compose exec db psql -U postgres -d forexai

# Backup database
docker-compose exec db pg_dump -U postgres forexai > backup_$(date +%Y%m%d).sql
```

## Production Recommendations

### Reverse Proxy (Nginx)

Add SSL/TLS with nginx:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### External Database

For production, consider using a managed PostgreSQL service:

1. Update `DATABASE_URL` in your `.env`
2. Remove the `db` service from `docker-compose.yml`
3. Remove the `depends_on` section from the `app` service

## Troubleshooting

### Container won't start

Check environment variables are set:
```bash
docker-compose config
```

### Database connection errors

Ensure the database is healthy:
```bash
docker-compose ps
docker-compose logs db
```

### AI analysis not working

Verify your API key:
```bash
docker-compose exec app printenv | grep API_KEY
```

## Health Check

The app exposes a health endpoint:
```bash
curl http://localhost:5000/api/health
```
