import { STORE } from '@/config/store';

/** Bottom-left so it never sits on top of the assistant button (bottom-right) or the mobile buy bar. */
export default function FloatingWhatsApp() {
  const href = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent('Hello Raazwood, I need help with furniture.')}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp" className="fixed bottom-5 left-4 z-40 hidden h-12 items-center gap-2 rounded-full bg-[#1FA855] pl-3 pr-4 text-sm font-semibold text-white shadow-card transition hover:scale-105 sm:inline-flex">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.2-.7-2.7-1.1-4.4-3.8-4.5-4-.1-.2-1.1-1.4-1.1-2.7 0-1.2.7-1.9.9-2.1.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2 1.1 1 2.1 1.300 2.400 1.400.3.100.5.100.600-.1l.9-1.100c.2-.3.4-.2.600-.1l1.900.9c.3.1.5.2.5.3.1.2.1.8-.2 1.300Z" /></svg>
      <span className="hidden md:inline">WhatsApp</span>
    </a>
  );
}
