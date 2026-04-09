// Generate a stokvel/savings group constitution from filled-in fields.

export interface ConstitutionFields {
  groupName: string;
  groupType: string;
  country?: string;
  contributionAmount?: number;
  contributionFrequency?: string;
  meetingFrequency?: string;
  meetingVenue?: string;
  payoutMethod?: string;
  membershipFee?: number;
  finePerLatePayment?: number;
  finePerMissedMeeting?: number;
  founderName?: string;
  treasurerName?: string;
  secretaryName?: string;
}

export function generateConstitution(f: ConstitutionFields): string {
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const currency = f.country === 'Kenya' ? 'KES' : f.country === 'Nigeria' ? 'NGN' : 'ZAR';

  const moneyFmt = (n?: number) => n ? `${currency} ${n.toLocaleString()}` : '__________';

  const typeLabel = ({
    rotating: 'Rotating Stokvel',
    burial: 'Burial Society',
    grocery: 'Grocery Stokvel',
    investment: 'Investment Club',
    chama: 'Chama',
    susu: 'Susu',
    tontine: 'Tontine',
    vsla: 'VSLA',
    goal: 'Goal-Based Savings Group',
  } as Record<string, string>)[f.groupType] || 'Savings Group';

  return `# CONSTITUTION OF ${f.groupName.toUpperCase()}

**Type:** ${typeLabel}
**Adopted on:** ${today}

---

## 1. NAME AND PURPOSE

1.1. The name of this group is **${f.groupName}** (hereinafter "the Group").

1.2. The Group is constituted as a ${typeLabel.toLowerCase()} for the mutual benefit of its members.

1.3. The Group is not a registered financial services provider and operates within the rules permitted for stokvels and informal savings groups in ${f.country || 'its jurisdiction'}.

---

## 2. MEMBERSHIP

2.1. Membership is open to any person who:
   - Is at least 18 years old
   - Agrees to abide by this constitution
   - Is approved by existing members

2.2. New members shall pay a once-off joining fee of ${moneyFmt(f.membershipFee)} where applicable.

2.3. A member who fails to fulfil their obligations under this constitution may be suspended or expelled by majority vote of the active members.

---

## 3. CONTRIBUTIONS

3.1. Each member shall contribute ${moneyFmt(f.contributionAmount)} ${f.contributionFrequency ? `(${f.contributionFrequency})` : 'on the agreed schedule'}.

3.2. Contributions are due on or before the agreed date of each cycle.

3.3. Late contributions may attract a fine of ${moneyFmt(f.finePerLatePayment)} per occurrence.

3.4. All contributions are recorded in the Stokpile app and are visible to all members for transparency.

---

## 4. PAYOUTS

4.1. Payouts are made in accordance with the rules of a ${typeLabel.toLowerCase()}.

4.2. The order, timing, and amount of payouts shall be agreed by the members at the time of joining and recorded in the Stokpile app.

4.3. ${f.payoutMethod ? `Payouts are made via ${f.payoutMethod}.` : 'The payment method shall be agreed by members.'}

4.4. No payout shall be made unless contributions for that cycle have been received from all participating members, except by majority vote.

---

## 5. MEETINGS

5.1. The Group shall meet ${f.meetingFrequency || '_________'} ${f.meetingVenue ? `at ${f.meetingVenue}` : 'at a venue agreed by members'}.

5.2. Attendance at meetings is compulsory for all active members.

5.3. A member who misses a meeting without prior notice may be fined ${moneyFmt(f.finePerMissedMeeting)}.

5.4. Decisions are made by majority vote of members present, except where a higher threshold is specified.

---

## 6. ROLES AND RESPONSIBILITIES

6.1. The Group shall elect from its members:
   - A **Chairperson** to convene and chair meetings
   - A **Treasurer** to manage funds and reconcile contributions${f.treasurerName ? ` (currently: ${f.treasurerName})` : ''}
   - A **Secretary** to keep records and minutes${f.secretaryName ? ` (currently: ${f.secretaryName})` : ''}

6.2. Office bearers serve a term of **12 months** and may be re-elected.

6.3. Office bearers may be removed by a two-thirds majority vote.

---

## 7. CONFLICT RESOLUTION

7.1. Disputes between members shall first be resolved internally through dialogue.

7.2. If internal resolution fails, the matter shall be put to a vote of the full membership.

7.3. The decision of the majority is final and binding on all members.

---

## 8. DISSOLUTION

8.1. The Group may be dissolved by a two-thirds majority vote of all active members.

8.2. On dissolution, all remaining funds shall be distributed equitably among contributing members in proportion to their contributions over the lifetime of the Group.

8.3. All records shall be retained by the Treasurer for a minimum of **5 years** as required by South African tax law.

---

## 9. AMENDMENTS

9.1. This constitution may be amended by a two-thirds majority vote of members at a duly convened meeting.

9.2. Notice of proposed amendments shall be given at least 14 days before the meeting.

---

## 10. SIGNATURES

By joining or remaining a member of ${f.groupName}, each person agrees to be bound by this constitution.

${f.founderName ? `**Founding Member:** ${f.founderName}\n` : ''}
**Date Adopted:** ${today}

---

*This constitution was generated using Stokpile and may be customised by the Group. Stokpile is not a legal advisor — for binding agreements, consult a qualified attorney in your jurisdiction.*
`;
}
