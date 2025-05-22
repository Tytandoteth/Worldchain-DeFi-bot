import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { DocumentChunk, WorldchainProtocol, WorldchainMiniApp, ProtocolStats } from "./types.js";
import { isComparisonQuery, createProtocolComparisonDocument } from "./protocol-comparer.js";

// Setup directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../../data/financial");
const WORLDCHAIN_DATA_FILE = path.resolve(DATA_DIR, "worldchain_protocols.json");
const WORLDCHAIN_DEFI_FILE = path.resolve(DATA_DIR, "worldchain_defi.md");
const WORLDCHAIN_MINI_APPS_FILE = path.resolve(DATA_DIR, "worldchain_mini_apps.json");
const PROTOCOL_STATS_DIR = path.resolve(DATA_DIR, "worldchain_protocol_stats");

/**
 * Simple RAG implementation that uses basic text search 
 * to find relevant financial information
 */
class SimpleRAG {
  private documents: DocumentChunk[] = [];
  private initialized: boolean = false;
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey
    });
  }

  /**
   * Initialize the RAG system by loading all financial documents
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Get all files in the financial data directory
      const files = await fs.readdir(DATA_DIR);
      let protocolCount = 0;
      let fileCount = 0;
      
      // Load protocol-specific statistics if they exist
      try {
        const statsDirExists = await fs.stat(PROTOCOL_STATS_DIR).then(() => true).catch(() => false);
        if (statsDirExists) {
          const statsFiles = await fs.readdir(PROTOCOL_STATS_DIR);
          for (const statsFile of statsFiles) {
            if (statsFile.endsWith('.json')) {
              const statsFilePath = path.join(PROTOCOL_STATS_DIR, statsFile);
              try {
                const content = await fs.readFile(statsFilePath, 'utf-8');
                const statsData = JSON.parse(content) as ProtocolStats;
                await this.processProtocolStats(statsData, statsFile);
                console.log(`Loaded statistics for ${statsData["App Name"] || statsFile}`);
              } catch (statsError) {
                console.error(`Error processing protocol statistics file ${statsFile}:`, statsError);
              }
            }
          }
        }
      } catch (statsDirError) {
        console.error("Error loading protocol statistics directory:", statsDirError);
      }
      
      // Load all documents
      for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (!stats.isFile()) continue;
        fileCount++;
        
        // Handle JSON files (like Worldchain protocols)
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const jsonData = JSON.parse(content);
            
            // Handle Worldchain protocols JSON specifically
            if (file === 'worldchain_protocols.json') {
              await this.processWorldchainProtocols(jsonData as WorldchainProtocol[]);
              protocolCount = jsonData.length;
            }
            // Handle Worldchain mini apps JSON
            else if (file === 'worldchain_mini_apps.json') {
              await this.processWorldchainMiniApps(jsonData as WorldchainMiniApp[]);
              console.log(`Loaded ${jsonData.length} Worldchain mini apps`);
            } else {
              // Handle other JSON files by converting to text chunks
              this.processGenericJsonData(jsonData, file);
            }
          } catch (jsonError) {
            console.error(`Error processing JSON file ${file}:`, jsonError);
          }
        }
        // Handle markdown and text files
        else if (file.endsWith('.md') || file.endsWith('.txt')) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            
            // Special handling for Worldchain DeFi data
            if (file === 'worldchain_defi.md') {
              // Create chunks with section headers
              const sections = content.split('## ');
              
              // Process the introduction (first section without ##)
              if (sections[0]) {
                this.documents.push({
                  content: sections[0].trim(),
                  source: file,
                  protocol: 'Worldchain',
                  category: 'Overview'
                });
              }
              
              // Process each section
              for (let i = 1; i < sections.length; i++) {
                const section = sections[i].trim();
                const sectionTitle = section.split('\n')[0].trim();
                
                this.documents.push({
                  content: `## ${section}`,
                  source: file,
                  protocol: 'Worldchain',
                  category: sectionTitle
                });
              }
            } else {
              // Standard processing for other markdown files
              this.documents.push({
                content,
                source: file
              });
            }
          } catch (textError) {
            console.error(`Error processing text file ${file}:`, textError);
          }
        }
      }
      
      console.log(`Loaded ${this.documents.length} document chunks from ${fileCount} files, including ${protocolCount} protocols`);
      this.initialized = true;
    } catch (error) {
      console.error("Error initializing RAG system:", error);
      throw new Error("Failed to initialize RAG system");
    }
  }
  
  /**
   * Process protocol-specific statistics
   */
  private async processProtocolStats(stats: ProtocolStats, filename: string): Promise<void> {
    // Normalize the protocol name (remove .json extension if present)
    const protocolName = stats["App Name"] || filename.replace(/\.json$/, '');
    
    // Create a detailed, conversational description of the protocol stats
    const sections = [];
    
    // Basic information
    sections.push(`# ${protocolName} - Detailed Statistics`);
    
    if (stats["Global Ranking"] !== undefined && stats["Total Apps Ranked"] !== undefined) {
      sections.push(`${protocolName} ranks #${stats["Global Ranking"]} out of ${stats["Total Apps Ranked"]} apps on Worldchain.`);
    }
    
    // Usage metrics
    const usageMetrics = [];
    if (stats["Impressions"]) usageMetrics.push(`${stats["Impressions"].toLocaleString()} impressions`);
    if (stats["Impression Growth (%)"] !== undefined) usageMetrics.push(`${stats["Impression Growth (%)"]}% impression growth`);
    if (stats["Sessions"]) usageMetrics.push(`${stats["Sessions"].toLocaleString()} sessions`);
    
    if (usageMetrics.length > 0) {
      sections.push(`## Usage Metrics\n${protocolName} has generated ${usageMetrics.join(', ')}.`);
    }
    
    // User metrics
    const userMetrics = [];
    if (stats["Users"]) userMetrics.push(`${stats["Users"].toLocaleString()} total users`);
    if (stats["Unique Users"]) userMetrics.push(`${stats["Unique Users"].toLocaleString()} unique users`);
    if (stats["Verifications"]) userMetrics.push(`${stats["Verifications"].toLocaleString()} verifications`);
    
    if (userMetrics.length > 0) {
      sections.push(`## User Base\n${protocolName} has ${userMetrics.join(' and ')}.`);
    }
    
    // Financial metrics
    const financialMetrics = [];
    if (stats["Total TVL (USD)"]) financialMetrics.push(`$${stats["Total TVL (USD)"].toLocaleString()} in Total Value Locked`);
    if (stats["Loans Issued"]) financialMetrics.push(`${stats["Loans Issued"].toLocaleString()} loans issued`);
    if (stats["Total USDC Repaid"]) financialMetrics.push(`$${stats["Total USDC Repaid"].toLocaleString()} in USDC repaid`);
    
    if (financialMetrics.length > 0) {
      sections.push(`## Financial Activity\n${protocolName} has ${financialMetrics.join(' and ')}.`);
    }
    
    // Other metrics
    const otherMetrics = [];
    if (stats["Total NFT Mints"]) otherMetrics.push(`${stats["Total NFT Mints"].toLocaleString()} NFT mints`);
    
    // Add any other keys not explicitly handled
    for (const [key, value] of Object.entries(stats)) {
      if (
        value !== undefined && 
        key !== "App Name" && 
        key !== "Global Ranking" && 
        key !== "Total Apps Ranked" && 
        key !== "Impressions" &&
        key !== "Impression Growth (%)" &&
        key !== "Sessions" &&
        key !== "Users" &&
        key !== "Unique Users" &&
        key !== "Verifications" &&
        key !== "Total TVL (USD)" &&
        key !== "Loans Issued" &&
        key !== "Total USDC Repaid" &&
        key !== "Total NFT Mints"
      ) {
        otherMetrics.push(`${key}: ${value}`);
      }
    }
    
    if (otherMetrics.length > 0) {
      sections.push(`## Other Metrics\n${otherMetrics.join('\n')}`);
    }
    
    // Create a condensed summary
    const summary = [
      `${protocolName} is a Worldchain protocol with ${stats["Users"] ? `${stats["Users"].toLocaleString()} users` : 'a growing user base'}.`,
      stats["Global Ranking"] ? `It ranks #${stats["Global Ranking"]} among Worldchain apps.` : '',
      stats["Total TVL (USD)"] ? `It has $${stats["Total TVL (USD)"].toLocaleString()} in Total Value Locked.` : '',
      stats["Loans Issued"] ? `The protocol has issued ${stats["Loans Issued"].toLocaleString()} loans.` : ''
    ].filter(Boolean).join(' ');
    
    // Add the detailed document
    this.documents.push({
      content: sections.join('\n\n'),
      source: `worldchain_protocol_stats/${filename}`,
      protocol: protocolName,
      category: 'Detailed Stats'
    });
    
    // Add the summary document
    this.documents.push({
      content: summary,
      source: `worldchain_protocol_stats/${filename}`,
      protocol: protocolName,
      category: 'Summary'
    });
  }

  /**
   * Process Worldchain mini apps data from JSON
   */
  private async processWorldchainMiniApps(miniApps: WorldchainMiniApp[]): Promise<void> {
    // Create individual mini app documents with natural language
    for (const app of miniApps) {
      // Create a conversational description of each mini app
      const content = `${app.Name} is a ${app.Category.toLowerCase()} mini app on Worldchain. ${app.Description}`;
      
      this.documents.push({
        content,
        source: 'worldchain_mini_apps.json',
        protocol: app.Name,
        category: app.Category
      });
    }
    
    // Create category-based summaries
    const categoryGroups: Record<string, WorldchainMiniApp[]> = {};
    for (const app of miniApps) {
      if (!categoryGroups[app.Category]) {
        categoryGroups[app.Category] = [];
      }
      categoryGroups[app.Category].push(app);
    }
    
    // Generate conversational category overviews
    for (const [category, apps] of Object.entries(categoryGroups)) {
      const content = [
        `Worldchain offers ${apps.length} ${category} mini apps.`,
        '',
        'These include:',
        ...apps.map(app => `- ${app.Name}: ${app.Description}`)
      ].join('\n');
      
      this.documents.push({
        content,
        source: 'worldchain_mini_apps.json',
        protocol: 'Worldchain',
        category
      });
    }
    
    // Create a complete overview of all mini apps
    const appsByPopularity = [...miniApps].sort((a, b) => a.Name.localeCompare(b.Name));
    const overview = [
      `The World App ecosystem includes ${miniApps.length} mini apps across various categories.`,
      '',
      'Some popular mini apps include:',
      ...appsByPopularity.slice(0, 5).map(app => `- ${app.Name} (${app.Category}): ${app.Description}`),
      '',
      'Mini apps span categories like Identity, Finance, Games, DeFi, and more, creating a diverse ecosystem for Worldcoin users.'
    ].join('\n');
    
    this.documents.push({
      content: overview,
      source: 'worldchain_mini_apps.json',
      protocol: 'Worldchain',
      category: 'Mini Apps Overview'
    });
  }
  
  /**
   * Process Worldchain protocols data from JSON
   */
  private async processWorldchainProtocols(protocols: WorldchainProtocol[]): Promise<void> {
    // Sort protocols by TVL
    const sortedProtocols = [...protocols].sort((a, b) => {
      const tvlA = this.extractNumericValue(a.TVL);
      const tvlB = this.extractNumericValue(b.TVL);
      return tvlB - tvlA; // Sort in descending order
    });
    
    // Create a ranking document
    const rankingContent = [
      '# Worldchain Protocol Rankings by TVL',
      '',
      'Current Total Value Locked (TVL) rankings for protocols on Worldchain:',
      '',
      '| Rank | Protocol | Category | TVL | 24h Change | 24h Revenue |',
      '| ---- | -------- | -------- | --- | ---------- | ----------- |',
      ...sortedProtocols.map((protocol, index) => 
        `| ${index + 1} | ${protocol.Name} | ${protocol.Category} | ${protocol.TVL} | ${protocol["1d Change"]} | ${protocol["Revenue 24h"] || 'N/A'} |`
      )
    ].join('\n');
    
    this.documents.push({
      content: rankingContent,
      source: 'worldchain_protocols.json',
      protocol: 'Worldchain',
      category: 'Rankings'
    });
    
    // Create individual protocol documents
    for (const protocol of protocols) {
      const protocolContent = [
        `# ${protocol.Name}`,
        '',
        `${protocol.Name} is a ${protocol.Category.toLowerCase()} protocol on Worldchain.`,
        '',
        `Current TVL: ${protocol.TVL}`,
        `24h Change: ${protocol["1d Change"]}`,
        protocol["Revenue 24h"] ? `24h Revenue: ${protocol["Revenue 24h"]}` : '',
        protocol["Volume 24h"] ? `24h Volume: ${protocol["Volume 24h"]}` : '',
        protocol["Fees/Vol (raw)"] ? `Fees/Volume Ratio: ${protocol["Fees/Vol (raw)"]}` : '',
      ].filter(Boolean).join('\n');
      
      this.documents.push({
        content: protocolContent,
        source: 'worldchain_protocols.json',
        protocol: protocol.Name,
        category: protocol.Category
      });
    }
    
    // Create category-based summaries
    const categoryGroups: Record<string, WorldchainProtocol[]> = {};
    for (const protocol of protocols) {
      if (!categoryGroups[protocol.Category]) {
        categoryGroups[protocol.Category] = [];
      }
      categoryGroups[protocol.Category].push(protocol);
    }
    
    // Generate category overviews
    for (const [category, categoryProtocols] of Object.entries(categoryGroups)) {
      // Sort by TVL within category
      const sortedCategoryProtocols = [...categoryProtocols].sort((a, b) => {
        const tvlA = this.extractNumericValue(a.TVL);
        const tvlB = this.extractNumericValue(b.TVL);
        return tvlB - tvlA;
      });
      
      const totalTVL = sortedCategoryProtocols.reduce((sum, protocol) => {
        return sum + this.extractNumericValue(protocol.TVL);
      }, 0);
      
      const content = [
        `# ${category} Protocols on Worldchain`,
        '',
        `There are ${sortedCategoryProtocols.length} ${category.toLowerCase()} protocols on Worldchain with a combined TVL of $${this.formatNumber(totalTVL)}.`,
        '',
        'The top protocols in this category are:',
        ...sortedCategoryProtocols.slice(0, 5).map((protocol, index) => 
          `${index + 1}. ${protocol.Name} (TVL: ${protocol.TVL})`
        )
      ].join('\n');
      
      this.documents.push({
        content,
        source: 'worldchain_protocols.json',
        protocol: 'Worldchain',
        category
      });
    }
    
    // Create an overall TVL summary
    const totalTVL = protocols.reduce((sum, protocol) => {
      return sum + this.extractNumericValue(protocol.TVL);
    }, 0);
    
    const tvlSummary = [
      '# Worldchain DeFi Ecosystem Overview',
      '',
      `The Worldchain DeFi ecosystem currently has ${protocols.length} protocols with a total TVL of $${this.formatNumber(totalTVL)}.`,
      '',
      'Key statistics:',
      `- Top protocol by TVL: ${sortedProtocols[0].Name} (${sortedProtocols[0].TVL})`,
      `- Number of categories: ${Object.keys(categoryGroups).length}`,
      `- Most populous category: ${Object.entries(categoryGroups).sort((a, b) => b[1].length - a[1].length)[0][0]} (${Object.entries(categoryGroups).sort((a, b) => b[1].length - a[1].length)[0][1].length} protocols)`
    ].join('\n');
    
    this.documents.push({
      content: tvlSummary,
      source: 'worldchain_protocols.json',
      protocol: 'Worldchain',
      category: 'Summary'
    });
  }
  
  /**
   * Process generic JSON data by converting it to text
   */
  private processGenericJsonData(jsonData: unknown, source: string): void {
    if (typeof jsonData === 'object' && jsonData !== null) {
      const content = this.jsonToText(jsonData as Record<string, unknown>, source);
      this.documents.push({ content, source });
    }
  }
  
  /**
   * Convert a JSON object to a readable text format
   */
  private jsonToText(json: Record<string, unknown>, title: string): string {
    const lines = [`# ${title}`];
    
    for (const [key, value] of Object.entries(json)) {
      if (typeof value === 'object' && value !== null) {
        lines.push(`## ${key}`);
        
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            lines.push(`${i + 1}. ${JSON.stringify(value[i])}`);
          }
        } else {
          for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
            lines.push(`- ${subKey}: ${subValue}`);
          }
        }
      } else {
        lines.push(`- ${key}: ${value}`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Extract numeric value from a string like "$1.23M" or "$45,678"
   */
  private extractNumericValue(value: string): number {
    // Handle values like "$1.2M" or "$45.6K"
    const match = value.match(/\$?([\d,]+\.?\d*)([KMB])?/i);
    if (!match) return 0;
    
    const baseValue = parseFloat(match[1].replace(/,/g, ''));
    const multiplier = match[2] ? 
      (match[2].toUpperCase() === 'K' ? 1000 : 
       match[2].toUpperCase() === 'M' ? 1000000 : 
       match[2].toUpperCase() === 'B' ? 1000000000 : 1) : 1;
    
    return baseValue * multiplier;
  }
  
  /**
   * Format a number for display (e.g., 1000000 -> 1M)
   */
  private formatNumber(num: number): string {
    if (num >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1) + 'B';
    } else if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1) + 'M';
    } else if (num >= 1_000) {
      return (num / 1_000).toFixed(1) + 'K';
    } else {
      return num.toString();
    }
  }
  
  /**
   * Find relevant document chunks for a given query
   */
  public async findRelevantDocuments(query: string, limit: number = 3): Promise<DocumentChunk[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Check if this is a comparison query
      if (isComparisonQuery(query, this.documents)) {
        console.log('Detected comparison query, generating comparison document');
        const comparisonDoc = createProtocolComparisonDocument(query, this.documents);
        if (comparisonDoc) {
          return [comparisonDoc];
        }
      }
      
      // Use category if present in the query
      const category = this.extractCategory(query);
      
      let relevantDocuments: DocumentChunk[] = [];
      
      // Check if this is a Worldchain-specific query
      if (this.isWorldchainQuery(query)) {
        // Further refine by protocol if mentioned
        const protocolName = this.extractProtocolName(query);
        
        // Filter documents by protocol if mentioned
        if (protocolName) {
          console.log(`Found protocol name in query: ${protocolName}`);
          relevantDocuments = this.documents.filter(doc => 
            doc.protocol === protocolName ||
            doc.content.toLowerCase().includes(protocolName.toLowerCase())
          );
        } else if (category) {
          // Filter by category if mentioned
          console.log(`Found category in query: ${category}`);
          relevantDocuments = this.documents.filter(doc => 
            doc.category === category ||
            doc.content.toLowerCase().includes(category.toLowerCase())
          );
        } else {
          // Use all Worldchain documents
          relevantDocuments = this.documents.filter(doc => 
            doc.source.includes('worldchain') ||
            (doc.protocol && doc.protocol.includes('Worldchain'))
          );
        }
      } else {
        // Use all documents for non-Worldchain queries
        relevantDocuments = this.documents;
      }
      
      // Calculate relevance scores for filtered documents
      for (const doc of relevantDocuments) {
        doc.score = this.calculateRelevance(query, doc.content);
      }
      
      // Sort by relevance score and take the top matches
      return relevantDocuments
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, limit);
    } catch (error: any) {
      console.error("Error finding relevant documents:", error);
      return [];
    }
  }
  
  /**
   * Check if a query is related to Worldchain
   */
  private isWorldchainQuery(query: string): boolean {
    const worldchainKeywords = [
      'worldchain', 'world chain', 'world app', 'chain 480', 
      'worldid', 'world id', 'worldcoin', 'world coin',
      'mini app', 'mini-app', 'miniapp', 'world ecosystem'
    ];
    
    const queryLower = query.toLowerCase();
    return worldchainKeywords.some(keyword => queryLower.includes(keyword.toLowerCase()));
  }
  
  /**
   * Extract a protocol name from a query, if present
   */
  private extractProtocolName(query: string): string | null {
    // List of protocol names we know about
    const protocolNames = this.documents
      .filter(doc => doc.protocol && doc.protocol !== 'Worldchain')
      .map(doc => doc.protocol as string);
      
    // Find the first protocol name mentioned in the query
    const queryLower = query.toLowerCase();
    for (const name of protocolNames) {
      if (queryLower.includes(name.toLowerCase())) {
        return name;
      }
    }
    
    return null;
  }
  
  /**
   * Extract a category from a query, if present
   */
  private extractCategory(query: string): string | null {
    // Common DeFi categories
    const categories = [
      'Lending', 'DEX', 'Farm', 'Yield', 'Liquidity', 'Gaming',
      'Risk', 'Launchpad', 'Aggregator', 'DEX Aggregator'
    ];
    
    // Extract category mentioned in the query
    const queryLower = query.toLowerCase();
    for (const category of categories) {
      if (queryLower.includes(category.toLowerCase())) {
        return category;
      }
    }
    
    return null;
  }
  
  /**
   * Calculate relevance score between a query and a document
   * This is a simple keyword-based scoring method
   */
  private calculateRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    // Count how many query words appear in the content
    let matchCount = 0;
    for (const word of queryWords) {
      if (word.length > 2 && contentLower.includes(word)) {
        matchCount++;
      }
    }
    
    // Calculate a simple relevance score based on word matches
    return matchCount / queryWords.length;
  }
  
  /**
   * Format the relevant documents into a context string
   */
  public formatContext(documents: DocumentChunk[]): string {
    return documents.map(doc => doc.content).join('\n\n');
  }
}

/**
 * Create a new RAG system with the given API key
 */
export function createRAG(apiKey: string): SimpleRAG {
  return new SimpleRAG(apiKey);
}

export default {
  createRAG
};
