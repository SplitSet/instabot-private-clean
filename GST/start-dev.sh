#!/bin/bash
echo "🚀 Starting Shopify Bundle App in development mode..."

# Function to handle cleanup
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
echo "📦 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servers started successfully!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:5000"
echo "📊 Health:   http://localhost:5000/health"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
