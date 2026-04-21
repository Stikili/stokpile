import { projectId, publicAnonKey } from "@/infrastructure/supabase/config";
import { fetchClient } from "@/infrastructure/api/client";
import type {
  Group, Member, Contribution, Payout, Meeting, Vote, Note,
  ChatMessage, Invite, JoinRequest, Constitution, MemberStats,
  UserSearchResult, InviteLinkInfo, Profile, AuditEntry, GroupHealth,
  AppNotification, NotificationPrefs, RSVPSummary, MeetingRSVP, OverdueMember,
  Announcement, PaymentProof, RotationOrder, GroceryItem,
  BurialBeneficiary, BurialClaim, PenaltyRule, PenaltyCharge,
  Subscription, SubscriptionTier,
} from "@/domain/types";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-34d0b231`;

// --- Token management ---

let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
  // Access token — short-lived, kept in memory + sessionStorage fallback.
  if (token) {
    sessionStorage.setItem("accessToken", token);
  } else {
    sessionStorage.removeItem("accessToken");
  }
};

export const getAccessToken = (): string | null => {
  if (!accessToken) {
    accessToken = sessionStorage.getItem("accessToken");
  }
  return accessToken;
};

// Refresh token — longer-lived, stored in localStorage so sessions survive
// browser restarts. The access token expires hourly; a 401 triggers a
// transparent refresh using this token (see fetchClient).
const REFRESH_KEY = "stokpile-refresh-token";

export const setRefreshToken = (token: string | null): void => {
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
};

export const getRefreshToken = (): string | null =>
  localStorage.getItem(REFRESH_KEY);

// Attempt to exchange the refresh token for a new access token.
// Returns the fresh access token, or null if refresh failed (tokens cleared).
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      setAccessToken(null);
      setRefreshToken(null);
      return null;
    }
    const data = await res.json();
    if (data.accessToken) setAccessToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}

// --- Base request helper ---

type AuthMode = "user" | "anon";

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: AuthMode; _retry?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, auth = "user", _retry = false } = options;

  const token = auth === "anon" ? publicAnonKey : (getAccessToken() || publicAnonKey);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  let serializedBody: string | FormData | undefined;
  if (body instanceof FormData) {
    serializedBody = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    serializedBody = JSON.stringify(body);
  }

  try {
    return await fetchClient<T>(`${API_URL}${path}`, { method, headers, body: serializedBody });
  } catch (err: unknown) {
    // 401 on a user-auth call: try silent refresh once, then retry
    const isAuthError =
      !!err && typeof err === "object" && "status" in err && (err as { status: number }).status === 401;
    if (isAuthError && auth === "user" && !_retry && getRefreshToken()) {
      const fresh = await refreshAccessToken();
      if (fresh) {
        return request<T>(path, { ...options, _retry: true });
      }
    }
    throw err;
  }
}

// --- API methods ---

export const api = {
  // Auth
  signup: (data: { email: string; password: string; fullName: string; surname: string; country: string; phone?: string }) =>
    request<{ message: string }>("/signup", { method: "POST", body: data, auth: "anon" }),

  signin: async (data: { email: string; password: string }) => {
    const result = await request<{ accessToken: string; refreshToken?: string; session: { user: { id: string; email: string } } }>(
      "/signin", { method: "POST", body: data, auth: "anon" }
    );
    if (result.accessToken) setAccessToken(result.accessToken);
    if (result.refreshToken) setRefreshToken(result.refreshToken);
    return result;
  },

  getSession: () =>
    request<{ session: { user: { id: string; email: string } } | null }>("/session"),

  signout: async () => {
    const result = await request<{ message: string }>("/signout", { method: "POST" });
    setAccessToken(null);
    setRefreshToken(null);
    return result;
  },

  requestPasswordReset: (email: string) =>
    request<{ message: string; resetCode?: string }>("/auth/request-reset", { method: "POST", body: { email }, auth: "anon" }),

  resetPassword: (email: string, resetCode: string, newPassword: string) =>
    request<{ message: string }>("/auth/reset-password", { method: "POST", body: { email, resetCode, newPassword }, auth: "anon" }),

  // Profile
  getProfile: () =>
    request<Profile>("/profile"),

  updateProfile: (data: { fullName: string; surname: string; profilePictureUrl?: string | null; phone?: string | null }) =>
    request<{ message: string }>("/profile", { method: "PUT", body: data }),

  uploadProfilePicture: (formData: FormData) =>
    request<{ url: string }>("/profile/picture", { method: "POST", body: formData }),

  // Groups
  createGroup: (data: { name: string; description?: string; contributionFrequency?: string; isPublic: boolean; groupType?: string; currency?: string; contributionTarget?: number | null }) =>
    request<{ group: Group; groupCode: string }>("/groups", { method: "POST", body: data }),

  getGroups: () =>
    request<{ groups: Group[] }>("/groups"),

  getGroup: (id: string) =>
    request<{ group: Group }>(`/groups/${id}`),

  updateGroupFrequency: (groupId: string, frequency: string) =>
    request<{ message: string }>(`/groups/${groupId}/frequency`, { method: "PUT", body: { frequency } }),

  updateGroup: (id: string, data: { isPublic?: boolean; payoutsAllowed?: boolean; name?: string; description?: string; currency?: string; contributionTarget?: number | null }) =>
    request<{ message: string }>(`/groups/${id}`, { method: "PUT", body: data }),

  archiveGroup: (id: string) =>
    request<{ message: string }>(`/groups/${id}/archive`, { method: "PUT" }),

  unarchiveGroup: (id: string) =>
    request<{ message: string }>(`/groups/${id}/unarchive`, { method: "PUT" }),

  getArchivedGroups: () =>
    request<{ groups: Group[] }>("/groups/archived"),

  transferAdmin: (groupId: string, newOwnerEmail: string) =>
    request<{ message: string }>(`/groups/${groupId}/transfer-admin`, { method: "POST", body: { newOwnerEmail } }),

  getOverdueMembers: (groupId: string) =>
    request<{ members: OverdueMember[]; target: number }>(`/groups/${groupId}/overdue`),

  sendWeeklyDigest: (groupId: string) =>
    request<{ message: string }>("/admin/send-weekly-digest", { method: "POST", body: { groupId } }),

  searchPublicGroups: (query: string) =>
    request<{ groups: Group[] }>(`/groups/search/public?q=${encodeURIComponent(query)}`),

  deleteGroup: (groupId: string) =>
    request<{ message: string; deletedCount?: Record<string, number> }>(`/groups/${groupId}`, { method: "DELETE" }),

  // Members
  getMembers: (groupId: string) =>
    request<{ members: Member[] }>(`/groups/${groupId}/members`),

  promoteMember: (groupId: string, memberEmail: string) =>
    request<{ message: string }>(`/groups/${groupId}/members/${encodeURIComponent(memberEmail)}/promote`, { method: "PUT" }),

  demoteMember: (groupId: string, memberEmail: string) =>
    request<{ message: string }>(`/groups/${groupId}/members/${encodeURIComponent(memberEmail)}/demote`, { method: "PUT" }),

  removeMember: (groupId: string, memberEmail: string) =>
    request<{ message: string }>(`/groups/${groupId}/members/${encodeURIComponent(memberEmail)}`, { method: "DELETE" }),

  deactivateMember: (groupId: string, memberEmail: string) =>
    request<{ message: string }>(`/groups/${groupId}/members/${encodeURIComponent(memberEmail)}/deactivate`, { method: "PUT" }),

  reactivateMember: (groupId: string, memberEmail: string) =>
    request<{ message: string }>(`/groups/${groupId}/members/${encodeURIComponent(memberEmail)}/reactivate`, { method: "PUT" }),

  getMemberStats: (groupId: string, memberEmail: string) =>
    request<MemberStats>(`/groups/${groupId}/members/${encodeURIComponent(memberEmail)}/stats`),

  // Join / Requests
  joinGroup: (groupName: string, groupCode?: string) =>
    request<{ message: string }>("/groups/join", { method: "POST", body: { groupName, groupCode } }),

  joinGroupById: (groupId: string) =>
    request<{ message: string }>(`/groups/${groupId}/join`, { method: "POST" }),

  getJoinRequests: (groupId: string) =>
    request<{ requests: JoinRequest[] }>(`/groups/${groupId}/requests`),

  approveRequest: (groupId: string, email: string) =>
    request<{ message: string }>(`/groups/${groupId}/requests/${email}/approve`, { method: "POST" }),

  denyRequest: (groupId: string, email: string) =>
    request<{ message: string }>(`/groups/${groupId}/requests/${email}/deny`, { method: "POST" }),

  // Selected Group
  getSelectedGroup: () =>
    request<{ group: Group | null }>("/selected-group"),

  setSelectedGroup: (groupId: string) =>
    request<{ message: string }>("/selected-group", { method: "POST", body: { groupId } }),

  // Contributions
  createContribution: (data: { groupId: string; amount: number; date?: string; paid?: boolean; userEmail?: string }) =>
    request<{ contribution: Contribution }>("/contributions", { method: "POST", body: data }),

  getContributions: (groupId: string) =>
    request<{ contributions: Contribution[] }>(`/contributions?groupId=${groupId}`),

  updateContribution: (id: string, data: { paid: boolean }) =>
    request<{ message: string }>(`/contributions/${id}`, { method: "PUT", body: data }),

  deleteContribution: (id: string) =>
    request<{ message: string }>(`/contributions/${id}`, { method: "DELETE" }),

  // Contribution Adjustment (admin only)
  getContributionAdjustment: (groupId: string) =>
    request<{ adjustment: number }>(`/groups/${groupId}/contribution-adjustment`),

  updateContributionAdjustment: (groupId: string, adjustment: number) =>
    request<{ message: string }>(`/groups/${groupId}/contribution-adjustment`, { method: "PUT", body: { adjustment } }),

  // Payouts
  createPayout: (data: { groupId: string; recipientEmail: string; amount: number; scheduledDate?: string }) =>
    request<{ payout: Payout }>("/payouts", { method: "POST", body: data }),

  getPayouts: (groupId: string) =>
    request<{ payouts: Payout[] }>(`/payouts?groupId=${groupId}`),

  updatePayout: (id: string, data: { status: string; referenceNumber?: string }) =>
    request<{ message: string }>(`/payouts/${id}`, { method: "PUT", body: data }),

  // Meetings
  createMeeting: (groupId: string, data: { date: string; time: string; venue: string; agenda: string }) =>
    request<{ meeting: Meeting }>("/meetings", { method: "POST", body: { groupId, ...data } }),

  getMeetings: (groupId: string) =>
    request<{ meetings: Meeting[] }>(`/meetings?groupId=${groupId}`),

  getMeeting: (groupId: string, meetingId: string) =>
    request<{ meeting: Meeting }>(`/meetings/${meetingId}?groupId=${groupId}`),

  updateMeeting: (groupId: string, meetingId: string, data: { date: string; time: string; venue: string; agenda: string }) =>
    request<{ message: string }>(`/meetings/${meetingId}`, { method: "PUT", body: { groupId, ...data } }),

  deleteMeeting: (groupId: string, meetingId: string) =>
    request<{ message: string }>(`/meetings/${meetingId}?groupId=${groupId}`, { method: "DELETE" }),

  updateAttendance: (groupId: string, meetingId: string, memberEmail: string, isPresent: boolean) =>
    request<{ message: string }>(`/meetings/${meetingId}/attendance`, { method: "PUT", body: { groupId, memberEmail, isPresent } }),

  // Notes
  createNote: (data: { groupId: string; title: string; content: string; meetingId?: string }) =>
    request<{ note: Note }>("/notes", { method: "POST", body: data }),

  getNotes: (groupId: string, meetingId?: string) => {
    const params = new URLSearchParams({ groupId });
    if (meetingId) params.append("meetingId", meetingId);
    return request<{ notes: Note[] }>(`/notes?${params}`);
  },

  // Votes
  createVote: (data: { groupId: string; question: string; meetingId?: string }) =>
    request<{ vote: Vote }>("/votes", { method: "POST", body: data }),

  getVotes: (groupId: string, meetingId?: string) => {
    const params = new URLSearchParams({ groupId });
    if (meetingId) params.append("meetingId", meetingId);
    return request<{ votes: Vote[] }>(`/votes?${params}`);
  },

  castVote: (voteId: string, answer: "yes" | "no") =>
    request<{ message: string }>(`/votes/${voteId}/cast`, { method: "POST", body: { answer } }),

  // Chat
  sendMessage: (data: { groupId: string; message: string; meetingId?: string }) =>
    request<{ message: ChatMessage }>("/chat", { method: "POST", body: data }),

  getMessages: (groupId: string, meetingId?: string) => {
    const params = new URLSearchParams({ groupId });
    if (meetingId) params.append("meetingId", meetingId);
    return request<{ messages: ChatMessage[] }>(`/chat?${params}`);
  },

  // Invite Links
  createInviteLink: (groupId: string) =>
    request<{ token: string; link: string }>(`/groups/${groupId}/invite-link`, { method: "POST" }),

  getInviteLinkInfo: (token: string) =>
    request<InviteLinkInfo>(`/invite/${token}`, { auth: "anon" }),

  joinViaInviteLink: async (token: string) => {
    try {
      return await request<{ message: string; alreadyMember?: boolean; groupId?: string }>(
        `/invite/${token}/join`, { method: "POST" }
      );
    } catch (error) {
      // Surface alreadyMember responses instead of throwing
      if (error && typeof error === "object" && "alreadyMember" in error) {
        return error as { message: string; alreadyMember: boolean; groupId?: string };
      }
      throw error;
    }
  },

  // Invites
  searchUsers: (query: string) =>
    request<{ users: UserSearchResult[] }>(`/users/search?q=${encodeURIComponent(query)}`),

  inviteUser: (groupId: string, invitedEmail: string) =>
    request<{ message: string }>("/invites", { method: "POST", body: { groupId, invitedEmail } }),

  getInvites: () =>
    request<{ invites: Invite[] }>("/invites"),

  acceptInvite: (groupId: string) =>
    request<{ message: string }>(`/invites/${groupId}/accept`, { method: "POST" }),

  declineInvite: (groupId: string) =>
    request<{ message: string }>(`/invites/${groupId}/decline`, { method: "POST" }),

  // Constitution
  uploadConstitution: (groupId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ message: string }>(`/groups/${groupId}/constitution`, { method: "POST", body: formData });
  },

  getConstitution: (groupId: string) =>
    request<{ constitution: Constitution | null }>(`/groups/${groupId}/constitution`),

  deleteConstitution: (groupId: string) =>
    request<{ message: string }>(`/groups/${groupId}/constitution`, { method: "DELETE" }),

  // Admin: Clear all test data (dev-only)
  clearAllData: () => {
    if (!import.meta.env.DEV) {
      throw new Error("clearAllData is only available in development mode");
    }
    return request<{ message: string; deletedCount?: Record<string, number> }>("/admin/clear-all-data", { method: "DELETE" });
  },

  // Paystack payment link for a contribution
  createPaymentLink: (contributionId: string) =>
    request<{ authorizationUrl: string; reference: string }>(`/contributions/${contributionId}/payment-link`, { method: "POST" }),

  // Push notification subscription storage
  storePushSubscription: (subscription: object) =>
    request<{ message: string }>("/push-subscription", { method: "POST", body: subscription }),

  // In-app notifications
  getNotifications: () =>
    request<{ notifications: AppNotification[] }>("/notifications"),

  markAllNotificationsRead: () =>
    request<{ message: string }>("/notifications/read-all", { method: "PUT" }),

  // Notification preferences
  getNotificationPrefs: () =>
    request<NotificationPrefs>("/notification-preferences"),

  updateNotificationPrefs: (prefs: Partial<NotificationPrefs>) =>
    request<{ message: string }>("/notification-preferences", { method: "PUT", body: prefs }),

  // Meeting RSVP
  rsvpMeeting: (meetingId: string, response: 'yes' | 'no' | 'maybe') =>
    request<{ message: string }>(`/meetings/${meetingId}/rsvp`, { method: "POST", body: { response } }),

  getMeetingRSVPs: (meetingId: string) =>
    request<{ rsvps: MeetingRSVP[]; summary: RSVPSummary }>(`/meetings/${meetingId}/rsvps`),

  // Bulk mark contributions paid/unpaid (admin only)
  bulkMarkContributions: (groupId: string, contributionIds: string[], paid: boolean) =>
    request<{ updated: number }>("/contributions/bulk-mark", { method: "POST", body: { groupId, contributionIds, paid } }),

  // Audit log (admin only)
  getAuditLog: (groupId: string) =>
    request<{ auditLog: AuditEntry[] }>(`/groups/${groupId}/audit-log`),

  // Group health score
  getGroupHealth: (groupId: string) =>
    request<GroupHealth>(`/groups/${groupId}/health`),

  // Announcements
  getAnnouncements: (groupId: string) =>
    request<{ announcements: Announcement[] }>(`/groups/${groupId}/announcements`),

  createAnnouncement: (groupId: string, data: { title: string; content: string; urgent?: boolean; pinned?: boolean }) =>
    request<{ announcement: Announcement }>(`/groups/${groupId}/announcements`, { method: "POST", body: data }),

  updateAnnouncement: (groupId: string, announcementId: string, data: { title?: string; content?: string; urgent?: boolean; pinned?: boolean }) =>
    request<{ message: string }>(`/groups/${groupId}/announcements/${announcementId}`, { method: "PUT", body: data }),

  deleteAnnouncement: (groupId: string, announcementId: string) =>
    request<{ message: string }>(`/groups/${groupId}/announcements/${announcementId}`, { method: "DELETE" }),

  // Payment Proofs
  uploadPaymentProof: (groupId: string, linkedType: 'contribution' | 'payout', linkedId: string, file: File, referenceNumber?: string, notes?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (referenceNumber) formData.append("referenceNumber", referenceNumber);
    if (notes) formData.append("notes", notes);
    return request<{ proof: PaymentProof }>(`/groups/${groupId}/proofs/${linkedType}/${linkedId}`, { method: "POST", body: formData });
  },

  getPaymentProof: (groupId: string, linkedType: 'contribution' | 'payout', linkedId: string) =>
    request<{ proof: PaymentProof | null }>(`/groups/${groupId}/proofs/${linkedType}/${linkedId}`),

  deletePaymentProof: (groupId: string, linkedType: 'contribution' | 'payout', linkedId: string) =>
    request<{ message: string }>(`/groups/${groupId}/proofs/${linkedType}/${linkedId}`, { method: "DELETE" }),

  // Flutterwave
  createFlutterwaveLink: (contributionId: string) =>
    request<{ paymentLink: string; txRef: string }>(`/contributions/${contributionId}/flutterwave-link`, { method: "POST" }),

  // Rotation Order
  getRotationOrder: (groupId: string) =>
    request<{ rotation: RotationOrder | null }>(`/groups/${groupId}/rotation`),

  initRotationOrder: (groupId: string) =>
    request<{ message: string; rotation: RotationOrder }>(`/groups/${groupId}/rotation/init`, { method: "POST" }),

  advanceRotation: (groupId: string) =>
    request<{ message: string; rotation: RotationOrder }>(`/groups/${groupId}/rotation/advance`, { method: "PUT" }),

  reorderRotation: (groupId: string, slots: { email: string; position: number }[]) =>
    request<{ message: string; rotation: RotationOrder }>(`/groups/${groupId}/rotation/reorder`, { method: "PUT", body: { slots } }),

  // Grocery
  getGroceryItems: (groupId: string) =>
    request<{ items: GroceryItem[] }>(`/groups/${groupId}/grocery`),

  createGroceryItem: (groupId: string, data: { name: string; quantity: number; unit: string; estimatedCost?: number; assignedTo?: string; notes?: string }) =>
    request<{ item: GroceryItem }>(`/groups/${groupId}/grocery`, { method: "POST", body: data }),

  updateGroceryItem: (groupId: string, itemId: string, data: Partial<GroceryItem>) =>
    request<{ message: string }>(`/groups/${groupId}/grocery/${itemId}`, { method: "PUT", body: data }),

  deleteGroceryItem: (groupId: string, itemId: string) =>
    request<{ message: string }>(`/groups/${groupId}/grocery/${itemId}`, { method: "DELETE" }),

  // Burial Society
  getBurialBeneficiaries: (groupId: string) =>
    request<{ beneficiaries: BurialBeneficiary[] }>(`/groups/${groupId}/burial/beneficiaries`),

  addBurialBeneficiary: (groupId: string, data: { name: string; relationship: string; idNumber?: string; phone?: string }) =>
    request<{ beneficiary: BurialBeneficiary }>(`/groups/${groupId}/burial/beneficiaries`, { method: "POST", body: data }),

  deleteBurialBeneficiary: (groupId: string, beneficiaryId: string) =>
    request<{ message: string }>(`/groups/${groupId}/burial/beneficiaries/${beneficiaryId}`, { method: "DELETE" }),

  getBurialClaims: (groupId: string) =>
    request<{ claims: BurialClaim[] }>(`/groups/${groupId}/burial/claims`),

  submitBurialClaim: (groupId: string, data: { beneficiaryName: string; relationship: string; deceasedName: string; dateOfDeath: string; amount: number; notes?: string }) =>
    request<{ claim: BurialClaim }>(`/groups/${groupId}/burial/claims`, { method: "POST", body: data }),

  updateBurialClaim: (groupId: string, claimId: string, data: { status: string }) =>
    request<{ message: string; claim: BurialClaim }>(`/groups/${groupId}/burial/claims/${claimId}`, { method: "PUT", body: data }),

  // Penalties / Fines
  getPenalties: (groupId: string) =>
    request<{ rules: PenaltyRule[]; charges: PenaltyCharge[] }>(`/groups/${groupId}/penalties`),

  createPenaltyRule: (groupId: string, data: { name: string; amount: number; description?: string }) =>
    request<{ rule: PenaltyRule }>(`/groups/${groupId}/penalties/rules`, { method: "POST", body: data }),

  deletePenaltyRule: (groupId: string, ruleId: string) =>
    request<{ message: string }>(`/groups/${groupId}/penalties/rules/${ruleId}`, { method: "DELETE" }),

  chargePenalty: (groupId: string, data: { memberEmail: string; ruleId: string; reason?: string }) =>
    request<{ charge: PenaltyCharge }>(`/groups/${groupId}/penalties/charge`, { method: "POST", body: data }),

  updatePenaltyCharge: (groupId: string, chargeId: string, data: { status: string }) =>
    request<{ message: string }>(`/groups/${groupId}/penalties/charges/${chargeId}`, { method: "PUT", body: data }),

  // Referral
  getReferral: () =>
    request<{ code: string; invitedCount: number; rewardedCount: number }>("/referral"),

  trackReferral: (code: string, newUserEmail: string) =>
    request<{ success: boolean }>("/referral/track", { method: "POST", body: { code, newUserEmail } }),

  // Email digest
  sendGroupDigest: (groupId: string) =>
    request<{ message: string; sent: number }>(`/groups/${groupId}/digest`, { method: "POST" }),

  // Account deletion
  deleteAccount: () =>
    request<{ message: string; deletedCount: Record<string, number> }>("/account", { method: "DELETE" }),

  // Bank details
  getBankDetails: () =>
    request<{ bankDetails: import("@/domain/types").BankDetails | null }>("/me/bank-details"),

  updateBankDetails: (data: { bankName: string; accountNumber: string; branchCode: string; accountType?: string; accountHolder?: string }) =>
    request<{ bankDetails: any }>("/me/bank-details", { method: "PUT", body: data }),

  // Demo group
  createDemoGroup: () =>
    request<{ group: any; alreadyExisted: boolean }>("/demo-group", { method: "POST" }),

  // Member data export (POPIA portability)
  exportMyData: () =>
    request<{ profile: any; groups: any[]; contributions: any[]; payouts: any[]; meetings: any[] }>("/me/export"),

  // Burial dependents
  getDependents: (groupId: string) =>
    request<{ dependents: any[] }>(`/groups/${groupId}/dependents`),

  addDependent: (groupId: string, data: { fullName: string; relationship: string; dateOfBirth?: string; idNumber?: string }) =>
    request<{ dependent: any }>(`/groups/${groupId}/dependents`, { method: "POST", body: data }),

  deleteDependent: (groupId: string, dependentId: string) =>
    request<{ success: boolean }>(`/groups/${groupId}/dependents/${dependentId}`, { method: "DELETE" }),

  // Voice notes
  uploadVoiceNote: (meetingId: string, base64Audio: string) =>
    request<{ url: string }>(`/meetings/${meetingId}/voice-note`, { method: "POST", body: { audio: base64Audio } }),

  // Leaderboard
  getLeaderboard: (groupId: string) =>
    request<{ leaderboard: Array<{ email: string; fullName?: string; surname?: string; totalPaid: number; streak: number; rank: number }> }>(`/groups/${groupId}/leaderboard`),

  // Session management
  getSessions: () =>
    request<{ sessions: Array<{ sessionId: string; ip: string; userAgent: string; createdAt: string; lastActiveAt: string; isCurrent: boolean }> }>("/sessions"),

  revokeSession: (sessionId: string) =>
    request<{ success: boolean }>(`/sessions/${sessionId}`, { method: "DELETE" }),

  revokeAllOtherSessions: () =>
    request<{ success: boolean; revoked: number }>("/sessions/revoke-all", { method: "POST" }),

  // Subscription
  getSubscription: (groupId: string) =>
    request<Subscription>(`/groups/${groupId}/subscription`),

  initializeBilling: (groupId: string, tier: SubscriptionTier, email: string, useCredit?: boolean) =>
    request<{ authorizationUrl?: string; reference?: string; creditOnly?: boolean; tier?: string; creditUsedZar?: number; creditRemainingZar?: number }>(`/billing/initialize`, {
      method: "POST",
      body: { groupId, tier, email, useCredit: !!useCredit },
    }),

  cancelSubscription: (groupId: string) =>
    request<{ message: string }>(`/billing/cancel`, { method: "POST", body: { groupId } }),

  // Rewards
  getRewardsAccount: () =>
    request<{
      account: {
        tier: 'bronze' | 'silver' | 'gold' | 'platinum';
        lifetimePoints: number;
        availablePoints: number;
        lifetimeEarningsZar: number;
        pendingEarningsZar: number;
        creditedZar: number;
        nextTierAt: number | null;
        pointsToNextTier: number;
        commissionRate: number;
        conversionRate: { pointsPerZar: number; minPoints: number };
      };
    }>(`/rewards/account`),

  getRewardsLedger: () =>
    request<{
      ledger: Array<{
        id: string;
        eventType: string;
        pointsDelta: number;
        zarDelta: number;
        metadata: Record<string, unknown>;
        createdAt: string;
      }>;
    }>(`/rewards/ledger`),

  getRewardsCommissions: () =>
    request<{
      commissions: Array<{
        id: string;
        referredEmail: string;
        grossZar: number;
        rate: number;
        commissionZar: number;
        month: string;
        paidOut: boolean;
        createdAt: string;
      }>;
    }>(`/rewards/commissions`),

  redeemRewards: (groupId: string, points: number) =>
    request<{ redemption: { id: string; creditZar: number; pointsCost: number } }>(`/rewards/redeem`, {
      method: "POST",
      body: { groupId, points },
    }),

  // AI assistant
  getAiOptIn: () =>
    request<{ optedIn: boolean; optedInAt: string | null }>("/ai/opt-in"),

  setAiOptIn: (accept: boolean) =>
    request<{ ok: boolean; optedIn: boolean }>("/ai/opt-in", {
      method: "POST",
      body: { accept },
    }),

  getAiUsage: () =>
    request<{ callsThisMonth: number; costZarThisMonth: number }>("/ai/usage"),

  aiChat: (params: { task: string; groupId?: string; language?: string; context?: Record<string, unknown> }) =>
    request<{ text: string; costZar: number; latencyMs: number; callsThisMonth: number; cap: number }>("/ai/chat", {
      method: "POST",
      body: params,
    }),

  piloChat: (params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    groupId?: string;
    groupName?: string;
    isAdmin?: boolean;
    language?: string;
    tier?: string;
    lifetimePoints?: number;
    commissionRate?: number;
  }) =>
    request<{
      text: string;
      suggestedActions: Array<{ label: string; task: string; context?: Record<string, unknown> }>;
      callsThisMonth: number;
      cap: number;
      costZar: number;
      latencyMs: number;
    }>("/ai/pilo", { method: "POST", body: params }),

  getRewardsAdminSummary: () =>
    request<{
      summary: {
        totalAccounts: number;
        tierCounts: Record<string, number>;
        totalLifetimeEarningsZar: number;
        totalPendingZar: number;
        totalRedeemedZar: number;
        thisMonth: {
          accruingTotalZar: number;
          accruingReferrers: number;
          accruingCommissions: number;
          subsCount: number;
          subsTotalZar: number;
        };
        lastClosedMonth: {
          totalZar: number;
          referrers: number;
          commissions: number;
        };
        topReferrers: Array<{
          userId: string;
          email: string;
          tier: string;
          lifetimeEarningsZar: number;
          lifetimePoints: number;
        }>;
      };
    }>(`/rewards/admin/summary`),
};
