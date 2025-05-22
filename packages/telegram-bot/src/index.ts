import { Telegraf } from "telegraf";
import { askGPT } from "../../core/dist/openai.js";
import defiLlama from "../../core/dist/defillama.js";
import { createRAG } from "../../core/dist/simple-rag.js";
import scheduledUpdates from "../../core/dist/scheduled-updates.js";
import twitterClient from "../../core/dist/twitter.js";
import { registerBotCommands } from "./bot-commands.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the root .env file
const envPath = resolve(__dirname, "../../../.env");

/**
 * Initialize DefiLlama data and schedule updates
 */
async function initializeDefiLlamaData(): Promise<void> {
  try {
    console.log('Fetching initial Worldchain DeFi data from DefiLlama...');
    await defiLlama.updateWorldchainData();
    console.log('Initial Worldchain DeFi data fetched successfully');
    
    // Schedule updates every 4 hours
    defiLlama.scheduleUpdates();
  } catch (error) {
    console.error('Failed to initialize DefiLlama data:', error);
    // Continue bot startup even if DeFi data fails
  }
}

/**
 * Load environment variables and initialize the bot
 */
async function main(): Promise<void> {
  // Check if .env file exists
  if (!fs.existsSync(envPath)) {
    console.error(`Error: .env file not found at ${envPath}`);
    process.exit(1);
  }
  
  // Load environment variables
  console.log(`Loading environment variables from ${envPath}`);
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error("Error loading environment variables:", result.error);
    process.exit(1);
  }
  
  console.log("Environment variables loaded successfully");
  console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "[CONFIGURED]" : "[NOT CONFIGURED]");
  console.log("TELEGRAM_BOT_TOKEN:", process.env.TELEGRAM_BOT_TOKEN ? "[CONFIGURED]" : "[NOT CONFIGURED]");
  
  // Ensure required environment variables are set
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("Error: TELEGRAM_BOT_TOKEN environment variable is not set");
    process.exit(1);
  }
  
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is not set");
    process.exit(1);
  }
  
  // Initialize DefiLlama data
  await initializeDefiLlamaData();
  
  // Initialize the RAG system
  const ragSystem = createRAG(process.env.OPENAI_API_KEY as string);
  await ragSystem.initialize();
  console.log('RAG system initialized with financial data including Worldchain protocols');
  
  // Initialize scheduled updates system (includes Twitter integration)
  await scheduledUpdates.initializeScheduledUpdates();
  
  // Log Twitter client status
  if (twitterClient.isInitialized()) {
    console.log('Twitter integration enabled - scheduled updates will be posted to Twitter');
  } else {
    console.log('Twitter integration not fully configured - updates will not be posted to Twitter');
  }
  
  // Initialize the Telegram bot
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  
  // Basic command handlers
  bot.start((ctx) => {
    ctx.reply("Hi! I'm MAGI AI. Ask me anything about Worldchain, DeFi protocols, and mini apps!");
  });
  
  // Register all advanced commands (compare, stats, miniapps, trending)
  registerBotCommands(bot, ragSystem);
  
  // Handle text messages
  bot.on("text", async (ctx) => {
    try {
      // Show typing indicator
      await ctx.replyWithChatAction("typing");
      
      // Check if we have text content
      if (!ctx.message || !('text' in ctx.message)) {
        ctx.reply("I couldn't understand your message. Please try again.");
        return;
      }
      
      const userQuery = ctx.message.text;
      
      // Find relevant documents using our RAG system
      const relevantDocs = await ragSystem.findRelevantDocuments(userQuery, 5);
      
      let answer: string;
      
      // If we found relevant documents, format them as context for the LLM
      if (relevantDocs.length > 0) {
        console.log(`Found ${relevantDocs.length} relevant documents for query: "${userQuery}"`);
        
        // Format the documents into a context string
        const context = ragSystem.formatContext(relevantDocs);
        
        // Use the context to enhance the answer
        answer = await askGPT(
          userQuery,
          `You are MAGI AI, a friendly and conversational assistant focused on Worldchain, its protocols, and mini apps. ` +
          `Use the following context to answer the user's question in a natural, conversational tone. ` +
          `If the context doesn't contain relevant information, use your general knowledge but acknowledge when you're uncertain.\n\n` +
          `CONTEXT:\n${context}\n\n` +
          `IMPORTANT GUIDELINES:\n` +
          `1. Be conversational and friendly - respond like you're having a natural conversation.\n` +
          `2. Avoid rigid categorization of information unless explicitly asked.\n` +
          `3. Present information in a flowing narrative rather than strict categories.\n` +
          `4. When discussing protocols, include their TVL, user metrics, or other key statistics in a natural way.\n` +
          `5. Format your responses using Markdown for readability, but keep the style conversational.\n` +
          `6. If appropriate, suggest using one of the available commands: /compare, /stats, /miniapps, or /trending.`
        );
      } else {
        // If no relevant documents, use general model knowledge
        console.log(`No relevant documents found for query: "${userQuery}"`);
        answer = await askGPT(
          userQuery,
          `You are MAGI AI, a friendly assistant specialized in Worldchain information. ` +
          `If you don't know the answer, be honest about it. You can suggest using one of these commands if relevant: ` +
          `/compare (to compare protocols), /stats (for protocol stats), /miniapps (to explore mini apps), or /trending (for trending protocols).`
        );
      }
      
      ctx.reply(answer, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error("Error processing message:", error);
      ctx.reply("Sorry, I encountered an error processing your request. Please try again later.");
    }
  });
  
  // Error handling
  bot.catch((err, ctx) => {
    console.error('Bot error:', err instanceof Error ? err.message : String(err));
    ctx.reply("An error occurred while processing your request. Please try again later.");
  });
  
  // Start the bot
  await bot.launch();
  console.log("Bot started with Worldchain DeFi data integration");
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
