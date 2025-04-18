import { Request } from "express";

// Define consistent type for authenticated requests
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;  // Using id for consistency with our service implementation
    username: string;
    role: string;
    scope?: string[];
  };
  isAuthenticated(): boolean;
}