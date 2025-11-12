/**
 * Shared types used across the monorepo
 */

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface Config {
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    authentication: boolean;
    analytics: boolean;
  };
}
