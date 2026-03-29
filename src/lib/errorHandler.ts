import { toast } from 'sonner';
import { ApiError } from '@/infrastructure/api/client';

export { ApiError };

/**
 * Map of common error messages to user-friendly versions
 */
const ERROR_MESSAGES: Record<string, string> = {
  'Failed to fetch': 'Unable to connect to the server. Please check your internet connection.',
  'NetworkError when attempting to fetch resource.': 'Network error. Please check your connection and try again.',
  'Network request failed': 'Network error. Please check your connection and try again.',
  'Load failed': 'Unable to connect to the server. Please try again.',
  'AbortError': 'The request timed out. Please try again.',
  'The operation was aborted.': 'The request timed out. Please try again.',
  'The user aborted a request.': 'The request was cancelled.',
};

/**
 * Maps an error to a user-friendly message
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return 'You do not have permission to perform this action.';
    if (error.status === 404) return 'The requested resource was not found.';
    if (error.status === 409) return 'This action conflicts with the current state. Please refresh and try again.';
    if (error.status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (error.status >= 500) return 'A server error occurred. Please try again later.';
    // For other 4xx errors, the server message is usually user-appropriate
    return error.message;
  }

  if (error instanceof Error) {
    // Check for known error messages
    const friendlyMessage = ERROR_MESSAGES[error.message];
    if (friendlyMessage) return friendlyMessage;

    // Check for partial matches
    if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (error.name === 'AbortError') {
      return 'The request timed out. Please try again.';
    }
    if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
      return 'Network error. Please check your connection and try again.';
    }

    // Return the original message if it looks user-friendly (not a stack trace or code error)
    if (error.message.length < 200 && !error.message.includes('\n')) {
      return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Centralized error handler - logs in dev, shows user-friendly toast
 */
export function handleError(error: unknown, context?: string): void {
  const message = getUserFriendlyMessage(error);

  // Log original error details in development only
  if (import.meta.env.DEV) {
    console.error(`[${context || 'Error'}]`, error);
  }

  toast.error(message);
}

/**
 * Extract error message from an unknown error for inline use
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
