import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
        R
      </span>
      <span className="text-foreground">
        Roadbook<span className="text-primary">.ai</span>
      </span>
    </Link>
  );
}
