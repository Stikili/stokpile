import { CreateGroupDialog } from './CreateGroupDialog';
import { JoinGroupDialog } from './JoinGroupDialog';
import { SearchPublicGroupsDialog } from './SearchPublicGroupsDialog';

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
