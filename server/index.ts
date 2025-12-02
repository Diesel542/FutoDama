import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { AppError, isAppError } from "./utils/errors";
import { logger } from "./utils/logger";

const app = express();
app.use(express.json({ limit: '50mb' })); // Increased limit for vision processing
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/version', (_req: Request, res: Response) => {
    res.json({
      env: process.env.NODE_ENV || 'development',
      commit: process.env.GIT_COMMIT || 'unknown',
      version: process.env.APP_VERSION || '1.0.0'
    });
  });

  const server = await registerRoutes(app);

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (isAppError(err)) {
      logger.warn(`AppError: ${err.message}`, {
        code: err.code,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method
      });
      return res.status(err.statusCode).json(err.toJSON());
    }

    const error = err instanceof Error ? err : new Error('Unknown error');
    const statusCode = (err as any)?.status || (err as any)?.statusCode || 500;
    
    logger.error(`Unhandled error: ${error.message}`, {
      path: req.path,
      method: req.method,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });

    res.status(statusCode).json({
      error: statusCode === 500 ? 'Internal server error' : error.message,
      code: 'INTERNAL_ERROR'
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
