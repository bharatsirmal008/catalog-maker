"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function HomeHero({ children }: { children: ReactNode }) {
  const hero = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = hero.current;
    const header = element?.closest(".template-grid")?.querySelector(".catalog-header");
    if (!element || !header) return;
    const measure = () => element.style.setProperty("--catalog-header-height", `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return <section ref={hero} className="home-intro" aria-labelledby="home-heading">
    <div className="shell home-intro-content">
      <div className="catalog-hero">
        <div><p className="eyebrow">THE EVERYDAY EDIT · VOL. 01</p><h1 id="home-heading">Good things.<br /><em>Every day.</em></h1></div>
        <p className="hero-copy">A considered collection of useful, beautiful things. Find your favourites, ask a question, make them yours.</p>
      </div>
      {children}
    </div>
  </section>;
}
