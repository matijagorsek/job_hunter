#!/bin/bash
set -e

echo "🎯 JobRadar Bot — Setup Script"
echo "================================"
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Run: brew install node"; exit 1; }
command -v cloudflared >/dev/null 2>&1 || { echo "❌ cloudflared not found. Run: brew install cloudflared"; exit 1; }

echo "✅ Prerequisites OK"
echo ""

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install
echo ""

# Check .env
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Created .env from template. Please edit it with your keys:"
    echo "    nano .env"
    echo ""
    echo "   You need:"
    echo "   1. Telegram bot token (from @BotFather)"
    echo "   2. Anthropic API key (your private one)"
    echo "   3. Your Cloudflare tunnel domain"
    echo ""
    exit 0
fi

echo "✅ .env exists"
echo ""

# Create logs directory
mkdir -p logs

# Setup LaunchAgents (optional)
read -p "🔄 Auto-start bot on login? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    USER_HOME=$(eval echo ~$USER)
    PROJECT_DIR=$(pwd)
    
    # Update plist files with actual paths
    PLIST_DIR="$USER_HOME/Library/LaunchAgents"
    mkdir -p "$PLIST_DIR"
    
    # Bot plist
    sed "s|YOUR_USER|$USER|g; s|/Users/$USER/Projects/jobrador-bot|$PROJECT_DIR|g" \
        launchd/com.jobrador.bot.plist > "$PLIST_DIR/com.jobrador.bot.plist"
    
    # Tunnel plist  
    sed "s|YOUR_USER|$USER|g; s|/Users/$USER/Projects/jobrador-bot|$PROJECT_DIR|g" \
        launchd/com.jobrador.tunnel.plist > "$PLIST_DIR/com.jobrador.tunnel.plist"
    
    echo "✅ LaunchAgents installed"
    echo "   Load now with:"
    echo "   launchctl load $PLIST_DIR/com.jobrador.tunnel.plist"
    echo "   launchctl load $PLIST_DIR/com.jobrador.bot.plist"
fi

echo ""
echo "🚀 Setup complete! To start manually:"
echo ""
echo "   # Terminal 1: Tunnel"
echo "   cloudflared tunnel run jobrador"
echo ""
echo "   # Terminal 2: Bot"  
echo "   npm start"
echo ""
echo "Then open Telegram and send /start to your bot!"
