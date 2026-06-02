import Link from "next/link";

export function Stat({
  Icon,
  label,
  href,
  count,
}: {
  Icon: React.FC<{ className?: string; width?: number }>;
  label: string;
  href: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="font-poppins flex items-center gap-[20px] hover:text-accent transition-all"
    >
      <span className="text-accent" aria-hidden="true">
        <Icon className="text-[40px]" width={40} />
      </span>
      <div className="flex flex-col gap-0">
        <span className="font-bold text-[32px] leading-[40px]" aria-label={`${count} ${label}${count !== 1 ? "s" : ""}`}>
          {count}
        </span>
        <span className="text-[16px] leading-[24px]" aria-hidden="true">
          {label}
          {count > 1 ? "s" : ""}
        </span>
      </div>
    </Link>
  );
}
