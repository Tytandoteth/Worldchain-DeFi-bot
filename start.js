// Simple starter script for Railway deployment
console.log('Starting WorldChain DeFi Bot...');

// Import and run the Railway deployment script using CommonJS
try {
  require('./railway-deploy.js');
} catch (error) {
  console.error('Failed to start bot:', error);
  process.exit(1);
}
