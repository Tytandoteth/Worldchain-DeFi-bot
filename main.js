// Main entry point for WorldChain DeFi Bot with enhanced data accuracy
const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const defiLlama = require('./defillama-api');
const logger = require('./conversation-logger');
const dataManager = require('./data-manager');
const registerFeedbackCommand = require('./commands/feedback');
const registerAdminCommands = require('./commands/admin');

// Initialize environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN environment variable is not set');
  process.exit(1);
}

// Initialize the Telegram bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

/**
 * Set up the bot with our existing commands
 * and improved data handling
 */
async function setupBot() {
  console.log('Starting WorldChain DeFi Bot with enhanced data accuracy...');
  
  // Initialize data manager first
  try {
    await dataManager.initialize();
    console.log('Data manager initialized successfully');
  } catch (error) {
    console.error('Failed to initialize data manager:', error);
    // Continue anyway - we'll fall back to local data
  }
  
  // Import command handlers from original implementation
  const originalBot = require('./railway-deploy');
  
  // Register our new commands for data accuracy
  registerFeedbackCommand(bot);
  registerAdminCommands(bot);
  
  // Replace findProtocol with our enhanced version
  originalBot.findProtocol = (name) => {
    // Try to find from data manager first
    const protocol = dataManager.findProtocol(name);
    if (protocol) return protocol;
    
    // Fall back to original implementation if needed
    return originalBot.findProtocol(name);
  };
  
  // Format TVL consistently
  global.formatTVL = (tvl) => {
    return dataManager.formatTVL(tvl);
  };
  
  // Add global method for trending protocols
  global.getTrendingProtocols = (limit) => {
    return dataManager.getTrendingProtocols(limit);
  };
  
  // Error handling
  bot.catch((err, ctx) => {
    console.error('Telegram bot error:', err);
    ctx.reply('An error occurred. Please try again later.');
    logger.logConversation(ctx, 'error', err.message, { error_type: err.name });
  });
  
  // Start the bot
  await bot.launch();
  console.log('Bot is running with enhanced data accuracy!');
  
  // Enable graceful stop
  process.once('SIGINT', () => {
    console.log('Shutting down...');
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    console.log('Shutting down...');
    bot.stop('SIGTERM');
  });
}

// Run the bot
setupBot().catch(error => {
  console.error('Fatal error during bot startup:', error);
  process.exit(1);
});
