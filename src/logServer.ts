import * as http from 'http';

export interface BrowserLog {
    level: string;
    message: string;
    timestamp: number;
}

const logs: BrowserLog[] = [];
let server: http.Server | undefined;

export function getStoredLogs(): BrowserLog[] {
    return logs.slice();
}

export function clearStoredLogs(): void {
    logs.length = 0;
}

export function startLogServer(port: number, onError?: (error: NodeJS.ErrnoException) => void): http.Server {
    server?.close();
    server = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        const path = req.url?.split('?')[0];
        if (path !== '/api/logs') {
            res.writeHead(404);
            res.end();
            return;
        }
        if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, logs }));
            return;
        }
        if (req.method === 'DELETE') {
            clearStoredLogs();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
            return;
        }
        if (req.method === 'POST') {
            const chunks: Buffer[] = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => {
                try {
                    const data = JSON.parse(Buffer.concat(chunks).toString() || '{}');
                    logs.push({
                        level: typeof data.level === 'string' ? data.level : 'info',
                        message: String(data.message ?? ''),
                        timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now()
                    });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch {
                    res.writeHead(400);
                    res.end();
                }
            });
            return;
        }
        res.writeHead(405);
        res.end();
    });
    if (onError) {
        server.on('error', onError);
    }
    server.listen(port);
    return server;
}

export function stopLogServer(): void {
    server?.close();
    server = undefined;
}
