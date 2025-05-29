// Data Manager for WorldChain DeFi Bot
// Handles protocol data caching, refreshing, and validation

const fs = require('fs');
const path = require('path');
const defiLlama = require('./defillama-api');

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const PROTOCOLS_CACHE_FILE = path.join(DATA_DIR, 'protocols-cache.json');
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory protocol data cache
let protocolsCache = {
  timestamp: 0,
  protocols: {},
  version: 1,
  lastRefreshAttempt: 0,
  refreshSuccess: false
};

// Protocol name aliases for better matching
const protocolAliases = {
  'morpho blue': 'morpho',
  'uniswap v3': 'uniswap',
  'pooltogether v5': 'pooltogether',
  'magnify finance': 'magnify',
  'magnify cash': 'magnify',
  're7': 're7labs',
  'dackieswap dex': 'dackieswap'
};

/**
 * Initialize the data manager
 * @returns {Promise<void>}
 */
async function initialize() {
  console.log('Initializing data manager...');
  
  // Load cache from disk if exists
  try {
    if (fs.existsSync(PROTOCOLS_CACHE_FILE)) {
      const cacheData = fs.readFileSync(PROTOCOLS_CACHE_FILE, 'utf8');
      const parsedCache = JSON.parse(cacheData);
      protocolsCache = parsedCache;
      console.log(`Loaded protocols cache with ${Object.keys(parsedCache.protocols).length} protocols from ${new Date(parsedCache.timestamp).toISOString()}`);
    }
  } catch (error) {
    console.error('Error loading protocols cache:', error);
  }
  
  // Refresh data on startup
  await refreshProtocolData();
  
  // Set up periodic refresh
  setInterval(async () => {
    try {
      await refreshProtocolData();
    } catch (error) {
      console.error('Error in scheduled data refresh:', error);
    }
  }, REFRESH_INTERVAL);
}

/**
 * Refresh protocol data from DeFi Llama API
 * @returns {Promise<boolean>} Success status
 */
async function refreshProtocolData() {
  console.log('Refreshing protocol data from DeFi Llama...');
  protocolsCache.lastRefreshAttempt = Date.now();
  
  // Implement retry logic with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Get trending protocols as a starting point
      const trendingProtocols = await defiLlama.getTrendingProtocols();
      
      if (!trendingProtocols || trendingProtocols.length === 0) {
        throw new Error('No trending protocols returned from API');
      }
      
      // Create a fresh protocols object
      const freshProtocols = {};
      
      // Process each protocol
      for (const protocol of trendingProtocols.slice(0, 20)) { // Limit to top 20
        try {
          // Get detailed protocol info
          const protocolInfo = await defiLlama.getProtocolInfo(protocol.name);
          
          if (protocolInfo) {
            // Create a normalized key for the protocol
            const normalizedName = normalizeProtocolName(protocol.name);
            
            // Store protocol with validation
            freshProtocols[normalizedName] = validateProtocolData({
              name: protocol.name,
              description: protocolInfo.description || `${protocol.name} is a protocol on WorldChain and other chains.`,
              tvl: protocolInfo.tvl || 0,
              category: protocolInfo.category || protocol.category || 'DeFi',
              website: protocolInfo.url || 'https://defillama.com',
              chains: protocolInfo.chains || protocol.chains || '1 chain',
              change_1d: protocolInfo.change_1d || 0,
              change_7d: protocolInfo.change_7d || 0,
              last_updated: Date.now()
            });
          }
        } catch (innerError) {
          console.error(`Error processing protocol ${protocol.name}:`, innerError);
        }
      }
      
      // Add the protocols from our local database that weren't in the API results
      const localProtocols = require('./railway-deploy').deFiProtocols;
      for (const [key, protocol] of Object.entries(localProtocols)) {
        const normalizedName = normalizeProtocolName(protocol.name);
        if (!freshProtocols[normalizedName]) {
          freshProtocols[normalizedName] = validateProtocolData({
            name: protocol.name,
            description: protocol.description,
            tvl: protocol.tvl,
            category: protocol.category,
            website: protocol.website,
            chains: protocol.chains || '1 chain',
            launched: protocol.launched,
            last_updated: Date.now(),
            source: 'local'
          });
        }
      }
      
      // Update cache
      protocolsCache = {
        timestamp: Date.now(),
        protocols: freshProtocols,
        version: protocolsCache.version + 1,
        lastRefreshAttempt: Date.now(),
        refreshSuccess: true
      };
      
      // Save to disk
      saveCache();
      
      console.log(`Successfully refreshed data for ${Object.keys(freshProtocols).length} protocols`);
      return true;
    } catch (error) {
      console.error(`Refresh attempt ${attempt}/${MAX_RETRIES} failed:`, error);
      
      if (attempt < MAX_RETRIES) {
        // Wait with exponential backoff before retrying
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        protocolsCache.refreshSuccess = false;
        return false;
      }
    }
  }
  
  return false;
}

/**
 * Validate and normalize protocol data
 * @param {Object} protocol - Protocol data to validate
 * @returns {Object} - Validated protocol data
 */
function validateProtocolData(protocol) {
  // Make a copy to avoid modifying the original
  const validated = { ...protocol };
  
  // Ensure required fields exist
  validated.name = validated.name || 'Unknown Protocol';
  validated.description = validated.description || 'No description available.';
  validated.category = validated.category || 'DeFi';
  validated.website = validated.website || 'https://defillama.com';
  
  // Validate TVL
  if (validated.tvl) {
    if (typeof validated.tvl === 'string') {
      // Already formatted, keep as is
    } else {
      // Convert to number and ensure it's non-negative
      const tvlValue = parseFloat(validated.tvl);
      validated.tvl = !isNaN(tvlValue) ? Math.max(0, tvlValue) : 0;
    }
  } else {
    validated.tvl = 0;
  }
  
  // Validate change percentages
  validated.change_1d = typeof validated.change_1d === 'number' ? validated.change_1d : 0;
  validated.change_7d = typeof validated.change_7d === 'number' ? validated.change_7d : 0;
  
  // Add metadata
  validated.last_updated = validated.last_updated || Date.now();
  validated.source = validated.source || 'api';
  
  return validated;
}

/**
 * Save the current cache to disk
 */
function saveCache() {
  try {
    fs.writeFileSync(PROTOCOLS_CACHE_FILE, JSON.stringify(protocolsCache, null, 2), 'utf8');
    console.log('Saved protocols cache to disk');
  } catch (error) {
    console.error('Error saving protocols cache:', error);
  }
}

/**
 * Normalize protocol name for consistent lookup
 * @param {string} name - Protocol name to normalize
 * @returns {string} - Normalized name
 */
function normalizeProtocolName(name) {
  if (!name) return '';
  
  // Convert to lowercase and remove special characters
  let normalized = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  
  // Check aliases
  const lowerName = name.toLowerCase().trim();
  for (const [alias, canonical] of Object.entries(protocolAliases)) {
    if (lowerName === alias || lowerName.includes(alias)) {
      normalized = canonical.toLowerCase().replace(/[^a-z0-9]/g, '');
      break;
    }
  }
  
  return normalized;
}

/**
 * Find a protocol by name using fuzzy matching
 * @param {string} name - Protocol name to search for
 * @returns {Object|null} - Protocol data or null if not found
 */
function findProtocol(name) {
  if (!name) return null;
  
  // Step 1: Try exact match with normalized name
  const normalizedQuery = normalizeProtocolName(name);
  const exactMatch = Object.values(protocolsCache.protocols).find(p => 
    normalizeProtocolName(p.name) === normalizedQuery
  );
  
  if (exactMatch) return exactMatch;
  
  // Step 2: Check aliases
  const lowerName = name.toLowerCase().trim();
  for (const [alias, canonical] of Object.entries(protocolAliases)) {
    if (lowerName === alias || lowerName.includes(alias)) {
      const aliasMatch = Object.values(protocolsCache.protocols).find(p => 
        normalizeProtocolName(p.name) === normalizeProtocolName(canonical)
      );
      if (aliasMatch) return aliasMatch;
    }
  }
  
  // Step 3: Try substring match
  const substringMatch = Object.values(protocolsCache.protocols).find(p => 
    p.name.toLowerCase().includes(lowerName) || lowerName.includes(p.name.toLowerCase())
  );
  
  if (substringMatch) return substringMatch;
  
  // Step 4: Try partial word matching
  const words = lowerName.split(/\s+/);
  for (const protocol of Object.values(protocolsCache.protocols)) {
    const protocolWords = protocol.name.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 2 && protocolWords.some(pw => pw.includes(word) || word.includes(pw))) {
        return protocol;
      }
    }
  }
  
  return null;
}

/**
 * Get all protocols sorted by TVL
 * @param {number} limit - Maximum number of protocols to return
 * @returns {Array} - Array of protocol objects
 */
function getAllProtocols(limit = 10) {
  const protocols = Object.values(protocolsCache.protocols);
  
  // Sort by TVL (descending)
  return protocols
    .sort((a, b) => {
      const tvlA = typeof a.tvl === 'number' ? a.tvl : parseFloat(a.tvl.replace(/[^0-9.]/g, '')) || 0;
      const tvlB = typeof b.tvl === 'number' ? b.tvl : parseFloat(b.tvl.replace(/[^0-9.]/g, '')) || 0;
      return tvlB - tvlA;
    })
    .slice(0, limit);
}

/**
 * Get trending protocols based on 24h change
 * @param {number} limit - Maximum number of protocols to return
 * @returns {Array} - Array of protocol objects
 */
function getTrendingProtocols(limit = 5) {
  const protocols = Object.values(protocolsCache.protocols);
  
  // Sort by absolute 24h change (descending)
  return protocols
    .filter(p => p.change_1d !== undefined)
    .sort((a, b) => Math.abs(b.change_1d || 0) - Math.abs(a.change_1d || 0))
    .slice(0, limit);
}

/**
 * Format TVL value for display
 * @param {number|string} tvl - TVL value to format
 * @returns {string} - Formatted TVL string
 */
function formatTVL(tvl) {
  let tvlFormatted = 'Unknown';
  
  if (tvl) {
    // Check if TVL is already formatted as a string with $ and M/B/etc.
    if (typeof tvl === 'string' && tvl.startsWith('$')) {
      tvlFormatted = tvl;
    } else {
      // Format TVL based on size
      const tvlValue = parseFloat(tvl);
      if (!isNaN(tvlValue)) {
        if (tvlValue >= 1000000000) {
          tvlFormatted = `$${(tvlValue / 1000000000).toFixed(2)}B`;
        } else if (tvlValue >= 1000000) {
          tvlFormatted = `$${(tvlValue / 1000000).toFixed(2)}M`;
        } else if (tvlValue >= 1000) {
          tvlFormatted = `$${(tvlValue / 1000).toFixed(2)}K`;
        } else {
          tvlFormatted = `$${tvlValue.toFixed(2)}`;
        }
      }
    }
  }
  
  return tvlFormatted;
}

/**
 * Store user feedback for data improvement
 * @param {Object} feedback - User feedback data
 * @returns {Promise<boolean>} - Success status
 */
async function storeUserFeedback(feedback) {
  try {
    const feedbackPath = path.join(DATA_DIR, 'user-feedback.jsonl');
    const feedbackEntry = {
      timestamp: Date.now(),
      ...feedback
    };
    
    fs.appendFileSync(feedbackPath, JSON.stringify(feedbackEntry) + '\n');
    return true;
  } catch (error) {
    console.error('Error storing user feedback:', error);
    return false;
  }
}

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics
 */
function getCacheStats() {
  return {
    protocolCount: Object.keys(protocolsCache.protocols).length,
    lastUpdated: new Date(protocolsCache.timestamp).toISOString(),
    version: protocolsCache.version,
    lastRefreshAttempt: new Date(protocolsCache.lastRefreshAttempt).toISOString(),
    refreshSuccess: protocolsCache.refreshSuccess,
    cacheAge: Date.now() - protocolsCache.timestamp
  };
}

module.exports = {
  initialize,
  refreshProtocolData,
  findProtocol,
  getAllProtocols,
  getTrendingProtocols,
  formatTVL,
  storeUserFeedback,
  getCacheStats
};
