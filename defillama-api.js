// DefiLlama API integration
const https = require('https');

// API key for Pro API
const DEFILLAMA_API_KEY = 'bbb225402ad379a4fefa6fdd55d19e47ae86385b90e1352e09fd3e23c7832045';

/**
 * Make a request to the DefiLlama API
 * @param {string} endpoint - API endpoint to call
 * @param {Object} params - Query parameters for the request
 * @returns {Promise<Object>} - JSON response from the API
 */
function makeRequest(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    // Construct query string from params
    const queryParams = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    
    const url = `https://api.llama.fi/${endpoint}${queryParams ? `?${queryParams}` : ''}`;
    
    const options = {
      headers: {
        'Content-Type': 'application/json',
        // Add API key for Pro API endpoints
        ...(endpoint.startsWith('pro/') ? { 'x-api-key': DEFILLAMA_API_KEY } : {})
      }
    };
    
    const req = https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          reject(new Error(`Failed to parse API response: ${e.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`API request failed: ${error.message}`));
    });
    
    req.end();
  });
}

/**
 * Get protocol information from DefiLlama
 * @param {string} protocolName - Name of the protocol to get info for
 * @returns {Promise<Object>} - Protocol information
 */
async function getProtocolInfo(protocolName) {
  try {
    // First, get all protocols to find the one we want
    const allProtocols = await makeRequest('protocols');
    
    // Find the protocol by name (case-insensitive partial match)
    const protocol = allProtocols.find(p => 
      p.name.toLowerCase().includes(protocolName.toLowerCase())
    );
    
    if (!protocol) {
      return null;
    }
    
    // Get detailed protocol information
    const protocolDetails = await makeRequest(`protocol/${protocol.slug}`);
    return protocolDetails;
  } catch (error) {
    console.error('Error fetching protocol info:', error);
    return null;
  }
}

/**
 * Search for protocols by name
 * @param {string} query - Search query
 * @returns {Promise<Array>} - List of matching protocols
 */
async function searchProtocols(query) {
  try {
    const allProtocols = await makeRequest('protocols');
    
    // Filter protocols by name match
    return allProtocols.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase())
    );
  } catch (error) {
    console.error('Error searching protocols:', error);
    return [];
  }
}

/**
 * Get TVL data for a specific chain
 * @param {string} chain - Chain name (e.g., "worldchain", "ethereum")
 * @returns {Promise<Object>} - TVL data for the chain
 */
async function getChainTVL(chain) {
  try {
    return await makeRequest(`v2/historicalChainTvl/${chain}`);
  } catch (error) {
    console.error(`Error fetching TVL for chain ${chain}:`, error);
    return null;
  }
}

/**
 * Get trending protocols based on TVL changes
 * @returns {Promise<Array>} - List of trending protocols
 */
async function getTrendingProtocols() {
  try {
    // This would use a Pro API endpoint in the real implementation
    // For now, we'll use the regular API and sort by TVL change
    const allProtocols = await makeRequest('protocols');
    
    // Sort by TVL change percentage (if available)
    return allProtocols
      .filter(p => p.change_1d !== null)
      .sort((a, b) => Math.abs(b.change_1d) - Math.abs(a.change_1d))
      .slice(0, 10);
  } catch (error) {
    console.error('Error fetching trending protocols:', error);
    return [];
  }
}

module.exports = {
  getProtocolInfo,
  searchProtocols,
  getChainTVL,
  getTrendingProtocols
};
