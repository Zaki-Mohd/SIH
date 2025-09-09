import { RAGService } from './ragService.js';

const RISK_QUERIES = [
  "Find any regulatory circulars or directives mentioning deadlines, penalties, or compliance requirements",
  "Flag incidents mentioning 'safety', 'near-miss', 'fire', 'derail', 'overspeed', 'intrusion'",
  "Identify contracts or agreements with upcoming renewal dates or penalty clauses",
  "Locate maintenance schedules showing overdue or critical items"
];

export async function scanPredictiveRisks({ rag = new RAGService(), role = 'Director' }) {
  const hits = [];
  
  for (const q of RISK_QUERIES) {
    try {
      const resp = await rag.ask({ question: q, role, k: 8 });
      // If we have sources, consider it a potential risk
      if (resp.sources?.length) {
        hits.push({ 
          query: q, 
          answer: resp.answer, 
          sources: resp.sources 
        });
      }
    } catch (error) {
      console.error('Error in risk scanning:', error);
    }
  }
  
  return { 
    alerts: hits, 
    timestamp: new Date().toISOString() 
  };
}