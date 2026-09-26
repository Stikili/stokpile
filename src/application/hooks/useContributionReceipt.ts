import { useMemo } from 'react';
import { hasRotation } from '@/domain/types';
import { buildContributionReceipt, type ReceiptModel } from '@/domain/receipt';
import { rotationPosition } from '@/domain/round';
import { useContributions, useMembers, useRotation } from '@/application/hooks/queries';

/** Receipt for one recorded contribution, from cached group data. */
export function useContributionReceipt(args: {
  groupId: string;
  groupName: string;
  groupType?: string;
  contributionId: string | null;
}): ReceiptModel | null {
  const { groupId, groupName, groupType, contributionId } = args;
  const rotating = hasRotation(groupType);
  const contributions = useContributions(groupId).data?.contributions ?? [];
  const members = useMembers(groupId).data?.members ?? [];
  const rotation = useRotation(rotating ? groupId : undefined).data?.rotation ?? null;

  return useMemo(() => {
    const contribution = contributions.find((c) => c.id === contributionId);
    if (!contribution) return null;
    const pos = rotating ? rotationPosition(rotation) : null;
    return buildContributionReceipt({
      contribution,
      groupName,
      members,
      contributions,
      round: pos && pos.total > 0 ? { number: pos.round, of: pos.total } : undefined,
    });
  }, [contributions, members, rotation, rotating, contributionId, groupName]);
}
