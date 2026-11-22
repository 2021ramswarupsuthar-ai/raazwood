'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatINR } from '@/lib/money';
import { STORE } from '@/config/store';

type Msg = { role: 'user' | 'assistant'; content: string };
type Prod = { slug: string; name: string; fromPricePaise: number; category: string; inStock: boolean };

const CHIPS = ['Show beds', 'Check delivery to my pincode', 'How do I pay?', 'Return policy'];

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: 'Namaste! I can help you find furniture, check delivery to your pincode, or answer questions about payment and returns. What are you looking for?' }]);
  const [products, setProducts] = useState<Prod[]>([]);
  const [handoff, setHandoff] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, products, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content }];
    setMsgs(next);
    setInput('');
    setBusy(true);
    setProducts([]);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-8) }),
      });
      if (res.status === 429) throw new Error('slow');
      if (!res.ok) throw new Error('fail');
      const data = (await res.json()) as { reply: string; products: Prod[]; handoff: boolean };
      setMsgs((m) => [...m, { role: 'assistant', content: data.reply }]);
      setProducts(data.products ?? []);
      setHandoff(Boolean(data.handoff));
    } catch (e) {
      const slow = e instanceof Error && e.message === 'slow';
      setMsgs((m) => [...m, { role: 'assistant', content: slow ? 'You are sending messages quickly. Please wait a moment and try again.' : 'Sorry, I am having trouble right now. You can message our team on WhatsApp.' }]);
      setHandoff(true);
    } finally {
      setBusy(false);
    }
  }

  const wa = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent('Hello Raazwood, I need help with: ' + (msgs.filter((m) => m.role === 'user').slice(-1)[0]?.content ?? 'furniture'))}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="rw-assistant"
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-walnut shadow-card ring-2 ring-brand/60 transition hover:scale-105"
      >
        {open ? <span className="text-xl text-brand">×</span> : <Image src="/brand/logo-icon.png" alt="" width={30} height={34} />}
      </button>

      {open && (
        <section id="rw-assistant" aria-label="Raazwood assistant" className="fixed inset-x-3 bottom-24 z-50 flex max-h-[75svh] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card sm:inset-x-auto sm:right-5 sm:w-[380px]">
          <div className="flex items-center justify-between bg-walnut px-4 py-3 text-bone">
            <div>
              <p className="font-display text-lg leading-none">Raazwood Assistant</p>
              <p className="mt-1 text-[11px] text-bone/60">AI helper. Please do not share phone numbers, OTPs or payment details.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-2xl leading-none text-brand" aria-label="Close">×</button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[15px]" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
                <p className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 ${m.role === 'user' ? 'bg-brand-dark text-white' : 'bg-bone text-ink'}`}>{m.content}</p>
              </div>
            ))}
            {busy && <p className="text-sm text-ink/50">Typing…</p>}
            {products.length > 0 && (
              <ul className="space-y-2">
                {products.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/product/${p.slug}`} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 hover:border-brand-dark">
                      <span><span className="block text-sm font-semibold">{p.name}</span><span className="text-xs text-ink/60">{p.category}{p.inStock ? '' : ' · Out of stock'}</span></span>
                      <span className="text-sm font-semibold text-brand-dark">from {formatINR(p.fromPricePaise)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {handoff && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full">Chat with our team on WhatsApp</a>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t border-line px-3 pb-3 pt-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {CHIPS.map((c) => (
                <button key={c} type="button" onClick={() => send(c)} disabled={busy} className="rounded-full border border-line px-3 py-1 text-xs hover:border-brand-dark hover:text-brand-dark disabled:opacity-50">{c}</button>
              ))}
              <button type="button" onClick={() => { setHandoff(true); }} className="rounded-full border border-line px-3 py-1 text-xs hover:border-brand-dark hover:text-brand-dark">Talk to a human</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex gap-2">
              <label htmlFor="rw-chat-input" className="sr-only">Your message</label>
              <input id="rw-chat-input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} placeholder="Ask about furniture, delivery, payment…" className="field" autoComplete="off" />
              <button type="submit" disabled={busy || !input.trim()} className="btn btn-primary !px-4">Send</button>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
