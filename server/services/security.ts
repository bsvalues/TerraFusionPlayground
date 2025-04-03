/**
 * Security Service
 * 
 * This service provides security-related functionality including input validation,
 * sanitization, and protection against common attack vectors like SQL injection and XSS.
 * It's designed to address the security concerns demonstrated in the ICSF simulation labs.
 */

// Import necessary dependencies
import { z } from 'zod';
import { AuditLog } from '@shared/schema';
import { storage } from '../storage';

export class SecurityService {
  /**
   * Sanitize a string to protect against XSS attacks
   * @param input The input string to sanitize
   * @returns Sanitized string
   */
  sanitizeString(input: string | undefined | null): string | null {
    if (input === undefined || input === null) {
      return null;
    }
    
    // Replace HTML tags and other potentially dangerous characters
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;')
      .replace(/\$/g, '&#36;');
  }
  
  /**
   * Validate and sanitize an object's string properties
   * @param obj The object to sanitize
   * @returns A new object with sanitized string properties
   */
  sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized: Record<string, any> = {};
    
    // Process each property in the object
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Sanitize string values
        sanitized[key] = this.sanitizeString(value);
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeObject(value);
      } else if (Array.isArray(value)) {
        // Sanitize arrays by mapping over each element
        sanitized[key] = value.map(item => 
          typeof item === 'string' 
            ? this.sanitizeString(item)
            : (typeof item === 'object' && item !== null)
              ? this.sanitizeObject(item)
              : item
        );
      } else {
        // Pass through non-string, non-object values unchanged
        sanitized[key] = value;
      }
    }
    
    return sanitized as T;
  }
  
  /**
   * Protect against SQL injection by checking for common SQL injection patterns
   * @param input The input string to check
   * @returns Boolean indicating if the input contains SQL injection patterns
   */
  containsSqlInjection(input: string): boolean {
    if (!input) return false;
    
    // Check for common SQL injection patterns
    const sqlPatterns = [
      /'\s*OR\s*.*/i,                  // 'OR 1=1--
      /'\s*;\s*DROP\s+TABLE.*/i,       // '; DROP TABLE users--
      /'\s*;\s*DELETE\s+FROM.*/i,      // '; DELETE FROM users--
      /'\s*UNION\s+SELECT.*/i,         // ' UNION SELECT username, password FROM users--
      /--/,                           // Comment indicator
      /\/\*/,                         // Start of block comment
      /EXEC\s+xp_.*/i,                // EXEC xp_cmdshell
      /INSERT\s+INTO.*/i,             // INSERT INTO users
      /SELECT\s+.*\s+FROM.*/i,        // Basic SELECT query
      /UPDATE\s+.*\s+SET.*/i,         // UPDATE users SET
      /DELETE\s+FROM.*/i              // DELETE FROM users
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }
  
  /**
   * Checks if a string contains potential XSS payloads
   * @param input The input string to check
   * @returns Boolean indicating if the input contains XSS patterns
   */
  containsXss(input: string): boolean {
    if (!input) return false;
    
    // Check for common XSS patterns
    const xssPatterns = [
      /<script.*>.*<\/script>/i,    // <script>alert('XSS')</script>
      /<.*javascript:.*>/i,         // <img src="javascript:alert('XSS')">
      /<.*onload=.*>/i,             // <img onload="alert('XSS')">
      /<.*onclick=.*>/i,            // <div onclick="alert('XSS')">
      /<.*onerror=.*>/i,            // <img src="x" onerror="alert('XSS')">
      /<.*onmouseover=.*>/i,        // <div onmouseover="alert('XSS')">
      /<.*onfocus=.*>/i,            // <input onfocus="alert('XSS')">
      /<.*onblur=.*>/i,             // <input onblur="alert('XSS')">
      /<.*style=.*expression\(.*\).*>/i, // <div style="expression(alert('XSS'))">
      /<.*src=.*data:.*>/i         // <img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=">
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  }
  
  /**
   * Validate property IDs to ensure they match the expected format
   * @param propertyId The property ID to validate
   * @returns Boolean indicating if the property ID is valid
   */
  isValidPropertyId(propertyId: string): boolean {
    // Benton County property IDs follow a specific format (BC followed by 3 digits)
    return /^BC\d{3}$/.test(propertyId);
  }
  
  /**
   * Validate numeric values to protect against numeric overflow attacks
   * @param value The value to validate
   * @param min Optional minimum allowed value
   * @param max Optional maximum allowed value
   * @returns Boolean indicating if the value is valid
   */
  isValidNumericValue(value: string | number, min?: number, max?: number): boolean {
    // Convert to number if string
    const numValue = typeof value === 'string' ? Number(value) : value;
    
    // Check if it's a valid number
    if (isNaN(numValue) || !isFinite(numValue)) {
      return false;
    }
    
    // Check min/max if provided
    if (min !== undefined && numValue < min) {
      return false;
    }
    
    if (max !== undefined && numValue > max) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Log a security event to the audit log
   * @param userId The ID of the user involved in the event
   * @param action The action being performed
   * @param entityType The type of entity involved
   * @param entityId The ID of the entity involved
   * @param details Additional details about the event
   * @param ipAddress The IP address from which the event originated
   * @returns The created audit log
   */
  async logSecurityEvent(
    userId: number,
    action: string,
    entityType: string,
    entityId: string | null,
    details: Record<string, any>,
    ipAddress: string
  ): Promise<AuditLog> {
    return await storage.createAuditLog({
      userId,
      action: `SECURITY_${action}`,
      entityType,
      entityId,
      details,
      ipAddress
    });
  }
  
  /**
   * Create a Zod schema for validating MCP requests with appropriate constraints
   * @param toolName The name of the tool being executed
   * @returns A Zod schema for validating the request parameters
   */
  createMcpRequestSchema(toolName: string): z.ZodType<any> {
    // Base schemas for common parameter types
    const stringSchema = z.string().transform(value => this.sanitizeString(value));
    const numberSchema = z.number().or(z.string().regex(/^\d+$/).transform(Number));
    const propertyIdSchema = z.string().regex(/^BC\d{3}$/);
    
    // Define tool-specific schemas
    switch (toolName) {
      case 'getProperties':
        return z.object({
          address: z.string().optional().transform(value => value ? this.sanitizeString(value) : value),
          propertyType: z.string().optional().transform(value => value ? this.sanitizeString(value) : value),
          status: z.string().optional().transform(value => value ? this.sanitizeString(value) : value),
          minValue: numberSchema.optional(),
          maxValue: numberSchema.optional(),
          limit: z.number().optional().or(z.literal(undefined))
        });
        
      case 'getPropertyById':
        return z.object({
          propertyId: propertyIdSchema
        });
        
      case 'getLandRecordsByZone':
        return z.object({
          zoning: stringSchema
        });
        
      case 'getImprovementsByType':
        return z.object({
          improvementType: stringSchema
        });
        
      case 'getImprovementsByYearBuiltRange':
        return z.object({
          minYear: z.number().or(z.string().regex(/^\d+$/).transform(Number))
            .refine(val => val >= 1800 && val <= new Date().getFullYear(), {
              message: `Year must be between 1800 and ${new Date().getFullYear()}`
            }),
          maxYear: z.number().or(z.string().regex(/^\d+$/).transform(Number))
            .refine(val => val >= 1800 && val <= new Date().getFullYear() + 10, {
              message: `Year must be between 1800 and ${new Date().getFullYear() + 10}`
            })
        });
        
      case 'getPropertiesByValueRange':
        return z.object({
          minValue: z.number().or(z.string().regex(/^\d+$/).transform(Number))
            .refine(val => val >= 0 && val <= 1000000000, {
              message: "Value must be between 0 and 1,000,000,000"
            }),
          maxValue: z.number().or(z.string().regex(/^\d+$/).transform(Number))
            .refine(val => val >= 0 && val <= 1000000000, {
              message: "Value must be between 0 and 1,000,000,000"
            })
        });
        
      case 'generateMapUrl':
        return z.object({
          propertyId: propertyIdSchema.optional(),
          address: stringSchema.optional(),
          mapType: z.enum(['esri', 'google', 'pictometry'])
        }).refine(data => data.propertyId !== undefined || data.address !== undefined, {
          message: "Either propertyId or address must be provided"
        });
        
      case 'getPropertyFullDetails':
        return z.object({
          propertyId: propertyIdSchema
        });
        
      // Default case for tools without specific validation
      default:
        return z.any();
    }
  }
}

// Export singleton instance
export const securityService = new SecurityService();