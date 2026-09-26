import type { Page, Route } from '@playwright/test';

/**
 * Use with `test.use({ serviceWorkers: 'block' })` — once the app's service
 * worker takes control it fetches the API itself and bypasses page routes.
 *
 * Signs the browser into a fake session and answers every API call with
 * sample data, so logged-in screens can be tested without a real backend.
 * A 10-member rotating stokvel in round 7: seven paid, two late, one due.
 */
export const ME = 'lindiwe@example.com';
export const GROUP_ID = 'g-masakhane';

const names = [
  ['Lindiwe', 'Mahlangu'], ['Thandi', 'Mokoena'], ['Sipho', 'Dlamini'], ['Precious', 'Khumalo'],
  ['Kagiso', 'Tladi'], ['Nomsa', 'Dube'], ['Bongani', 'Nkosi'], ['Lerato', 'Ndlovu'],
  ['Zanele', 'Zulu'], ['Themba', 'Sithole'],
];
const email = (i: number) => (i === 0 ? ME : `${names[i][0].toLowerCase()}@example.com`);

const now = new Date();
// Local calendar date (toISOString would shift midnight into the previous UTC day).
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const thisMonth = (day: number) => iso(new Date(now.getFullYear(), now.getMonth(), day));
const monthsAgo = (m: number, day = 5) => iso(new Date(now.getFullYear(), now.getMonth() - m, day));
const inDays = (d: number) => iso(new Date(now.getTime() + d * 86_400_000));

export function sampleData(groupType = 'rotating') {
  const members = names.map(([fullName, surname], i) => ({
    email: email(i), fullName, surname, role: i === 0 ? 'admin' : 'member', status: 'approved',
    joinedAt: monthsAgo(8),
  }));

  const contributions = [
    // Six previous months, everyone paid.
    ...Array.from({ length: 6 }, (_, m) => members.map((mem, i) => ({
      id: `c-${m}-${i}`, groupId: GROUP_ID, userEmail: mem.email, amount: 1200,
      date: monthsAgo(m + 1, 3 + i), paid: true, createdAt: monthsAgo(m + 1, 3 + i),
    }))).flat(),
    // This month: 0-6 paid; 7 and 8 late; 9 due.
    ...members.slice(0, 7).map((mem, i) => ({
      id: `c-now-${i}`, groupId: GROUP_ID, userEmail: mem.email, amount: 1200,
      date: thisMonth(Math.min(1 + i, now.getDate())), paid: true, createdAt: thisMonth(1),
    })),
  ];

  const payouts = [
    ...Array.from({ length: 6 }, (_, m) => ({
      id: `p-${m}`, groupId: GROUP_ID, recipientEmail: members[m].email, amount: 12000,
      status: 'completed', scheduledDate: monthsAgo(6 - m, 25), completedAt: monthsAgo(6 - m, 25),
    })),
    { id: 'p-next', groupId: GROUP_ID, recipientEmail: members[6].email, amount: 12000,
      status: 'scheduled', scheduledDate: inDays(9), createdBy: members[1].email,
      approvals: [{ approverEmail: members[1].email, approvedAt: monthsAgo(0) }],
      recipient: { fullName: members[6].fullName, surname: members[6].surname } },
  ];

  const group = {
    id: GROUP_ID, name: 'Masakhane Umgalelo', groupCode: 'MSK123', isPublic: false, payoutsAllowed: true,
    contributionFrequency: 'monthly', groupType, currency: 'ZAR', contributionTarget: 1200, loanRatePercent: 10, quorumPercent: 50,
    createdBy: ME, createdAt: monthsAgo(8), userRole: 'admin', memberCount: 10, userStatus: 'approved',
  };

  const loans = [
    { id: 'loan-req', groupId: GROUP_ID, borrowerEmail: members[3].email, principal: 5000, ratePercent: 10, termMonths: 5,
      purpose: 'Stock', status: 'requested', requestedBy: members[3].email, createdAt: monthsAgo(0),
      approvals: [{ approverEmail: members[1].email, approvedAt: monthsAgo(0) }], repayments: [] },
    { id: 'loan-late', groupId: GROUP_ID, borrowerEmail: members[2].email, principal: 18000, ratePercent: 10, termMonths: 6,
      purpose: 'School fees', status: 'active', requestedBy: members[2].email, createdAt: monthsAgo(4),
      releasedAt: new Date(now.getFullYear(), now.getMonth() - 4, 1).toISOString(), dueDate: inDays(60),
      approvals: [], repayments: [{ id: 'r1', amount: 3300, paidOn: monthsAgo(3), method: 'cash', recordedBy: ME }] },
  ];

  return {
    group,
    loans,
    members,
    contributions,
    payouts,
    meetings: [{
      id: 'm-1', groupId: GROUP_ID, date: inDays(4), time: '10:00', venue: 'Community hall', createdAt: monthsAgo(0),
      attendance: Object.fromEntries(members.map((m, i) => [m.email, i < 7])),
    }],
    votes: [
      { id: 'v-open', groupId: GROUP_ID, meetingId: 'm-1', question: 'Increase the monthly contribution to R1 500',
        kind: 'resolution', active: true, yesVotes: members.slice(1, 5).map((m) => m.email), noVotes: [members[5].email],
        createdAt: monthsAgo(0) },
      { id: 'v-closed', groupId: GROUP_ID, meetingId: 'm-1', question: 'Buy a gazebo for meetings',
        kind: 'resolution', active: false, yesVotes: [], noVotes: [], outcome: 'no_quorum', closedAt: monthsAgo(1),
        tally: { yes: 3, no: 1, present: 4, eligible: 10, quorum: 5 }, createdAt: monthsAgo(1) },
    ],
    overdue: members.slice(7, 9).map((m) => ({
      email: m.email, fullName: m.fullName, surname: m.surname, totalPaid: 7200, unpaidAmount: 1200,
      contributionCount: 6, isOverdue: true, deficit: 1200, target: 1200,
    })),
    rotation: {
      groupId: GROUP_ID, currentPosition: 6, currentCycle: 1, updatedAt: monthsAgo(0),
      slots: members.map((m, i) => ({ email: m.email, position: i, fullName: m.fullName, surname: m.surname, cycleReceived: i < 6 })),
    },
  };
}

export interface MockApiOptions {
  groupType?: string;
  /** Start as a brand-new user with no groups; POST /groups creates one. */
  newUser?: boolean;
}

/** Requests the app sent that change data, for assertions. */
export interface MockApiLog {
  writes: Array<{ method: string; path: string; body: unknown }>;
}

export async function mockApi(page: Page, opts: MockApiOptions = {}): Promise<MockApiLog> {
  const data = sampleData(opts.groupType);
  const log: MockApiLog = { writes: [] };
  let hasGroup = !opts.newUser;

  const routes: Array<[RegExp, unknown | (() => unknown)]> = [
    [/\/session$/, { session: { user: { id: 'u-1', email: ME } } }],
    [/\/profile$/, { email: ME, fullName: 'Lindiwe', surname: 'Mahlangu', country: 'South Africa', phone: '+27820000000' }],
    [/\/groups$/, () => ({ groups: hasGroup ? [data.group] : [] })],
    [/\/groups\/archived$/, { groups: [] }],
    [/\/selected-group$/, () => ({ group: hasGroup ? data.group : null })],
    [/\/groups\/[^/]+$/, { group: data.group }],
    [/\/groups\/[^/]+\/members$/, { members: data.members }],
    [/\/contributions$/, { contributions: data.contributions }],
    [/\/groups\/[^/]+\/contribution-adjustment$/, { adjustment: 0 }],
    [/\/payouts$/, { payouts: data.payouts, requiredApprovals: 2 }],
    [/\/meetings$/, { meetings: data.meetings }],
    [/\/groups\/[^/]+\/overdue$/, { members: data.overdue, target: 1200 }],
    [/\/groups\/[^/]+\/rotation$/, { rotation: data.rotation }],
    [/\/groups\/[^/]+\/requests$/, { requests: [] }],
    [/\/groups\/[^/]+\/subscription$/, { groupId: GROUP_ID, tier: 'pro', trialStartedAt: null, trialEndsAt: null, paystackSubscriptionCode: 'SUB_test', paystackCustomerCode: 'CUS_test', nextBillingDate: inDays(20), updatedAt: monthsAgo(1) }],
    [/\/notifications$/, { notifications: [] }],
    [/\/groups\/[^/]+\/health$/, {
      score: 86, paymentRate: 93.3, streak: 6, trend: 'up', memberCount: 10,
      totalContributions: 70, paidContributions: 67,
      monthlyBreakdown: Array.from({ length: 6 }, (_, i) => ({ label: monthsAgo(5 - i).slice(0, 7), paid: 10, total: 10 })),
    }],
    [/\/invites$/, { invites: [] }],
    [/\/votes$/, { votes: data.votes }],
    [/\/groups\/[^/]+\/loans$/, { loans: data.loans, ratePercent: 10, activeAdminCount: 2 }],
    [/\/groups\/[^/]+\/announcements$/, { announcements: [] }],
  ];

  await page.addInitScript(() => {
    sessionStorage.setItem('accessToken', 'test-token');
    localStorage.setItem('stokpile-has-account', 'true');
  });

  await page.route(/supabase\.co\//, async (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname.replace(/^.*make-server-34d0b231/, '');
    if (method !== 'GET') {
      let body: unknown = null;
      try { body = route.request().postDataJSON(); } catch { /* not JSON */ }
      log.writes.push({ method, path, body });
      if (method === 'POST' && path === '/groups') {
        hasGroup = true;
        return route.fulfill({ json: { group: data.group, groupCode: data.group.groupCode } });
      }
      return route.fulfill({ json: { message: 'ok', success: true } });
    }
    const hit = routes.find(([rx]) => rx.test(path));
    const value = hit ? (typeof hit[1] === 'function' ? (hit[1] as () => unknown)() : hit[1]) : {};
    // Unknown endpoints get an empty-but-valid shape so screens render.
    return route.fulfill({ json: value });
  });
  return log;
}
