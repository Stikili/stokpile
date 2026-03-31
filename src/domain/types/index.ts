// === Auth & Session ===
export interface User {
  id: string;
  email: string;
  fullName: string;
  surname: string;
  country: string;
  profilePictureUrl?: string | null;
  phone?: string | null;
}

export interface Session {
  user: User;
  accessToken: string;
}

export interface Profile {
  email: string;
  fullName: string;
  surname: string;
  country: string;
  profilePictureUrl?: string | null;
  phone?: string | null;
}

// === Groups ===
export type GroupType = 'rotating' | 'burial' | 'grocery' | 'investment';

export interface Group {
  id: string;
  name: string;
  description?: string;
  groupCode: string;
  isPublic: boolean;
  payoutsAllowed: boolean;
  contributionFrequency?: string;
  groupType?: GroupType;
  contributionTarget?: number | null;
  archived?: boolean;
  archivedAt?: string | null;
  createdBy: string;
  createdAt: string;
  admin1?: string;
  userRole: 'admin' | 'member';
  memberCount?: number;
  userStatus?: 'approved' | 'pending' | string;
}

// === Members ===
export interface Member {
  email: string;
  fullName: string;
  surname: string;
  role: 'admin' | 'member';
  status: 'approved' | 'pending' | 'inactive';
  joinedAt: string;
  profilePictureUrl?: string | null;
  country?: string;
  createdAt?: string;
  deactivatedAt?: string;
}

// === Contributions ===
export interface Contribution {
  id: string;
  groupId: string;
  userEmail: string;
  amount: number;
  date: string;
  paid: boolean;
  status?: string;
  createdAt: string;
  createdBy?: string;
  user?: {
    fullName: string;
    surname: string;
    profilePictureUrl?: string | null;
  };
}

// === Payouts ===
export interface Payout {
  id: string;
  groupId: string;
  recipientEmail: string;
  amount: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  scheduledDate: string;
  completedAt?: string;
  referenceNumber?: string;
  createdAt: string;
  recipient?: {
    fullName: string;
    surname: string;
    profilePictureUrl?: string | null;
  };
}

// === Meetings ===
export interface Meeting {
  id: string;
  groupId: string;
  date: string;
  time: string;
  venue: string;
  agenda?: string;
  createdAt: string;
  attendance?: Record<string, boolean>;
}

// === Votes ===
export interface Vote {
  id: string;
  groupId: string;
  question: string;
  meetingId?: string;
  yesVotes: string[];
  noVotes: string[];
  createdAt: string;
  createdBy?: string;
}

// === Notes ===
export interface Note {
  id: string;
  groupId: string;
  title: string;
  content: string;
  meetingId?: string;
  createdBy: string;
  createdAt: string;
  author?: {
    fullName: string;
    surname: string;
    profilePictureUrl?: string | null;
  };
}

// === Chat ===
export interface ChatMessage {
  id: string;
  groupId: string;
  userEmail: string;
  message: string;
  meetingId?: string;
  createdAt: string;
  user?: {
    fullName: string;
    surname: string;
  };
  sender?: {
    fullName: string;
    surname: string;
  };
  senderEmail?: string;
}

// === Invites ===
export interface Invite {
  id: string;
  groupId: string;
  groupName: string;
  invitedBy: string;
  invitedAt: string;
  inviter?: {
    fullName: string;
    surname: string;
  };
  group?: {
    name: string;
    description?: string;
  };
}

export interface JoinRequest {
  email?: string;
  userEmail: string;
  fullName?: string;
  surname?: string;
  requestedAt: string;
  profilePictureUrl?: string | null;
  user?: {
    fullName: string;
    surname: string;
    country?: string;
  };
}

// === Constitution ===
export interface Constitution {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy?: string;
  downloadUrl: string;
}

// === Notifications (UI-only for now) ===
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
}

// === Member Stats ===
export interface MemberStats {
  totalContributions: number;
  totalPaid?: number;
  totalPayouts: number;
  totalPayoutsReceived?: number;
  contributionCount?: number;
  payoutCount?: number;
  meetingsAttended?: number;
  recentContributions?: Contribution[];
  recentPayouts?: Payout[];
}

// === Dashboard Stats ===
export interface DashboardStats {
  totalContributions: number;
  calculatedContributions: number;
  contributionAdjustment: number;
  totalPayouts: number;
  netBalance: number;
  nextPayout: Payout | null;
  completedPayoutsCount: number;
  scheduledPayoutsCount: number;
}

// === Search Result ===
export interface UserSearchResult {
  email: string;
  fullName: string;
  surname: string;
  profilePictureUrl?: string | null;
}

// === Invite Link ===
export interface InviteLinkInfo {
  groupId: string;
  groupName: string;
  groupDescription?: string;
  memberCount: number;
}

// === App Notification ===
export interface AppNotification {
  id: string;
  recipientEmail: string;
  groupId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: string;
}

// === Notification Preferences ===
export interface NotificationPrefs {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;
}

// === RSVP ===
export interface MeetingRSVP {
  meetingId: string;
  groupId: string;
  userEmail: string;
  response: 'yes' | 'no' | 'maybe';
  updatedAt: string;
}

export interface RSVPSummary {
  yes: number;
  no: number;
  maybe: number;
  myResponse: 'yes' | 'no' | 'maybe' | null;
}

// === Overdue Member ===
export interface OverdueMember {
  email: string;
  fullName: string;
  surname: string;
  totalPaid: number;
  unpaidAmount: number;
  contributionCount: number;
  isOverdue: boolean;
  deficit: number;
  target: number;
}

// === Audit Log ===
export interface AuditEntry {
  id: string;
  groupId: string;
  actorEmail: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
}

// === Group Health ===
export interface GroupHealth {
  score: number;
  paymentRate: number;
  streak: number;
  trend: 'up' | 'down' | 'stable';
  memberCount: number;
  totalContributions: number;
  paidContributions: number;
  monthlyBreakdown: { label: string; paid: number; total: number }[];
}

// === Payout with proof ===
export interface PayoutProof {
  referenceNumber?: string;
}

// === Payout status badge variants ===
export type PayoutStatus = 'scheduled' | 'completed' | 'cancelled';

// === Delete confirmation state ===
export interface DeleteConfirmState {
  open: boolean;
  id: string | null;
}
