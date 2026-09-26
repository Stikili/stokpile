import type { NavItem } from './navigation';

/**
 * Segmented switcher across the screens of one section (e.g. Money:
 * Contributions · Payouts · Penalties), so sibling screens are one tap apart
 * on every device. Renders nothing when a section has a single screen.
 */
export function SectionTabs({
  items, activeTab, onChange,
}: { items: NavItem[]; activeTab: string; onChange: (tab: string) => void }) {
  if (items.length < 2) return null;
  return (
    <div role="tablist" aria-label="Section" className="flex gap-1 overflow-x-auto scrollbar-none -mx-1 px-1">
      {items.map((item) => {
        const active = item.id === activeTab;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--s-radius-sm)] text-sm font-semibold border transition-colors
              ${active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:text-foreground'}`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
