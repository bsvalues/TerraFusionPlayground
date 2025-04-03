/**
 * Authentication Service
 * 
 * This service provides JWT-based authentication for securing the MCP API endpoints.
 * It handles token generation, validation, and role-based access control.
 */

import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { storage } from '../storage';
import { securityService } from './security';

// Define the JWT payload structure
export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
  scope: string[];
  exp?: number;
  iat?: number;
}

// Define token scopes for MCP access levels
export enum TokenScope {
  READ_ONLY = 'mcp:read',
  READ_WRITE = 'mcp:read:write',
  ADMIN = 'mcp:admin'
}

// Access level definition
export enum AccessLevel {
  READ_ONLY = 'read_only',
  READ_WRITE = 'read_write',
  ADMIN = 'admin'
}

// Define the API key schema
export const apiKeySchema = z.object({
  key: z.string().min(32).max(64),
  clientId: z.string().min(8).max(32),
  userId: z.number(),
  accessLevel: z.enum([AccessLevel.READ_ONLY, AccessLevel.READ_WRITE, AccessLevel.ADMIN]),
  description: z.string().optional(),
  createdAt: z.date(),
  expiresAt: z.date().optional(),
  lastUsed: z.date().optional(),
  rateLimit: z.number().optional(),
  ipRestrictions: z.array(z.string()).optional()
});

export type ApiKey = z.infer<typeof apiKeySchema>;

// Map API access levels to token scopes
const accessLevelToScopes: Record<AccessLevel, TokenScope[]> = {
  [AccessLevel.READ_ONLY]: [TokenScope.READ_ONLY],
  [AccessLevel.READ_WRITE]: [TokenScope.READ_ONLY, TokenScope.READ_WRITE],
  [AccessLevel.ADMIN]: [TokenScope.READ_ONLY, TokenScope.READ_WRITE, TokenScope.ADMIN]
};

export class AuthService {
  // Secret for signing JWT tokens
  private jwtSecret: string;
  
  // Token expiration time (1 hour by default)
  private tokenExpirationTime: number;
  
  // In-memory API key storage
  private apiKeys: Map<string, ApiKey> = new Map();
  
  /**
   * Initialize the authentication service
   */
  constructor() {
    // In a production environment, this should be loaded from environment variables
    this.jwtSecret = process.env.JWT_SECRET || 'benton-county-mcp-jwt-secret-2024';
    this.tokenExpirationTime = 60 * 60; // 1 hour in seconds
    
    // Initialize default API keys for testing
    this.initializeDefaultApiKeys();
    
    console.log('Authentication service initialized');
  }
  
  /**
   * Initialize default API keys for testing
   */
  private initializeDefaultApiKeys() {
    // Create default API keys
    const defaultKeys: ApiKey[] = [
      {
        key: 'api-key-read-only-3a9f8e7d6c5b4a3210',
        clientId: 'assessor-portal',
        userId: 1,
        accessLevel: AccessLevel.READ_ONLY,
        description: 'Read-only access for Assessor Portal',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      },
      {
        key: 'api-key-read-write-7d8e9f6a5b4c3d2e10',
        clientId: 'admin-dashboard',
        userId: 1,
        accessLevel: AccessLevel.READ_WRITE,
        description: 'Read-write access for Admin Dashboard',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      },
      {
        key: 'api-key-admin-1a2b3c4d5e6f7g8h9i0j',
        clientId: 'mcp-admin',
        userId: 1,
        accessLevel: AccessLevel.ADMIN,
        description: 'Full admin access for MCP administration',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      }
    ];
    
    // Store API keys
    defaultKeys.forEach(key => {
      this.apiKeys.set(key.key, key);
    });
  }
  
  /**
   * Generate a JWT token for the given API key
   * @param apiKey The API key to use for token generation
   * @returns The generated JWT token
   */
  public generateToken(apiKey: string): string | null {
    // Get API key details
    const keyDetails = this.apiKeys.get(apiKey);
    if (!keyDetails) {
      return null;
    }
    
    // Check if API key is expired
    if (keyDetails.expiresAt && keyDetails.expiresAt < new Date()) {
      return null;
    }
    
    // Update last used timestamp
    keyDetails.lastUsed = new Date();
    this.apiKeys.set(apiKey, keyDetails);
    
    // Get token scopes based on access level
    const scopes = accessLevelToScopes[keyDetails.accessLevel];
    
    // Create token payload
    const payload: JwtPayload = {
      userId: keyDetails.userId,
      username: keyDetails.clientId,
      role: keyDetails.accessLevel,
      scope: scopes.map(scope => scope.toString())
    };
    
    // Generate and return the JWT token
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.tokenExpirationTime
    });
  }
  
  /**
   * Validate a JWT token
   * @param token The JWT token to validate
   * @returns The decoded token payload if valid, null otherwise
   */
  public validateToken(token: string): JwtPayload | null {
    try {
      // Verify the token
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
      return decoded;
    } catch (error) {
      console.error('Error validating JWT token:', error);
      return null;
    }
  }
  
  /**
   * Check if a token has the required scope
   * @param token The JWT token to check
   * @param requiredScope The scope required for access
   * @returns True if the token has the required scope, false otherwise
   */
  public hasScope(token: string, requiredScope: TokenScope): boolean {
    const decoded = this.validateToken(token);
    if (!decoded) {
      return false;
    }
    
    return decoded.scope.includes(requiredScope.toString());
  }
  
  /**
   * Create a new API key
   * @param userId The ID of the user the API key is for
   * @param clientId The client ID associated with the API key
   * @param accessLevel The access level for the API key
   * @param description Optional description of the API key
   * @param expiresInDays Optional number of days until the API key expires
   * @param ipRestrictions Optional array of IP addresses to restrict the API key to
   * @returns The newly created API key
   */
  public createApiKey(
    userId: number,
    clientId: string,
    accessLevel: AccessLevel,
    description?: string,
    expiresInDays?: number,
    ipRestrictions?: string[]
  ): ApiKey {
    // Generate a secure API key
    const key = this.generateSecureKey();
    
    // Calculate expiration date if provided
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;
    
    // Create the API key
    const apiKey: ApiKey = {
      key,
      clientId,
      userId,
      accessLevel,
      description,
      createdAt: new Date(),
      expiresAt,
      ipRestrictions
    };
    
    // Store the API key
    this.apiKeys.set(key, apiKey);
    
    // Log the API key creation
    this.logApiKeyCreation(apiKey);
    
    return apiKey;
  }
  
  /**
   * Revoke an API key
   * @param key The API key to revoke
   * @returns True if the API key was revoked, false otherwise
   */
  public revokeApiKey(key: string): boolean {
    // Check if the API key exists
    if (!this.apiKeys.has(key)) {
      return false;
    }
    
    // Remove the API key
    this.apiKeys.delete(key);
    
    // Log the API key revocation
    this.logApiKeyRevocation(key);
    
    return true;
  }
  
  /**
   * Validate an API key
   * @param key The API key to validate
   * @param ipAddress Optional IP address to check against IP restrictions
   * @returns The API key details if valid, null otherwise
   */
  public validateApiKey(key: string, ipAddress?: string): ApiKey | null {
    // Get API key details
    const keyDetails = this.apiKeys.get(key);
    if (!keyDetails) {
      return null;
    }
    
    // Check if API key is expired
    if (keyDetails.expiresAt && keyDetails.expiresAt < new Date()) {
      return null;
    }
    
    // Check IP restrictions if provided
    if (ipAddress && keyDetails.ipRestrictions && keyDetails.ipRestrictions.length > 0) {
      if (!keyDetails.ipRestrictions.includes(ipAddress)) {
        return null;
      }
    }
    
    // Update last used timestamp
    keyDetails.lastUsed = new Date();
    this.apiKeys.set(key, keyDetails);
    
    return keyDetails;
  }
  
  /**
   * Generate a secure random API key
   * @returns A secure random API key
   */
  private generateSecureKey(): string {
    // In a production environment, use a cryptographically secure random generator
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const prefix = 'ak-';
    let key = prefix;
    
    // Generate a 32-character random string
    for (let i = 0; i < 32; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      key += charset[randomIndex];
    }
    
    return key;
  }
  
  /**
   * Log API key creation
   * @param apiKey The API key that was created
   */
  private async logApiKeyCreation(apiKey: ApiKey) {
    try {
      await storage.createAuditLog({
        userId: apiKey.userId,
        action: 'CREATE_API_KEY',
        entityType: 'api_key',
        entityId: null,
        details: {
          clientId: apiKey.clientId,
          accessLevel: apiKey.accessLevel,
          description: apiKey.description,
          expiresAt: apiKey.expiresAt,
          ipRestrictions: apiKey.ipRestrictions
        },
        ipAddress: 'system'
      });
      
      await storage.createSystemActivity({
        agentId: 4, // MCP Agent ID
        activity: `API key created for client: ${apiKey.clientId}`,
        entityType: 'api_key',
        entityId: null
      });
    } catch (error) {
      console.error('Error logging API key creation:', error);
    }
  }
  
  /**
   * Log API key revocation
   * @param key The API key that was revoked
   */
  private async logApiKeyRevocation(key: string) {
    try {
      await storage.createAuditLog({
        userId: 1, // Admin user ID
        action: 'REVOKE_API_KEY',
        entityType: 'api_key',
        entityId: null,
        details: {
          key: securityService.sanitizeString(key.substring(0, 8) + '...')
        },
        ipAddress: 'system'
      });
      
      await storage.createSystemActivity({
        agentId: 4, // MCP Agent ID
        activity: 'API key revoked',
        entityType: 'api_key',
        entityId: null
      });
    } catch (error) {
      console.error('Error logging API key revocation:', error);
    }
  }
}

// Export singleton instance
export const authService = new AuthService();