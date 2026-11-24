interface BaseMarkProps {
  size?: number;
  className?: string;
}

export function BaseMark({ size = 28, className }: BaseMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.75 10.75 12 4l8.25 6.75V20H3.75v-9.25Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M9 20v-6h6v6"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
