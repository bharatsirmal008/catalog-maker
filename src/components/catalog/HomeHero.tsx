"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";

// Reuse the supplied artwork in feathered regions, so its shapes and palette
// remain intact. Each region moves only a few pixels over the original image.
const regions = [
  { name: "wave-left", x: 390, y: 725, r: 610, duration: 15 },
  { name: "wave-right", x: 1740, y: 795, r: 510, duration: 13 },
  { name: "bubble-one", x: 269, y: 152, r: 51, duration: 12 },
  { name: "bubble-two", x: 124, y: 306, r: 44, duration: 15 },
  { name: "bubble-three", x: 1447, y: 252, r: 32, duration: 11 },
  { name: "bubble-four", x: 1460, y: 446, r: 36, duration: 14 },
  { name: "orbit-one", x: 1857, y: 212, r: 34, duration: 12 },
  { name: "orbit-two", x: 1739, y: 353, r: 34, duration: 15 },
  { name: "orbit-three", x: 1205, y: 628, r: 34, duration: 13 },
];

export function HomeHero({ children }: { children: ReactNode }) {
  const hero = useRef<HTMLElement>(null);
  const id = useId().replace(/:/g, "");
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 35, damping: 25, mass: 1 });
  const y = useSpring(pointerY, { stiffness: 35, damping: 25, mass: 1 });

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

  useEffect(() => {
    const element = hero.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.paused = String(!entry.isIntersecting);
    });
    const visibility = () => { element.dataset.hidden = String(document.hidden); };
    visibility();
    observer.observe(element);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  return <section ref={hero} className="home-intro" aria-labelledby="home-heading"
    onPointerMove={(event) => {
      if (reducedMotion !== false || event.pointerType !== "mouse") return;
      const bounds = event.currentTarget.getBoundingClientRect();
      pointerX.set((.5 - (event.clientX - bounds.left) / bounds.width) * 8);
      pointerY.set((.5 - (event.clientY - bounds.top) / bounds.height) * 8);
    }}
    onPointerLeave={() => { pointerX.set(0); pointerY.set(0); }}>
    <div className="hero-artwork" aria-hidden="true">
      <motion.div className="hero-parallax" style={reducedMotion ? { x: 0, y: 0 } : { x, y }}>
        <svg className="hero-scene" viewBox="0 0 1983 793" preserveAspectRatio="xMidYMid slice" focusable="false">
          <defs>
            <radialGradient id={`${id}-feather`}><stop offset="68%" stopColor="white" /><stop offset="100%" stopColor="black" /></radialGradient>
            {regions.map(region => <mask key={region.name} id={`${id}-${region.name}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1983" height="793">
              <circle cx={region.x} cy={region.y} r={region.r} fill={`url(#${id}-feather)`} />
            </mask>)}
          </defs>
          <image href="/hero-background.png" width="1983" height="793" />
          {regions.map((region, index) => <g key={region.name} className={`hero-region ${region.name}`}
            style={{ "--drift-duration": `${region.duration}s`, "--drift-delay": `${-index * 1.7}s` } as CSSProperties}>
            <image href="/hero-background.png" width="1983" height="793" mask={`url(#${id}-${region.name})`} />
          </g>)}
        </svg>
        <div className="hero-light hero-light-blue" />
        <div className="hero-light hero-light-peach" />
      </motion.div>
    </div>
    <div className="shell home-intro-content">
      <div className="catalog-hero">
        <div><p className="eyebrow">THE EVERYDAY EDIT · VOL. 01</p><h1 id="home-heading">Good things.<br /><em>Every day.</em></h1></div>
        <p className="hero-copy">A considered collection of useful, beautiful things. Find your favourites, ask a question, make them yours.</p>
      </div>
      {children}
    </div>
  </section>;
}
