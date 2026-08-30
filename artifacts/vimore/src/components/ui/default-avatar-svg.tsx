export function DefaultAvatarSVG({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', height: '100%' }}
    >
      <circle cx="50" cy="50" r="50" fill="#EDEDED" />
      <ellipse cx="50" cy="34" rx="15" ry="18" fill="#ADADAD" />
      <path d="M16 86 C16 63 29 58 50 58 C71 58 84 63 84 86 Z" fill="#ADADAD" />
    </svg>
  );
}
