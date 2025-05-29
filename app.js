// Main entry point for Railway deployment
import { startBot } from './packages/telegram-bot/dist/index.js';

// Start the bot
startBot().catch(error => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});
