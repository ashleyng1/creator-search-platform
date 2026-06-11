import Link from "next/link";

type BrandLogoProps = {
  variant?: "full" | "icon";
  href?: string;
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
};

export function BrandLogo({
  variant = "full",
  href = "/",
  className = "",
  iconClassName = "h-8 w-8",
  wordmarkClassName = "text-[1.05rem] font-bold tracking-tight text-neutral-900",
}: BrandLogoProps) {
  const content =
    variant === "icon" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/brand/icon.svg" alt="Creator" className={iconClassName} />
    ) : (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon.svg" alt="" className={iconClassName} />
        <span className={wordmarkClassName}>Creator</span>
      </span>
    );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
