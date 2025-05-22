import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import twitterClient from './twitter.js';
import { createRAG } from './simple-rag.js';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');

// Load environment variables
dotenv.config({ path: envPath });

async function postTestTweet() {
  console.log('Starting test tweet...');
  
  // Check if the client is properly initialized
  const initialized = twitterClient.isInitialized();
  console.log('Twitter client initialized:', initialized);
  
  if (!initialized) {
    console.log('Twitter client not initialized. Check your .env file for Twitter credentials.');
    return;
  }
  
  // Get some DeFi data for the tweet (if we have an OpenAI API key)
  let tweetText = 'This is a test tweet from MAGI AI bot about #Worldchain #DeFi! Current time: ' + new Date().toISOString();
  
  if (process.env.OPENAI_API_KEY) {
    try {
      // Initialize RAG system
      const rag = createRAG(process.env.OPENAI_API_KEY);
      await rag.initialize();
      
      // Get relevant documents about Worldchain protocols
      const docs = await rag.findRelevantDocuments('Worldchain DeFi protocols TVL', 2);
      
      if (docs.length > 0) {
        // Extract some data for the tweet
        const tvlMatch = docs[0].content.match(/total TVL of \$([0-9.]+[KMB])/i);
        const protocolMatch = docs[0].content.match(/Top protocol by TVL: ([^(]+)/i);
        
        if (tvlMatch && protocolMatch) {
          tweetText = `#Worldchain DeFi Update: The ecosystem now has a total TVL of $${tvlMatch[1]} with ${protocolMatch[1].trim()} leading the pack. #WorldcoinApp #Crypto`;
        }
      }
    } catch (error) {
      console.error('Error generating tweet content:', error);
    }
  }
  
  console.log('Posting tweet:', tweetText);
  
  try {
    // Post the tweet
    const success = await twitterClient.postDeFiUpdate(tweetText);
    if (success) {
      console.log('✅ Test tweet posted successfully!');
    } else {
      console.log('❌ Failed to post test tweet');
    }
  } catch (error) {
    console.error('Error posting test tweet:', error);
  }
}

// Run the test
postTestTweet().then(() => {
  console.log('Test completed');
}).catch(error => {
  console.error('Unexpected error in test:', error);
});
