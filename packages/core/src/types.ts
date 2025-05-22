/**
 * Shared type definitions for the MAGI AI bot
 */

/**
 * Represents a chunk of document content with metadata
 */
export interface DocumentChunk {
  content: string;
  source: string;
  score?: number;
  protocol?: string; // Added for tracking protocol names
  category?: string; // Added for protocol categorization
}

/**
 * Worldchain protocol data structure
 */
export interface WorldchainProtocol {
  Name: string;
  Category: string;
  TVL: string;
  "1d Change": string;
  "Revenue 24h": string;
  "Volume 24h": string;
  "Fees/Vol (raw)": string;
}

/**
 * Worldchain mini app data structure
 */
export interface WorldchainMiniApp {
  Name: string;
  Category: string;
  Description: string;
}

/**
 * Protocol statistics data structure
 */
export interface ProtocolStats {
  "App Name": string;
  "Global Ranking"?: number;
  "Total Apps Ranked"?: number;
  "Impressions"?: number;
  "Impression Growth (%)"?: number;
  "Sessions"?: number;
  "Users"?: number;
  "Verifications"?: number;
  "Unique Users"?: number;
  "Loans Issued"?: number;
  "Total TVL (USD)"?: number;
  "Total NFT Mints"?: number;
  "Total USDC Repaid"?: number;
  [key: string]: string | number | undefined;
}
