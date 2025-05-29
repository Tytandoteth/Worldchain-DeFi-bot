#!/bin/bash
# Simple build script for Railway deployment

# Build core package first
echo "Building core package..."
cd packages/core
npm run build
if [ $? -ne 0 ]; then
  echo "Core package build failed"
  exit 1
fi

# Then build the telegram bot
echo "Building telegram bot package..."
cd ../telegram-bot
npm run build
if [ $? -ne 0 ]; then
  echo "Telegram bot package build failed"
  exit 1
fi

echo "Build completed successfully"
exit 0
