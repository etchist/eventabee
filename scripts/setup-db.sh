#!/bin/bash

# Setup script for Eventabee database

echo "🚀 Setting up Eventabee database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Starting database services..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is ready
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "⏳ PostgreSQL is starting up..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run migrations
echo "📊 Running database migrations..."
npx prisma migrate dev

echo "✅ Database setup complete!"
echo ""
echo "You can now:"
echo "  - Run 'npx prisma studio' to view your database"
echo "  - Run 'npm run dev' to start the application"
echo "  - Run 'docker-compose down' to stop the database"