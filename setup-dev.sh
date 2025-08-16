#!/bin/bash

# Pedal Playground Development Setup
# This script sets up the complete development environment

echo "🚀 Setting up Pedal Playground development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are available"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Set up database
echo "🗃️  Setting up database..."
npm run db:setup

if [ $? -ne 0 ]; then
    echo "❌ Failed to set up database"
    exit 1
fi

# Seed database with existing data
echo "🌱 Seeding database..."
npm run db:seed

if [ $? -ne 0 ]; then
    echo "❌ Failed to seed database"
    exit 1
fi

echo "🎉 Development environment setup complete!"
echo ""
echo "📋 Available commands:"
echo "  npm start              - Start development server"
echo "  npm run build          - Build for production"
echo "  npm run db:query       - Open database shell"
echo "  npm run db:export      - Export database to JSON"
echo "  npm run db:reset       - Reset and reseed database"
echo ""
echo "🔧 Database management:"
echo "  sqlite3 database/pedalplayground.db"
echo ""
echo "🌐 Ready to start developing!"
echo "Run 'npm start' to begin."