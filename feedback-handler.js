// Feedback handler for WorldChain DeFi Bot
// Processes user feedback about protocol data accuracy

const fs = require('fs');
const path = require('path');
const dataManager = require('./data-manager');

// Configuration
const FEEDBACK_DIR = path.join(__dirname, 'data', 'feedback');
const ADMIN_CHAT_ID = process.env.DATA_SUBMISSIONS_ADMIN_CHAT_ID || '';

// Ensure feedback directory exists
if (!fs.existsSync(FEEDBACK_DIR)) {
  fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
}

/**
 * Handle user feedback
 * @param {Object} ctx - Telegram context
 * @param {string} feedbackText - Feedback text
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<boolean>} - Success status
 */
async function handleFeedback(ctx, feedbackText, metadata = {}) {
  try {
    if (!ctx || !ctx.from || !feedbackText) {
      return false;
    }
    
    const userId = ctx.from.id;
    const username = ctx.from.username || 'Anonymous';
    const timestamp = Date.now();
    const feedbackId = `${timestamp}-${userId}`;
    
    // Create feedback entry
    const feedback = {
      id: feedbackId,
      userId,
      username,
      text: feedbackText,
      timestamp,
      chatType: ctx.chat ? ctx.chat.type : 'unknown',
      metadata
    };
    
    // Store feedback
    await dataManager.storeUserFeedback(feedback);
    
    // Save to feedback file
    const feedbackFile = path.join(FEEDBACK_DIR, `${feedbackId}.json`);
    fs.writeFileSync(feedbackFile, JSON.stringify(feedback, null, 2), 'utf8');
    
    // Notify admin if configured
    if (ADMIN_CHAT_ID) {
      try {
        const bot = ctx.telegram;
        const adminMessage = 
          `📝 *New Feedback Received*\n\n` +
          `From: ${username} (${userId})\n` +
          `Type: ${metadata.type || 'General'}\n` +
          `Protocol: ${metadata.protocol || 'N/A'}\n\n` +
          `Message:\n${feedbackText}\n\n` +
          `ID: \`${feedbackId}\``;
        
        bot.sendMessage(ADMIN_CHAT_ID, adminMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Error notifying admin about feedback:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error handling feedback:', error);
    return false;
  }
}

/**
 * Parse feedback command
 * @param {string} text - Command text
 * @returns {Object} - Parsed feedback
 */
function parseFeedbackCommand(text) {
  // Remove command part
  const content = text.replace(/^\/feedback\s+/i, '').trim();
  
  if (!content) {
    return {
      valid: false,
      error: 'Please provide feedback content.'
    };
  }
  
  // Try to extract protocol name
  let protocol = null;
  let feedbackText = content;
  
  // Check for format: /feedback [Protocol Name]: Feedback text
  const protocolMatch = content.match(/^([^:]+):\s*(.+)$/);
  if (protocolMatch) {
    protocol = protocolMatch[1].trim();
    feedbackText = protocolMatch[2].trim();
  }
  
  return {
    valid: true,
    protocol,
    text: feedbackText,
    type: protocol ? 'Protocol Data' : 'General'
  };
}

module.exports = {
  handleFeedback,
  parseFeedbackCommand
};
