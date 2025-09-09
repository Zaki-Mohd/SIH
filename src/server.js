import http from 'http';
import url from 'url';
import { RAGService } from './services/ragService.js';
import { makeBriefing } from './services/briefingsService.js';
import { scanPredictiveRisks } from './services/alertsService.js';
import { config } from './config/environment.js';

const rag = new RAGService();

function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, message, status = 500) {
  sendJSON(res, { error: message }, status);
}

async function handleChatRequest(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  
  req.on('end', async () => {
    try {
      const { question, role, filter } = JSON.parse(body);
      
      if (!question || !role) {
        return sendError(res, 'question and role are required', 400);
      }

      const response = await rag.ask({ question, role, filter });
      sendJSON(res, response);
    } catch (error) {
      console.error('Chat error:', error);
      sendError(res, 'Internal server error');
    }
  });
}

async function handleWhyRequest(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  
  req.on('end', async () => {
    try {
      const { question, role, docs } = JSON.parse(body);
      
      if (!question || !role || !docs) {
        return sendError(res, 'question, role, and docs are required', 400);
      }

      const response = await rag.why({ question, role, docs });
      sendJSON(res, response);
    } catch (error) {
      console.error('Why error:', error);
      sendError(res, 'Internal server error');
    }
  });
}

async function handleBriefingRequest(req, res) {
  const urlParts = url.parse(req.url, true);
  const { role } = urlParts.query;
  
  if (!role) {
    return sendError(res, 'role parameter is required', 400);
  }

  try {
    const briefing = await makeBriefing({ role });
    sendJSON(res, briefing);
  } catch (error) {
    console.error('Briefing error:', error);
    sendError(res, 'Internal server error');
  }
}

async function handleAlertsRequest(req, res) {
  const urlParts = url.parse(req.url, true);
  const { role = 'Director' } = urlParts.query;
  
  try {
    const alerts = await scanPredictiveRisks({ role });
    sendJSON(res, alerts);
  } catch (error) {
    console.error('Alerts error:', error);
    sendError(res, 'Internal server error');
  }
}

const server = http.createServer((req, res) => {
  const urlParts = url.parse(req.url, true);
  const pathname = urlParts.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // Route handlers
  if (pathname === '/api/chat' && req.method === 'POST') {
    return handleChatRequest(req, res);
  }
  
  if (pathname === '/api/why' && req.method === 'POST') {
    return handleWhyRequest(req, res);
  }
  
  if (pathname === '/api/briefings' && req.method === 'GET') {
    return handleBriefingRequest(req, res);
  }
  
  if (pathname === '/api/alerts' && req.method === 'GET') {
    return handleAlertsRequest(req, res);
  }

  // Health check
  if (pathname === '/health') {
    return sendJSON(res, { status: 'ok', timestamp: new Date().toISOString() });
  }

  // 404
  sendError(res, 'Not found', 404);
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