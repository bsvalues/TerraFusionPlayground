/**
 * Authentication Middleware
 * 
 * This middleware provides JWT token verification for protected API endpoints.
 * It verifies the token from the Authorization header and adds the decoded user to the request object.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth-service';
import { SecurityService } from '../services/security';

// Create instances of services
const authService = new AuthService({} as any, {} as any);
const securityService = new SecurityService({} as any);

// Define token scope enum
export enum TokenScope {
  READ_ONLY = 'read_only',
  READ_WRITE = 'read_write',
  ADMIN = 'admin'
}

// Extend Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        role: string;
        scope: string[];
      };
    }
  }
}

/**
 * Verify JWT token middleware
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    
    // Check if authorization header is present
    if (!authHeader) {
      return res.status(401).json({
        message: 'Access denied. No token provided.'
      });
    }
    
    // Check if authorization header has the correct format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Invalid token format. Use Bearer schema.'
      });
    }
    
    // Extract token from authorization header
    const token = authHeader.split(' ')[1];
    
    // Validate token
    const decoded = authService.validateToken(token);
    if (!decoded) {
      return res.status(401).json({
        message: 'Invalid or expired token.'
      });
    }
    
    // Add user to request object
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      scope: decoded.scope
    };
    
    // Log the token validation for audit purposes
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    securityService.logSecurityEvent({
      eventType: 'authentication',
      component: 'auth-middleware',
      userId: decoded.userId,
      ipAddress: clientIp,
      details: {
        username: decoded.username,
        role: decoded.role,
        scope: decoded.scope
      },
      severity: 'info'
    }).catch(err => console.error('Failed to log token validation:', err));
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Error in verifyToken middleware:', error);
    return res.status(500).json({
      message: 'Internal server error during authentication.'
    });
  }
}

/**
 * Check if the user has the required scope
 * @param requiredScope The scope required for access
 * @returns Middleware function
 */
export function requireScope(requiredScope: TokenScope) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user exists on the request
      if (!req.user) {
        return res.status(401).json({
          message: 'Access denied. Authentication required.'
        });
      }
      
      // Check if user has the required scope
      const hasScope = req.user.scope.includes(requiredScope.toString());
      if (!hasScope) {
        // Log the access denied event
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        securityService.logSecurityEvent({
          eventType: 'authorization',
          component: 'auth-middleware',
          userId: req.user.userId,
          ipAddress: clientIp,
          details: {
            username: req.user.username,
            role: req.user.role,
            requiredScope,
            userScopes: req.user.scope
          },
          severity: 'warning'
        }).catch(err => console.error('Failed to log access denied event:', err));
        
        return res.status(403).json({
          message: 'Access denied. Insufficient permissions.'
        });
      }
      
      // Continue to the next middleware or route handler
      next();
    } catch (error) {
      console.error('Error in requireScope middleware:', error);
      return res.status(500).json({
        message: 'Internal server error during authorization.'
      });
    }
  };
}

/**
 * Direct API key validation middleware
 * This allows API key authentication as an alternative to JWT tokens
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] as string;
    
    // Check if API key is provided
    if (!apiKey) {
      // No API key provided, try token authentication instead
      return verifyToken(req, res, next);
    }
    
    // Get client IP for validation
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Validate API key
    const keyDetails = authService.validateApiKey(apiKey, clientIp);
    if (!keyDetails) {
      return res.status(401).json({
        message: 'Invalid API key.'
      });
    }
    
    // Get token scopes based on access level
    const scopes = keyDetails.accessLevel === 'admin' 
      ? [TokenScope.READ_ONLY, TokenScope.READ_WRITE, TokenScope.ADMIN]
      : keyDetails.accessLevel === 'read_write'
        ? [TokenScope.READ_ONLY, TokenScope.READ_WRITE]
        : [TokenScope.READ_ONLY];
    
    // Add user to request object
    req.user = {
      userId: keyDetails.userId,
      username: keyDetails.clientId,
      role: keyDetails.accessLevel,
      scope: scopes.map(scope => scope.toString())
    };
    
    // Log the API key validation for audit purposes
    securityService.logSecurityEvent({
      eventType: 'authentication',
      component: 'auth-middleware',
      userId: keyDetails.userId,
      ipAddress: clientIp,
      details: {
        clientId: keyDetails.clientId,
        accessLevel: keyDetails.accessLevel
      },
      severity: 'info'
    }).catch(err => console.error('Failed to log API key validation:', err));
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Error in validateApiKey middleware:', error);
    return res.status(500).json({
      message: 'Internal server error during API key validation.'
    });
  }
}