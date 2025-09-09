import http from 'http';
import url from 'url';
import { RAGService } from './services/ragService.js';
import { makeBriefing } from './services/briefingsService.js';
import { scanPredictiveRisks } from './services/alertsService.js';
import { config } from './config/environment.js';

const rag = new RAGService();

// Helper to send JSON responses
function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Allow any origin
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Helper to send error responses
function sendError(res, message, status = 500) {
  sendJSON(res, { error: message }, status);
}

// Helper to parse JSON body from a request
function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      if (body === '') return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', err => reject(err));
  });
}

// Main server logic
const server = http.createServer(async (req, res) => {
  const urlParts = url.parse(req.url, true);
  const pathname = urlParts.pathname;

  // Handle CORS preflight for all routes
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*', // Allow any origin
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  try {
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

    if (pathname === '/api/briefings' && req.method === 'GET') {
      const { role } = urlParts.query;
      if (!role) return sendError(res, 'role parameter is required', 400);
      const briefing = await makeBriefing({ role });
      return sendJSON(res, briefing);
    }

    if (pathname === '/api/alerts' && req.method === 'GET') {
      const { role = 'Director' } = urlParts.query;
      const alerts = await scanPredictiveRisks({ role });
      return sendJSON(res, alerts);
    }

    if (pathname === '/health') {
      return sendJSON(res, { status: 'ok', timestamp: new Date().toISOString() });
    }

    // If no route matched, send 404
    sendError(res, 'Not found', 404);

  } catch (error) {
    console.error('Unhandled error:', error);
    if (error.message === 'Invalid JSON') {
      sendError(res, 'Invalid JSON in request body', 400);
    } else {
      sendError(res, 'Internal server error');
    }
  }
});

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`🚀 Saarthi RAG Server running on port ${PORT}`);
  console.log(`📚 Available endpoints:`);
  console.log(`  POST /api/chat - Ask questions with role context`);
  console.log(`  POST /api/why - Get explanations for retrieved documents`);
  console.log(`  GET /api/briefings?role=<role> - Get daily briefings`);
  console.log(`  GET /api/alerts?role=<role> - Get predictive risk alerts`);
  console.log(`  GET /health - Health check`);
});
