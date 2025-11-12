/**
 * Shared utility functions
 */

import { User, ApiResponse } from './types';

/**
 * Format a user's full name
 */
export function formatUserName(user: User): string {
  return `${user.name} <${user.email}>`;
}

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    message: 'Success',
    success: true,
  };
}

/**
 * Create an error API response
 */
export function createErrorResponse(message: string): ApiResponse<never> {
  return {
    data: null as never,
    message,
    success: false,
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
