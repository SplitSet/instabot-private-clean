#!/bin/bash
echo "🚀 Starting Shopify Bundle App in production mode..."

# Build frontend
echo "🏗️  Building frontend..."
cd frontend
npm run build
cd ..

# Start backend
echo "📦 Starting backend server..."
cd backend
npm start
