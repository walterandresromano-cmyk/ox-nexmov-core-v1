function Icon({ size = 16, className = "", children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function ShieldCheckIcon({ size = 16, className = "" }) {
  return (
    <Icon size={size} className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

export function ArrowsSwapIcon({ size = 16, className = "" }) {
  return (
    <Icon size={size} className={className}>
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </Icon>
  );
}

export function TargetIcon({ size = 16, className = "" }) {
  return (
    <Icon size={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
    </Icon>
  );
}

export function DollarSignIcon({ size = 16, className = "" }) {
  return (
    <Icon size={size} className={className}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Icon>
  );
}

export function ClipboardCheckIcon({ size = 16, className = "" }) {
  return (
    <Icon size={size} className={className}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

export function CheckIcon({ size = 16, className = "" }) {
  return (
    <Icon size={size} className={className}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  );
}
