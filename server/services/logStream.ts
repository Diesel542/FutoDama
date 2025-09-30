import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

class LogStreamService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/api/logs' });
    
    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const jobId = url.searchParams.get('jobId');
      
      if (jobId) {
        console.log(`[LOG STREAM] Client connected for job ${jobId}`);
        this.clients.set(jobId, ws);
        
        ws.on('close', () => {
          console.log(`[LOG STREAM] Client disconnected for job ${jobId}`);
          this.clients.delete(jobId);
        });
        
        ws.on('error', (error) => {
          console.error(`[LOG STREAM] WebSocket error for job ${jobId}:`, error);
          this.clients.delete(jobId);
        });
      }
    });
  }

  sendLog(jobId: string, message: string, type: 'info' | 'debug' | 'error' = 'info') {
    const client = this.clients.get(jobId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        timestamp: new Date().toISOString(),
        type,
        message
      }));
    }
  }

  sendDetailedLog(jobId: string, data: {
    step: string;
    message: string;
    details?: any;
    type?: 'info' | 'debug' | 'error';
  }) {
    const client = this.clients.get(jobId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        timestamp: new Date().toISOString(),
        ...data
      }));
    }
  }
}

export const logStream = new LogStreamService();
