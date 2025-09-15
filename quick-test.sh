#!/bin/bash

# Quick Test Script - Get InstaBot running in 2 minutes!

echo "🚀 Quick InstaBot Setup for Testing"
echo "=================================="

# 1. Setup environment if not done
if [ ! -f .env ]; then
    echo "📝 Setting up environment..."
    ./setup.sh
else
    echo "✅ Environment already configured"
fi

# 2. Start database services
echo "🗄️  Starting database services..."
docker-compose up -d mongodb redis
sleep 5

# 3. Install dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "🎉 Ready to test!"
echo ""
echo "Next steps:"
echo "1. Start backend:  cd backend && npm run dev"
echo "2. Start frontend: cd frontend && npm run dev"
echo "3. Open: http://localhost:3000"
echo ""
echo "For guided testing: ./test-with-real-account.sh"
