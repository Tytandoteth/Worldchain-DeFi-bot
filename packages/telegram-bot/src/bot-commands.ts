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
      `You are WorldChain DeFi Bot comparing Worldchain protocols. Use the following context to create a detailed comparison: ${context}`
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
      `You are WorldChain DeFi Bot providing detailed statistics about ${protocol}. Include TVL, user metrics, and other key statistics from the following context: ${context}`
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
      `You are WorldChain DeFi Bot providing information about Worldchain mini apps. ${category ? `Focus on ${category} category.` : 'Give an overview of different categories.'} Use this context: ${context}`
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
      `You are WorldChain DeFi Bot providing information about trending protocols on Worldchain. Focus on recent growth, TVL changes, and user activity. Use this context: ${context}`
    );
    
    ctx.reply(answer, { parse_mode: 'Markdown' });
  });
  
  // Help command with expanded functionality
  bot.help((ctx: Context) => {
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
}
