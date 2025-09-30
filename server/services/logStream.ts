import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

class LogStreamService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private messageBuffers: Map<string, any[]> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/api/logs' });
    
    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const jobId = url.searchParams.get('jobId');
      
      if (jobId) {
        console.log(`[LOG STREAM] Client connected for job ${jobId}`);
        this.clients.set(jobId, ws);
        
        // Send buffered messages if any exist
        const buffered = this.messageBuffers.get(jobId);
        if (buffered && buffered.length > 0) {
          console.log(`[LOG STREAM] Flushing ${buffered.length} buffered messages for job ${jobId}`);
          buffered.forEach(msg => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(msg));
            }
          });
          this.messageBuffers.delete(jobId);
        }
        
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
    const logMessage = {
      timestamp: new Date().toISOString(),
      type,
      message
    };
    
    const client = this.clients.get(jobId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(logMessage));
    } else {
      // Buffer the message if no client is connected
      if (!this.messageBuffers.has(jobId)) {
        this.messageBuffers.set(jobId, []);
      }
      this.messageBuffers.get(jobId)!.push(logMessage);
    }
  }

  sendDetailedLog(jobId: string, data: {
    step?: string;
    message: string;
    details?: any;
    type?: 'info' | 'debug' | 'error';
  }) {
    const logMessage = {
      timestamp: new Date().toISOString(),
      ...data
    };
    
    const client = this.clients.get(jobId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(logMessage));
    } else {
      // Buffer the message if no client is connected
      if (!this.messageBuffers.has(jobId)) {
        this.messageBuffers.set(jobId, []);
      }
      this.messageBuffers.get(jobId)!.push(logMessage);
    }
  }
}

export const logStream = new LogStreamService();
