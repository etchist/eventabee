# Database Setup Guide

This guide explains how to set up the Prisma database for the Eventabee project.

## Prerequisites

- Docker and Docker Compose installed (for local development)
- Node.js installed

## Local Development Setup

### 1. Start the Database Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379

### 2. Environment Variables

The `.env` file should already be configured with:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eventabee"
REDIS_URL="redis://localhost:6379"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
NODE_ENV=development
BROWSERLESS_URL="https://chrome.browserless.io"
```

**Important**: The ENCRYPTION_KEY shown is for development only. Generate a secure 256-bit key for production.

### 3. Generate Prisma Client

The Prisma client has already been generated to `/generated/prisma`:

```bash
npx prisma generate
```

### 4. Run Database Migrations

Apply the database schema:

```bash
npx prisma migrate dev
```

### 5. View Database (Optional)

To explore your database visually:

```bash
npx prisma studio
```

## Database Schema

The database includes the following models:

- **Shop**: Store configuration with encrypted credentials
- **Subscription**: Billing subscriptions with usage tracking
- **EventMapping**: Maps Shopify events to Segment/Facebook events
- **EventStats**: Analytics for event processing
- **EventLog**: Recent event logs for debugging
- **Session**: Shopify OAuth sessions

## Production Setup

For production:

1. Use a managed PostgreSQL service (e.g., AWS RDS, Google Cloud SQL, etc.)
2. Use a managed Redis service (e.g., AWS ElastiCache, Redis Cloud, etc.)
3. Generate a secure 256-bit encryption key
4. Set all environment variables properly
5. Run migrations: `npx prisma migrate deploy`

## Troubleshooting

### Database Connection Issues

If you can't connect to the database:

1. Ensure Docker is running: `docker ps`
2. Check if containers are up: `docker-compose ps`
3. View logs: `docker-compose logs postgres`

### Migration Issues

If migrations fail:

1. Reset the database: `npx prisma migrate reset`
2. Check the schema: `npx prisma validate`
3. Generate fresh migrations: `npx prisma migrate dev`