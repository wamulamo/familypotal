"use client";

type Role = "papa" | "mama" | "michi";

function isImageUrl(value: string): boolean {
  return typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"));
}

interface RoleIconProps {
  role: Role;
  value: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS = {
  xs: "w-6 h-6 text-base",
  sm: "w-8 h-8 text-lg",
  md: "w-12 h-12 text-2xl",
  lg: "w-16 h-16 text-3xl",
};

export function RoleIcon({ role, value, size = "md", className = "" }: RoleIconProps) {
  const sizeClass = SIZE_CLASS[size];

  if (isImageUrl(value)) {
    return (
      <img
        src={value}
        alt=""
        className={`rounded-full object-cover bg-[var(--surface)] border-2 border-[var(--border)] ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <span
      className={`rounded-full flex items-center justify-center bg-[var(--surface)] border-2 border-[var(--border)] ${sizeClass} ${className}`}
      aria-hidden
    >
      {value || (role === "papa" ? "👨" : role === "mama" ? "👩" : "👧")}
    </span>
  );
}
