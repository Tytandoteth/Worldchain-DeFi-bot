// Conversation logger for WorldChain DeFi Bot
// Implements secure, privacy-compliant conversation tracking

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const LOGS_DIR = path.join(__dirname, 'data', 'conversation_logs');
const PRIVACY_NOTICE_SHOWN_KEY = 'privacy_notice_shown';
const LOG_ROTATION_DAYS = 7; // Rotate logs weekly
const DATA_RETENTION_DAYS = 90; // Store data for 90 days

// Ensure the logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// User session storage to track privacy notice
const userSessions = new Map();

/**
 * Generate a unique session ID for a user
 * @param {Object} user - User object from Telegram
 * @returns {string} - Anonymized session ID
 */
function generateSessionId(user) {
  if (!user || !user.id) return 'anonymous';
  
  // Create a one-way hash of the user ID for anonymization
  // This allows tracking conversations without storing identifiable info
  return crypto
    .createHash('sha256')
    .update(user.id.toString())
    .digest('hex')
    .substring(0, 16); // Use first 16 chars of hash
}

/**
 * Log a conversation entry
 * @param {Object} ctx - Telegram context
 * @param {string} messageType - Type of message (user_message, bot_response, command)
 * @param {string} content - Message content
 * @param {Object} metadata - Additional metadata about the interaction
 */
function logConversation(ctx, messageType, content, metadata = {}) {
  try {
    if (!ctx || !ctx.from) return;
    
    const timestamp = new Date().toISOString();
    const sessionId = generateSessionId(ctx.from);
    const chatType = ctx.chat ? ctx.chat.type : 'unknown';
    
    // Don't log private data like API keys or credentials
    const sanitizedContent = sanitizeContent(content);
    
    const logEntry = {
      timestamp,
      session_id: sessionId,
      message_type: messageType,
      chat_type: chatType,
      content: sanitizedContent,
      metadata: {
        ...metadata,
        is_bot: ctx.from.is_bot || false,
        language_code: ctx.from.language_code,
        chat_type: chatType
      }
    };
    
    // Generate filename based on date for easier rotation
    const date = new Date();
    const filename = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.jsonl`;
    const logPath = path.join(LOGS_DIR, filename);
    
    // Append to log file
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    
    // Perform log rotation and cleanup in the background
    if (Math.random() < 0.01) { // Only check 1% of the time to avoid performance impact
      setTimeout(() => cleanupOldLogs(), 0);
    }
  } catch (error) {
    console.error('Error logging conversation:', error);
  }
}

/**
 * Sanitize content to remove sensitive information
 * @param {string} content - Content to sanitize
 * @returns {string} - Sanitized content
 */
function sanitizeContent(content) {
  if (!content || typeof content !== 'string') return '';
  
  // Remove potential API keys, tokens, passwords, etc.
  return content
    .replace(/[A-Za-z0-9-_]{20,}/g, '[REDACTED]') // Potential API keys/tokens
    .replace(/password\s*[:=]\s*\S+/gi, 'password: [REDACTED]')
    .replace(/api[-_]?key\s*[:=]\s*\S+/gi, 'api_key: [REDACTED]')
    .replace(/token\s*[:=]\s*\S+/gi, 'token: [REDACTED]')
    .replace(/secret\s*[:=]\s*\S+/gi, 'secret: [REDACTED]');
}

/**
 * Remove log files older than DATA_RETENTION_DAYS
 */
function cleanupOldLogs() {
  try {
    const files = fs.readdirSync(LOGS_DIR);
    const now = new Date();
    
    files.forEach(file => {
      if (!file.endsWith('.jsonl')) return;
      
      const filePath = path.join(LOGS_DIR, file);
      const stats = fs.statSync(filePath);
      const fileDate = new Date(stats.mtime);
      const diffDays = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays > DATA_RETENTION_DAYS) {
        fs.unlinkSync(filePath);
        console.log(`Removed old log file: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up old logs:', error);
  }
}

/**
 * Check if the privacy notice has been shown to a user
 * @param {Object} user - User object from Telegram
 * @returns {boolean} - Whether the notice has been shown
 */
function hasShownPrivacyNotice(user) {
  if (!user || !user.id) return false;
  const sessionId = generateSessionId(user);
  return userSessions.get(`${sessionId}_${PRIVACY_NOTICE_SHOWN_KEY}`) === true;
}

/**
 * Mark that the privacy notice has been shown to a user
 * @param {Object} user - User object from Telegram
 */
function markPrivacyNoticeShown(user) {
  if (!user || !user.id) return;
  const sessionId = generateSessionId(user);
  userSessions.set(`${sessionId}_${PRIVACY_NOTICE_SHOWN_KEY}`, true);
}

/**
 * Get the privacy notice text
 * @returns {string} - Privacy notice text
 */
function getPrivacyNotice() {
  return 'Privacy Notice: This bot collects anonymized conversation data to improve responses. ' +
    'No personally identifiable information is stored, and all data is automatically deleted after 90 days. ' +
    'You can use /privacy at any time to learn more about our data practices.';
}

module.exports = {
  logConversation,
  hasShownPrivacyNotice,
  markPrivacyNoticeShown,
  getPrivacyNotice
};
