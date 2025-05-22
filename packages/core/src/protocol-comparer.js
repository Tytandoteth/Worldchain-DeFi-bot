/**
 * Protocol comparison utilities
 * This module provides functionality for comparing Worldchain protocols
 * and is used by the SimpleRAG system
 */

/**
 * Extract multiple protocol names from a query for comparison
 * @param {string} query - The user query string
 * @param {Array<object>} documents - Array of document chunks to search for protocol names
 * @returns {Array<string>} Array of protocol names mentioned in the query
 */
export function extractProtocolsForComparison(query, documents) {
  // Get unique protocol names we know about
  const uniqueProtocolNames = Array.from(new Set(
    documents
      .filter(doc => doc.protocol && doc.protocol !== 'Worldchain')
      .map(doc => doc.protocol)
  ));
  
  // Find all protocols mentioned in the query
  const queryLower = query.toLowerCase();
  const mentionedProtocols = [];
  
  for (const name of uniqueProtocolNames) {
    if (queryLower.includes(name.toLowerCase())) {
      mentionedProtocols.push(name);
    }
  }
  
  return mentionedProtocols;
}

/**
 * Detect if a query is asking for a comparison between protocols
 * @param {string} query - The user query string
 * @param {Array<object>} documents - Array of document chunks to search for protocol names
 * @returns {boolean} Boolean indicating if this is a comparison query
 */
export function isComparisonQuery(query, documents) {
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
  const mentionedProtocols = extractProtocolsForComparison(query, documents);
  const hasMultipleProtocols = mentionedProtocols.length >= 2;
  
  return hasComparisonKeyword && hasMultipleProtocols;
}

/**
 * Create a structured comparison document between multiple protocols
 * @param {string} query - The original user query
 * @param {Array<object>} documents - Array of all document chunks
 * @returns {object|null} A document chunk with the comparison content or null if comparison not possible
 */
export function createProtocolComparisonDocument(query, documents) {
  // Extract protocols to compare
  const protocolsToCompare = extractProtocolsForComparison(query, documents);
  
  if (protocolsToCompare.length < 2) {
    return null;
  }
  
  console.log(`Comparing protocols: ${protocolsToCompare.join(', ')}`);
  
  // Find relevant documents for each protocol
  const protocolDocs = {};
  
  for (const protocol of protocolsToCompare) {
    protocolDocs[protocol] = documents.filter(doc => 
      doc.protocol === protocol
    );
  }
  
  // Gather key metrics for each protocol
  const comparisonData = {};
  
  for (const protocol of protocolsToCompare) {
    comparisonData[protocol] = {
      name: protocol,
      category: getProtocolCategory(protocolDocs[protocol]),
      tvl: extractTVL(protocolDocs[protocol]),
      dailyChange: extractMetric(protocolDocs[protocol], '1d Change', '24h Change', 'Daily Change'),
      revenue: extractMetric(protocolDocs[protocol], 'Revenue 24h'),
      userCount: extractMetric(protocolDocs[protocol], 'Users', 'Unique Users'),
      description: getProtocolDescription(protocolDocs[protocol])
    };
  }
  
  // Create a comparison document
  const comparisonContent = generateComparisonText(protocolsToCompare, comparisonData);
  
  return {
    content: comparisonContent,
    source: 'protocol_comparison',
    protocol: protocolsToCompare.join('_vs_'),
    category: 'Comparison',
    score: 1.0 // Set highest score for custom comparisons
  };
}

/**
 * Extract a protocol's category from its documents
 * @param {Array<object>} documents - Documents for a specific protocol
 * @returns {string} Category of the protocol or 'Unknown'
 */
function getProtocolCategory(documents) {
  for (const doc of documents) {
    if (doc.category) {
      return doc.category;
    }
  }
  return 'Unknown';
}

/**
 * Extract TVL from protocol documents
 * @param {Array<object>} documents - Documents for a specific protocol
 * @returns {string} TVL value or 'Unknown'
 */
function extractTVL(documents) {
  for (const doc of documents) {
    const content = doc.content.toLowerCase();
    const tvlMatch = content.match(/tvl[:\s]+\$(\d[\d,.]+[KMB]?)/i) || 
                    content.match(/total value locked[:\s]+\$(\d[\d,.]+[KMB]?)/i);
    
    if (tvlMatch) {
      return tvlMatch[1];
    }
  }
  return 'Unknown';
}

/**
 * Extract a specific metric from protocol documents
 * @param {Array<object>} documents - Documents for a specific protocol
 * @param {...string} metricNames - Possible names for the metric
 * @returns {string} Extracted metric or 'N/A'
 */
function extractMetric(documents, ...metricNames) {
  for (const doc of documents) {
    const content = doc.content.toLowerCase();
    
    for (const name of metricNames) {
      const regex = new RegExp(`${name.toLowerCase()}[:\s]+([$\d,.]+[KMB%]?)`, 'i');
      const match = content.match(regex);
      
      if (match) {
        return match[1];
      }
    }
  }
  return 'N/A';
}

/**
 * Get a brief description of a protocol from its documents
 * @param {Array<object>} documents - Documents for a specific protocol
 * @returns {string} Brief description
 */
function getProtocolDescription(documents) {
  // Look for a description in the documents
  for (const doc of documents) {
    const content = doc.content;
    const lines = content.split('\n');
    
    // Find a line that looks like a description
    for (const line of lines) {
      if (line.includes('is a') || line.includes('protocol on Worldchain')) {
        return line;
      }
    }
  }
  
  return 'No description available';
}

/**
 * Generate a formatted comparison text between protocols
 * @param {Array<string>} protocols - Protocol names to compare
 * @param {object} comparisonData - Comparison data for each protocol
 * @returns {string} Formatted comparison text
 */
function generateComparisonText(protocols, comparisonData) {
  // Create a comparison table
  const lines = [
    `# Comparison: ${protocols.join(' vs. ')}`,
    '',
    '## Overview',
    ''
  ];
  
  // Add protocol descriptions
  for (const protocol of protocols) {
    const data = comparisonData[protocol];
    lines.push(`**${data.name}**: ${data.description}`);
  }
  
  // Create comparison table
  lines.push('', '## Key Metrics', '');
  lines.push('| Metric | ' + protocols.map(p => `**${p}**`).join(' | ') + ' |');
  lines.push('| ------ | ' + protocols.map(() => '-------').join(' | ') + ' |');
  lines.push('| Category | ' + protocols.map(p => comparisonData[p].category).join(' | ') + ' |');
  lines.push('| TVL | ' + protocols.map(p => comparisonData[p].tvl).join(' | ') + ' |');
  lines.push('| 24h Change | ' + protocols.map(p => comparisonData[p].dailyChange).join(' | ') + ' |');
  lines.push('| 24h Revenue | ' + protocols.map(p => comparisonData[p].revenue).join(' | ') + ' |');
  lines.push('| Users | ' + protocols.map(p => comparisonData[p].userCount).join(' | ') + ' |');
  
  // Add conclusion
  lines.push('', '## Summary', '');
  lines.push(`This comparison shows key metrics for ${protocols.join(' and ')}. `);
  lines.push('For more detailed information about each protocol, use the /stats command followed by the protocol name.');
  
  return lines.join('\n');
}

export default {
  isComparisonQuery,
  extractProtocolsForComparison,
  createProtocolComparisonDocument
};