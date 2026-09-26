import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/infrastructure/api';
import { hasRotation, type GroupType } from '@/domain/types';
import { parseMemberNames } from '@/domain/groupTypes';
import { trackGroupCreated } from '@/application/analytics';

export interface GroupSetupInput {
  type: GroupType;
  name: string;
  /** Per-member contribution each period; null when not set. */
  contribution: number | null;
  frequency: string;
  currency: string;
  /** Member names, one per line or comma-separated. Phones can be added later. */
  memberNames: string;
}

export interface GroupSetupResult {
  groupId: string;
  added: number;
  /** Names the server refused (e.g. already in the group). */
  failed: string[];
}

/**
 * Creates a group in one go: the group itself, the members typed by name,
 * and — for rotating types — the payout order in the order they were typed.
 * The server makes the new group the selected one.
 */
export function useGroupSetup() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);

  const setup = async (input: GroupSetupInput): Promise<GroupSetupResult> => {
    setBusy(true);
    try {
      setStep('Creating your group');
      const { group } = await api.createGroup({
        name: input.name.trim(),
        contributionFrequency: input.frequency,
        isPublic: false,
        groupType: input.type,
        currency: input.currency,
        contributionTarget: input.contribution,
      });

      const names = parseMemberNames(input.memberNames);
      const failed: string[] = [];
      if (names.length > 0) setStep(`Adding ${names.length} member${names.length === 1 ? '' : 's'}`);
      // Sequential, so the payout order follows the order names were typed.
      for (const name of names) {
        try {
          await api.addManagedMember(group.id, { name });
        } catch {
          failed.push(name);
        }
      }

      if (hasRotation(input.type)) {
        setStep('Setting the payout order');
        await api.initRotationOrder(group.id).catch(() => undefined);
      }

      trackGroupCreated(input.type, names.length - failed.length);
      qc.invalidateQueries();
      return { groupId: group.id, added: names.length - failed.length, failed };
    } finally {
      setBusy(false);
      setStep(null);
    }
  };

  return { setup, busy, step };
}
