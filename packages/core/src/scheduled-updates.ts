import cron from 'node-cron';
import defiLlama from './defillama.js';
import twitterClient from './twitter.js';
import { createRAG } from './simple-rag.js';
import { askGPT } from './openai.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');

// Load environment variables
if (process.env.OPENAI_API_KEY === undefined) {
  dotenv.config({ path: envPath });
}

// RAG system for context
let ragSystem: ReturnType<typeof createRAG> | null = null;

/**
 * Initialize the scheduled updates system
 */
export async function initializeScheduledUpdates(): Promise<void> {
  console.log('Initializing scheduled updates system');
  
  // Initialize RAG system if we have an OpenAI key
  if (process.env.OPENAI_API_KEY) {
    ragSystem = createRAG(process.env.OPENAI_API_KEY);
    await ragSystem.initialize();
    console.log('RAG system initialized for scheduled updates');
  } else {
    console.warn('OpenAI API key not found, RAG system not initialized');
  }
  
  // Schedule daily DeFi updates to Twitter
  scheduleTwitterUpdates();
  
  // Check Twitter for mentions every hour
  scheduleTwitterMonitoring();
}

/**
 * Schedule daily DeFi updates to Twitter
 */
function scheduleTwitterUpdates(): void {
  // Post a DeFi update at 9 AM every day
  cron.schedule('0 9 * * *', async () => {
    console.log('Running scheduled Twitter DeFi update');
    
    try {
      // Check if Twitter client is initialized
      if (!twitterClient.isInitialized()) {
        console.log('Twitter client not initialized, skipping DeFi update');
        return;
      }
      
      // Get latest DeFi data
      await defiLlama.updateWorldchainData();
      
      // Generate a tweet about Worldchain DeFi protocols
      const tweet = await generateDeFiTweet();
      
      // Post to Twitter
      if (tweet) {
        const success = await twitterClient.postDeFiUpdate(tweet);
        if (success) {
          console.log('Successfully posted DeFi update to Twitter');
        } else {
          console.error('Failed to post DeFi update to Twitter');
        }
      }
    } catch (error) {
      console.error('Error in scheduled Twitter DeFi update:', error);
    }
  });
  
  console.log('Scheduled daily Twitter DeFi updates at 9 AM');
}

/**
 * Schedule hourly Twitter mention monitoring
 */
function scheduleTwitterMonitoring(): void {
  // Check for Twitter mentions every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled Twitter mention monitoring');
    
    try {
      // Check if Twitter client is initialized
      if (!twitterClient.isInitialized()) {
        console.log('Twitter client not initialized, skipping mention monitoring');
        return;
      }
      
      // Check if RAG system is initialized
      if (!ragSystem) {
        console.log('RAG system not initialized, monitoring mentions without response capability');
        await twitterClient.monitorMentions();
        return;
      }
      
      // Monitor Twitter mentions with RAG system for responding to queries
      await twitterClient.monitorMentions(ragSystem);
    } catch (error) {
      console.error('Error in scheduled Twitter mention monitoring:', error);
    }
  });
  
  console.log('Scheduled hourly Twitter mention monitoring');
}

/**
 * Generate a tweet about Worldchain DeFi protocols, mini apps or protocol statistics
 * based on a rotating schedule
 */
async function generateDeFiTweet(): Promise<string | null> {
  if (!ragSystem || !process.env.OPENAI_API_KEY) {
    console.error('Cannot generate tweet: RAG system or OpenAI API key not available');
    return null;
  }
  
  try {
    // Determine which type of tweet to generate based on the day of the week
    const day = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    let tweetType: 'defi' | 'miniapps' | 'stats';
    
    if (day % 3 === 0) { // Sunday, Wednesday, Saturday
      tweetType = 'defi';
    } else if (day % 3 === 1) { // Monday, Thursday
      tweetType = 'miniapps';
    } else { // Tuesday, Friday
      tweetType = 'stats';
    }
    
    console.log(`Generating ${tweetType} tweet for day ${day}`);
    
    let relevantDocs;
    let tweetPrompt;
    let systemPrompt;
    
    switch (tweetType) {
      case 'defi':
        // Get relevant documents about Worldchain protocols
        relevantDocs = await ragSystem.findRelevantDocuments('Worldchain DeFi protocol TVL rankings', 3);
        tweetPrompt = 'Generate a concise tweet with the latest Worldchain DeFi protocol rankings and TVL data. Make it engaging and informative.';
        systemPrompt = `You are MAGI AI, a DeFi data analyst. Use the following context to generate a tweet about Worldchain DeFi protocols.
          
          CONTEXT:
          ${ragSystem.formatContext(relevantDocs)}
          
          The tweet MUST:
          1. Be under 280 characters
          2. Mention specific protocol names and TVL figures
          3. Include hashtags #Worldchain #DeFi #WorldcoinApp
          4. Be informative yet engaging
          5. NOT include links (they will be added separately)
        `;
        break;
        
      case 'miniapps':
        // Get relevant documents about Worldchain mini apps
        relevantDocs = await ragSystem.findRelevantDocuments('Worldchain mini apps overview', 3);
        tweetPrompt = 'Generate a concise tweet highlighting interesting Worldchain mini apps. Focus on one or two specific apps in a particular category.';
        systemPrompt = `You are MAGI AI, a Worldchain expert. Use the following context to generate a tweet about Worldchain mini apps.
          
          CONTEXT:
          ${ragSystem.formatContext(relevantDocs)}
          
          The tweet MUST:
          1. Be under 280 characters
          2. Highlight one or two specific mini apps by name
          3. Briefly explain what they do or why they're interesting
          4. Include hashtags #Worldchain #MiniApps #WorldcoinApp
          5. Be written in an exciting, discovery-oriented tone
          6. NOT include links (they will be added separately)
        `;
        break;
        
      case 'stats':
        // Get relevant documents about protocol statistics
        relevantDocs = await ragSystem.findRelevantDocuments('Worldchain protocol statistics', 3);
        tweetPrompt = 'Generate a concise tweet highlighting interesting statistics about a Worldchain protocol. Focus on user growth, impressions, or financial metrics.';
        systemPrompt = `You are MAGI AI, a data analyst. Use the following context to generate a tweet about Worldchain protocol statistics.
          
          CONTEXT:
          ${ragSystem.formatContext(relevantDocs)}
          
          The tweet MUST:
          1. Be under 280 characters
          2. Highlight one specific protocol by name
          3. Include at least one impressive statistic (user growth, TVL, etc.)
          4. Include hashtags #Worldchain #ProtocolStats #WorldcoinApp
          5. Be written in a data-driven, analytical tone
          6. NOT include links (they will be added separately)
        `;
        break;
    }
    
    // Generate the tweet using GPT
    const tweet = await askGPT(tweetPrompt, systemPrompt);
    
    return tweet;
  } catch (error) {
    console.error('Error generating tweet:', error);
    return null;
  }
}

export default {
  initializeScheduledUpdates
};
