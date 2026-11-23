// Tiny, safe text format for blog posts (no HTML is ever rendered from the database):
//   blank line = new paragraph, "## Heading", "### Subheading", "- bullet" lines form a list.
export type Block = { type: 'h2' | 'h3' | 'p'; text: string } | { type: 'ul'; items: string[] };

export function parseBlocks(body: string): Block[] {
  const out: Block[] = [];
  for (const chunk of body.replace(/\r\n/g, '\n').split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    let para: string[] = [];
    let list: string[] = [];
    const flush = () => {
      if (para.length) out.push({ type: 'p', text: para.join(' ') });
      if (list.length) out.push({ type: 'ul', items: list });
      para = [];
      list = [];
    };
    for (const l of lines) {
      if (l.startsWith('### ')) { flush(); out.push({ type: 'h3', text: l.slice(4).trim() }); }
      else if (l.startsWith('## ')) { flush(); out.push({ type: 'h2', text: l.slice(3).trim() }); }
      else if (/^[-*] /.test(l)) { if (para.length) { out.push({ type: 'p', text: para.join(' ') }); para = []; } list.push(l.slice(2).trim()); }
      else { if (list.length) { out.push({ type: 'ul', items: list }); list = []; } para.push(l); }
    }
    flush();
  }
  return out;
}

export const readingMinutes = (body: string): number => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));
