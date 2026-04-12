/**
 * Shared API response types.
 *
 * These types define the exact shape the Edge Function returns.
 * Both the frontend API client and the backend route handlers
 * should conform to these interfaces.
 *
 * If you change a response shape in the Edge Function, update
 * the corresponding type here — TypeScript will flag all call
 * sites that need updating.
 */

// ─── Generic ─────────────────────────────────────────────────
export interface ApiSuccess<T = unknown> {
  success: true;
  data?: T;
}

export interface ApiError {
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Auth ────────────────────────────────────────────────────
export interface SigninResponse {
  success: true;
  accessToken: string;
  user: { id: string; email: string; user_metadata: Record<string, any> };
}

export interface SignupResponse {
  success: true;
  user: { id: string; email: string };
  requiresVerification: boolean;
}

export interface SessionResponse {
  session: {
    user: { id: string; email: string; user_metadata: Record<string, any> };
    access_token: string;
  } | null;
}

// ─── Groups ──────────────────────────────────────────────────
export interface GroupResponse {
  success: true;
  group: import('./index').Group;
}

export interface GroupsListResponse {
  groups: import('./index').Group[];
}

// ─── Contributions ───────────────────────────────────────────
export interface ContributionsResponse {
  contributions: import('./index').Contribution[];
}

// ─── Payouts ─────────────────────────────────────────────────
export interface PayoutsResponse {
  payouts: import('./index').Payout[];
}

// ─── Meetings ────────────────────────────────────────────────
export interface MeetingsResponse {
  meetings: import('./index').Meeting[];
}

// ─── Members ─────────────────────────────────────────────────
export interface MembersResponse {
  members: import('./index').Member[];
}

// ─── Announcements ───────────────────────────────────────────
export interface AnnouncementsResponse {
  announcements: import('./index').Announcement[];
}

// ─── Subscription ────────────────────────────────────────────
export interface SubscriptionResponse extends import('./subscription').Subscription {}

// ─── Health ──────────────────────────────────────────────────
export interface HealthCheckResponse {
  status: 'ok';
  timestamp: string;
}
