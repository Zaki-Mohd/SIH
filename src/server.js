
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { RAGService } from './services/ragService.js';
import { makeBriefing } from './services/briefingsService.js';
import { scanPredictiveRisks } from './services/alertsService.js';
import {
  sendError,
  sendJSON,
  getBody,
  serveStatic,
} from './utils/httpHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3001;
const rag = new RAGService();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  try {
    // Health check
    if (pathname === '/health' && req.method === 'GET') {
      return sendJSON(res, { status: 'ok' });
    }

    // Route handlers
    if (pathname === '/api/chat' && req.method === 'POST') {
      const { question, role, filter } = await getBody(req);
      if (!question || !role) {
        return sendError(res, 'question and role are required', 400);
      }
      const response = await rag.ask({ question, role, filter });
      return sendJSON(res, response);
    }

    if (pathname === '/api/why' && req.method === 'POST') {
      const { question, role, docs } = await getBody(req);
      if (!question || !role || !docs) {
        return sendError(res, 'question, role, and docs are required', 400);
      }
      const response = await rag.why({ question, role, docs });
      return sendJSON(res, response);
    }

    if (pathname.startsWith('/api/briefings') && req.method === 'GET') {
      const role = url.searchParams.get('role');
      if (!role) {
        return sendError(res, 'role is required', 400);
      }
      const response = await makeBriefing({ role, rag });
      return sendJSON(res, response);
    }

    if (pathname.startsWith('/api/alerts') && req.method === 'GET') {
      console.log("Received request for /api/alerts");
      const role = url.searchParams.get('role');
      if (!role) {
        return sendError(res, 'role is required', 400);
      }
      const response = await scanPredictiveRisks({ role, rag });
      return sendJSON(res, response);
    }

    // Serve static files for the frontend
    return serveStatic(req, res);
  } catch (error) {
    console.error('Server error:', error);
    sendError(res, 'Internal Server Error', 500);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Saarthi RAG Server running on port ${PORT}`);
  console.log(`📚 Available endpoints:`);
  console.log(`  POST /api/chat - Ask questions with role context`);
  console.log(`  POST /api/why - Get explanations for retrieved documents`);
  console.log(`  GET /api/briefings?role=<role> - Get daily briefings`);
  console.log(`  GET /api/alerts?role=<role> - Get predictive risk alerts`);
  console.log(`  GET /health - Health check`);
});
