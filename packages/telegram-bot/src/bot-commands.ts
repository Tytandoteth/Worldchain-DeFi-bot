import { Context, Telegraf } from "telegraf";
import { askGPT } from "../../core/dist/openai.js";
import { createRAG } from "../../core/dist/simple-rag.js";

/**
 * Register all command handlers for the Telegram bot
 * @param bot The Telegraf bot instance
 * @param ragSystem The RAG system instance for retrieving context
 */
export function registerBotCommands(bot: Telegraf, ragSystem: any): void {
  // Compare command for protocol comparison
  bot.command('compare', async (ctx: Context) => {
    // Extract arguments from the command
    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const args = message.split(' ').slice(1);
    
    if (args.length < 2) {
      ctx.reply('Please specify two protocols to compare. Example: /compare Morpho Magnify');
      return;
    }
    
    await ctx.replyWithChatAction("typing");
    
    // Build a comparison query
    const query = `Compare ${args.join(' and ')} protocols on Worldchain`;
    
    // Use the existing RAG system to find relevant documents for comparison
    const relevantDocs = await ragSystem.findRelevantDocuments(query, 5);
    const context = ragSystem.formatContext(relevantDocs);
    
    const answer = await askGPT(
      query,
      `You are MAGI AI comparing Worldchain protocols. Use the following context to create a detailed comparison: ${context}`
    );
    
    ctx.reply(answer, { parse_mode: 'Markdown' });
  });
  
  // Stats command for detailed protocol statistics
  bot.command('stats', async (ctx: Context) => {
    // Extract the protocol name from the command
    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const protocol = message.split(' ').slice(1).join(' ');
    
    if (!protocol) {
      ctx.reply('Please specify a protocol. Example: /stats Magnify');
      return;
    }
    
    await ctx.replyWithChatAction("typing");
    
    const query = `Detailed statistics for ${protocol} on Worldchain`;
    const relevantDocs = await ragSystem.findRelevantDocuments(query, 3);
    const context = ragSystem.formatContext(relevantDocs);
    
    const answer = await askGPT(
      query,
      `You are MAGI AI providing detailed statistics about ${protocol}. Include TVL, user metrics, and other key statistics from the following context: ${context}`
    );
    
    ctx.reply(answer, { parse_mode: 'Markdown' });
  });
  
  // Mini apps command to explore Worldchain mini apps
  bot.command('miniapps', async (ctx: Context) => {
    // Extract optional category from the command
    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const category = message.split(' ').slice(1).join(' ');
    
    await ctx.replyWithChatAction("typing");
    
    const query = category 
      ? `List of ${category} mini apps on Worldchain` 
      : 'Overview of mini apps on Worldchain';
      
    const relevantDocs = await ragSystem.findRelevantDocuments(query, 3);
    const context = ragSystem.formatContext(relevantDocs);
    
    const answer = await askGPT(
      query,
      `You are MAGI AI providing information about Worldchain mini apps. ${category ? `Focus on ${category} category.` : 'Give an overview of different categories.'} Use this context: ${context}`
    );
    
    ctx.reply(answer, { parse_mode: 'Markdown' });
  });
  
  // Trending command to show what's popular on Worldchain
  bot.command('trending', async (ctx: Context) => {
    await ctx.replyWithChatAction("typing");
    
    const query = 'Top trending protocols on Worldchain by TVL and growth';
    const relevantDocs = await ragSystem.findRelevantDocuments(query, 3);
    const context = ragSystem.formatContext(relevantDocs);
    
    const answer = await askGPT(
      query,
      `You are MAGI AI providing information about trending protocols on Worldchain. Focus on recent growth, TVL changes, and user activity. Use this context: ${context}`
    );
    
    ctx.reply(answer, { parse_mode: 'Markdown' });
  });
  
  // Help command with expanded functionality
  bot.help((ctx: Context) => {
    const helpText = `
*MAGI AI Bot - Worldchain Assistant*

I can help you with information about Worldchain protocols, DeFi stats, and mini apps.

*Available Commands:*
• /start - Start a conversation with me
• /help - Show this help message
• /compare [protocol1] [protocol2] - Compare two Worldchain protocols
• /stats [protocol] - Get detailed stats for a protocol
• /miniapps [category] - List mini apps, optionally filtered by category
• /trending - Show trending protocols on Worldchain

You can also just ask me questions in natural language about Worldchain and its ecosystem!
    `;
    
    ctx.reply(helpText, { parse_mode: 'Markdown' });
  });
}
