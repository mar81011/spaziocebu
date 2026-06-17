interface IconProps {
  className?: string;
}

/** Messenger-style filled microphone */
export function MicIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15a1 1 0 0 0-.98-.85.995.995 0 0 0-1.09.99C5.68 15.14 8.62 18 12 18s6.32-2.86 6.98-6.16a1 1 0 0 0-1.07-1.01zM11 22h2v-2h-2v2z" />
    </svg>
  );
}

/** Messenger-style send (paper plane) */
export function SendIcon({ className = "h-[18px] w-[18px]" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}
