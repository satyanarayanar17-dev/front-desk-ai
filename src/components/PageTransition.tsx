import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Router events keep the overlay tied to navigation, rather than form requests. */
export function PageTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "loading" | "leaving">("idle");
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const clearTimers = () => {
      clearTimeout(finishTimer);
      clearTimeout(fadeTimer);
    };
    const unsubscribeStart = router.subscribe("onBeforeNavigate", (event) => {
      if (!event.pathChanged) return;
      clearTimers();
      startedAt.current = performance.now();
      setPhase("loading");
    });
    const unsubscribeEnd = router.subscribe("onResolved", () => {
      if (startedAt.current === null) return;
      clearTimers();
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const remaining = Math.max(0, (reducedMotion ? 0 : 420) - (performance.now() - startedAt.current));
      finishTimer = setTimeout(() => {
        startedAt.current = null;
        setPhase("leaving");
        fadeTimer = setTimeout(() => setPhase("idle"), reducedMotion ? 0 : 160);
      }, remaining);
    });
    return () => {
      unsubscribeStart();
      unsubscribeEnd();
      clearTimers();
      startedAt.current = null;
    };
  }, [router]);

  const visible = phase !== "idle";
  return (
    <>
      <div className="page-transition-content" inert={visible} aria-hidden={visible || undefined}>
        {children}
      </div>
      {visible && (
        <div className={`callwoven-transition${phase === "leaving" ? " is-leaving" : ""}`} role="status" aria-live="polite">
          <span className="sr-only">Loading page</span>
          <div className="callwoven-transition-loader" aria-hidden="true">
            <div className="callwoven-transition-ring" />
            <div className="callwoven-transition-mark"><span /><span /></div>
          </div>
          <div className="callwoven-transition-wordmark" aria-hidden="true">Callwoven</div>
        </div>
      )}
    </>
  );
}
