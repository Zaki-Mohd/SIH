import { RAGService } from './ragService.js';

const ROLE_QUESTIONS = {
  StationController: [
    "List incidents, maintenance blocks, or speed restrictions in last 24h",
    "Any staffing or roster changes affecting today?",
    "Current operational status and alerts"
  ],
  Engineer: [
    "Open issues affecting rolling stock availability",
    "Vendor bulletins or technical circulars added in last 7 days",
    "Maintenance schedules and equipment status"
  ],
  Procurement: [
    "Contracts expiring in 60 days; pending POs; compliance notes",
    "Vendor performance issues or updates",
    "Budget allocations and expenditure tracking"
  ],
  HR: [
    "New policies, training schedules, or safety circulars in last 7 days",
    "Staff attendance and leave management updates",
    "Recruitment and onboarding activities"
  ],
  Director: [
    "High-level KPIs & risks this week across departments",
    "Strategic initiatives and project updates",
    "Compliance and regulatory updates"
  ],
};

export async function makeBriefing({ role, rag = new RAGService() }) {
  const questions = ROLE_QUESTIONS[role] ?? [];
  const results = [];
  
  for (const q of questions) {
    try {
      const resp = await rag.brief({ question: q, role, k: 3 });
      
      let formattedAnswer = resp.answer;
      if (formattedAnswer && formattedAnswer !== 'No new updates found.') {
        const lines = formattedAnswer.split('\n').filter(line => line.trim().startsWith('*'));
        const newAnswer = lines.map(line => {
          let content = line.trim().substring(1).trim();
          content = content.replace(/\*\*/g, '');

          const parts = content.split(':');
          const title = parts[0].trim();
          
          if (parts.length > 1) {
            const description = parts.slice(1).join(':').trim();
            return `* **${title}**: ${description}`;
          } else {
            return `* **${title}**`;
          }
        });
        formattedAnswer = newAnswer.join('\n');
      }

      results.push({ 
        question: q, 
        answer: formattedAnswer, 
        sources: resp.sources 
      });
    } catch (error) {
      console.error(`Error processing briefing question for ${role}:`, error);
      results.push({
        question: q,
        answer: "Error generating briefing for this topic.",
        sources: []
      });
    }
  }
  
  return { 
    role, 
    items: results, 
    generatedAt: new Date().toISOString() 
  };
}
