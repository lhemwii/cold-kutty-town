/* Adaptateur de plateforme.
   Dans claude.ai, la page reçoit window.claude (Claude, base partagée, salles, téléchargements).
   Ailleurs (Vercel, en local, version de bureau), on fournit la même interface avec ce qu'on a :
   Claude passe par /api/claude, les téléchargements par le navigateur,
   la base partagée n'est pas disponible (voir docs/PLAN.md). */

/** un tour de conversation envoye a Claude */
export interface Turn { role: 'user' | 'assistant'; content: string }
export interface SampleOpts { signal?: AbortSignal; modelTier?: string; onText?: (p: { text: string; delta: string }) => void }
export interface SampleResult { text: string; truncated: boolean }
export interface Sample {
  (input: string | Turn[], opts?: SampleOpts): Promise<SampleResult>;
  json: (input: string | Turn[], opts?: SampleOpts) => Promise<unknown>;
}
export interface Downloads { save(f: { filename: string; data: Blob | string }): Promise<{ status: string }> }
export interface Host { standalone?: boolean; use(name: string): Promise<Sample | Downloads | null> }
/** erreur rendue par l'adaptateur, sur le modele de celles de claude.ai */
export interface HostError { code: string; message: string; text?: string }

const hostWin: Window & { claude?: Host } = window;

function install(){
  if (hostWin.claude && typeof hostWin.claude.use === 'function') return;

  let enabled: boolean | null = null;
  async function ask(body: object): Promise<{ text?: string; truncated?: boolean }> {
    const r = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d: { code?: string; error?: string; text?: string; truncated?: boolean } = await r.json().catch(() => ({}));
    if (!r.ok){ const e: HostError = { code: d.code || (r.status === 429 ? 'rate_limited' : 'upstream_error'), message: d.error || String(r.status) }; throw e; }
    return d;
  }
  const toTurns = (input: string | Turn[]): Turn[] => typeof input === 'string' ? [{ role: 'user', content: input }] : input;
  const cancelled: HostError = { code: 'cancelled', message: 'annulé' };

  const sample: Sample = Object.assign(async (input: string | Turn[], opts: SampleOpts = {}): Promise<SampleResult> => {
    if (opts.signal && opts.signal.aborted) throw cancelled;
    const d = await ask({ messages: toTurns(input), tier: opts.modelTier || 'default' });
    if (opts.signal && opts.signal.aborted) throw cancelled;
    const text = d.text || '';
    if (typeof opts.onText === 'function') opts.onText({ text, delta: text });
    return { text, truncated: !!d.truncated };
  }, {
    json: async (input: string | Turn[], opts: SampleOpts = {}): Promise<unknown> => {
      const d = await ask({ messages: toTurns(input), tier: opts.modelTier || 'default', json: true });
      const t = String(d.text || '').trim();
      try { return JSON.parse(t); } catch (_) {}
      const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence){ try { return JSON.parse(fence[1]); } catch (_) {} }
      const a = t.indexOf('{'), b = t.lastIndexOf('}');
      if (a >= 0 && b > a){ try { return JSON.parse(t.slice(a, b + 1)); } catch (_) {} }
      const e: HostError = { code: 'invalid_json', message: 'réponse illisible', text: t };
      throw e;
    },
  });

  const downloads: Downloads = {
    async save({ filename, data }){
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return { status: 'saved' };
    }
  };

  hostWin.claude = {
    standalone: true,
    async use(name: string){
      if (name === 'sample'){
        if (enabled === null){
          try { const r = await fetch('/api/claude'); const d: { enabled?: boolean } = r.ok ? await r.json() : {}; enabled = !!d.enabled; } catch (_) { enabled = false; }
        }
        return enabled ? sample : null;
      }
      if (name === 'downloads') return downloads;
      return null;
    }
  };
}
install();
