// AI feature launchers. Each is a thin wrapper around <AiDrawer> with
// task-specific fields + prompts. Keep the surface minimal — all heavy
// lifting happens in the edge function task registry (ai_routes.ts).

import { useState } from 'react';
import { Button } from '@/presentation/ui/button';
import { AiDrawer } from './AiDrawer';
import {
  Sparkles, MessageCircle, Bell, CalendarDays, FileText, FileSignature,
  HandCoins, Scale, Shield, RotateCw, Trophy, Calculator, Search,
  Clock, UserCheck, HelpCircle, ClipboardCheck, AlertTriangle, Coins,
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════════
// Phase 1: Admin content generators
// ════════════════════════════════════════════════════════════════════

export function AskGroupButton({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Ask your group
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Ask your group"
        description={`Ask anything about ${groupName} — I'll pull live data.`}
        task="ask_group"
        groupId={groupId}
        contextStatic={{ groupName }}
        fields={[
          { key: 'question', label: 'Your question', type: 'textarea', required: true,
            placeholder: 'Who hasn\'t paid this month? · How much did we save in 2025? · When is my next payout?' },
        ]}
      />
    </>
  );
}

export function AnnouncementDrafterButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <MessageCircle className="h-3.5 w-3.5" />
        Draft announcement
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Announcement drafter"
        description="Draft a message to send to your group"
        task="announcement_drafter"
        groupId={groupId}
        fields={[
          { key: 'topic', label: 'What is the announcement about?', type: 'textarea', required: true,
            placeholder: 'E.g. Payouts are delayed 3 days because of the public holiday' },
          { key: 'tone', label: 'Tone', type: 'select', initial: 'warm and respectful', options: [
            { value: 'warm and respectful', label: 'Warm & respectful' },
            { value: 'formal',               label: 'Formal' },
            { value: 'urgent',               label: 'Urgent' },
            { value: 'celebratory',          label: 'Celebratory' },
          ]},
          { key: 'length', label: 'Length', type: 'select', initial: 'short (under 80 words)', options: [
            { value: 'short (under 80 words)',   label: 'Short (WhatsApp)' },
            { value: 'medium (80-150 words)',    label: 'Medium' },
            { value: 'detailed (up to 250 words)', label: 'Detailed' },
          ]},
          { key: 'context', label: 'Extra context (optional)', type: 'textarea', placeholder: 'Dates, amounts, member names...' },
        ]}
      />
    </>
  );
}

export function NudgeWriterButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Bell className="h-3.5 w-3.5" />
        Draft nudge
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Member reminder drafter"
        description="Personalised tone based on the member's history"
        task="nudge_writer"
        groupId={groupId}
        fields={[
          { key: 'memberEmail', label: 'Member email', required: true, placeholder: 'name@example.com' },
          { key: 'amount', label: 'Amount overdue', required: true, placeholder: 'R500' },
          { key: 'period', label: 'Period', required: true, placeholder: 'March 2026' },
        ]}
      />
    </>
  );
}

export function AgendaGeneratorButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <CalendarDays className="h-3.5 w-3.5" />
        Meeting agenda
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Meeting agenda generator"
        description="Pulls from your recent audit log and past meetings"
        task="agenda_generator"
        groupId={groupId}
        fields={[
          { key: 'meetingDate', label: 'Meeting date', required: true, placeholder: 'YYYY-MM-DD' },
        ]}
      />
    </>
  );
}

export function AgmMinutesButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <FileText className="h-3.5 w-3.5" />
        AGM minutes
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="AGM minutes generator"
        task="agm_minutes"
        groupId={groupId}
        fields={[
          { key: 'date', label: 'AGM date', required: true, placeholder: 'YYYY-MM-DD' },
          { key: 'notes', label: 'Rough notes from the meeting', type: 'textarea', required: true, placeholder: 'Key discussions, decisions, names...' },
        ]}
      />
    </>
  );
}

export function TreasurerHandoverButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <FileSignature className="h-3.5 w-3.5" />
        Treasurer handover
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Treasurer handover pack"
        description="Everything the incoming treasurer needs"
        task="treasurer_handover"
        groupId={groupId}
        fields={[
          { key: 'from', label: 'Outgoing treasurer (name/email)', required: true },
          { key: 'to',   label: 'Incoming treasurer (name/email)', required: true },
        ]}
      />
    </>
  );
}

export function CycleClosureButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <ClipboardCheck className="h-3.5 w-3.5" />
        Cycle closure report
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Cycle closure report"
        task="cycle_closure_report"
        groupId={groupId}
        fields={[
          { key: 'cycleStart', label: 'Cycle start', required: true, placeholder: 'YYYY-MM-DD' },
          { key: 'cycleEnd',   label: 'Cycle end',   required: true, placeholder: 'YYYY-MM-DD' },
        ]}
      />
    </>
  );
}

export function WeeklyDigestButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        Weekly digest
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Weekly admin digest"
        description="What needs your attention this week"
        task="weekly_digest"
        groupId={groupId}
        autoSubmit
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Phase 2: Member Q&A
// ════════════════════════════════════════════════════════════════════

export function TierExplainerButton({ tier, lifetimePoints }: { tier: string; lifetimePoints: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Trophy className="h-3.5 w-3.5 text-amber-500" />
        Explain my tier
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Your tier explained"
        task="tier_explainer"
        contextStatic={{ tier, lifetimePoints }}
        autoSubmit
      />
    </>
  );
}

export function RewardsCalculatorButton({ tier, commissionRate }: { tier: string; commissionRate: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Calculator className="h-3.5 w-3.5" />
        Rewards calculator
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Rewards calculator"
        description="Project your earnings under different scenarios"
        task="rewards_calculator"
        contextStatic={{ tier, commissionRate }}
        fields={[
          { key: 'scenario', label: 'Your scenario', type: 'textarea', required: true,
            placeholder: 'E.g. What if I refer 3 Pro groups? How long until I hit Gold?' },
        ]}
      />
    </>
  );
}

export function StokvelQuizButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <HelpCircle className="h-3.5 w-3.5" />
        Which stokvel fits?
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Find the right stokvel type"
        task="stokvel_quiz"
        fields={[
          { key: 'goal', label: 'What are you trying to achieve?', type: 'textarea', required: true,
            placeholder: 'E.g. Save R50k with 10 friends for a year-end holiday · Bulk-buy groceries in December · Pool money for burial expenses' },
        ]}
      />
    </>
  );
}

export function ContributionProjectionButton({ groupId, memberEmail }: { groupId: string; memberEmail: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Coins className="h-3.5 w-3.5" />
        Project my savings
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Savings projection"
        task="contribution_projection"
        groupId={groupId}
        contextStatic={{ memberEmail }}
        fields={[
          { key: 'targetDate', label: 'Target date', required: true, placeholder: 'YYYY-MM-DD' },
        ]}
      />
    </>
  );
}

export function PayoutPredictorButton({ groupId, memberEmail }: { groupId: string; memberEmail: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <HandCoins className="h-3.5 w-3.5" />
        When's my payout?
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Payout date predictor"
        task="payout_predictor"
        groupId={groupId}
        contextStatic={{ memberEmail }}
        autoSubmit
      />
    </>
  );
}

export function JoinAdvisorButton({ groupListing }: { groupListing: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <UserCheck className="h-3.5 w-3.5" />
        Is this group safe?
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Group safety check"
        description="I'll evaluate red flags and green flags for you"
        task="join_advisor"
        contextStatic={{ groupListing }}
        autoSubmit
      />
    </>
  );
}

export function MemberFaqButton({ groupId }: { groupId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Search className="h-3.5 w-3.5" />
        Ask Stokpile
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Ask Stokpile"
        description="Any question about the app or stokvels"
        task="member_faq"
        groupId={groupId}
        fields={[
          { key: 'question', label: 'Your question', type: 'textarea', required: true,
            placeholder: 'E.g. What\'s the difference between a chama and a stokvel?' },
        ]}
      />
    </>
  );
}

export function AbsenceApologyButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} className="gap-1.5">
        <Sparkles className="h-3.5 w-3.5" />
        Draft apology
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Absence apology drafter"
        task="absence_apology"
        fields={[
          { key: 'event', label: 'What did you miss?', required: true, placeholder: 'Meeting on Saturday · March contribution' },
          { key: 'reason', label: 'Why (brief)', type: 'textarea', required: true, placeholder: 'Family emergency · Work travel · Illness' },
        ]}
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Phase 3: Advisory / reasoning
// ════════════════════════════════════════════════════════════════════

export function PenaltyAdvisorButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Scale className="h-3.5 w-3.5" />
        Penalty advisor
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Penalty advisor"
        description="Applies your constitution to a specific incident"
        task="penalty_advisor"
        groupId={groupId}
        fields={[
          { key: 'memberEmail', label: 'Member involved', required: true },
          { key: 'incident', label: 'What happened?', type: 'textarea', required: true,
            placeholder: 'E.g. Missed 2 contributions in a row, no notification given' },
        ]}
      />
    </>
  );
}

export function ConstitutionBuilderButton({ groupType }: { groupType?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <FileSignature className="h-3.5 w-3.5" />
        Constitution builder
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Constitution builder"
        description="Guided Q&A generates a full constitution"
        task="constitution_builder"
        contextStatic={{ groupType }}
        fields={[
          { key: 'answers', label: 'Answers to the starter questions', type: 'textarea', required: true,
            placeholder: 'Group name, purpose, how members join, contribution amount, frequency, penalty rules, payout process, meeting cadence, office bearers...' },
        ]}
      />
    </>
  );
}

export function ConstitutionLegalCheckButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Shield className="h-3.5 w-3.5" />
        Legal check
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Constitution legal check (SA)"
        description="Flags clauses that conflict with SA law"
        task="constitution_legal_check"
        fields={[
          { key: 'constitutionText', label: 'Paste your constitution', type: 'textarea', required: true,
            placeholder: 'Paste the full text here' },
        ]}
      />
    </>
  );
}

export function RotationAdvisorButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <RotateCw className="h-3.5 w-3.5" />
        Review rotation fairness
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Rotation-fairness advisor"
        task="rotation_advisor"
        groupId={groupId}
        autoSubmit
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Phase 4: Background scan (invoked on demand from admin view)
// ════════════════════════════════════════════════════════════════════

export function MissingDocsScanButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        Documentation gaps
      </Button>
      <AiDrawer
        open={open}
        onOpenChange={setOpen}
        title="Documentation gap scan"
        description="Finds meetings without minutes, payouts without proof, etc."
        task="missing_docs_scan"
        groupId={groupId}
        autoSubmit
      />
    </>
  );
}
