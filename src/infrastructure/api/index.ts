import { projectId, publicAnonKey } from "@/infrastructure/supabase/config";
import { fetchClient } from "@/infrastructure/api/client";
import type {
  Group, Member, Contribution, Payout, Meeting, Vote, Note,
  ChatMessage, Invite, JoinRequest, Constitution, MemberStats,
  UserSearchResult, InviteLinkInfo, Profile,
} from "@/domain/types";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-34d0b231`;

// --- Token management ---

let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
  // Token is kept in memory only for XSS protection.
  // sessionStorage is used as a fallback for page reloads within the same tab.
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

// --- Base request helper ---

type AuthMode = "user" | "anon";

function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: AuthMode } = {}
): Promise<T> {
  const { method = "GET", body, auth = "user" } = options;

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

  return fetchClient<T>(`${API_URL}${path}`, { method, headers, body: serializedBody });
}

// --- API methods ---

export const api = {
  // Auth
  signup: (data: { email: string; password: string; fullName: string; surname: string; country: string }) =>
    request<{ message: string }>("/signup", { method: "POST", body: data, auth: "anon" }),

  signin: async (data: { email: string; password: string }) => {
    const result = await request<{ accessToken: string; session: { user: { id: string; email: string } } }>(
      "/signin", { method: "POST", body: data, auth: "anon" }
    );
    if (result.accessToken) setAccessToken(result.accessToken);
    return result;
  },

  getSession: () =>
    request<{ session: { user: { id: string; email: string } } | null }>("/session"),

  signout: async () => {
    const result = await request<{ message: string }>("/signout", { method: "POST" });
    setAccessToken(null);
    return result;
  },

  requestPasswordReset: (email: string) =>
    request<{ message: string; resetCode?: string }>("/auth/request-reset", { method: "POST", body: { email }, auth: "anon" }),

  resetPassword: (email: string, resetCode: string, newPassword: string) =>
    request<{ message: string }>("/auth/reset-password", { method: "POST", body: { email, resetCode, newPassword }, auth: "anon" }),

  // Profile
  getProfile: () =>
    request<Profile>("/profile"),

  updateProfile: (data: { fullName: string; surname: string; profilePictureUrl?: string | null }) =>
    request<{ message: string }>("/profile", { method: "PUT", body: data }),

  uploadProfilePicture: (formData: FormData) =>
    request<{ url: string }>("/profile/picture", { method: "POST", body: formData }),

  // Groups
  createGroup: (data: { name: string; description?: string; contributionFrequency?: string; isPublic: boolean }) =>
    request<{ group: Group; groupCode: string }>("/groups", { method: "POST", body: data }),

  getGroups: () =>
    request<{ groups: Group[] }>("/groups"),

  getGroup: (id: string) =>
    request<{ group: Group }>(`/groups/${id}`),

  updateGroupFrequency: (groupId: string, frequency: string) =>
    request<{ message: string }>(`/groups/${groupId}/frequency`, { method: "PUT", body: { frequency } }),

  updateGroup: (id: string, data: { isPublic?: boolean; payoutsAllowed?: boolean; name?: string; description?: string }) =>
    request<{ message: string }>(`/groups/${id}`, { method: "PUT", body: data }),

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

  updatePayout: (id: string, data: { status: string }) =>
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
};
