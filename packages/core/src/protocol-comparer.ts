/**
 * Protocol Comparison Module for MAGI AI Bot
 * Provides utilities for comparing multiple Worldchain protocols
 */
import { DocumentChunk } from './types.js';

/**
 * Detect if a query is asking for a comparison between protocols
 * @param query The user query string
 * @param documents Array of document chunks to search for protocol names
 * @returns Boolean indicating if this is a comparison query
 */
export function isComparisonQuery(query: string, documents: DocumentChunk[]): boolean {
  // Check for comparison keywords
  const comparisonKeywords = [
    'compare', 'comparison', 'versus', 'vs', 'vs.', 'difference', 
    'better', 'worse', 'best', 'worst', 'between', 'which'
  ];
  
  const queryLower = query.toLowerCase();
  const hasComparisonKeyword = comparisonKeywords.some(keyword => 
    queryLower.includes(keyword)
  );
  
  // Check if multiple protocols are mentioned
  const protocols = extractProtocolsFromQuery(query, documents);
  
  return hasComparisonKeyword && protocols.length >= 2;
}

/**
 * Extract protocol names from a query
 * @param query The user query string
 * @param documents Array of document chunks to search for protocol names
 * @returns Array of protocol names mentioned in the query
 */
export function extractProtocolsFromQuery(query: string, documents: DocumentChunk[]): string[] {
  // Get unique protocol names we know about
  const uniqueProtocolNames = Array.from(new Set(
    documents
      .filter(doc => doc.protocol && doc.protocol !== 'Worldchain')
      .map(doc => doc.protocol as string)
  ));
  
  // Find all protocols mentioned in the query
  const queryLower = query.toLowerCase();
  const mentionedProtocols: string[] = [];
  
  for (const name of uniqueProtocolNames) {
    if (queryLower.includes(name.toLowerCase())) {
      mentionedProtocols.push(name);
    }
  }
  
  return mentionedProtocols;
}

/**
 * Create a comparison document for protocols mentioned in a query
 * @param query The user query
 * @param documents The full document collection
 * @returns A document chunk with the comparison information
 */
export function createProtocolComparisonDocument(
  query: string, 
  documents: DocumentChunk[]
): DocumentChunk | null {
  const protocols = extractProtocolsFromQuery(query, documents);
  
  if (protocols.length < 2) {
    return null;
  }
  
  console.log(`Creating comparison between: ${protocols.join(', ')}`);
  
  // Create a markdown table comparing key metrics
  let comparisonContent = `# Comparison of ${protocols.join(' vs. ')}\n\n`;
  
  // Get documents for each protocol
  const protocolDocs: Record<string, DocumentChunk[]> = {};
  protocols.forEach(protocol => {
    protocolDocs[protocol] = documents.filter(doc => doc.protocol === protocol);
  });
  
  // Extract key metrics for each protocol
  const metrics: Record<string, Record<string, string>> = {};
  
  protocols.forEach(protocol => {
    metrics[protocol] = {};
    
    // Extract TVL information
    const tvlDoc = protocolDocs[protocol].find(doc => 
      doc.content.toLowerCase().includes('tvl')
    );
    if (tvlDoc) {
      const tvlMatch = tvlDoc.content.match(/\$([\d,.]+[KMB]?)\s+(in\s+)?TVL/i);
      if (tvlMatch) {
        metrics[protocol]['TVL'] = tvlMatch[1];
      }
    }
    
    // Extract user count if available
    const userDoc = protocolDocs[protocol].find(doc => 
      doc.content.toLowerCase().includes('user') || 
      doc.content.toLowerCase().includes('unique')
    );
    if (userDoc) {
      const userMatch = userDoc.content.match(/([\d,]+)\s+(?:total\s+)?users/i);
      if (userMatch) {
        metrics[protocol]['Users'] = userMatch[1];
      }
    }
    
    // Extract category if available
    const categoryDoc = protocolDocs[protocol].find(doc => doc.category);
    if (categoryDoc && categoryDoc.category) {
      metrics[protocol]['Category'] = categoryDoc.category;
    }
  });
  
  // Create a markdown table with the comparison
  comparisonContent += '## Key Metrics\n\n';
  comparisonContent += '| Metric | ' + protocols.map(p => p).join(' | ') + ' |\n';
  comparisonContent += '| ------ | ' + protocols.map(() => '------').join(' | ') + ' |\n';
  
  // Add rows for each metric we found
  const allMetrics = new Set<string>();
  Object.values(metrics).forEach(protocolMetrics => {
    Object.keys(protocolMetrics).forEach(metric => allMetrics.add(metric));
  });
  
  Array.from(allMetrics).forEach(metric => {
    comparisonContent += `| ${metric} | `;
    protocols.forEach(protocol => {
      comparisonContent += (metrics[protocol][metric] || 'N/A') + ' | ';
    });
    comparisonContent += '\n';
  });
  
  // Add a summary section
  comparisonContent += '\n## Summary\n\n';
  comparisonContent += `This comparison shows key metrics between ${protocols.join(' and ')} on Worldchain. `;
  
  if (protocols.every(p => metrics[p]['TVL'])) {
    comparisonContent += 'Looking at TVL (Total Value Locked), ';
    const tvlValues = protocols.map(p => `${p} has ${metrics[p]['TVL']}`).join(' while ');
    comparisonContent += tvlValues + '. ';
  }
  
  if (protocols.some(p => metrics[p]['Users'])) {
    comparisonContent += 'In terms of user adoption, ';
    const userValues = protocols
      .filter(p => metrics[p]['Users'])
      .map(p => `${p} has ${metrics[p]['Users']} users`)
      .join(' compared to ');
    if (userValues) {
      comparisonContent += userValues + '. ';
    }
  }
  
  return {
    content: comparisonContent,
    source: 'protocol_comparison',
    protocol: protocols.join('_vs_'),
    category: 'Comparison',
    score: 1.0 // Highest relevance score
  };
}
