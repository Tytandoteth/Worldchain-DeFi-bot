import axios from 'axios';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

// Define strict types for DefiLlama responses
interface Protocol {
  id: string;
  name: string;
  symbol?: string;
  chainTvls: Record<string, number>;
  tvl: number;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
  tvlPrevDay?: number;
  tvlPrevWeek?: number;
  tvlPrevMonth?: number;
  mcap?: number;
  mcaptvl?: number;
  category?: string;
  chains: string[];
  description?: string;
  url?: string;
  twitter?: string;
  audit_links?: string[];
}

interface ChainTVL {
  name: string;
  tokenSymbol: string;
  cmcId?: number;
  gecko_id?: string;
  tvl: number;
  tvlPrevDay?: number;
  tvlPrevWeek?: number;
  tvlPrevMonth?: number;
  chainId: number;
}

interface HistoricalTVLData {
  date: number; // Unix timestamp
  tvl: number;
}

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../data/financial');
const DEFILLAMA_DATA_PATH = path.resolve(DATA_DIR, 'worldchain_defi.md');

// Constants
const WORLDCHAIN_ID = 480; // Per organization rules
const WORLDCHAIN_SLUG = 'worldchain'; // DefiLlama's chain slug for API calls

// DeFiLlama API endpoints
const DEFILLAMA_BASE_URL = 'https://api.llama.fi';
const DEFILLAMA_PRO_URL = 'https://pro-api.llama.fi/bbb225402ad379a4fefa6fdd55d19e47ae86385b90e1352e09fd3e23c7832045';

// Free API endpoints
const DEFILLAMA_PROTOCOLS_URL = `${DEFILLAMA_BASE_URL}/protocols`;
const DEFILLAMA_CHAINS_URL = `${DEFILLAMA_BASE_URL}/chains`;
const DEFILLAMA_CHARTS_URL = `${DEFILLAMA_BASE_URL}/charts`;
const DEFILLAMA_HISTORICAL_TVL_URL = `${DEFILLAMA_BASE_URL}/v2/historicalChainTvl`;

// Pro API endpoints
const PRO_PROTOCOLS_URL = `${DEFILLAMA_PRO_URL}/api/protocols`;
const PRO_PROTOCOL_DETAILS_URL = `${DEFILLAMA_PRO_URL}/api/protocol`;
const PRO_CHAINS_URL = `${DEFILLAMA_PRO_URL}/api/v2/chains`;
const PRO_HISTORICAL_CHAIN_TVL_URL = `${DEFILLAMA_PRO_URL}/api/v2/historicalChainTvl`;
const PRO_CHAIN_ASSETS_URL = `${DEFILLAMA_PRO_URL}/api/chainAssets`;
const PRO_ACTIVE_USERS_URL = `${DEFILLAMA_PRO_URL}/api/activeUsers`;

/**
 * DefiLlama API client that fetches and processes DeFi data for Worldchain
 */
export class DefiLlamaClient {
  private lastUpdated: Date | null = null;
  
  /**
   * Fetch all protocols from DefiLlama Pro API
   */
  public async fetchAllProtocols(): Promise<Protocol[]> {
    try {
      // Use Pro API endpoint for better data
      const response = await axios.get<Protocol[]>(PRO_PROTOCOLS_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching protocols from DefiLlama Pro API:', error);
      // Fall back to free API if Pro fails
      try {
        const fallbackResponse = await axios.get<Protocol[]>(DEFILLAMA_PROTOCOLS_URL);
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('Error fetching protocols from fallback API:', fallbackError);
        return [];
      }
    }
  }
  
  /**
   * Fetch all chains' TVL data from DefiLlama Pro API
   */
  public async fetchChainsTVL(): Promise<ChainTVL[]> {
    try {
      // Use Pro API endpoint for enhanced data
      const response = await axios.get<ChainTVL[]>(PRO_CHAINS_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching chains TVL from DefiLlama Pro API:', error);
      // Fall back to free API if Pro fails
      try {
        const fallbackResponse = await axios.get<ChainTVL[]>(DEFILLAMA_CHAINS_URL);
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('Error fetching chains TVL from fallback API:', fallbackError);
        return [];
      }
    }
  }
  
  /**
   * Fetch chain assets data - Pro API only feature
   */
  public async fetchChainAssets(): Promise<any> {
    try {
      const response = await axios.get(PRO_CHAIN_ASSETS_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching chain assets from DefiLlama Pro API:', error);
      return null;
    }
  }
  
  /**
   * Fetch active users data for a chain - Pro API only feature
   */
  public async fetchActiveUsers(): Promise<any> {
    try {
      const response = await axios.get(PRO_ACTIVE_USERS_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching active users from DefiLlama Pro API:', error);
      return null;
    }
  }
  
  /**
   * Get detailed protocol information - Pro API feature
   */
  public async getProtocolDetails(protocolSlug: string): Promise<any> {
    try {
      const response = await axios.get(`${PRO_PROTOCOL_DETAILS_URL}/${protocolSlug}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching details for protocol ${protocolSlug}:`, error);
      return null;
    }
  }
  
  /**
   * Get historical TVL data for Worldchain - Using Pro API if available
   */
  public async fetchHistoricalTVL(): Promise<HistoricalTVLData[]> {
    try {
      // Try Pro API first for more comprehensive data
      const response = await axios.get<HistoricalTVLData[]>(`${PRO_HISTORICAL_CHAIN_TVL_URL}/${WORLDCHAIN_SLUG}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching historical TVL data from Pro API:', error);
      // Fall back to free API
      try {
        const fallbackResponse = await axios.get<HistoricalTVLData[]>(`${DEFILLAMA_CHARTS_URL}/${WORLDCHAIN_SLUG}`);
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('Error fetching historical TVL data from fallback API:', fallbackError);
        return [];
      }
    }
  }
  
  /**
   * Get historical TVL data excluding liquid staking & double counting - Using Pro API
   */
  public async fetchHistoricalChainTVL(): Promise<HistoricalTVLData[]> {
    try {
      const response = await axios.get<HistoricalTVLData[]>(
        `${PRO_HISTORICAL_CHAIN_TVL_URL}/${WORLDCHAIN_SLUG}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching historical chain TVL data from Pro API:', error);
      // Fall back to free API
      try {
        const fallbackResponse = await axios.get<HistoricalTVLData[]>(
          `${DEFILLAMA_HISTORICAL_TVL_URL}/${WORLDCHAIN_SLUG}`
        );
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('Error fetching historical chain TVL data from fallback API:', fallbackError);
        return [];
      }
    }
  }
  
  /**
   * Get protocols deployed on Worldchain with enhanced data from Pro API
   */
  public async getWorldchainProtocols(): Promise<Protocol[]> {
    const allProtocols = await this.fetchAllProtocols();
    const worldchainProtocols = allProtocols.filter(protocol => 
      protocol.chains.includes(WORLDCHAIN_SLUG)
    );
    
    // For the top protocols, fetch enhanced details from Pro API
    const enhancedProtocols = await Promise.all(
      worldchainProtocols.slice(0, 5).map(async (protocol) => {
        try {
          if (protocol.id) {
            const details = await this.getProtocolDetails(protocol.id);
            if (details) {
              return { ...protocol, ...details };
            }
          }
          return protocol;
        } catch (error) {
          console.error(`Error enhancing protocol ${protocol.name}:`, error);
          return protocol;
        }
      })
    );
    
    // Combine the enhanced protocols with the rest
    return [
      ...enhancedProtocols,
      ...worldchainProtocols.slice(5)
    ];
  }
  
  /**
   * Get TVL data for Worldchain using Pro API
   */
  public async getWorldchainTVL(): Promise<ChainTVL | null> {
    const allChains = await this.fetchChainsTVL();
    return allChains.find(chain => chain.chainId === WORLDCHAIN_ID) || null;
  }
  
  /**
   * Format the Worldchain DeFi data into a markdown document using Pro API data
   */
  public async formatWorldchainDataMarkdown(): Promise<string> {
    const protocols = await this.getWorldchainProtocols();
    const chainTVL = await this.getWorldchainTVL();
    const historicalTVL = await this.fetchHistoricalTVL();
    const chainAssets = await this.fetchChainAssets();
    const activeUsers = await this.fetchActiveUsers();
    
    if (!chainTVL) {
      return '# Worldchain DeFi Data\n\nNo data available for Worldchain (ID 480) at this time.';
    }
    
    const formattedDate = new Date().toISOString().split('T')[0];
    let markdown = `# Worldchain DeFi Data (${formattedDate})\n\n`;
    
    // Chain overview with enhanced Pro API data
    markdown += `## Chain Overview\n`;
    markdown += `- **Chain ID**: ${WORLDCHAIN_ID}\n`;
    markdown += `- **Chain Name**: Worldchain\n`;
    markdown += `- **Token Symbol**: ${chainTVL.tokenSymbol || 'WORLD'}\n`;
    markdown += `- **Total Value Locked (TVL)**: $${this.formatNumber(chainTVL.tvl)}\n`;
    
    if (chainTVL.tvlPrevDay) {
      const dailyChange = ((chainTVL.tvl - chainTVL.tvlPrevDay) / chainTVL.tvlPrevDay) * 100;
      markdown += `- **24h Change**: ${dailyChange.toFixed(2)}% ${dailyChange >= 0 ? '📈' : '📉'}\n`;
    }
    
    if (chainTVL.tvlPrevWeek) {
      const weeklyChange = ((chainTVL.tvl - chainTVL.tvlPrevWeek) / chainTVL.tvlPrevWeek) * 100;
      markdown += `- **7d Change**: ${weeklyChange.toFixed(2)}% ${weeklyChange >= 0 ? '📈' : '📉'}\n`;
    }
    
    // Active Users data from Pro API
    if (activeUsers) {
      markdown += `\n## User Activity\n`;
      try {
        // Filter for Worldchain data if available
        const worldchainUsers = activeUsers.chains?.find((c: any) => 
          c.name.toLowerCase() === WORLDCHAIN_SLUG.toLowerCase());
        
        if (worldchainUsers) {
          if (worldchainUsers.dailyActiveUsers) {
            markdown += `- **Daily Active Users**: ${worldchainUsers.dailyActiveUsers.toLocaleString()}\n`;
          }
          if (worldchainUsers.weeklyActiveUsers) {
            markdown += `- **Weekly Active Users**: ${worldchainUsers.weeklyActiveUsers.toLocaleString()}\n`;
          }
          if (worldchainUsers.monthlyActiveUsers) {
            markdown += `- **Monthly Active Users**: ${worldchainUsers.monthlyActiveUsers.toLocaleString()}\n`;
          }
        } else {
          // General DeFi users stats if chain-specific not available
          if (activeUsers.totalDailyActiveUsers) {
            markdown += `- **Global DeFi Daily Active Users**: ${activeUsers.totalDailyActiveUsers.toLocaleString()}\n`;
          }
          if (activeUsers.totalWeeklyActiveUsers) {
            markdown += `- **Global DeFi Weekly Active Users**: ${activeUsers.totalWeeklyActiveUsers.toLocaleString()}\n`;
          }
          if (activeUsers.totalMonthlyActiveUsers) {
            markdown += `- **Global DeFi Monthly Active Users**: ${activeUsers.totalMonthlyActiveUsers.toLocaleString()}\n`;
          }
        }
      } catch (error) {
        console.error('Error parsing active users data:', error);
      }
    }
    
    // Chain Assets data from Pro API
    if (chainAssets) {
      markdown += `\n## Chain Assets\n`;
      try {
        // Extract Worldchain assets if available
        const worldchainAssets = chainAssets[WORLDCHAIN_SLUG] || [];
        
        if (worldchainAssets.length > 0) {
          markdown += `### Top Assets on Worldchain\n`;
          
          // Sort by TVL if available
          const sortedAssets = worldchainAssets
            .sort((a: any, b: any) => (b.tvl || 0) - (a.tvl || 0))
            .slice(0, 5);
          
          for (const asset of sortedAssets) {
            markdown += `- **${asset.symbol || 'Unknown Asset'}**: $${this.formatNumber(asset.tvl || 0)}\n`;
          }
        } else {
          markdown += `No detailed asset information available for Worldchain yet.\n`;
        }
      } catch (error) {
        console.error('Error parsing chain assets data:', error);
        markdown += `Asset data not available at this time.\n`;
      }
    }
    
    // Historical TVL Trend with enhanced visualization
    if (historicalTVL.length > 0) {
      markdown += `\n## TVL Trend\n`;
      
      // Get the last 30 days of data if available
      const recentTVL = historicalTVL.slice(-30);
      
      if (recentTVL.length > 1) {
        // Calculate 30-day trend
        const oldestTVL = recentTVL[0].tvl;
        const newestTVL = recentTVL[recentTVL.length - 1].tvl;
        const thirtyDayChange = ((newestTVL - oldestTVL) / oldestTVL) * 100;
        
        markdown += `- **30-day Trend**: ${thirtyDayChange.toFixed(2)}% ${thirtyDayChange >= 0 ? '📈' : '📉'}\n`;
        
        // Add key milestone dates and values
        const keyDates = [
          { period: '7 days ago', index: -7 },
          { period: '30 days ago', index: -30 },
          { period: 'All-time high', index: -1, findMax: true },
        ];
        
        for (const date of keyDates) {
          if (date.findMax) {
            // Find all-time high
            const maxTVL = Math.max(...historicalTVL.map(d => d.tvl));
            const maxTVLDate = historicalTVL.find(d => d.tvl === maxTVL);
            if (maxTVLDate) {
              const dateStr = new Date(maxTVLDate.date * 1000).toISOString().split('T')[0];
              markdown += `- **All-time High**: $${this.formatNumber(maxTVL)} (${dateStr})\n`;
            }
          } else if (recentTVL.length + date.index >= 0) {
            const targetDate = recentTVL[Math.max(0, recentTVL.length + date.index)];
            const dateStr = new Date(targetDate.date * 1000).toISOString().split('T')[0];
            markdown += `- **${date.period}**: $${this.formatNumber(targetDate.tvl)} (${dateStr})\n`;
          }
        }
        
        // Add a simple ASCII chart visualization
        markdown += `\n### TVL Chart (Last 14 Days)\n\`\`\`\n`;
        const chartData = recentTVL.slice(-14);
        if (chartData.length >= 7) {
          const maxChartTVL = Math.max(...chartData.map(d => d.tvl));
          const minChartTVL = Math.min(...chartData.map(d => d.tvl));
          const range = maxChartTVL - minChartTVL;
          const chartHeight = 7; // lines
          
          for (let i = 0; i < chartHeight; i++) {
            const rowValue = maxChartTVL - (i * (range / (chartHeight - 1)));
            let row = `${this.formatNumber(rowValue).padStart(8)} |`;
            
            for (const point of chartData) {
              const normalizedValue = (point.tvl - minChartTVL) / range;
              const position = Math.round(normalizedValue * (chartHeight - 1));
              row += (chartHeight - 1 - i) === position ? '*' : ' ';
            }
            
            markdown += row + '\n';
          }
          
          // Add date labels
          markdown += `           `;
          for (let i = 0; i < chartData.length; i += Math.ceil(chartData.length / 7)) {
            const dateStr = new Date(chartData[i].date * 1000).toISOString().split('T')[0].slice(5);
            markdown += dateStr.padEnd(10);
          }
        } else {
          markdown += `Insufficient data for chart visualization\n`;
        }
        markdown += `\n\`\`\`\n`;
      }
    }
    
    // Protocols section with enhanced data from Pro API
    markdown += `\n## Protocols (${protocols.length})\n\n`;
    
    if (protocols.length === 0) {
      markdown += 'No protocols currently tracked on Worldchain.\n';
    } else {
      // Sort protocols by TVL
      const sortedProtocols = protocols.sort((a, b) => {
        const aTVL = a.chainTvls[WORLDCHAIN_SLUG] || 0;
        const bTVL = b.chainTvls[WORLDCHAIN_SLUG] || 0;
        return bTVL - aTVL;
      });
      
      // Add summary of top categories
      const categories = sortedProtocols.reduce((acc, protocol) => {
        const category = protocol.category || 'Unknown';
        if (!acc[category]) acc[category] = 0;
        acc[category] += protocol.chainTvls[WORLDCHAIN_SLUG] || 0;
        return acc;
      }, {} as Record<string, number>);
      
      // Sort categories by TVL
      const sortedCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      markdown += `### Top Categories by TVL\n`;
      for (const [category, tvl] of sortedCategories) {
        markdown += `- **${category}**: $${this.formatNumber(tvl)}\n`;
      }
      markdown += `\n`;
      
      // Add top protocols with enhanced data from Pro API
      markdown += `### Top Protocols\n\n`;
      for (const protocol of sortedProtocols.slice(0, 15)) {
        const protocolTVL = protocol.chainTvls[WORLDCHAIN_SLUG] || 0;
        markdown += `#### ${protocol.name}${protocol.symbol ? ` (${protocol.symbol})` : ''}\n`;
        markdown += `- **Category**: ${protocol.category || 'Unknown'}\n`;
        markdown += `- **TVL on Worldchain**: $${this.formatNumber(protocolTVL)}\n`;
        
        if (protocol.change_1d) {
          markdown += `- **24h Change**: ${protocol.change_1d.toFixed(2)}% ${protocol.change_1d >= 0 ? '↗️' : '↘️'}\n`;
        }
        
        if (protocol.change_7d) {
          markdown += `- **7d Change**: ${protocol.change_7d.toFixed(2)}% ${protocol.change_7d >= 0 ? '↗️' : '↘️'}\n`;
        }
        
        // Show mcap/TVL ratio if available (Pro API feature)
        if (protocol.mcap && protocol.tvl) {
          const mcapTvlRatio = protocol.mcap / protocol.tvl;
          markdown += `- **MCap/TVL Ratio**: ${mcapTvlRatio.toFixed(2)}\n`;
        }
        
        if (protocol.description) {
          markdown += `- **Description**: ${protocol.description.slice(0, 150)}${protocol.description.length > 150 ? '...' : ''}\n`;
        }
        
        if (protocol.url) {
          markdown += `- **Website**: ${protocol.url}\n`;
        }
        
        if (protocol.twitter) {
          markdown += `- **Twitter**: @${protocol.twitter}\n`;
        }
        
        // Add audit information if available (Pro API feature)
        if (protocol.audit_links && protocol.audit_links.length > 0) {
          markdown += `- **Audited**: Yes (${protocol.audit_links.length} audit${protocol.audit_links.length > 1 ? 's' : ''})\n`;
        }
        
        markdown += '\n';
      }
    }
    
    // Add update timestamp
    this.lastUpdated = new Date();
    markdown += `\n---\n\nData last updated: ${this.lastUpdated.toISOString()}\nSource: DefiLlama Pro API\nChain ID: ${WORLDCHAIN_ID}`;
    
    return markdown;
  }
  
  /**
   * Format large numbers for readability
   */
  private formatNumber(num: number): string {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
    } else {
      return num.toFixed(2);
    }
  }
  
  /**
   * Update the Worldchain DeFi data file
   */
  public async updateWorldchainData(): Promise<void> {
    try {
      const markdown = await this.formatWorldchainDataMarkdown();
      await fs.writeFile(DEFILLAMA_DATA_PATH, markdown, 'utf-8');
      console.log(`Updated Worldchain DeFi data at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Error updating Worldchain DeFi data:', error);
    }
  }
  
  /**
   * Schedule automatic updates
   * @param cronExpression - cron expression for update frequency (default: every 4 hours)
   */
  public scheduleUpdates(cronExpression: string = '0 */4 * * *'): void {
    cron.schedule(cronExpression, async () => {
      await this.updateWorldchainData();
    });
    
    console.log(`Scheduled DefiLlama data updates with expression: ${cronExpression}`);
  }
}

// Export a singleton instance
const defiLlama = new DefiLlamaClient();
export default defiLlama;
