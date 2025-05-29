// Bootstrap file for WorldChain DeFi Bot
// Handles initialization of data manager and bot startup

const dataManager = require('./data-manager');
const registerFeedbackCommand = require('./commands/feedback');
const registerAdminCommands = require('./commands/admin');

/**
 * Initialize the bot with enhanced data capabilities
 * @param {Object} bot - Telegram bot instance 
 * @returns {Promise<void>}
 */
async function bootstrapBot(bot) {
  console.log('Initializing data manager...');
  
  try {
    // Initialize data manager first to ensure data is available
    await dataManager.initialize();
    console.log('Data manager initialized successfully');
    
    // Register feedback command
    registerFeedbackCommand(bot);
    
    // Register admin commands
    registerAdminCommands(bot);
    
    return true;
  } catch (error) {
    console.error('Error bootstrapping bot:', error);
    return false;
  }
}

/**
 * Replace old protocol lookup function with enhanced version
 * @param {string} name - Protocol name to search for
 * @returns {Object|null} - Protocol data or null if not found
 */
function findProtocol(name) {
  return dataManager.findProtocol(name);
}

/**
 * Format TVL value with consistent representation
 * @param {number|string} tvl - TVL value to format
 * @returns {string} - Formatted TVL string
 */
function formatTVL(tvl) {
  return dataManager.formatTVL(tvl);
}

/**
 * Get trending protocols
 * @param {number} limit - Maximum number of protocols to return
 * @returns {Array} - Array of protocol objects
 */
function getTrendingProtocols(limit = 5) {
  return dataManager.getTrendingProtocols(limit);
}

// Export bootstrap and utility functions
module.exports = {
  bootstrapBot,
  findProtocol,
  formatTVL,
  getTrendingProtocols
};
