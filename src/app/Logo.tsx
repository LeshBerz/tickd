/**
 * The product mark: a rounded tile with a tick, echoing the checkbox action that
 * defines the app. Decorative only — the wordmark next to it carries the name.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 inline-flex items-center justify-center rounded-[0.55em] bg-accent text-accent-text shadow-sm ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-[68%] h-[68%]"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M4 12.5l5 5L20 6.5" />
      </svg>
    </span>
  );
}

/** Mark plus dense wordmark, sized by the parent heading. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-accent ${className}`}>
      <BrandMark className="w-[1.15em] h-[1.15em]" />
      <span className="inline-flex flex-col items-start font-black tracking-[-0.075em] leading-[0.9]">
        <span>Tickd</span>
        <span
          aria-hidden="true"
          className="mt-[0.12em] h-[0.09em] w-[2.3em] rounded-full bg-current"
        />
      </span>
    </span>
  );
}
