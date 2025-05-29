// Admin commands for WorldChain DeFi Bot
const dataManager = require('../data-manager');
const logger = require('../conversation-logger');

/**
 * Register the admin commands with the bot
 * @param {Object} bot - Telegram bot instance
 */
function registerAdminCommands(bot) {
  // Cache status command
  bot.command('cache', async (ctx) => {
    // Only respond in private chats for security
    if (ctx.chat.type !== 'private') {
      return;
    }
    
    // Log the cache command
    logger.logConversation(ctx, 'command', '/cache', { command: 'cache' });
    
    const stats = dataManager.getCacheStats();
    const responseMsg = 
      `*Data Cache Status*\n\n` +
      `Protocols: ${stats.protocolCount}\n` +
      `Last Updated: ${stats.lastUpdated}\n` +
      `Cache Version: ${stats.version}\n` +
      `Last Refresh: ${stats.lastRefreshAttempt}\n` +
      `Refresh Success: ${stats.refreshSuccess ? '✅' : '❌'}\n` +
      `Cache Age: ${Math.floor(stats.cacheAge / (60 * 1000))} minutes`;
    
    ctx.reply(responseMsg, { parse_mode: 'Markdown' });
    logger.logConversation(ctx, 'bot_response', responseMsg, { command: 'cache' });
  });

  // Manually refresh data
  bot.command('refresh', async (ctx) => {
    // Only respond in private chats for security
    if (ctx.chat.type !== 'private') {
      return;
    }
    
    // Log the refresh command
    logger.logConversation(ctx, 'command', '/refresh', { command: 'refresh' });
    
    ctx.reply('Refreshing protocol data... This may take a moment.');
    
    try {
      const success = await dataManager.refreshProtocolData();
      
      if (success) {
        const stats = dataManager.getCacheStats();
        const responseMsg = 
          `✅ *Data Refresh Successful*\n\n` +
          `Updated Protocols: ${stats.protocolCount}\n` +
          `Last Updated: ${stats.lastUpdated}\n` +
          `Cache Version: ${stats.version}`;
        
        ctx.reply(responseMsg, { parse_mode: 'Markdown' });
        logger.logConversation(ctx, 'bot_response', responseMsg, { command: 'refresh', status: 'success' });
      } else {
        ctx.reply('❌ Data refresh failed. Please check server logs for details.');
        logger.logConversation(ctx, 'bot_response', 'Data refresh failed', { command: 'refresh', status: 'failed' });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      ctx.reply('❌ Error refreshing data. Please try again later.');
      logger.logConversation(ctx, 'bot_response', 'Error refreshing data', { command: 'refresh', status: 'error' });
    }
  });
}

module.exports = registerAdminCommands;
