import type { ElementType } from 'react';
import {
  Home, Wallet, Users, Calendar, TrendingUp, Megaphone, Settings, RefreshCw, ShoppingCart,
  HeartHandshake, Gavel, FileBarChart, ClipboardList, DollarSign,
} from 'lucide-react';
import type { Group, SubscriptionFeature } from '@/domain/types';
import { hasRotation } from '@/domain/types';

/**
 * The app's navigation, defined once. The mobile tab bar, the mobile drawer
 * and the desktop menus all read from here, so a tab can't exist in one and
 * be missing (or point nowhere) in another. Every id is a TabsContent value
 * in App.tsx.
 */
export type NavSection = 'money' | 'people' | 'more';

export interface NavItem {
  id: string;
  label: string;
  icon: ElementType;
  section: NavSection;
  /** Plan feature that gates the screen (shown as a badge when locked). */
  feature: SubscriptionFeature;
  badge?: number;
}

export interface TabBarItem {
  label: string;
  icon: ElementType;
  /** Tab opened when tapped. */
  target: string;
  /** Tabs that light this item up. */
  match: readonly string[];
}

export const SECTION_LABELS: Record<NavSection, string> = {
  money: 'Money',
  people: 'People',
  more: 'More',
};

export function navItems(
  group: Group,
  isAdmin: boolean,
  badges: { announcements?: number; joinRequests?: number } = {},
): NavItem[] {
  const type = group.groupType;
  const items: Array<NavItem | false> = [
    { id: 'contributions', label: 'Contributions', icon: DollarSign, section: 'money', feature: 'announcements' },
    group.payoutsAllowed && { id: 'payouts', label: 'Payouts', icon: TrendingUp, section: 'money', feature: 'announcements' },
    isAdmin && { id: 'insights', label: 'Insights', icon: FileBarChart, section: 'money', feature: 'reports' },
    isAdmin && { id: 'penalties', label: 'Penalties', icon: Gavel, section: 'money', feature: 'penalties' },

    { id: 'members', label: 'Members', icon: Users, section: 'people', feature: 'announcements' },
    { id: 'meetings', label: 'Meetings', icon: Calendar, section: 'people', feature: 'announcements' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, section: 'people', feature: 'announcements', badge: badges.announcements },
    { id: 'info', label: 'Group settings', icon: Settings, section: 'people', feature: 'announcements', badge: badges.joinRequests },

    hasRotation(type) && { id: 'rotation', label: 'Rotation', icon: RefreshCw, section: 'more', feature: 'rotation' },
    type === 'grocery' && { id: 'grocery', label: 'Grocery list', icon: ShoppingCart, section: 'more', feature: 'grocery' },
    type === 'burial' && { id: 'burial', label: 'Burial', icon: HeartHandshake, section: 'more', feature: 'burial' },
    isAdmin && { id: 'audit', label: 'Audit log', icon: ClipboardList, section: 'more', feature: 'audit' },
  ];
  return items.filter((i): i is NavItem => Boolean(i));
}

export function itemsIn(items: NavItem[], section: NavSection): NavItem[] {
  return items.filter((i) => i.section === section);
}

/**
 * Mobile tab bar: a word under every icon, five slots, Pilo raised in the
 * centre (rendered by the bar itself between the halves).
 */
export function tabBar(items: NavItem[]): { left: TabBarItem[]; right: TabBarItem[] } {
  const moneyIds = itemsIn(items, 'money').map((i) => i.id);
  return {
    left: [
      { label: 'Home', icon: Home, target: 'dashboard', match: ['dashboard'] },
      { label: 'Money', icon: Wallet, target: 'contributions', match: moneyIds },
    ],
    right: [
      { label: 'Members', icon: Users, target: 'members', match: ['members'] },
      { label: 'Meet', icon: Calendar, target: 'meetings', match: ['meetings'] },
    ],
  };
}

export function sectionOf(items: NavItem[], tab: string): NavSection | null {
  return items.find((i) => i.id === tab)?.section ?? null;
}
