// Fonction Vercel : relaie les demandes du jeu (chats, journal du matin) vers l'API Claude d'Anthropic.
// Elle ne s'active que si la variable d'environnement ANTHROPIC_API_KEY est définie dans le projet Vercel.
// Sans clé, le jeu marche quand même : les chats répondent avec des phrases toutes faites.

const MODELS = {
  quick: process.env.CLAUDE_MODEL_QUICK || 'claude-haiku-4-5-20251001',
  default: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'
};
const MAX_INPUT = 24000;          // caractères envoyés au maximum par demande
const PER_MINUTE = +process.env.CLAUDE_PER_MINUTE || 20;   // demandes par minute et par adresse
const hits = new Map();

function limited(ip){
  const now = Date.now(), recent = (hits.get(ip) || []).filter(t => now - t < 60000);
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > PER_MINUTE;
}
async function readBody(req){
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = []; for await (const c of req) chunks.push(c);
  const s = Buffer.concat(chunks).toString('utf8');
  return s ? JSON.parse(s) : {};
}

export default async function handler(req, res){
  const key = process.env.ANTHROPIC_API_KEY;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ enabled: !!key });
  if (req.method !== 'POST') return res.status(405).json({ code: 'bad_request', error: 'méthode' });
  if (!key) return res.status(503).json({ code: 'not_declared', error: 'ANTHROPIC_API_KEY manquante' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ code: 'rate_limited', error: 'trop de demandes' });

  let body;
  try { body = await readBody(req); } catch (_) { return res.status(400).json({ code: 'bad_request', error: 'json' }); }
  const msgs = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-16);
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ code: 'bad_request', error: 'messages' });
  if (JSON.stringify(msgs).length > MAX_INPUT) return res.status(413).json({ code: 'bad_request', error: 'trop long' });

  // l'API veut des tours qui alternent et qui commencent par l'utilisateur
  const turns = [];
  for (const m of msgs){ const last = turns[turns.length - 1]; if (last && last.role === m.role) last.content += '\n\n' + m.content; else turns.push({ role: m.role, content: m.content }); }
  if (turns[0].role !== 'user') turns.shift();

  const system = 'Tu écris les répliques des personnages et les journaux du jeu vidéo Cold Kutty Town, une comédie tout public. Réponds toujours en français, sans tiret long ni tiret moyen.'
    + (body.json ? ' Réponds uniquement avec du JSON valide, sans texte autour et sans bloc de code.' : '');
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODELS[body.tier === 'quick' ? 'quick' : 'default'], max_tokens: body.json ? 1600 : 400, system, messages: turns })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ code: r.status === 429 ? 'rate_limited' : 'upstream_error', error: d?.error?.message || 'erreur' });
    const text = (d.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    return res.status(200).json({ text, truncated: d.stop_reason === 'max_tokens' });
  } catch (_) {
    return res.status(502).json({ code: 'upstream_error', error: 'réseau' });
  }
}
