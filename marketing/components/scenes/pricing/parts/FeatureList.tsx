// Static feature list rendered inside each TierCard. Kept as its own file
// so the per-tier content stays declarative and easy to scan.

export interface Feature {
  text: string;
  /** When true, render with brand accent — used to highlight the cap line. */
  emphasize?: boolean;
}

export interface FeatureListProps {
  items: Feature[];
}

export function FeatureList({ items }: FeatureListProps) {
  return (
    <ul className="space-y-2.5 text-sm">
      {items.map((f, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <Check />
          <span className={f.emphasize ? 'text-ink-50' : 'text-ink-300'}>
            {f.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Check() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="mt-1 shrink-0 text-brand-400"
    >
      <path
        d="M2.5 7.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
