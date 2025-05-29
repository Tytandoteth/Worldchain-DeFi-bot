// Railway deployment script
// This file directly includes the necessary modules without requiring a complex build setup

const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Initialize environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN environment variable is not set');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  process.exit(1);
}

// Initialize the Telegram bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Basic command handlers
bot.start((ctx) => {
  ctx.reply("Hi! I'm WorldChain DeFi Bot. Ask me anything about Worldchain, DeFi protocols, and mini apps! You can also submit new data by starting a private chat with me.");
});

// Help command
bot.help((ctx) => {
  const helpText = `
*WorldChain DeFi Bot - Worldchain Assistant*

I can help you with information about Worldchain protocols, DeFi stats, and mini apps.

*Available Commands:*
/compare - Compare two protocols (e.g., /compare Morpho Magnify)
/stats - Get detailed stats about a protocol (e.g., /stats Magnify)
/miniapps - Explore Worldchain mini apps (e.g., /miniapps gaming)
/trending - See trending protocols on Worldchain
/submit - Submit new protocol data for review (use in private chat)
/status - Check the status of your data submission

Or just ask me anything about Worldchain and DeFi!
`;
  ctx.reply(helpText, { parse_mode: 'Markdown' });
});

// Compare command
bot.command('compare', async (ctx) => {
  // Extract arguments from the command
  const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  const args = message.split(' ').slice(1);
  
  if (args.length < 2) {
    ctx.reply('Please specify two protocols to compare. Example: /compare Morpho Magnify');
    return;
  }
  
  await ctx.replyWithChatAction("typing");
  
  // Simple response since we don't have full RAG capabilities in this simplified version
  ctx.reply(`I would compare ${args[0]} and ${args[1]} protocols for you, but this is a simplified version running on Railway. Full functionality will be available soon!`);
});

// Stats command
bot.command('stats', async (ctx) => {
  const protocol = ctx.message && 'text' in ctx.message ? ctx.message.text.split(' ').slice(1).join(' ') : '';
  
  if (!protocol) {
    ctx.reply('Please specify a protocol. Example: /stats Magnify');
    return;
  }
  
  await ctx.replyWithChatAction("typing");
  ctx.reply(`I would show you detailed stats for ${protocol}, but this is a simplified version running on Railway. Full functionality will be available soon!`);
});

// Mini apps command
bot.command('miniapps', async (ctx) => {
  const category = ctx.message && 'text' in ctx.message ? ctx.message.text.split(' ').slice(1).join(' ') : '';
  
  await ctx.replyWithChatAction("typing");
  ctx.reply(`I would show you information about WorldChain mini apps${category ? ` in the ${category} category` : ''}, but this is a simplified version running on Railway. Full functionality will be available soon!`);
});

// Trending command
bot.command('trending', async (ctx) => {
  await ctx.replyWithChatAction("typing");
  ctx.reply('I would show you trending protocols on WorldChain, but this is a simplified version running on Railway. Full functionality will be available soon!');
});

// Data submission command
bot.command('submit', async (ctx) => {
  // Check if in private chat
  if (!ctx.chat || ctx.chat.type !== 'private') {
    ctx.reply('Please use the /submit command in a private chat with me for data security.');
    return;
  }
  
  if (!ctx.message || !('text' in ctx.message)) {
    ctx.reply('Error processing your submission. Please try again with text content.');
    return;
  }
  
  const args = ctx.message.text.split(' ').slice(1).join(' ');
  
  if (!args) {
    ctx.reply('To submit protocol data, use: `/submit Protocol Name: Your detailed information`\n\nYour submission will be reviewed by moderators before being added to the database.');
    return;
  }
  
  // Store the submission in a pending queue
  const submissionId = Date.now().toString();
  const submission = {
    id: submissionId,
    userId: ctx.from?.id || 0,
    username: ctx.from?.username || 'Anonymous',
    content: args,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
  
  // Log the submission (in a real implementation, this would be saved to a database)
  console.log('New data submission:', submission);
  
  // Respond to the user
  ctx.reply(`Thank you for your submission! It has been received and will be reviewed by our team.\n\nSubmission ID: ${submissionId}`);
});

// Check submission status
bot.command('status', async (ctx) => {
  if (!ctx.chat || ctx.chat.type !== 'private') {
    ctx.reply('Please use the /status command in a private chat with me.');
    return;
  }
  
  if (!ctx.message || !('text' in ctx.message)) {
    ctx.reply('Error processing your request. Please try again with text content.');
    return;
  }
  
  const submissionId = ctx.message.text.split(' ').slice(1).join(' ');
  
  if (!submissionId) {
    ctx.reply('Please provide a submission ID. Example: `/status 1234567890`');
    return;
  }
  
  // In a real implementation, this would check the database
  ctx.reply(`Submission ID ${submissionId} is currently pending review. You will be notified when it's approved.`);
});

// Handle text messages
bot.on("text", async (ctx) => {
  try {
    const text = ctx.message.text;
    
    // Simple response for the Railway deployment
    await ctx.replyWithChatAction("typing");
    
    // Wait a moment to simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    ctx.reply(`Thanks for your message! This is a simplified version of the WorldChain DeFi Bot running on Railway. Full functionality, including responses to questions like "${text}", will be available soon!`);
  } catch (error) {
    console.error('Error handling message:', error);
    ctx.reply('Sorry, there was an error processing your request. Please try again later.');
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Telegram bot error:', err);
  ctx.reply('An error occurred. Please try again later.');
});

// Start the bot
bot.launch()
  .then(() => {
    console.log('WorldChain DeFi Bot started successfully!');
  })
  .catch((err) => {
    console.error('Failed to start bot:', err);
    process.exit(1);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
