import { Link, useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState, type SVGProps } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { whatsappGreeting, whatsappUrl } from "@/lib/whatsapp";

const TOPICS = [
  { label: "Arrange a demo", message: "Hi Callwoven, I'd like to arrange a demo." },
  { label: "7-day pilot", message: "Hi Callwoven, I'm interested in the 7-day pilot." },
  { label: "Pricing", message: "Hi Callwoven, I have a question about pricing." },
];

const PULSE_SEEN_KEY = "callwoven-whatsapp-pulse";

/** WhatsApp's glyph, drawn in currentColor. */
export function WhatsAppGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

/**
 * Round WhatsApp launcher pinned bottom-right on public pages. It opens a small chat card with
 * ready-written messages; nothing is sent until the visitor presses send in WhatsApp.
 */
export function WhatsAppChat() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  // A few soft pulses on the first page of a visit only, so the button never nags.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(PULSE_SEEN_KEY)) return;
      sessionStorage.setItem(PULSE_SEEN_KEY, "1");
      setPulse(true);
    } catch {
      // Blocked storage just means no pulse.
    }
  }, []);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setPulse(false);
  };

  const chatLink = (message: string) => ({
    href: whatsappUrl(message),
    target: "_blank",
    rel: "noopener noreferrer",
    onClick: () => setOpen(false),
  });

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-50 sm:bottom-6 sm:right-6 print:hidden">
      {pulse && (
        <>
          <span aria-hidden="true" className="callwoven-wa-halo" />
          <span
            aria-hidden="true"
            className="callwoven-wa-halo"
            style={{ animationDelay: "2.2s" }}
          />
        </>
      )}
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger
          aria-label="Chat with Callwoven on WhatsApp"
          className="group relative grid size-14 cursor-pointer place-items-center rounded-full bg-[linear-gradient(145deg,#4ae388_0%,#25d366_45%,#139a4c_100%)] text-white shadow-[0_16px_34px_-12px_rgba(18,140,74,0.7),0_3px_8px_rgba(16,44,48,0.14)] ring-4 ring-white/95 transition-[translate,scale,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-12px_rgba(18,140,74,0.8),0_3px_8px_rgba(16,44,48,0.14)] focus-visible:outline-offset-[6px] active:translate-y-0 active:scale-95 sm:size-[60px]"
        >
          <WhatsAppGlyph
            className={`size-7 transition-[opacity,rotate,scale] duration-300 [grid-area:1/1] sm:size-[30px] ${open ? "scale-50 -rotate-45 opacity-0" : ""}`}
          />
          <X
            aria-hidden="true"
            className={`size-6 transition-[opacity,rotate,scale] duration-300 [grid-area:1/1] ${open ? "" : "scale-50 rotate-45 opacity-0"}`}
          />
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute right-full top-1/2 mr-4 translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground opacity-0 shadow-[0_12px_30px_-14px_rgba(16,44,48,0.45)] ring-1 ring-border/80 transition-[opacity,translate] duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 ${open ? "hidden" : ""}`}
          >
            Chat with us
          </span>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="end"
          sideOffset={16}
          collisionPadding={16}
          aria-labelledby="whatsapp-chat-title"
          aria-describedby="whatsapp-chat-intro"
          className="max-h-(--radix-popover-content-available-height) w-[min(23rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-[1.375rem] border-border/70 p-0 shadow-[0_32px_80px_-28px_rgba(16,44,48,0.55),0_10px_24px_-18px_rgba(16,44,48,0.3)]"
        >
          <div className="relative overflow-hidden bg-brand-ink px-5 py-5 text-primary-foreground">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-20 size-48 rounded-full bg-blush/30 blur-3xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 -left-12 size-48 rounded-full bg-powder/25 blur-3xl"
            />
            <div className="relative flex items-center gap-3.5">
              <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-white shadow-[0_8px_18px_-8px_rgba(0,0,0,0.55)]">
                <img
                  src="/brand/callwoven-icon.png"
                  alt=""
                  width={252}
                  height={227}
                  className="h-6 w-auto"
                />
                <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-[#25d366] text-white ring-2 ring-brand-ink">
                  <WhatsAppGlyph className="size-3" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="whatsapp-chat-title"
                  className="text-[length:clamp(1.25rem,5.6vw,1.45rem)] font-semibold leading-none"
                >
                  Chat with Callwoven
                </h2>
                <p className="mt-1.5 text-xs text-primary-foreground/70">
                  Demos, pilots and pricing
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close WhatsApp chat"
                className="grid size-8 shrink-0 cursor-pointer place-items-center self-start rounded-full text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-primary-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="space-y-5 bg-warm bg-[radial-gradient(circle_at_100%_0%,color-mix(in_oklab,var(--powder)_55%,transparent),transparent_55%),radial-gradient(circle_at_0%_100%,color-mix(in_oklab,var(--blush)_45%,transparent),transparent_55%)] p-5">
            <p
              id="whatsapp-chat-intro"
              className="mr-6 rounded-[1.1rem] rounded-bl-[0.3rem] bg-card px-4 py-3 text-sm leading-relaxed text-card-foreground shadow-[0_10px_24px_-18px_rgba(16,44,48,0.45)] ring-1 ring-border/70"
            >
              Hello! Thinking about Callwoven for your practice or business? Choose a topic or start
              a chat, and we'll reply on WhatsApp.
            </p>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
                Popular topics
              </p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {TOPICS.map((topic) => (
                  <li key={topic.label}>
                    <a
                      {...chatLink(topic.message)}
                      className="inline-flex items-center rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-[#25d366] hover:bg-[#25d366]/10"
                    >
                      {topic.label}
                      <span className="sr-only"> (opens WhatsApp)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <a
              {...chatLink(whatsappGreeting(pathname))}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[#25d366] text-sm font-bold text-brand-ink shadow-[0_14px_26px_-16px_rgba(18,140,74,0.95)] transition-[translate,background-color] duration-200 hover:-translate-y-px hover:bg-[#33dd75] active:translate-y-0"
            >
              <WhatsAppGlyph className="size-5" />
              Start a WhatsApp chat
              <span className="sr-only"> (opens WhatsApp)</span>
            </a>

            <div className="space-y-1 text-balance text-center text-[11px] leading-relaxed text-muted-foreground">
              <p>Opens WhatsApp with your message ready to edit and send.</p>
              <p>
                No WhatsApp?{" "}
                <Link
                  to="/demo"
                  hash="request-demo"
                  onClick={() => setOpen(false)}
                  className="font-semibold text-foreground underline underline-offset-2 transition-colors hover:text-brand"
                >
                  Send an enquiry instead
                </Link>
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
