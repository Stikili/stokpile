// Combined entry point for admins to add members in three ways:
//   1. Invite via email (existing flow — requires the invitee to sign up)
//   2. Add "without the app" — managed member, treasurer logs on behalf
//   3. Import from CSV — bootstrap dozens at once from a spreadsheet

import { useState } from 'react';
import { Button } from '@/presentation/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/presentation/ui/dropdown-menu';
import { UserPlus, Mail, UserCog, Upload, ChevronDown } from 'lucide-react';
import { InviteMembersDialog } from './InviteMembersDialog';
import { AddManagedMemberDialog } from './AddManagedMemberDialog';
import { BulkCsvImportDialog } from './BulkCsvImportDialog';

interface Props {
  groupId: string;
  onSuccess?: () => void;
}

export function AdminAddMembersMenu({ groupId, onSuccess }: Props) {
  const [showInvite, setShowInvite] = useState(false);
  const [showManaged, setShowManaged] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            Add members
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={() => setShowInvite(true)}>
            <Mail className="h-4 w-4 mr-2" />
            <div className="flex-1">
              <p className="font-medium text-sm">Invite via email</p>
              <p className="text-[10px] text-muted-foreground">They'll sign up themselves</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowManaged(true)}>
            <UserCog className="h-4 w-4 mr-2" />
            <div className="flex-1">
              <p className="font-medium text-sm">Add without the app</p>
              <p className="text-[10px] text-muted-foreground">You log contributions for them</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            <div className="flex-1">
              <p className="font-medium text-sm">Import from CSV</p>
              <p className="text-[10px] text-muted-foreground">Bulk add from a spreadsheet</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InviteMembersDialog
        groupId={groupId}
        open={showInvite}
        onOpenChange={setShowInvite}
        hideTrigger
      />

      <AddManagedMemberDialog
        groupId={groupId}
        open={showManaged}
        onOpenChange={setShowManaged}
        onSuccess={onSuccess}
      />
      <BulkCsvImportDialog
        groupId={groupId}
        open={showImport}
        onOpenChange={setShowImport}
        onSuccess={onSuccess}
      />
    </>
  );
}
