
import fs from 'fs';
import path from 'path';

export function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function sendError(res, message, statusCode = 500) {
  sendJSON(res, { error: message }, statusCode);
}

export async function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function serveStatic(req, res) {
  const filePath = path.join(process.cwd(), 'public', req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendError(res, 'Not Found', 404);
    } else {
      res.writeHead(200);
      res.end(data);
    }
  });
}
