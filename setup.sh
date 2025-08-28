#!/bin/bash

# Bet Tracker Pro - Complete Setup Script
echo "🎯 Setting up Bet Tracker Pro..."
echo "=================================="

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: Please run this script from the bet-tracker-extension directory"
    exit 1
fi

# 1. Check backend dependencies
echo ""
echo "📦 Checking backend dependencies..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
else
    echo "✅ Backend dependencies already installed"
fi

# 2. Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env file from template..."
    cp .env.example .env
    echo "📝 Please edit backend/.env and add your Gemini API key"
fi

# 3. Start backend (if not already running)
echo ""
echo "🚀 Starting backend server..."
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "Starting backend on port 3000..."
    npm start &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    
    # Wait for backend to start
    echo "Waiting for backend to start..."
    for i in {1..10}; do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            echo "✅ Backend started successfully!"
            break
        fi
        sleep 1
        echo "Waiting... ($i/10)"
    done
else
    echo "✅ Backend already running on port 3000"
fi

cd ..

# 4. Test backend
echo ""
echo "🧪 Testing backend API..."
HEALTH_CHECK=$(curl -s http://localhost:3000/health)
if echo "$HEALTH_CHECK" | grep -q "success"; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# 5. Test demo authentication
echo "🔑 Testing demo authentication..."
AUTH_TEST=$(curl -s -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"demo@bettracker.com","password":"demo123"}')

if echo "$AUTH_TEST" | grep -q "token"; then
    echo "✅ Demo authentication working"
else
    echo "❌ Demo authentication failed"
    exit 1
fi

# 6. Extension setup instructions
echo ""
echo "📋 Chrome Extension Setup:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select this directory: $(pwd)"
echo "5. The extension should appear in your toolbar"
echo ""

# 7. Usage instructions
echo "🎯 How to Use:"
echo "1. Click the extension icon in Chrome toolbar"
echo "2. Click 'Sign In' and choose demo account"
echo "3. Go to any betting website"
echo "4. Click 'Capture Bet Slip' in the extension"
echo "5. Select a bet slip area and confirm"
echo ""

# 8. API Key setup (if needed)
if grep -q "your-gemini-api-key-here" backend/.env; then
    echo "⚠️  IMPORTANT: For real AI processing, you need to:"
    echo "   1. Get a Gemini API key: https://aistudio.google.com/app/apikey"
    echo "   2. Edit backend/.env and replace 'your-gemini-api-key-here'"
    echo "   3. Restart the backend: cd backend && npm start"
    echo ""
    echo "   Without a real API key, the system will return mock data."
fi

echo "🎉 Setup complete!"
echo ""
echo "📊 System Status:"
echo "✅ Backend API: http://localhost:3000"
echo "✅ Health Check: http://localhost:3000/health"
echo "✅ Demo User: demo@bettracker.com / demo123"
echo ""
echo "🚀 Ready to track bets!"