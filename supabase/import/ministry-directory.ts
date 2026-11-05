// Supabase Edge Function used once to read the Ministry of Education's
// "Directory of Educational Institutions 2018-2019" (a 107-page PDF) and return one row per school.
// Deploy:  supabase functions deploy ministry-directory
// Call:    POST { "from": 12, "to": 25 }  (PDF pages; public schools are pages 12-54, independent 55-91)
// Returns: { rows: [{ c: code, n: name, a: address, p: parish, t: type, s: 'public' | 'independent', pg: page }], notes }
// Each page is a rotated table: School Code | Name | Address | Telephone | Email | Region, grouped under
// "Parish: X" headers and type headings (Primary, All Age, Secondary High, ...). Long names wrap onto the next line.
import { getDocumentProxy } from 'npm:unpdf@0.12.1';

const PDF = 'https://moey.gov.jm/wp-content/uploads/2020/05/Directory-of-Educational-Institutions-2018-19-1.pdf';
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

type Item = { pos: number; s: string };
type Rec = { c: string; n: string[]; a: string[]; p: string | null; t: string | null; s: string | null; pg: number };

Deno.serve(async (req) => {
  let body: { from?: number; to?: number } = {};
  try { body = await req.json(); } catch (_) { /* no body */ }
  const from = Math.max(1, Number(body.from) || 12), to = Number(body.to) || from;
  const res = await fetch(PDF, { headers: { 'User-Agent': 'Mozilla/5.0 ExamForge-school-import' } });
  const pdf = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
  const out: unknown[] = [], notes: string[] = [];
  let parish: string | null = null, type: string | null = null, sector: string | null = null;
  for (let p = from; p <= Math.min(to, pdf.numPages); p++) {
    const tc = await (await pdf.getPage(p)).getTextContent();
    // deno-lint-ignore no-explicit-any
    const items = (tc.items as any[]).filter((it) => it.str && it.str.trim());
    const rot = items.filter((it) => Math.abs(it.transform[0]) < 0.01).length > items.length / 2;
    const map = new Map<number, Item[]>();
    for (const it of items) {
      const t = it.transform;
      const line = Math.round(rot ? t[4] : -t[5]);
      const pos = Math.round(rot ? t[5] : t[4]);
      if (!map.has(line)) map.set(line, []);
      map.get(line)!.push({ pos, s: it.str });
    }
    const lines = [...map.entries()].sort((a, b) => a[0] - b[0]).map(([line, its]) => ({ line, its: its.sort((a, b) => a.pos - b.pos) }));
    for (const l of lines) {
      const t = l.its.map((i) => i.s).join(' ');
      if (/DIRECTORY OF PUBLIC/i.test(t)) sector = 'public';
      if (/DIRECTORY OF INDEPENDENT/i.test(t)) sector = 'independent';
      const m = /Parish:\s*(.+)$/.exec(t);
      if (m) parish = clean(m[1]);
    }
    const codeLines = lines.filter((l) => /^\d{5}\b/.test(l.its[0].s.trim()));
    if (!codeLines.length) { notes.push(p + ':no-codes'); continue; }
    const codeX = codeLines[0].its[0].pos;
    // the address column starts where the 3rd cell of most rows starts
    const thirds: Record<number, number> = {};
    for (const l of codeLines) {
      const its = l.its.filter((i) => !/^\d{5}$/.test(i.s.trim()));
      if (its[1]) thirds[its[1].pos] = (thirds[its[1].pos] || 0) + 1;
    }
    const addrX = +Object.entries(thirds).sort((a, b) => b[1] - a[1])[0][0];
    const recs = new Map<number, Rec>();
    for (const l of lines) {
      if (l.line < 105 || l.line > 595) continue; // page header and footer
      const ft = l.its[0].s.trim();
      const isCode = /^\d{5}\b/.test(ft);
      if (!isCode && Math.abs(l.its[0].pos - codeX) <= 8) {
        if (/^[*]|School Code/i.test(ft)) continue;
        type = clean(l.its.filter((i) => i.pos < addrX - 5).map((i) => i.s).join(' ')); // a type heading
        continue;
      }
      if (isCode) {
        const rest = ft.slice(5).trim();
        recs.set(l.line, {
          c: ft.slice(0, 5),
          n: (rest ? [rest] : []).concat(l.its.slice(1).filter((i) => i.pos < addrX - 5).map((i) => i.s)),
          a: l.its.filter((i) => i.pos >= addrX - 5 && i.pos < addrX + 175).map((i) => i.s),
          p: parish, t: type, s: sector, pg: p
        });
        continue;
      }
      // a wrapped line belongs to the row just above it (or the row it sits a hair above)
      const owners = [...recs.keys()].filter((k) => k <= l.line + 3);
      if (!owners.length) continue;
      const k = Math.max(...owners);
      if (l.line - k > 24) continue;
      const r = recs.get(k)!;
      for (const i of l.its) {
        if (i.pos > codeX + 10 && i.pos < addrX - 5) r.n.push(i.s);
        else if (i.pos >= addrX - 5 && i.pos < addrX + 175 && !/^876/.test(i.s.trim())) r.a.push(i.s);
      }
    }
    for (const r of recs.values()) {
      out.push({ c: r.c, n: clean(r.n.join(' ')).replace(/\s*[*]+\s*$/, ''), a: clean(r.a.join(' ')).slice(0, 120), p: r.p, t: r.t, s: r.s, pg: r.pg });
    }
  }
  return new Response(JSON.stringify({ rows: out, notes }), { headers: { 'content-type': 'application/json' } });
});
