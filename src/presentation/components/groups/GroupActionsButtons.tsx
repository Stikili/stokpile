import { CreateGroupDialog } from '@/presentation/components/groups/CreateGroupDialog';
import { JoinGroupDialog } from '@/presentation/components/groups/JoinGroupDialog';
import { SearchPublicGroupsDialog } from '@/presentation/components/groups/SearchPublicGroupsDialog';

interface GroupActionsButtonsProps {
  onSuccess: () => void;
}

export function GroupActionsButtons({ onSuccess }: GroupActionsButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <CreateGroupDialog onSuccess={onSuccess} />
      <JoinGroupDialog onSuccess={onSuccess} />
      <SearchPublicGroupsDialog onSuccess={onSuccess} />
    </div>
  );
}
