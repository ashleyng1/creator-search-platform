"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { BrandMarquee } from "@/components/BrandMarquee";

const CHAPTERS = [
  {
    id: "discover",
    eyebrow: "Discover",
    headline: "Find partners aligned with your brand",
    sub: "Ranked by audience, niche, and budget fit",
    visual: "/landing/visual-discover.svg",
  },
  {
    id: "measure",
    eyebrow: "Measure",
    headline: "Prove what partnerships deliver",
    sub: "Track partnership performance and return on spend",
    visual: "/landing/visual-roi.svg",
  },
  {
    id: "listen",
    eyebrow: "Listen",
    headline: "Know your market before you brief",
    sub: "Daily signals on what your audience cares about",
    visual: "/landing/visual-insights.svg",
  },
] as const;

function AppleLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="landing-body text-brand-600 transition hover:underline"
    >
      {children} <span aria-hidden className="text-[0.85em]">›</span>
    </Link>
  );
}

function LandingVisual({
  src,
  variant = "default",
}: {
  src: string;
  variant?: "default" | "chapter";
}) {
  const frameClass =
    variant === "chapter" ? "landing-chapter-visual-frame" : "landing-visual-frame";

  return (
    <div className={frameClass}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" decoding="async" />
    </div>
  );
}

export function LandingPage() {
  const [activeChapter, setActiveChapter] = useState(0);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    chapterRefs.current.forEach((el, index) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveChapter(index);
        },
        { rootMargin: "-35% 0px -35% 0px", threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollToChapter = useCallback((index: number) => {
    chapterRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveChapter(index);
  }, []);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, index: number) => {
      e.preventDefault();
      scrollToChapter(index);
    },
    [scrollToChapter]
  );

  return (
    <div className="landing-page min-h-screen w-full overflow-x-hidden bg-white text-neutral-900 antialiased">
      <header className="sticky top-0 z-50 border-b border-neutral-200/60 bg-white/80 backdrop-blur-xl">
        <div className="landing-shell flex h-[clamp(3rem,6vh,4rem)] items-center justify-between">
          <BrandLogo
            wordmarkClassName="text-[clamp(0.9375rem,0.25vw+0.85rem,1.125rem)] font-bold tracking-tight text-neutral-900"
            iconClassName="h-[clamp(1.5rem,3vmin,1.875rem)] w-[clamp(1.5rem,3vmin,1.875rem)]"
          />
          <nav className="hidden gap-[clamp(1.25rem,2.5vw,2.5rem)] text-[clamp(0.6875rem,0.2vw+0.625rem,0.8125rem)] text-neutral-600 md:flex">
            {CHAPTERS.map((chapter, i) => (
              <a
                key={chapter.id}
                href={`#${chapter.id}`}
                onClick={(e) => handleNavClick(e, i)}
                className={
                  activeChapter === i ? "font-medium text-brand-600" : "hover:text-neutral-900"
                }
              >
                {chapter.eyebrow}
              </a>
            ))}
          </nav>
          <Link
            href="/login"
            className="text-[clamp(0.6875rem,0.2vw+0.625rem,0.8125rem)] text-brand-600 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="bg-surface-muted pb-[clamp(2rem,5vh,3.5rem)] pt-[clamp(3rem,9vh,6.5rem)]">
        <div className="landing-shell landing-block">
          <div className="landing-copy landing-hero-copy">
            <p className="landing-eyebrow font-medium uppercase text-brand-600">
              For brand owners &amp; marketing teams
            </p>
            <h1 className="landing-hero-title mt-[clamp(0.75rem,2vh,1.25rem)] font-semibold tracking-tight">
              The right creators
              <br />
              <span className="text-neutral-500">The best use of your budget</span>
            </h1>
            <p className="landing-body landing-hero-sub mx-auto mt-[clamp(0.875rem,2vh,1.5rem)] text-neutral-500">
              Select influencer partners aligned with your brand and campaign objectives
            </p>
            <div className="mt-[clamp(1rem,2.5vh,1.75rem)] flex flex-wrap items-center justify-center gap-[clamp(0.75rem,2vw,1.5rem)]">
              <AppleLink href="/register">Get started</AppleLink>
              <AppleLink href="/login">Sign in</AppleLink>
            </div>
          </div>
        </div>
      </section>

      <BrandMarquee />

      <div id="features" className="relative bg-white">
        <div className="pointer-events-none fixed bottom-[clamp(0.75rem,2.5vh,1.5rem)] left-1/2 z-40 flex -translate-x-1/2 gap-2 rounded-full bg-white/90 px-4 py-2 shadow-[0_2px_20px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden">
          {CHAPTERS.map((c, i) => (
            <span
              key={c.id}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                activeChapter === i ? "w-6 bg-brand-500" : "w-1.5 bg-neutral-300"
              }`}
            />
          ))}
        </div>

        <div className="landing-shell">
          {CHAPTERS.map((chapter, i) => (
            <section
              key={chapter.id}
              id={chapter.id}
              ref={(el) => {
                chapterRefs.current[i] = el;
              }}
              aria-label={chapter.eyebrow}
              className="landing-chapter"
            >
              <div className="landing-block">
                <div className="landing-copy">
                  <p className="landing-eyebrow font-medium uppercase text-brand-600">
                    {chapter.eyebrow}
                  </p>
                  <h2 className="landing-chapter-title mt-[clamp(0.375rem,1vh,0.75rem)] font-semibold tracking-tight">
                    {chapter.headline}
                  </h2>
                  <p className="landing-body mx-auto mt-[clamp(0.5rem,1.5vh,1rem)] text-neutral-500">
                    {chapter.sub}
                  </p>
                </div>
                <LandingVisual src={chapter.visual} variant="chapter" />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
