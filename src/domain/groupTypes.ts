import type { GroupType } from './types';

/**
 * The kinds of group Stokpile runs. One ledger, different engines: the type
 * decides what releases money (a turn, a claim, a date, a vote). It is chosen
 * first when a group is created.
 */
export interface GroupTypeInfo {
  type: GroupType;
  label: string;
  /** One line a treasurer recognises, in their own terms. */
  description: string;
  /** Shown in the first row of choices; the rest sit under "More types". */
  primary: boolean;
}

export const GROUP_TYPES: readonly GroupTypeInfo[] = [
  { type: 'rotating', label: 'Rotating stokvel', description: 'Everyone pays in each round and one member takes the pot, in a fixed order.', primary: true },
  { type: 'burial', label: 'Burial society', description: 'Members pay a monthly levy that covers funeral costs for their families.', primary: true },
  { type: 'grocery', label: 'Grocery stokvel', description: 'Save through the year, then buy groceries together in bulk.', primary: true },
  { type: 'chama', label: 'Chama', description: 'A merry-go-round, often with savings and loans to members.', primary: true },
  { type: 'investment', label: 'Investment club', description: 'Pool money, invest together and share what it earns.', primary: false },
  { type: 'goal', label: 'Goal saving', description: 'Save towards one shared target, like school fees or a trip.', primary: false },
  { type: 'susu', label: 'Susu / esusu', description: 'West African rotating savings: one member collects each round.', primary: false },
  { type: 'tontine', label: 'Tontine', description: 'A savings circle where one member receives the pool each period.', primary: false },
  { type: 'vsla', label: 'Savings and loans (VSLA)', description: 'Save together and lend small amounts from the shared fund.', primary: false },
];

export const groupTypeInfo = (type?: string | null): GroupTypeInfo | undefined =>
  GROUP_TYPES.find((t) => t.type === type);

/**
 * Member names typed one per line (or comma-separated): trimmed, blanks
 * dropped, and duplicates removed so each person is added once.
 */
export function parseMemberNames(text: string, max = 100): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of text.split(/[\n,]/)) {
    const name = raw.replace(/\s+/g, ' ').trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length >= max) break;
  }
  return names;
}
