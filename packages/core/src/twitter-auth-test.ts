import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { TwitterApi } from 'twitter-api-v2';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');

// Load environment variables
dotenv.config({ path: envPath });

async function testTwitterAuth() {
  console.log('=== Twitter API Authentication Test ===');
  console.log('Checking environment variables...');
  
  // Check for required environment variables
  const requiredVars = [
    'TWITTER_API_KEY',
    'TWITTER_API_KEY_SECRET',
    'TWITTER_BEARER_TOKEN',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET'
  ];
  
  let missingVars = false;
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`❌ Missing environment variable: ${varName}`);
      missingVars = true;
    } else {
      // Show first few characters of each credential for verification
      console.log(`✅ ${varName} is set (starts with: ${process.env[varName]?.substring(0, 6)}...)`);
    }
  }
  
  if (missingVars) {
    console.error('Please check your .env file and ensure all Twitter API credentials are set.');
    return;
  }
  
  console.log('\nTesting read-only client with bearer token...');
  try {
    const roClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!);
    const user = await roClient.v2.userByUsername('twitterdev');
    console.log(`✅ Bearer token works! Successfully fetched user: ${user.data.username}`);
  } catch (error: any) {
    console.error('❌ Bearer token authentication failed:');
    console.error(error.message);
    if (error.data) {
      console.error('Error details:', error.data);
    }
  }
  
  console.log('\nTesting read-write client with user context...');
  try {
    const rwClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_KEY_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!
    });
    
    // Test by getting the authenticated user
    const me = await rwClient.v2.me();
    console.log(`✅ User authentication works! Logged in as: @${me.data.username}`);
    
    // Simple verification of API level and permissions
    console.log('\nChecking Twitter API access level...');
    try {
      // Try to get user's own tweets as another permission test
      const myTweets = await rwClient.v2.userTimeline(me.data.id, { max_results: 5 });
      console.log(`✅ Successfully retrieved ${myTweets.data.meta?.result_count || 0} of your recent tweets`);
      console.log('This indicates you have at least read permissions for your account');
    } catch (timelineError: any) {
      console.error('❌ Could not retrieve your tweets:');
      console.error(timelineError.message);
      if (timelineError.data) {
        console.error('Error details:', timelineError.data);
      }
    }
    
    // Try a simple direct post capability check
    console.log('\nTesting post capability directly...');
    try {
      // Create a test tweet text
      const testText = `Test tweet from MAGI AI diagnostic tool [${new Date().toISOString()}]`;
      console.log(`Attempting to post: "${testText}"`);
      
      // Actually post the tweet - use with caution!
      // Comment out this line if you don't want to post a real tweet
      console.log('(Actual posting is commented out for safety - uncomment in the code to test)');
      // const tweet = await rwClient.v2.tweet(testText);
      // console.log(`✅ Successfully posted tweet! Tweet ID: ${tweet.data.id}`);
    } catch (postError: any) {
      console.error('❌ Tweet posting test failed:');
      console.error(postError.message);
      if (postError.data) {
        console.error('Error details:', postError.data);
      }
    }
  } catch (error: any) {
    console.error('❌ User authentication failed:');
    console.error(error.message);
    if (error.data) {
      console.error('Error details:', error.data);
    }
    
    console.log('\nPossible solutions:');
    console.log('1. Check if your API keys and access tokens are correct');
    console.log('2. Ensure your Twitter developer app has the necessary permissions (Read + Write)');
    console.log('3. Verify your app has been approved for the Twitter API v2 endpoints you are using');
    console.log('4. Make sure your Twitter developer account is in good standing');
  }
}

// Run the test
testTwitterAuth().catch(error => {
  console.error('Unexpected error:', error);
});
