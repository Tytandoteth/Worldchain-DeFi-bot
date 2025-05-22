import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import twitterClient from './twitter.js';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');

// Load environment variables
dotenv.config({ path: envPath });

async function testTwitterClient() {
  console.log('Testing Twitter Client Integration');
  
  // Check if the client is properly initialized
  const initialized = twitterClient.isInitialized();
  console.log('Twitter client initialized:', initialized);
  
  if (!initialized) {
    console.log('Twitter client not initialized. Check your .env file for Twitter credentials.');
    return;
  }
  
  // Test posting a tweet in development mode
  console.log('Testing tweet posting in development mode...');
  const testTweet = 'This is a test tweet from MAGI AI bot about #Worldchain #DeFi protocols. Current time: ' + new Date().toISOString();
  
  try {
    const success = await twitterClient.postDeFiUpdate(testTweet);
    if (success) {
      console.log('Test tweet would have been posted successfully (development mode)');
    } else {
      console.log('Failed to post test tweet');
    }
  } catch (error) {
    console.error('Error posting test tweet:', error);
  }
  
  // Test monitoring mentions
  console.log('Testing mention monitoring...');
  try {
    await twitterClient.monitorMentions();
    console.log('Mention monitoring test completed');
  } catch (error) {
    console.error('Error monitoring mentions:', error);
  }
}

// Run the test
testTwitterClient().then(() => {
  console.log('Twitter integration test completed');
}).catch(error => {
  console.error('Error in Twitter integration test:', error);
});
