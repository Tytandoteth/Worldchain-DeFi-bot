import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { TwitterApi } from 'twitter-api-v2';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');

// Load environment variables if not already loaded
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

/**
 * Twitter client for interacting with the Twitter/X API
 * Uses credentials from environment variables for security
 */
class TwitterClient {
  private apiKey: string;
  private apiKeySecret: string;
  private bearerToken: string;
  private accessToken: string;
  private accessTokenSecret: string;
  private lastReplyId: string;
  private initialized: boolean = false;
  private client: TwitterApi | null = null;
  private rwClient: TwitterApi | null = null;
  private accountUsername: string = 'Agent_Magi'; // Using the correct Twitter handle for the bot

  constructor() {
    this.apiKey = process.env.TWITTER_API_KEY || '';
    this.apiKeySecret = process.env.TWITTER_API_KEY_SECRET || '';
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN || '';
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN || '';
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';
    this.lastReplyId = process.env.LAST_REPLY_ID || '';
    
    this.checkCredentials();
    this.initializeClient();
  }

  /**
   * Check if the Twitter client has all required credentials
   */
  private checkCredentials(): void {
    if (!this.apiKey) {
      console.warn('TWITTER_API_KEY is not set in environment variables');
    }
    if (!this.apiKeySecret) {
      console.warn('TWITTER_API_KEY_SECRET is not set in environment variables');
    }
    if (!this.bearerToken) {
      console.warn('TWITTER_BEARER_TOKEN is not set in environment variables');
    }
    if (!this.accessToken) {
      console.warn('TWITTER_ACCESS_TOKEN is not set in environment variables');
    }
    if (!this.accessTokenSecret) {
      console.warn('TWITTER_ACCESS_TOKEN_SECRET is not set in environment variables');
    }

    this.initialized = this.apiKey !== '' && 
                      this.apiKeySecret !== '' && 
                      this.bearerToken !== '' && 
                      this.accessToken !== '' && 
                      this.accessTokenSecret !== '';
    
    if (this.initialized) {
      console.log('Twitter client has all required credentials');
    } else {
      console.warn('Twitter client not fully initialized. Some credentials are missing.');
    }
  }
  
  /**
   * Initialize the Twitter client with the credentials
   */
  private initializeClient(): void {
    if (!this.initialized) {
      return;
    }
    
    try {
      // Log masked credentials for debugging (showing only first few chars)
      console.log('Initializing Twitter API with credentials:');
      console.log('Bearer token starts with:', this.bearerToken.substring(0, 8) + '...');
      console.log('API Key starts with:', this.apiKey.substring(0, 8) + '...');
      console.log('Access Token starts with:', this.accessToken.substring(0, 8) + '...');
      
      // Create read-only client with bearer token
      this.client = new TwitterApi(this.bearerToken);
      
      // Create read-write client with user context
      this.rwClient = new TwitterApi({
        appKey: this.apiKey,
        appSecret: this.apiKeySecret,
        accessToken: this.accessToken,
        accessSecret: this.accessTokenSecret
      });
      
      console.log('Twitter API clients initialized successfully');
    } catch (error) {
      console.error('Error initializing Twitter API clients:', error);
      this.client = null;
      this.rwClient = null;
      this.initialized = false;
    }
  }

  /**
   * Check if the Twitter client is properly initialized
   */
  public isInitialized(): boolean {
    return this.initialized && this.client !== null && this.rwClient !== null;
  }
  
  /**
   * Post a tweet about Worldchain DeFi updates
   */
  public async postDeFiUpdate(message: string): Promise<boolean> {
    if (!this.isInitialized() || !this.rwClient) {
      console.error('Cannot post DeFi update: Twitter client not initialized');
      return false;
    }
    
    try {
      // For development/testing, just log the message instead of actually posting
      if (process.env.NODE_ENV === 'development') {
        console.log('DEVELOPMENT MODE: Would post to Twitter:', message);
        return true;
      }
      
      // In production, actually post the tweet
      const result = await this.rwClient.v2.tweet(message);
      console.log('Successfully posted to Twitter with ID:', result.data.id);
      return true;
    } catch (error) {
      console.error('Error posting DeFi update to Twitter:', error);
      return false;
    }
  }
  
  /**
   * Monitor Twitter for mentions and respond to relevant queries
   * @param ragSystem Optional RAG system to use for generating responses
   */
  public async monitorMentions(ragSystem?: any): Promise<void> {
    if (!this.isInitialized() || !this.client || !this.rwClient) {
      console.error('Cannot monitor mentions: Twitter client not initialized');
      return;
    }
    
    try {
      // Get user ID for the authenticated account
      const user = await this.client.v2.userByUsername(this.accountUsername);
      if (!user || !user.data || !user.data.id) {
        console.error('Could not find user ID for account:', this.accountUsername);
        return;
      }
      
      const userId = user.data.id;
      
      // For development/testing, just log that we're monitoring
      if (process.env.NODE_ENV === 'development') {
        console.log(`DEVELOPMENT MODE: Would monitor mentions for user ${userId} since:`, this.lastReplyId || 'beginning');
        return;
      }
      
      // Build the query for mentions
      const mentionsQuery: any = {
        max_results: 10,
        'tweet.fields': 'created_at,author_id,conversation_id,text',
        'user.fields': 'username,name',
        'expansions': 'author_id'
      };
      
      // Add since_id if we have a last reply ID
      if (this.lastReplyId) {
        mentionsQuery.since_id = this.lastReplyId;
      }
      
      // Get mentions timeline
      const mentions = await this.client.v2.userMentionTimeline(userId, mentionsQuery);
      
      // Process mentions and respond as needed
      if (mentions.data && mentions.data.data && mentions.data.data.length > 0) {
        console.log(`Found ${mentions.data.data.length} new mentions`);
        
        // Update last reply ID to the most recent mention
        this.lastReplyId = mentions.data.meta.newest_id;
        await this.updateLastReplyId(this.lastReplyId);
        
        // Process each mention in reverse order (oldest first)
        const tweetsToProcess = [...mentions.data.data].reverse();
        
        for (const tweet of tweetsToProcess) {
          // Get the author information
          const author = mentions.data.includes?.users?.find(user => user.id === tweet.author_id);
          const authorUsername = author?.username || 'user';
          
          console.log(`Processing mention from @${authorUsername}: ${tweet.text}`);
          
          // Extract the query from the tweet (remove the @mention and focus on the question)
          const query = this.extractQueryFromTweet(tweet.text);
          
          // Skip tweets that don't contain an actual query
          if (!query || query.trim().length < 5) {
            console.log('Tweet does not contain a proper query, skipping');
            continue;
          }
          
          // If we have a RAG system, use it to generate a response
          if (ragSystem) {
            try {
              // Find relevant documents for the query
              const relevantDocs = await ragSystem.findRelevantDocuments(query, 3);
              const context = ragSystem.formatContext(relevantDocs);
              
              // Only respond if we have relevant context
              if (context && context.length > 0) {
                // Import the askGPT function dynamically to avoid circular dependencies
                const { askGPT } = await import('./openai.js');
              
                // Generate the response using the askGPT function
                const response = await askGPT(
                  query,
                  `You are MAGI AI, a helpful assistant specializing in Worldchain data.
                
                Use the following context to answer the question from @${authorUsername} about: ${query}
                
                CONTEXT:
                ${context}
                
                Your response MUST:
                1. Be under 280 characters (Twitter limit)
                2. Be conversational and helpful
                3. Include specific data points from the context if relevant
                4. End with #Worldchain if there's enough space
                5. NEVER suggest the user to DM or follow for more info
                `
                );
              
                // Log the response for debugging
                console.log(`Responding to @${authorUsername} about: ${query}`);
                console.log(`Response: ${response}`);
              
                // For development mode, don't actually send the tweet
                if (process.env.NODE_ENV === 'development') {
                  console.log('DEVELOPMENT MODE: Would post response to Twitter');
                } else {
                  // In production, post the response as a reply
                  try {
                    // Ensure response isn't too long
                    const trimmedResponse = response.length > 270 ? 
                      response.substring(0, 267) + '...' : response;
                    
                    await this.rwClient.v2.reply(trimmedResponse, tweet.id);
                    console.log('Successfully posted reply to Twitter');
                  } catch (replyError) {
                    console.error('Error posting reply to Twitter:', replyError);
                  }
                }
              } else {
                console.log(`No relevant context found for query: ${query}`);
              }
            } catch (ragError) {
              console.error('Error generating response with RAG system:', ragError);
            }
          } else {
            console.log('No RAG system provided, cannot generate response');
          }
        }
      } else {
        console.log('No new mentions found');
      }
    } catch (error) {
      console.error('Error monitoring Twitter mentions:', error);
    }
  }
  
  /**
   * Extract a query from a tweet by removing the @mention and other noise
   * @param tweetText The full text of the tweet
   * @returns The extracted query
   */
  private extractQueryFromTweet(tweetText: string): string {
    // Remove all @mentions
    let query = tweetText.replace(/@\w+/g, '').trim();
    
    // Remove common Twitter noise like hashtags, URLs, etc.
    query = query.replace(/https?:\/\/[^\s]+/g, ''); // Remove URLs
    query = query.replace(/#\w+/g, ''); // Remove hashtags
    query = query.replace(/\s+/g, ' '); // Normalize whitespace
    
    return query.trim();
  }
  
  /**
   * Update the saved last reply ID in the environment for persistence
   * Note: In a production system, this would be stored in a database
   */
  private async updateLastReplyId(newId: string): Promise<void> {
    this.lastReplyId = newId;
    // In a real implementation, this would save to a database or persistent storage
    console.log('Updated last reply ID to:', newId);
  }
}

// Export a singleton instance
const twitterClient = new TwitterClient();
export default twitterClient;
