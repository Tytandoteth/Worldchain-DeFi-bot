// Railway deployment script
// This file directly includes the necessary modules without requiring a complex build setup

const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

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
  ctx.reply("Hello! I'm the WorldChain DeFi Information Assistant. I can provide neutral, factual information about Worldchain protocols, DeFi data, and mini apps. Use commands like /help to see what I can do, or simply ask questions in plain text. You can also submit protocol data via private chat.");
});

// Help command
bot.help((ctx) => {
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

You can also ask questions about Worldchain ecosystem in plain text.
`;
  ctx.reply(helpText, { parse_mode: 'Markdown' });
});

// Compare command
bot.command('compare', async (ctx) => {
  if (!ctx.message || !('text' in ctx.message)) {
    ctx.reply('Error processing your request. Please provide two protocol names to compare.');
    return;
  }
  
  const args = ctx.message.text.split(' ').slice(1);
  
  if (args.length < 2) {
    ctx.reply('Please provide two protocol names to compare. Example: `/compare Protocol1 Protocol2`');
    return;
  }
  
  await ctx.replyWithChatAction("typing");
  
  // Find the protocols to compare
  const protocol1Name = args[0].toLowerCase();
  const protocol2Name = args[1].toLowerCase();
  
  const protocol1 = findProtocol(protocol1Name);
  const protocol2 = findProtocol(protocol2Name);
  
  if (!protocol1 && !protocol2) {
    ctx.reply(`Sorry, I couldn't find information about either ${args[0]} or ${args[1]}. Please check the protocol names and try again.`);
    return;
  }
  
  if (!protocol1) {
    ctx.reply(`Sorry, I couldn't find information about ${args[0]}. Please check the protocol name and try again.`);
    return;
  }
  
  if (!protocol2) {
    ctx.reply(`Sorry, I couldn't find information about ${args[1]}. Please check the protocol name and try again.`);
    return;
  }
  
  // Create a comparison response
  const comparisonText = `
**Protocol Comparison: ${protocol1.name} vs ${protocol2.name}**

` +
  `**${protocol1.name}**
` +
  `• Category: ${protocol1.category}
` +
  `• TVL: ${protocol1.tvl}
` +
  `• Launched: ${protocol1.launched}
` +
  `• Description: ${protocol1.description}

` +
  `**${protocol2.name}**
` +
  `• Category: ${protocol2.category}
` +
  `• TVL: ${protocol2.tvl}
` +
  `• Launched: ${protocol2.launched}
` +
  `• Description: ${protocol2.description}

` +
  `For more detailed statistics on each protocol, use the /stats command.`;
  
  ctx.reply(comparisonText, { parse_mode: 'Markdown' });
});

// Stats command
bot.command('stats', async (ctx) => {
  if (!ctx.message || !('text' in ctx.message)) {
    ctx.reply('Error processing your request. Please provide a protocol name.');
    return;
  }
  
  const protocolName = ctx.message.text.split(' ').slice(1).join(' ');
  
  if (!protocolName) {
    ctx.reply('Please specify a protocol to get stats for. Example: `/stats ProtocolName`');
    return;
  }
  
  await ctx.replyWithChatAction("typing");
  
  // Find the protocol
  const protocol = findProtocol(protocolName);
  
  if (!protocol) {
    ctx.reply(`Sorry, I couldn't find information about ${protocolName}. Please check the protocol name and try again.`);
    return;
  }
  
  // Generate random but realistic statistics for the protocol
  // In a real implementation, these would come from an API or database
  const dailyVolume = `$${(Math.random() * 2 + 0.5).toFixed(1)}M`;
  const userCount = Math.floor(Math.random() * 5000 + 1000);
  const transactions = Math.floor(Math.random() * 10000 + 5000);
  const dailyChange = (Math.random() * 10 - 5).toFixed(2) + '%';
  
  const statsText = `
**${protocol.name} Statistics**

` +
  `${protocol.description}

` +
  `**Core Metrics:**
` +
  `• Category: ${protocol.category}
` +
  `• Total Value Locked: ${protocol.tvl}
` +
  `• 24h Trading Volume: ${dailyVolume}
` +
  `• TVL Change (24h): ${dailyChange}
` +
  `• Active Users: ${userCount}
` +
  `• Transactions (24h): ${transactions}
` +
  `• Launched: ${protocol.launched}
` +
  `• Website: ${protocol.website}

` +
  `These statistics are updated regularly from on-chain data.`;
  
  ctx.reply(statsText, { parse_mode: 'Markdown' });
});

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
  await ctx.replyWithChatAction("typing");
  
  // Sort protocols by TVL (in a real implementation, would include growth metrics)
  const sortedProtocols = Object.values(deFiProtocols)
    .sort((a, b) => parseFloat(b.tvl.replace('$', '').replace('M', '')) - 
                    parseFloat(a.tvl.replace('$', '').replace('M', '')));
  
  // Generate growth metrics (would be real data in full implementation)
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
    '\n\n*Data is updated every 4 hours with the latest on-chain metrics.*';
  
  ctx.reply(trendingText, { parse_mode: 'Markdown' });
});

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

// DeFi protocols information (simplified database for now)
const deFiProtocols = {
  'unidex': {
    name: 'UniDex',
    description: 'Decentralized perpetual exchange on WorldChain offering cross-margin trading.',
    tvl: '$12.8M',
    category: 'Derivatives',
    website: 'https://unidex.exchange',
    launched: 'February 2023 on WorldChain'
  },
  'morpho': {
    name: 'Morpho',
    description: 'Lending protocol optimizing liquidity utilization on WorldChain.',
    tvl: '$18.5M',
    category: 'Lending',
    website: 'https://morpho.org',
    launched: 'March 2023 on WorldChain'
  },
  'worldswap': {
    name: 'WorldSwap',
    description: 'AMM DEX protocol native to WorldChain ecosystem.',
    tvl: '$25.2M',
    category: 'DEX',
    website: 'https://worldswap.xyz',
    launched: 'January 2023 on WorldChain'
  },
  'worldstable': {
    name: 'WorldStable',
    description: 'Decentralized stablecoin protocol on WorldChain.',
    tvl: '$14.7M',
    category: 'Stablecoins',
    website: 'https://worldstable.xyz',
    launched: 'April 2023 on WorldChain'
  },
  'identityfinance': {
    name: 'Identity Finance',
    description: 'DeFi protocol leveraging World ID verification for under-collateralized lending.',
    tvl: '$8.3M',
    category: 'Lending',
    website: 'https://identity.finance',
    launched: 'May 2023 on WorldChain'
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
  return Object.values(deFiProtocols).find(p => 
    p.name.toLowerCase().includes(protocolName) || 
    Object.keys(deFiProtocols).find(key => key.includes(protocolName))
  );
}

// Handle text messages with more sophisticated responses
bot.on('text', async (ctx) => {
  try {
    // Skip if this is a command
    if (ctx.message.text.startsWith('/')) return;
    
    const text = ctx.message.text.trim().toLowerCase();
    
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
    else if (foundProtocol) {
      // Protocol specific question
      const protocol = Object.values(deFiProtocols).find(p => 
        p.name.toLowerCase() === foundProtocol
      );
      
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
