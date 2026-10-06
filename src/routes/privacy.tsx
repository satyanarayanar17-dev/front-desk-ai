import { createFileRoute } from "@tanstack/react-router";

import { Marketing, pageHead } from "@/components/Marketing";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () =>
    pageHead(
      "Privacy Notice | Callwoven",
      "How Callwoven handles information submitted through its demo and pilot enquiry forms.",
    ),
  component: Privacy,
});

const sections: [string, string][] = [
  [
    "Who operates Callwoven",
    "Callwoven is a trading name of T Satya Narayana Reddy, a sole proprietor based in India. For this website, T Satya Narayana Reddy is responsible for deciding how enquiry information is used.",
  ],
  [
    "Scope of this notice",
    "This website accepts requests for arranged demos and discussions about tailored 7-day pilots. Callwoven does not take payment or activate customer call handling through this website; setup and service terms are agreed separately.",
  ],
  [
    "What we collect",
    "When you request demo or pilot access, we collect the details you enter: your name, business name, email address, phone number and, if provided, your website, location, approximate call volume and notes.",
  ],
  [
    "Why we use it",
    "We use enquiry details to respond to your request, understand your business needs and discuss a demo or pilot. We rely on taking steps at your request before a possible service agreement and on our legitimate interest in responding to relevant business enquiries. We do not sell your information.",
  ],
  [
    "Storage, service providers and international access",
    "Enquiry details are stored using Supabase in its UK region. Website hosting and database providers may process limited information to operate and secure the site. The proprietor may access enquiries from India in order to respond. We do not use enquiry details for unrelated advertising.",
  ],
  [
    "How long we keep it",
    "We aim to delete an inactive enquiry within 12 months of the last contact, unless we need to keep it for an ongoing discussion, a legal requirement or the handling of a dispute. You can ask us to delete it sooner where applicable.",
  ],
  [
    "Your choices and rights",
    "Depending on the circumstances, you may ask for access to, correction of or deletion of your information, or object to or restrict its use. You may also complain to the UK Information Commissioner's Office if you believe UK data-protection law applies to the handling of your information.",
  ],
  [
    "Privacy enquiries",
    "Use the demo-access form and write “Privacy” in the notes field. We will respond using the email address you provide. A dedicated public email and business correspondence address will be added before Callwoven enters paid service agreements or begins customer call handling.",
  ],
  [
    "Future customer call handling",
    "Before live dental or trades call handling begins for a customer, Callwoven and the customer business will agree the required processing terms, caller notices, recording and transcription choices, retention rules, international-transfer safeguards and protections for any sensitive information. Customer call data is outside the scope of this website enquiry notice.",
  ],
];

function Privacy() {
  return (
    <Marketing>
      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
           Website privacy notice
        </p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
          How we handle website enquiries.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
           This notice covers information submitted through the Callwoven website. Last
          updated 1 October 2026.
        </p>
        <div className="mt-12 space-y-10">
          {sections.map(([heading, body]) => (
            <div key={heading}>
              <h2 className="text-xl font-bold">{heading}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </Marketing>
  );
}
