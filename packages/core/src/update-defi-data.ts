import defiLlama from './defillama.js';

// Run an immediate update to fetch the latest Worldchain data
console.log('Fetching latest Worldchain DeFi data from DefiLlama...');
defiLlama.updateWorldchainData()
  .then(() => {
    console.log('Successfully updated Worldchain DeFi data');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to update Worldchain DeFi data:', error);
    process.exit(1);
  });
