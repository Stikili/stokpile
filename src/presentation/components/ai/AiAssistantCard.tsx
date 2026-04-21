import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Sparkles } from 'lucide-react';
import {
  AskGroupButton, AnnouncementDrafterButton, NudgeWriterButton,
  AgendaGeneratorButton, AgmMinutesButton, TreasurerHandoverButton,
  CycleClosureButton, WeeklyDigestButton, PenaltyAdvisorButton,
  RotationAdvisorButton, MissingDocsScanButton, MemberFaqButton,
  AbsenceApologyButton, PayoutPredictorButton, ContributionProjectionButton,
} from './AiActions';

interface AiAssistantCardProps {
  groupId: string;
  groupName: string;
  groupType?: string;
  isAdmin: boolean;
  userEmail: string;
}

export function AiAssistantCard({
  groupId, groupName, groupType, isAdmin, userEmail,
}: AiAssistantCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI assistant
          <Badge variant="outline" className="text-[10px] ml-1">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Ask</p>
          <div className="flex flex-wrap gap-2">
            <AskGroupButton groupId={groupId} groupName={groupName} />
            <MemberFaqButton groupId={groupId} />
            <PayoutPredictorButton groupId={groupId} memberEmail={userEmail} />
            <ContributionProjectionButton groupId={groupId} memberEmail={userEmail} />
            <AbsenceApologyButton />
          </div>
        </div>

        {isAdmin && (
          <>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Draft</p>
              <div className="flex flex-wrap gap-2">
                <AnnouncementDrafterButton groupId={groupId} />
                <NudgeWriterButton groupId={groupId} />
                <AgendaGeneratorButton groupId={groupId} />
                <AgmMinutesButton groupId={groupId} />
                <CycleClosureButton groupId={groupId} />
                <TreasurerHandoverButton groupId={groupId} />
                <WeeklyDigestButton groupId={groupId} />
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Review</p>
              <div className="flex flex-wrap gap-2">
                <PenaltyAdvisorButton groupId={groupId} />
                {(groupType === 'rotating' || groupType === 'susu' || groupType === 'tontine') && (
                  <RotationAdvisorButton groupId={groupId} />
                )}
                <MissingDocsScanButton groupId={groupId} />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
