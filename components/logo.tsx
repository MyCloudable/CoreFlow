// ServiceFox brand mark — used ONLY on operator surfaces (landing page,
// /admin). Tenant portals are white-labeled and never show it.
// The same artwork ships as app/icon.svg (favicon).

export function FoxMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        fill="#ea580c"
        d="M17 9 L33 22 L50 26 L67 22 L83 9 L91 46 L72 74 L50 92 L28 74 L9 46 Z"
      />
      <path fill="#ffffff" d="M19 16 L28 23 L14 33 Z" />
      <path fill="#ffffff" d="M81 16 L72 23 L86 33 Z" />
      <path fill="#ffffff" d="M25 58 L42 49 L50 58 L58 49 L75 58 L50 88 Z" />
      <circle cx="34" cy="46" r="5" fill="#431407" />
      <circle cx="66" cy="46" r="5" fill="#431407" />
      <path fill="#431407" d="M42 78 L58 78 L50 89 Z" />
    </svg>
  );
}

export function Wordmark({ markClassName = "h-8 w-8" }: { markClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <FoxMark className={markClassName} />
      <span className="text-lg font-bold tracking-tight text-gray-900">
        Service<span className="text-orange-600">Fox</span>
      </span>
    </span>
  );
}
