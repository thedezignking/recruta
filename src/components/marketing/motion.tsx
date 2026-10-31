"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ElementType,
} from "react";
import { cn } from "cn";

function useInView<T extends Element>(margin = "-80px") {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: `0px 0px ${margin} 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [margin]);
  return [ref, visible] as const;
}

/** Blur-and-rise into view once, the first time it scrolls in. */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [ref, visible] = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref}
      data-visible={visible}
      className={cn("mk-reveal", className)}
      style={{ "--mk-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

/** Mono section label that types itself out when it scrolls into view. */
export function TypedEyebrow({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [ref, visible] = useInView<HTMLParagraphElement>("-40px");
  const [count, setCount] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!visible || reduced) return;
    const timer = window.setInterval(() => {
      setCount((current) => {
        if (current >= text.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 45);
    return () => window.clearInterval(timer);
  }, [visible, reduced, text]);
  const shown = reduced ? text.length : count;
  return (
    <p
      ref={ref}
      className={cn("font-mono text-xs text-[#5C5AED]", className)}
      aria-label={text}
    >
      <span aria-hidden="true">{text.slice(0, shown)}</span>
      <span aria-hidden="true" className="mk-cursor" />
    </p>
  );
}

const reducedQuery = "(prefers-reduced-motion: reduce)";

/** True when the viewer asked for reduced motion; false during SSR. */
export function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(reducedQuery);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
}

/** A <details> menu that closes after a link inside it is tapped. */
export function MenuDetails({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={ref}
      className={className}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a") && ref.current)
          ref.current.open = false;
      }}
    >
      {children}
    </details>
  );
}
