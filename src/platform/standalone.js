/* Adaptateur de plateforme.
   Dans claude.ai, la page reçoit window.claude (Claude, base partagée, salles, téléchargements).
   Ailleurs (Vercel, en local), on fournit la même interface avec ce qu'on a :
   Claude passe par /api/claude, les téléchargements par le navigateur,
   la base partagée n'est pas disponible (voir docs/PLAN.md). */
(() => {
  if (window.claude && typeof window.claude.use === 'function') return;

  let enabled = null;
  async function ask(body){
    const r = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw { code: d.code || (r.status === 429 ? 'rate_limited' : 'upstream_error'), message: d.error || String(r.status) };
    return d;
  }
  const toTurns = (input) => typeof input === 'string' ? [{ role: 'user', content: input }] : input;

  async function sample(input, opts = {}){
    if (opts.signal && opts.signal.aborted) throw { code: 'cancelled', message: 'annulé' };
    const d = await ask({ messages: toTurns(input), tier: opts.modelTier || 'default' });
    if (opts.signal && opts.signal.aborted) throw { code: 'cancelled', message: 'annulé' };
    if (typeof opts.onText === 'function') opts.onText({ text: d.text, delta: d.text });
    return { text: d.text, truncated: !!d.truncated };
  }
  sample.json = async (input, opts = {}) => {
    const d = await ask({ messages: toTurns(input), tier: opts.modelTier || 'default', json: true });
    const t = String(d.text || '').trim();
    try { return JSON.parse(t); } catch (_) {}
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence){ try { return JSON.parse(fence[1]); } catch (_) {} }
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a){ try { return JSON.parse(t.slice(a, b + 1)); } catch (_) {} }
    throw { code: 'invalid_json', message: 'réponse illisible', text: t };
  };

  const downloads = {
    async save({ filename, data }){
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return { status: 'saved' };
    }
  };

  window.claude = {
    standalone: true,
    async use(name){
      if (name === 'sample'){
        if (enabled === null){ try { const r = await fetch('/api/claude'); enabled = r.ok && !!(await r.json()).enabled; } catch (_) { enabled = false; } }
        return enabled ? sample : null;
      }
      if (name === 'downloads') return downloads;
      return null;
    }
  };
})();
