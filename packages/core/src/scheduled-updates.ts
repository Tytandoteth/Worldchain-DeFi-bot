import cron from 'node-cron';
import defiLlama from './defillama.js';
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
  
  // Schedule regular DeFi data updates
  scheduleDeFiDataUpdates();
}

/**
 * Schedule regular DeFi data updates
 */
function scheduleDeFiDataUpdates(): void {
  // Update DeFi data every 4 hours
  cron.schedule('0 */4 * * *', async () => {
    console.log('Running scheduled DeFi data update');
    
    try {
      // Update DeFi data
      await defiLlama.updateWorldchainData();
      console.log('WorldChain DeFi data updated successfully');
      
      // Generate insights for logging purposes
      if (ragSystem) {
        const insights = await generateDeFiInsights();
        if (insights) {
          console.log('Generated DeFi insights:', insights);
        }
      }
    } catch (error) {
      console.error('Error in scheduled DeFi data update:', error);
    }
  });
  
  console.log('Scheduled WorldChain DeFi data updates every 4 hours');
}

/**
 * Generate insights about WorldChain DeFi protocols for internal use
 * @returns Insights about WorldChain DeFi
 */
async function generateDeFiInsights(): Promise<string | null> {
  try {
    if (!ragSystem) {
      console.error('RAG system not initialized, cannot generate insights');
      return null;
    }
    
    // Get current date to determine what type of insights to generate
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    let insightTopic: string;
    let query: string;
    
    // Rotate through different topics based on the day of the week
    switch (dayOfWeek) {
      case 0: // Sunday - Weekly recap
        insightTopic = 'weekly recap';
        query = 'Provide a weekly recap of WorldChain DeFi performance';
        break;
      
      case 1: // Monday - Top protocols
        insightTopic = 'top protocols';
        query = 'List the top 3 WorldChain protocols by TVL with stats';
        break;
      
      case 2: // Tuesday - Protocol comparison
        insightTopic = 'protocol comparison';
        query = 'Compare two popular WorldChain protocols';
        break;
        
      case 3: // Wednesday - Mini apps
        insightTopic = 'mini apps';
        query = 'Highlight interesting mini apps on WorldChain';
        break;
      
      case 4: // Thursday - DeFi tip
        insightTopic = 'DeFi tip';
        query = 'Provide DeFi tips for WorldChain users';
        break;
      
      case 5: // Friday - Protocol feature
        insightTopic = 'protocol feature';
        query = 'Highlight unique features of WorldChain protocols';
        break;
      
      case 6: // Saturday - Market trend
        insightTopic = 'market trend';
        query = 'Share insights on current WorldChain DeFi market trends';
        break;
      
      default:
        insightTopic = 'general update';
        query = 'Provide an update on WorldChain DeFi ecosystem';
        break;
    }
    
    console.log(`Generating ${insightTopic} insights`);
    
    // Find relevant documents for context
    const relevantDocs = await ragSystem.findRelevantDocuments(query, 3);
    const context = ragSystem.formatContext(relevantDocs);
    
    // Generate the insights with GPT
    const insightPrompt = `Generate informative insights about WorldChain ${insightTopic}. Use this context: ${context}`;
    
    const insights = await askGPT(insightPrompt, 'You are a DeFi expert analyzing WorldChain data. Be informative and accurate.');
    
    return insights;
  } catch (error) {
    console.error('Error generating DeFi insights:', error);
    return null;
  }
}

export default {
  initializeScheduledUpdates,
  generateDeFiInsights // Export for potential use in admin functions
};
