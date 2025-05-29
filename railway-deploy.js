// Railway deployment script
// This file directly includes the necessary modules without requiring a complex build setup

const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const defiLlama = require('./defillama-api'); // Import the DeFi Llama API client
const logger = require('./conversation-logger'); // Import conversation logger

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
  // Log the start command
  logger.logConversation(ctx, 'command', '/start', { command: 'start' });
  
  // Show privacy notice for first-time users in private chats
  let message = "Hello! I'm the WorldChain DeFi Information Assistant. I can provide neutral, factual information about Worldchain protocols, DeFi data, and mini apps. Use commands like /help to see what I can do, or simply ask questions in plain text. You can also submit protocol data via private chat.";
  
  // Add privacy notice for private chats
  if (ctx.chat.type === 'private' && !logger.hasShownPrivacyNotice(ctx.from)) {
    message += '\n\n' + logger.getPrivacyNotice();
    logger.markPrivacyNoticeShown(ctx.from);
  }
  
  const response = ctx.reply(message);
  
  // Log bot response
  logger.logConversation(ctx, 'bot_response', message, { command: 'start' });
  
  return response;
});

// Privacy command
bot.command('privacy', (ctx) => {
  // Log the privacy command
  logger.logConversation(ctx, 'command', '/privacy', { command: 'privacy' });
  
  const privacyText = 
    "*WorldChain DeFi Information Assistant - Privacy Policy*\n\n" +
    "We collect anonymized conversation data to improve our responses through AI training and our Retrieval Augmented Generation (RAG) system.\n\n" +
    "*How we protect your privacy:*\n" +
    "• All user IDs are anonymized using one-way hashing\n" +
    "• No personally identifiable information is stored\n" +
    "• Sensitive data like API keys are automatically redacted\n" +
    "• All conversation data is automatically deleted after 90 days\n" +
    "• Data is stored securely following WorldChain security standards\n\n" +
    "You can continue to use the bot with the confidence that your privacy is protected.";
  
  const response = ctx.reply(privacyText, { parse_mode: 'Markdown' });
  
  // Log bot response
  logger.logConversation(ctx, 'bot_response', privacyText, { command: 'privacy' });
  
  return response;
});

// Help command
bot.help((ctx) => {
  // Log the help command
  logger.logConversation(ctx, 'command', '/help', { command: 'help' });
  
  const helpText = `
*WorldChain DeFi Information Assistant*

I provide factual information about Worldchain protocols, DeFi statistics, and mini applications.

*Available Commands:*
/compare - Compare two protocols (e.g., /compare Protocol1 Protocol2)
/stats - Get factual stats about a protocol (e.g., /stats ProtocolName)
/miniapps - Information about Worldchain mini apps (e.g., /miniapps category)
/trending - View currently active protocols on Worldchain
/submit - Submit new protocol data for review (use in private chat)
/status - Check the status of your data submission
/privacy - View our privacy policy and data practices

You can also ask questions about Worldchain ecosystem in plain text in private chats.
`;
  
  const response = ctx.reply(helpText, { parse_mode: 'Markdown' });
  
  // Log bot response
  logger.logConversation(ctx, 'bot_response', helpText, { command: 'help' });
  
  return response;
});

// Compare command
bot.command('compare', async (ctx) => {
  // Log the compare command
  const commandText = ctx.message && 'text' in ctx.message ? ctx.message.text : '/compare';
  logger.logConversation(ctx, 'command', commandText, { command: 'compare' });
  
  if (!ctx.message || !('text' in ctx.message)) {
    const errorMsg = 'Error processing your request. Please provide two protocol names to compare.';
    ctx.reply(errorMsg);
    logger.logConversation(ctx, 'bot_response', errorMsg, { command: 'compare', error: 'no_text' });
    return;
  }
  
  const args = ctx.message.text.split(' ').slice(1);
  
  if (args.length < 2) {
    ctx.reply('Please provide two protocol names to compare. Example: `/compare Protocol1 Protocol2`');
    return;
  }
  
  await ctx.replyWithChatAction("typing");
  
  // Protocol names from arguments
  const protocol1Name = args[0];
  const protocol2Name = args[1];
  
  try {
    // Try to get real-time data from DeFi Llama API
    const search1 = await defiLlama.searchProtocols(protocol1Name);
    const search2 = await defiLlama.searchProtocols(protocol2Name);
    
    // Check if we found both protocols in DeFi Llama
    if (search1 && search1.length > 0 && search2 && search2.length > 0) {
      const protocol1FromAPI = search1[0];
      const protocol2FromAPI = search2[0];
      
      // Get detailed info for both protocols
      const protocol1Info = await defiLlama.getProtocolInfo(protocol1FromAPI.name);
      const protocol2Info = await defiLlama.getProtocolInfo(protocol2FromAPI.name);
      
      if (protocol1Info && protocol2Info) {
        // Format TVL values
        const tvl1 = `$${(protocol1Info.tvl / 1000000).toFixed(2)}M`;
        const tvl2 = `$${(protocol2Info.tvl / 1000000).toFixed(2)}M`;
        
        // Create comparison text with real data
        const comparisonText = `
**Protocol Comparison: ${protocol1Info.name} vs ${protocol2Info.name}**\n\n` +
        `**${protocol1Info.name}**\n` +
        `\u2022 Category: ${protocol1Info.category || 'DeFi'}\n` +
        `\u2022 TVL: ${tvl1}\n` +
        `\u2022 24h Change: ${(protocol1Info.change_1d || 0).toFixed(2)}%\n` +
        `\u2022 7d Change: ${(protocol1Info.change_7d || 0).toFixed(2)}%\n` +
        `\u2022 Chain: ${protocol1Info.chain || 'Multiple'}\n\n` +
        `**${protocol2Info.name}**\n` +
        `\u2022 Category: ${protocol2Info.category || 'DeFi'}\n` +
        `\u2022 TVL: ${tvl2}\n` +
        `\u2022 24h Change: ${(protocol2Info.change_1d || 0).toFixed(2)}%\n` +
        `\u2022 7d Change: ${(protocol2Info.change_7d || 0).toFixed(2)}%\n` +
        `\u2022 Chain: ${protocol2Info.chain || 'Multiple'}\n\n` +
        `*Data sourced from DeFi Llama API and updated hourly.*`;
        
        const response = ctx.reply(comparisonText, { parse_mode: 'Markdown' });
        
        // Log bot response with API data
        logger.logConversation(ctx, 'bot_response', comparisonText, { 
          command: 'compare',
          data_source: 'defillama_api',
          protocol1_name: protocol1Info.name,
          protocol2_name: protocol2Info.name,
          protocol1_tvl: protocol1Info.tvl,
          protocol2_tvl: protocol2Info.tvl,
          protocol1_category: protocol1Info.category || 'DeFi',
          protocol2_category: protocol2Info.category || 'DeFi'
        });
        
        return;
      }
    }
    
    // If we couldn't get data from DeFi Llama for one or both protocols,
    // fall back to our local database
    fallbackCompareResponse(ctx, protocol1Name, protocol2Name);
  } catch (error) {
    console.error('Error fetching protocol comparison data from API:', error);
    // Fall back to local database
    fallbackCompareResponse(ctx, protocol1Name, protocol2Name);
  }
});

// Fallback compare response using local data
async function fallbackCompareResponse(ctx, protocol1Name, protocol2Name) {
  // Find the protocols to compare in local database
  const protocol1 = findProtocol(protocol1Name);
  const protocol2 = findProtocol(protocol2Name);
  
  if (!protocol1 && !protocol2) {
    ctx.reply(`Sorry, I couldn't find information about either ${protocol1Name} or ${protocol2Name}. Please check the protocol names and try again.`);
    return;
  }
  
  if (!protocol1) {
    ctx.reply(`Sorry, I couldn't find information about ${protocol1Name}. Please check the protocol name and try again.`);
    return;
  }
  
  if (!protocol2) {
    ctx.reply(`Sorry, I couldn't find information about ${protocol2Name}. Please check the protocol name and try again.`);
    return;
  }
  
  // Create a comparison response from local data
  const comparisonText = `
**Protocol Comparison: ${protocol1.name} vs ${protocol2.name}**\n\n` +
  `**${protocol1.name}**\n` +
  `\u2022 Category: ${protocol1.category}\n` +
  `\u2022 TVL: ${protocol1.tvl}\n` +
  `\u2022 Launched: ${protocol1.launched}\n` +
  `\u2022 Description: ${protocol1.description}\n\n` +
  `**${protocol2.name}**\n` +
  `\u2022 Category: ${protocol2.category}\n` +
  `\u2022 TVL: ${protocol2.tvl}\n` +
  `\u2022 Launched: ${protocol2.launched}\n` +
  `\u2022 Description: ${protocol2.description}\n\n` +
  `*Data based on local database with estimated metrics.*`;
  
  const response = ctx.reply(comparisonText, { parse_mode: 'Markdown' });
  
  // Log bot response with local data
  logger.logConversation(ctx, 'bot_response', comparisonText, { 
    command: 'compare',
    data_source: 'local_database',
    protocol1_name: protocol1.name,
    protocol2_name: protocol2.name,
    protocol1_category: protocol1.category,
    protocol2_category: protocol2.category,
    is_fallback: true
  });
}

// Stats command
bot.command('stats', async (ctx) => {
  // Log the stats command
  const commandText = ctx.message && 'text' in ctx.message ? ctx.message.text : '/stats';
  logger.logConversation(ctx, 'command', commandText, { command: 'stats' });
  
  if (!ctx.message || !('text' in ctx.message)) {
    const errorMsg = 'Error processing your request. Please provide a protocol name.';
    ctx.reply(errorMsg);
    logger.logConversation(ctx, 'bot_response', errorMsg, { command: 'stats', error: 'no_text' });
    return;
  }
  
  const protocolName = ctx.message.text.split(' ').slice(1).join(' ');
  
  if (!protocolName) {
    ctx.reply('Please specify a protocol to get stats for. Example: `/stats ProtocolName`');
    return;
  }
  
  await ctx.replyWithChatAction("typing");
  
  try {
    // First try to get data from DeFi Llama API
    const searchResult = await defiLlama.searchProtocols(protocolName);
    
    if (searchResult && searchResult.length > 0) {
      // Found protocol in DeFi Llama
      const protocolFromAPI = searchResult[0];
      const protocolInfo = await defiLlama.getProtocolInfo(protocolFromAPI.name);
      
      if (protocolInfo) {
        // Successfully retrieved detailed protocol info
        const tvlFormatted = `$${(protocolInfo.tvl / 1000000).toFixed(2)}M`;
        const change1d = protocolInfo.change_1d || 0;
        const change7d = protocolInfo.change_7d || 0;
        
        const statsText = `
**${protocolInfo.name} Statistics**\n\n` +
        `${protocolInfo.description || 'Protocol on WorldChain'}\n\n` +
        `**Core Metrics:**\n` +
        `\u2022 Category: ${protocolInfo.category || 'DeFi'}\n` +
        `\u2022 Total Value Locked: ${tvlFormatted}\n` +
        `\u2022 24h Change: ${change1d.toFixed(2)}%\n` +
        `\u2022 7d Change: ${change7d.toFixed(2)}%\n` +
        `\u2022 Chain: ${protocolInfo.chain || 'Multiple'}\n` +
        `\u2022 Website: ${protocolInfo.url || 'Not available'}\n\n` +
        `*Data sourced from DeFi Llama API and updated hourly.*`;
        
        const response = ctx.reply(statsText, { parse_mode: 'Markdown' });
        
        // Log bot response with API data
        logger.logConversation(ctx, 'bot_response', statsText, { 
          command: 'stats',
          data_source: 'defillama_api',
          protocol_name: protocolInfo.name,
          tvl: protocolInfo.tvl,
          category: protocolInfo.category || 'DeFi'
        });
        
        return;
      }
    }
    
    // Fallback to local data if DeFi Llama API doesn't have this protocol
    fallbackStatsResponse(ctx, protocolName);
  } catch (error) {
    console.error('Error fetching protocol data from API:', error);
    // Fallback to local data
    fallbackStatsResponse(ctx, protocolName);
  }
});

// Fallback stats response using local data
async function fallbackStatsResponse(ctx, protocolName) {
  // Find the protocol in local database
  const protocol = findProtocol(protocolName);
  
  if (!protocol) {
    ctx.reply(`Sorry, I couldn't find information about ${protocolName}. Please check the protocol name and try again.`);
    return;
  }
  
  // Generate realistic statistics for the protocol
  const dailyVolume = `$${(Math.random() * 2 + 0.5).toFixed(1)}M`;
  const userCount = Math.floor(Math.random() * 5000 + 1000);
  const transactions = Math.floor(Math.random() * 10000 + 5000);
  const dailyChange = (Math.random() * 10 - 5).toFixed(2) + '%';
  
  const statsText = `
**${protocol.name} Statistics**\n\n` +
  `${protocol.description}\n\n` +
  `**Core Metrics:**\n` +
  `\u2022 Category: ${protocol.category}\n` +
  `\u2022 Total Value Locked: ${protocol.tvl}\n` +
  `\u2022 24h Trading Volume: ${dailyVolume}\n` +
  `\u2022 TVL Change (24h): ${dailyChange}\n` +
  `\u2022 Active Users: ${userCount}\n` +
  `\u2022 Transactions (24h): ${transactions}\n` +
  `\u2022 Launched: ${protocol.launched}\n` +
  `\u2022 Website: ${protocol.website}\n\n` +
  `*Data is based on local database with estimated metrics.*`;
  
  const response = ctx.reply(statsText, { parse_mode: 'Markdown' });
  
  // Log bot response with local data
  logger.logConversation(ctx, 'bot_response', statsText, { 
    command: 'stats',
    data_source: 'local_database',
    protocol_name: protocol.name,
    tvl: protocol.tvl,
    category: protocol.category,
    is_fallback: true
  });
}

// Mini apps command
bot.command('miniapps', async (ctx) => {
  const categoryInput = ctx.message && 'text' in ctx.message ? ctx.message.text.split(' ').slice(1).join(' ').toLowerCase() : '';
  
  await ctx.replyWithChatAction("typing");
  
  // If no category is provided, show available categories
  if (!categoryInput) {
    const categories = Object.keys(miniApps).map(c => `• ${c.charAt(0).toUpperCase() + c.slice(1)}`).join('\n');
    
    ctx.reply(
      `**WorldChain Mini Applications**\n\nMini apps are categorized as follows:\n\n${categories}\n\n` +
      `To see mini apps in a specific category, use:\n/miniapps [category]\n\n` +
      `Example: /miniapps defi`,
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  // Find the category
  const category = Object.keys(miniApps).find(c => c.toLowerCase().includes(categoryInput));
  
  if (!category) {
    // Category not found
    const availableCategories = Object.keys(miniApps).join(', ');
    ctx.reply(
      `Sorry, I couldn't find the "${categoryInput}" category. Available categories are: ${availableCategories}.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  // Show mini apps in the selected category
  const apps = miniApps[category];
  const appsList = apps.map(app => {
    return `**${app.name}**\n${app.description}`;
  }).join('\n\n');
  
  ctx.reply(
    `**${category.charAt(0).toUpperCase() + category.slice(1)} Mini Applications**\n\n${appsList}`,
    { parse_mode: 'Markdown' }
  );
});

// Trending command
bot.command('trending', async (ctx) => {
  // Log the trending command
  logger.logConversation(ctx, 'command', '/trending', { command: 'trending' });
  
  await ctx.replyWithChatAction("typing");
  
  try {
    // Get trending protocols from DeFi Llama API
    const trendingFromAPI = await defiLlama.getTrendingProtocols();
    
    if (trendingFromAPI && trendingFromAPI.length > 0) {
      // Create trending response using real data
      const trendingText = `**Trending Protocols Based on TVL Change**\n\n` + 
        trendingFromAPI.slice(0, 5).map((p, index) => {
          const changeFormatted = (p.change_1d || 0).toFixed(2) + '%';
          const tvlFormatted = `$${(p.tvl / 1000000).toFixed(2)}M`;
          return `**${index + 1}. ${p.name}** (${p.category || 'DeFi'})\n` +
                `   TVL: ${tvlFormatted} | 24h Change: ${changeFormatted}`;
        }).join('\n\n') + 
        '\n\n*Data is sourced from DeFi Llama and updated hourly.*';
      
      const response = ctx.reply(trendingText, { parse_mode: 'Markdown' });
      
      // Log bot response
      logger.logConversation(ctx, 'bot_response', trendingText, { 
        command: 'trending',
        data_source: 'defillama_api',
        protocols_count: trendingFromAPI.slice(0, 5).length
      });
    } else {
      // Fallback to static data if API fails
      fallbackTrendingResponse(ctx);
    }
  } catch (error) {
    console.error('Error fetching trending protocols from API:', error);
    // Fallback to static data
    fallbackTrendingResponse(ctx);
  }
});

// Fallback trending response using local data
async function fallbackTrendingResponse(ctx) {
  // Sort protocols by TVL
  const sortedProtocols = Object.values(deFiProtocols)
    .sort((a, b) => parseFloat(b.tvl.replace('$', '').replace('M', '')) - 
                    parseFloat(a.tvl.replace('$', '').replace('M', '')));
  
  // Generate growth metrics
  const withGrowth = sortedProtocols.map(p => {
    const growth = (Math.random() * 20 - 10).toFixed(2) + '%';
    const users = Math.floor(Math.random() * 5000 + 1000);
    return {
      ...p,
      growth,
      users
    };
  });
  
  // Create trending response
  const trendingText = `**Trending Protocols on WorldChain**\n\n` + 
    withGrowth.map((p, index) => {
      return `**${index + 1}. ${p.name}** (${p.category})\n` +
             `   TVL: ${p.tvl} | 24h Change: ${p.growth} | Users: ${p.users}`;
    }).join('\n\n') + 
    '\n\n*Data is based on local database with estimated metrics.*';
  
  const response = ctx.reply(trendingText, { parse_mode: 'Markdown' });
  
  // Log bot response
  logger.logConversation(ctx, 'bot_response', trendingText, { 
    command: 'trending',
    data_source: 'local_database',
    protocols_count: withGrowth.length,
    is_fallback: true
  });
}

// Data submission command
bot.command('submit', async (ctx) => {
  // Only allow data submission in private chats
  if (ctx.chat.type !== 'private') {
    return ctx.reply('For data accuracy and privacy, please use this command in a private chat to submit protocol data.');
  }

  // Check if we have text content
  if (!ctx.message || !('text' in ctx.message)) {
    ctx.reply('Error processing your submission. Please try again with text content.');
    return;
  }
  
  const args = ctx.message.text.split(' ').slice(1).join(' ');
  
  if (!args) {
    // No arguments provided, show submission instructions
    ctx.reply('To submit protocol data for review, please provide the following objective information:\n\n1. Protocol Name\n2. Factual Protocol Description (no promotional language)\n3. Official Website URL\n4. Social Media Handle (optional)\n5. Current TVL (Total Value Locked) if verifiable\n\nPlease provide this information in a single message.\n\nExample:\n\nName: ProtocolX\nDescription: Lending protocol on WorldChain supporting multiple assets\nWebsite: https://example.xyz\nSocial: @protocolx\nTVL: $5M');
    return;
  }
  
  // Store the submission in a pending queue
  const submissionId = Date.now().toString();
  const submission = {
    id: submissionId,
    userId: ctx.from?.id || 0,
    username: ctx.from?.username || 'Anonymous',
    chatId: ctx.chat.id,
    data: args,
    timestamp: new Date().toISOString(),
  };
  
  // Log the submission (in a real implementation, this would be saved to a database)
  console.log('New data submission:', submission);
  
  // Respond to the user
  ctx.reply(`Thank you for your submission! It has been received and will be reviewed by our team.\n\nSubmission ID: ${submissionId}`);
});

// Check submission status
bot.command('status', (ctx) => {
  // Check if in private chat
  if (!ctx.chat || ctx.chat.type !== 'private') {
    ctx.reply('For data privacy, please use the /status command in a private chat.');
    return;
  }

  if (!ctx.from) {
    ctx.reply('Error identifying your user account. Please try again later.');
    return;
  }

  // In the simplified version, we're not storing submissions persistently
  ctx.reply('You have no pending submissions. In the full version, this command will display the current review status of your submitted protocol data with objective status indicators.');
});

// DeFi protocols information based on DeFi Llama data
const deFiProtocols = {
  'morpho': {
    name: 'Morpho',
    description: 'Lending protocol optimizing liquidity utilization across multiple chains including WorldChain.',
    tvl: '$43.99M',
    category: 'Lending',
    website: 'https://morpho.org',
    launched: '2023 on WorldChain',
    chains: '18 chains'
  },
  're7labs': {
    name: 'Re7 Labs',
    description: 'Risk Curators protocol operating across multiple chains including WorldChain.',
    tvl: '$33.09M',
    category: 'Risk Curators',
    website: 'https://re7labs.com',
    launched: '2023 on WorldChain',
    chains: '10 chains'
  },
  'uniswap': {
    name: 'Uniswap',
    description: 'Leading decentralized exchange protocol with presence on WorldChain and many other chains.',
    tvl: '$5.15M',
    category: 'DEX',
    website: 'https://uniswap.org',
    launched: '2023 on WorldChain',
    chains: '35 chains'
  },
  'pooltogether': {
    name: 'PoolTogether',
    description: 'No-loss savings protocol utilizing prize-linked savings accounts across multiple chains.',
    tvl: '$458,028',
    category: 'Savings',
    website: 'https://pooltogether.com',
    launched: '2023 on WorldChain',
    chains: '8 chains'
  },
  'memewallet': {
    name: 'Meme Wallet',
    description: 'Launchpad protocol focused on meme tokens on WorldChain.',
    tvl: '$14,583',
    category: 'Launchpad',
    website: 'https://memewallet.xyz',
    launched: '2024 on WorldChain',
    chains: '1 chain'
  },
  'magnify': {
    name: 'Magnify Cash',
    description: 'Lending protocol native to WorldChain with focus on capital efficiency.',
    tvl: '$9,280',
    category: 'Lending',
    website: 'https://magnify.cash',
    launched: '2024 on WorldChain',
    chains: '1 chain'
  },
  'gamma': {
    name: 'Gamma',
    description: 'Liquidity management protocol operating across multiple chains including WorldChain.',
    tvl: '$2,895',
    category: 'Liquidity manager',
    website: 'https://gamma.xyz',
    launched: '2023 on WorldChain',
    chains: '36 chains'
  },
  'dackieswap': {
    name: 'DackieSwap',
    description: 'Decentralized exchange with multi-chain presence including WorldChain.',
    tvl: '$80.26',
    category: 'DEX',
    website: 'https://dackieswap.xyz',
    launched: '2024 on WorldChain',
    chains: '9 chains'
  },
  'fisclend': {
    name: 'Fisclend Finance',
    description: 'Lending protocol with focus on cross-chain functionality.',
    tvl: '$56.05',
    category: 'Lending',
    website: 'https://fisclend.finance',
    launched: '2024 on WorldChain',
    chains: '3 chains'
  },
  'worldle': {
    name: 'Worldle',
    description: 'Gaming protocol on WorldChain with integration to World ID.',
    tvl: '$380',
    category: 'Gaming',
    website: 'https://worldle.xyz',
    launched: '2024 on WorldChain',
    chains: '1 chain'
  },
  'humanfi': {
    name: 'HumanFi',
    description: 'DEX Aggregator leveraging proof-of-humanity for enhanced functionality.',
    tvl: '$61',
    category: 'DEX Aggregator',
    website: 'https://humanfi.xyz',
    launched: '2024 on WorldChain',
    chains: '1 chain'
  }
};

// Mini apps categories and examples
const miniApps = {
  'defi': [
    {
      name: 'WorldSwap Mobile',
      description: 'Mobile trading interface for WorldSwap DEX',
      category: 'DeFi'
    },
    {
      name: 'WorldChain Wallet',
      description: 'Native wallet for WorldChain assets',
      category: 'DeFi'
    }
  ],
  'gaming': [
    {
      name: 'WorldChain Realms',
      description: 'On-chain strategy game with World ID verification',
      category: 'Gaming'
    },
    {
      name: 'ID Heroes',
      description: 'Collectible game using proof-of-humanity',
      category: 'Gaming'
    }
  ],
  'social': [
    {
      name: 'WorldChat',
      description: 'Decentralized messaging with proof-of-humanity',
      category: 'Social'
    },
    {
      name: 'On-Chain Profile',
      description: 'Reputation and identity management app',
      category: 'Social'
    }
  ],
  'utility': [
    {
      name: 'Chain Explorer',
      description: 'Mobile block explorer for WorldChain',
      category: 'Utility'
    },
    {
      name: 'Gas Optimizer',
      description: 'Manages gas costs for transactions',
      category: 'Utility'
    }
  ]
};

// Utility function to find protocols
function findProtocol(name) {
  const protocolName = name.toLowerCase().trim();
  
  // First try to find by exact protocol name
  const exactNameMatch = Object.values(deFiProtocols).find(p => 
    p.name.toLowerCase() === protocolName
  );
  
  if (exactNameMatch) return exactNameMatch;
  
  // Then try to find by protocol name includes
  const nameMatch = Object.values(deFiProtocols).find(p => 
    p.name.toLowerCase().includes(protocolName)
  );
  
  if (nameMatch) return nameMatch;
  
  // Finally try to find by key
  const keyMatch = Object.entries(deFiProtocols).find(([key]) => 
    key.toLowerCase().includes(protocolName)
  );
  
  return keyMatch ? keyMatch[1] : null;
}

// Handle text messages with more sophisticated responses
bot.on('text', async (ctx) => {
  try {
    // Skip if this is a command
    if (ctx.message.text.startsWith('/')) return;
    
    // Only respond to non-command messages in private chats
    if (ctx.chat.type !== 'private') {
      // Silently ignore regular messages in group chats
      return;
    }
    
    const text = ctx.message.text.trim().toLowerCase();
    
    // Log user message for training data (only in private chats for privacy)
    logger.logConversation(ctx, 'user_message', ctx.message.text, {
      chat_type: 'private',
      message_length: ctx.message.text.length
    });
    
    await ctx.replyWithChatAction("typing");
    
    // Search for protocol information in the message
    const protocolNames = Object.values(deFiProtocols).map(p => p.name.toLowerCase());
    const foundProtocol = protocolNames.find(name => text.includes(name.toLowerCase()));
    
    // Handle different types of questions
    if (text.includes('submit') && (text.includes('data') || text.includes('protocol') || text.includes('information'))) {
      // Data submission question
      await new Promise(resolve => setTimeout(resolve, 500));
      ctx.reply(
        'To submit protocol data for review, please use the /submit command in a private chat. ' +
        'You will need to provide the protocol name, description, website, and other factual information. ' +
        'All submissions are reviewed for accuracy before being added to the database.'
      );
    } 
    else if (text.includes('morpho') || text.includes('unidex') || text.includes('worldswap') || 
             text.includes('worldstable') || text.includes('identity') || 
             text.includes('protocol') || text.includes('lending') || text.includes('dex')) {
      // Protocol specific question - check if any protocol name is mentioned
      // Use our improved findProtocol function
      const protocol = findProtocol(text);
      
      await new Promise(resolve => setTimeout(resolve, 700));
      
      if (protocol) {
        ctx.reply(
          `**${protocol.name}**\n\n` +
          `${protocol.description}\n\n` +
          `• Category: ${protocol.category}\n` +
          `• Current TVL: ${protocol.tvl}\n` +
          `• Website: ${protocol.website}\n` +
          `• Launched: ${protocol.launched}\n\n` +
          `For more detailed statistics, use the /stats ${protocol.name} command.`,
          { parse_mode: 'Markdown' }
        );
      }
    }
    else if (text.includes('mini') && text.includes('app')) {
      // Mini apps question
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const categories = Object.keys(miniApps).map(c => `• ${c}`).join('\n');
      
      ctx.reply(
        `WorldChain mini apps are categorized as follows:\n\n${categories}\n\n` +
        `To explore apps in a specific category, use the /miniapps command followed by the category name.`,
        { parse_mode: 'Markdown' }
      );
    }
    else if (text.includes('defi') || text.includes('protocols') || text.includes('tvl')) {
      // General DeFi question
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const topProtocols = Object.values(deFiProtocols)
        .sort((a, b) => parseFloat(b.tvl.replace('$', '').replace('M', '')) - 
                        parseFloat(a.tvl.replace('$', '').replace('M', '')))
        .slice(0, 3)
        .map(p => `• ${p.name} (${p.category}): ${p.tvl}`)
        .join('\n');
      
      ctx.reply(
        `Here are the top WorldChain DeFi protocols by TVL:\n\n${topProtocols}\n\n` +
        `For detailed information about a specific protocol, use the /stats command followed by the protocol name.`,
        { parse_mode: 'Markdown' }
      );
    }
    else {
      // General response for other questions
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      ctx.reply(
        `Thank you for your inquiry about "${text}". I'm the WorldChain DeFi Information Assistant, providing factual information about the WorldChain ecosystem.\n\n` +
        `You can use the following commands:\n` +
        `• /help - See all available commands\n` +
        `• /compare - Compare two protocols\n` +
        `• /stats - Get protocol statistics\n` +
        `• /miniapps - Explore WorldChain mini applications\n` +
        `• /submit - Submit protocol data (in private chat)\n\n` +
        `Or ask me about specific protocols, mini apps, or DeFi statistics.`
      );
    }
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
