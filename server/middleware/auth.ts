import { Request, Response, NextFunction } from 'express';
import { validateApiKey, TokenScope, requireScope } from './auth-middleware';

// Interface for AuthRequest
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    role: string;
    scope: string[];
  };
}

// Authentication middleware that validates tokens or API keys
export function authenticate(req: Request, res: Response, next: NextFunction) {
  // Use the validateApiKey middleware which already handles both token and API key auth
  validateApiKey(req, res, next);
}

// Authorization middleware to check for specific permissions
export function authorize(requiredPermission: string) {
  // Map our permission strings to token scopes
  let requiredScope: TokenScope;
  
  if (requiredPermission.includes('admin')) {
    requiredScope = TokenScope.ADMIN;
  } else if (requiredPermission.includes('write')) {
    requiredScope = TokenScope.READ_WRITE;
  } else {
    requiredScope = TokenScope.READ_ONLY;
  }
  
  return requireScope(requiredScope);
}

// Check API key middleware - direct pass-through to validateApiKey
export function checkApiKey(req: Request, res: Response, next: NextFunction) {
  validateApiKey(req, res, next);
}

// Export default middleware
export default { authenticate, authorize, checkApiKey };