import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Marketing, pageHead } from "@/components/Marketing";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/thank-you")({
  staticData: { sitemap: false },
  head: () => {
    const head = pageHead("Thank you | Callwoven", "Thank you for contacting Callwoven. We’ll be in touch to discuss your request.");
    return { ...head, meta: [...head.meta, { name: "robots", content: "noindex, nofollow" }] };
  },
  component: ThankYou,
});

function ThankYou() {
  return (
    <Marketing>
      <section className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center px-5 py-20 text-center sm:px-8">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand">
          <Check className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mt-7 text-4xl font-semibold leading-tight sm:text-5xl">Thank you for your enquiry.</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">We’ve received your request. We’ll contact you using the details you provided to discuss your business and arrange the next steps.</p>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">You don’t need to submit the form again. A demo or 7-day pilot will be arranged with you before any service starts.</p>
        <Button asChild size="lg" className="mt-9 h-12 rounded-full px-8">
          <Link to="/">Back to home</Link>
        </Button>
      </section>
    </Marketing>
  );
}
