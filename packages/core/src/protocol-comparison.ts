import { DocumentChunk } from './types.js';

/**
 * Extract multiple protocol names from a query for comparison
 * @param query The user query string
 * @param documents Array of document chunks to search for protocol names
 * @returns Array of protocol names mentioned in the query
 */
export function extractProtocolsForComparison(query: string, documents: DocumentChunk[]): string[] {
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
  const mentionedProtocols = extractProtocolsForComparison(query, documents);
  const hasMultipleProtocols = mentionedProtocols.length >= 2;
  
  return hasComparisonKeyword && hasMultipleProtocols;
}

/**
 * Get comparison documents for protocols mentioned in the query
 * @param query The user query string
 * @param documents Array of document chunks to search for protocol data
 * @returns Array of document chunks with protocol comparisons
 */
export async function getProtocolComparisonDocuments(
  query: string, 
  documents: DocumentChunk[]
): Promise<DocumentChunk[]> {
  // Extract protocols to compare
  const protocolsToCompare = extractProtocolsForComparison(query, documents);
  
  if (protocolsToCompare.length < 2) {
    return [];
  }
  
  console.log(`Comparing protocols: ${protocolsToCompare.join(', ')}`);
  
  // Find relevant documents for each protocol
  const protocolDocs: Record<string, DocumentChunk[]> = {};
  
  for (const protocol of protocolsToCompare) {
    protocolDocs[protocol] = documents.filter(doc => 
      doc.protocol === protocol
    );
  }
  
  // Create a comparison document
  const comparisonContent = await compareProtocols(protocolsToCompare, protocolDocs);
  
  return [
    {
      content: comparisonContent,
      source: 'protocol_comparison',
      protocol: protocolsToCompare.join('_vs_'),
      category: 'Comparison',
      score: 1.0 // Set highest score for custom comparisons
    }
  ];
}

/**
 * Compare multiple protocols and generate a structured comparison
 * @param protocols List of protocol names to compare
 * @param protocolDocs Record of documents for each protocol
 * @returns Formatted comparison string
 */
async function compareProtocols(
  protocols: string[], 
  protocolDocs: Record<string, DocumentChunk[]>
): Promise<string> {
  // Extract key metrics for comparison
  const comparisonData: Record<string, Record<string, string | number | undefined>> = {};
  
  for (const protocol of protocols) {
    comparisonData[protocol] = {};
    
    // Find TVL information
    const tvlDoc = protocolDocs[protocol].find(doc => 
      doc.content.toLowerCase().includes('tvl')
    );
    
    if (tvlDoc) {
      // Extract TVL value using regex
      const tvlMatch = tvlDoc.content.match(/\$([\d,.]+[KMB]?)\s+(in\s+)?TVL/i);
      if (tvlMatch) {
        comparisonData[protocol]['TVL'] = tvlMatch[1];
      }
    }
    
    // Find user information
    const userDoc = protocolDocs[protocol].find(doc => 
      doc.content.toLowerCase().includes('user') || 
      doc.content.toLowerCase().includes('unique')
    );
    
    if (userDoc) {
      // Extract user count using regex
      const userMatch = userDoc.content.match(/(\d[\d,]+)\s+(?:total\s+)?users/i);
      if (userMatch) {
        comparisonData[protocol]['Users'] = userMatch[1];
      }
    }
    
    // Find fees/revenue information
    const feesDoc = protocolDocs[protocol].find(doc => 
      doc.content.toLowerCase().includes('fee') || 
      doc.content.toLowerCase().includes('revenue')
    );
    
    if (feesDoc) {
      // Extract fees using regex
      const feesMatch = feesDoc.content.match(/\$([\d,.]+[KMB]?)\s+(in\s+)?(?:fee|revenue)/i);
      if (feesMatch) {
        comparisonData[protocol]['Fees/Revenue'] = feesMatch[1];
      }
    }
    
    // Add protocol description
    const descDoc = protocolDocs[protocol].find(doc => 
      doc.category === 'Summary' || doc.content.includes(protocol)
    );
    
    if (descDoc) {
      comparisonData[protocol]['Description'] = descDoc.content.substring(0, 200) + '...';
    }
  }
  
  // Format the comparison as a markdown table and summary
  let comparison = `# Comparison of ${protocols.join(' vs. ')}\n\n`;
  
  // Add description section
  comparison += `## Protocol Descriptions\n\n`;
  for (const protocol of protocols) {
    comparison += `### ${protocol}\n${comparisonData[protocol]['Description'] || 'No description available.'}\n\n`;
  }
  
  // Add metrics table
  comparison += '## Key Metrics Comparison\n\n';
  comparison += '| Metric | ' + protocols.map(p => p).join(' | ') + ' |\n';
  comparison += '| ------ | ' + protocols.map(() => '------').join(' | ') + ' |\n';
  
  // Add TVL row
  comparison += '| TVL | ' + protocols.map(p => comparisonData[p]['TVL'] || 'N/A').join(' | ') + ' |\n';
  
  // Add Users row
  comparison += '| Users | ' + protocols.map(p => comparisonData[p]['Users'] || 'N/A').join(' | ') + ' |\n';
  
  // Add Fees/Revenue row
  comparison += '| Fees/Revenue | ' + protocols.map(p => comparisonData[p]['Fees/Revenue'] || 'N/A').join(' | ') + ' |\n';
  
  // Add summary section
  comparison += '\n## Summary\n\n';
  comparison += `This comparison between ${protocols.join(' and ')} shows their relative positions in the Worldchain ecosystem. `;
  
  // Add TVL comparison
  const hasTVL = protocols.some(p => comparisonData[p]['TVL']);
  if (hasTVL) {
    comparison += 'In terms of Total Value Locked (TVL), ';
    const tvlValues = protocols
      .filter(p => comparisonData[p]['TVL'])
      .map(p => `${p} has ${comparisonData[p]['TVL']}`)
      .join(' while ');
    comparison += tvlValues + '. ';
  }
  
  // Add user comparison
  const hasUsers = protocols.some(p => comparisonData[p]['Users']);
  if (hasUsers) {
    comparison += 'Looking at user adoption, ';
    const userValues = protocols
      .filter(p => comparisonData[p]['Users'])
      .map(p => `${p} has ${comparisonData[p]['Users']} users`)
      .join(' compared to ');
    comparison += userValues + '. ';
  }
  
  return comparison;
}
