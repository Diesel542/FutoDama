export interface AppErrorDetails {
  field?: string;
  value?: unknown;
  constraint?: string;
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: AppErrorDetails;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: AppErrorDetails
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

export function badRequest(message: string, details?: AppErrorDetails): AppError {
  return new AppError(400, 'BAD_REQUEST', message, details);
}

export function notFound(resource: string, id?: string): AppError {
  const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
  return new AppError(404, 'NOT_FOUND', message, { resource, id });
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(403, 'FORBIDDEN', message);
}

export function conflict(message: string, details?: AppErrorDetails): AppError {
  return new AppError(409, 'CONFLICT', message, details);
}

export function unprocessable(message: string, details?: AppErrorDetails): AppError {
  return new AppError(422, 'UNPROCESSABLE_ENTITY', message, details);
}

export function internal(message = 'Internal server error', details?: AppErrorDetails): AppError {
  return new AppError(500, 'INTERNAL_ERROR', message, details);
}

export function serviceUnavailable(message = 'Service temporarily unavailable'): AppError {
  return new AppError(503, 'SERVICE_UNAVAILABLE', message);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return internal(error.message);
  }
  
  return internal('An unexpected error occurred');
}
