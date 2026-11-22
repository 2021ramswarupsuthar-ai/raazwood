'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const AssistantWidget = dynamic(() => import('./AssistantWidget'), { ssr: false });

/** Loads the chat widget only after the page is idle so it never affects LCP/INP. */
export default function AssistantLoader() {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const start = () => setGo(true);
    if (w.requestIdleCallback) w.requestIdleCallback(start, { timeout: 4000 });
    else setTimeout(start, 2500);
  }, []);
  return go ? <AssistantWidget /> : null;
}
