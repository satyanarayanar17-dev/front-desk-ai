/**
 * Callwoven's WhatsApp number in the format wa.me expects: country code first, digits only
 * (no "+", spaces or leading 0). 97098 01111 is an Indian mobile, so it is prefixed with 91.
 */
export const WHATSAPP_NUMBER = "919709801111";

/** Opens a WhatsApp chat with the message typed in; the visitor still reviews it and presses send. */
export const whatsappUrl = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

const PAGE_GREETINGS: Record<string, string> = {
  "/dental": "Hi Callwoven, I'd like to find out more about Callwoven Dental for our practice.",
  "/trades": "Hi Callwoven, I'd like to find out more about Callwoven for my business.",
  "/pricing": "Hi Callwoven, I have a question about pricing and the 7-day pilot.",
  "/demo": "Hi Callwoven, I'd like to arrange a demo.",
};

/** Default chat message, tailored to the page the visitor is reading. */
export const whatsappGreeting = (pathname: string) =>
  PAGE_GREETINGS[pathname.replace(/\/+$/, "")] ??
  "Hi Callwoven, I have a question about your AI receptionist.";
