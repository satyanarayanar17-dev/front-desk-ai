import { createFileRoute } from "@tanstack/react-router";
import { Action, ListeningPreview, Marketing, Meta, NextSteps, RequestSection, pageHead } from "@/components/Marketing";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => pageHead(
    "Callwoven | AI reception for UK dental & appointment businesses",
    "Callwoven provides reception overflow and out-of-hours call handling, answering routine questions and capturing enquiry details for your team to follow up."
  ),
  component: Home,
});

function Home() {
  const sectors = [
    {
      title: "Private Dental Practices",
      tag: "Primary launch segment",
      desc: "Our primary focus: keep new-patient and routine enquiries moving while reception attends to patients in clinic.",
    },
    {
      title: "Aesthetic Clinics & Medspas",
      desc: "Capture consultation requests and general enquiry details discreetly during treatment hours.",
    },
    {
      title: "Physiotherapy & Wellness",
      desc: "Log enquiry details and callback requests while practitioners are in treatment sessions.",
    },
    {
      title: "Plumbing, Heating & HVAC",
      desc: "Capture job details, callout requests, and location while engineers are on site or driving.",
    },
    {
      title: "Electrical, Roofing & Specialist Trades",
      desc: "Log quote requests and enquiry details safely without pulling staff off active jobs.",
    },
    {
      title: "Independent Garages & Vehicle Repair",
      desc: "Log service, MOT, and diagnostic callback requests while mechanics are in the workshop.",
    },
  ];

  return (
    <Marketing>
      <section className="callwoven-hero">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[590px] lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
          <div>
            <p className="inline-flex rounded-full bg-background/75 px-5 py-2 text-sm font-medium shadow-sm">
              AI reception for appointment and local service businesses
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[0.95] sm:text-7xl lg:text-[84px]">
              Keep customer enquiries moving—even when your team can’t answer.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Callwoven answers calls, handles routine questions and captures clear enquiry details for your team to follow up.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Action to="/demo">Hear Callwoven</Action>
              <Action to="/" hash="pilot" secondary>Start a 7-day pilot</Action>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Built for dental practices. Ready for appointment and local service businesses.
            </p>
          </div>
          <ListeningPreview />
        </div>
      </section>

      <NextSteps />

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Who it's for</p>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            Built for appointment and local service businesses.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            One reliable receptionist service tailored to teams occupied with patients, clients, or field work.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((s) => (
            <article key={s.title} className="flex flex-col justify-between rounded-xl border border-border bg-card p-6">
              <div>
                <div className="flex flex-col items-start gap-2">
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  {s.tag && (
                    <span className="rounded-full bg-blush/70 px-2.5 py-0.5 text-xs font-medium text-brand">
                      {s.tag}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <Meta eyebrow="Choose your Callwoven" title="Purpose-built call handling, shaped around your business.">
          Start with the calls your team already handles every day.
        </Meta>
        <div className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <article className="flex flex-col justify-between rounded-2xl border-2 border-primary bg-card p-7 sm:p-9">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-brand">CALLWOVEN DENTAL</p>
              <h3 className="mt-7 text-3xl font-semibold sm:text-4xl">Patient calls handled when reception can't answer.</h3>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                New-patient enquiries · Routine questions · Out-of-hours calls · Administrative support only — no clinical advice.
              </p>
            </div>
            <div className="mt-9">
              <Action to="/dental">Explore Callwoven Dental</Action>
            </div>
          </article>
          <article className="flex flex-col justify-between rounded-2xl border border-border bg-card p-7 sm:p-9">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-brand">CALLWOVEN TRADES</p>
              <h3 className="mt-7 text-3xl font-semibold">Customers answered while you're on the job.</h3>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Lead details · Job requests · Priority flags · Out-of-hours calls.
              </p>
            </div>
            <div className="mt-9">
              <Action to="/trades" secondary>Explore Trades</Action>
            </div>
          </article>
        </div>
      </section>

      <section className="bg-brand-ink text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-75">Safe and in your control</p>
            <h2 className="mt-4 text-4xl font-semibold sm:text-5xl">Callwoven follows your rules — not its own.</h2>
          </div>
          <ul className="space-y-3 text-sm leading-relaxed opacity-90">
            {[
              "Uses only the information you approve.",
              "Escalation rules are set by your team.",
              "Anything uncertain or sensitive goes back to a person.",
              "Captures enquiry details — it doesn't confirm bookings or give clinical advice.",
            ].map((x) => (
              <li key={x} className="border-b border-primary-foreground/15 pb-3">
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div id="pilot">
        <RequestSection source="home" title="A warmer welcome, shaped around your business." buttonText="Start a 7-day pilot" />
      </div>
    </Marketing>
  );
}
