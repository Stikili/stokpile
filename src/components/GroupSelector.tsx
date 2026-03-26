import { Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';

interface Group {
  id: string;
  name: string;
  userRole: string;
}

interface GroupSelectorProps {
  groups: Group[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

export function GroupSelector({ groups, selectedGroupId, onSelectGroup }: GroupSelectorProps) {
  if (groups.length === 0) return null;

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div className="bg-white dark:bg-gray-950 border-b px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        {groups.length > 1 && (
          <Badge variant="secondary" className="text-xs py-0 h-5">
            {groups.length}
          </Badge>
        )}
        <Select value={selectedGroupId || undefined} onValueChange={onSelectGroup}>
          <SelectTrigger className="w-[280px] h-8 text-sm">
            <SelectValue placeholder="Select a group">
              {selectedGroup && (
                <div className="flex items-center gap-1.5">
                  <span className="truncate">{selectedGroup.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({selectedGroup.userRole})
                  </span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {groups.map(group => (
              <SelectItem key={group.id} value={group.id} className="text-sm">
                <div className="flex items-center gap-1.5">
                  <span>{group.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({group.userRole})
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
