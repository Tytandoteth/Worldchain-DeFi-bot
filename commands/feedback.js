// Feedback command handler for WorldChain DeFi Bot
const feedbackHandler = require('../feedback-handler');
const logger = require('../conversation-logger');

/**
 * Register the feedback command with the bot
 * @param {Object} bot - Telegram bot instance
 */
function registerFeedbackCommand(bot) {
  // Feedback command for data accuracy
  bot.command('feedback', async (ctx) => {
    // Log the feedback command
    const commandText = ctx.message && 'text' in ctx.message ? ctx.message.text : '/feedback';
    logger.logConversation(ctx, 'command', commandText, { command: 'feedback' });
    
    // Parse feedback
    const parsedFeedback = feedbackHandler.parseFeedbackCommand(commandText);
    
    if (!parsedFeedback.valid) {
      const errorMsg = parsedFeedback.error || 'Please provide feedback in the format: /feedback [Protocol Name]: Your feedback';
      ctx.reply(errorMsg);
      logger.logConversation(ctx, 'bot_response', errorMsg, { command: 'feedback', error: 'invalid_format' });
      return;
    }
    
    // Process feedback
    try {
      await feedbackHandler.handleFeedback(ctx, parsedFeedback.text, {
        type: parsedFeedback.type,
        protocol: parsedFeedback.protocol
      });
      
      const responseMsg = `Thank you for your feedback! Your input helps us improve data accuracy.${
        parsedFeedback.protocol ? `\n\nWe'll review the information about ${parsedFeedback.protocol} and update our database accordingly.` : ''
      }`;
      
      ctx.reply(responseMsg);
      logger.logConversation(ctx, 'bot_response', responseMsg, { 
        command: 'feedback',
        feedback_type: parsedFeedback.type,
        protocol: parsedFeedback.protocol
      });
    } catch (error) {
      console.error('Error handling feedback:', error);
      const errorMsg = 'Sorry, there was an error processing your feedback. Please try again later.';
      ctx.reply(errorMsg);
      logger.logConversation(ctx, 'bot_response', errorMsg, { command: 'feedback', error: 'processing_error' });
    }
  });
}

module.exports = registerFeedbackCommand;
