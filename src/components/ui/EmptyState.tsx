export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const DEFAULT_ICON = (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export function EmptyState({ title, description, icon }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3.5 px-10 pb-28 pt-10 text-center">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-separator bg-surface-1 text-tertiary">
        {icon ?? DEFAULT_ICON}
      </div>
      <h3 className="text-[17px] font-bold text-primary">{title}</h3>
      <p className="max-w-[250px] text-sm leading-snug text-secondary">{description}</p>
    </div>
  );
}
