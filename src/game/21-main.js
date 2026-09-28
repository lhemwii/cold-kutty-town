/* ================= radio ================= */
const lotGo = (type, side) => () => { const l = LOTS.find(o => o.type === type && (!side || o.side === side)); return l ? [l.ca, l.cb] : null; };
const airportGo = (i) => () => { const T = AIRPORTS[i].terminal; return [(T[0] + T[1]) / 2, (T[2] + T[3]) / 2 - 20]; };
const paradeGo = (t) => { const h = paradeHead(t); return h == null ? null : [Math.max(PARADE.a1, h) + 40, PARADE.b]; };
paradeGo.live = true;
const trainGo = (side) => { const f = (t) => { const s = trainState(side, t); return s ? [s.c, RAIL_B + 10] : null; }; f.live = true; return f; };
const metroGo = (i) => () => [METRO[i].A, METRO[i].stations[1]];
const RADIO = [
  ['usc', 'Radio Kutty Libre', 'Le nouveau modèle Cadillatte a des ailerons encore plus longs. Les mouettes sont jalouses.'],
  ['ccp', 'Radio Miaou-Scou', 'Le plan quinquennal de croquettes est dépassé de 300 %. Gloire aux ouvriers de l’usine n° 7 !'],
  ['usc', 'Radio Kutty Libre', 'Ce soir au diner : concours de twist. Milkshake à la sardine offert au gagnant.'],
  ['ccp', 'Radio Miaou-Scou', 'Match d’échecs historique : Boris Pattov attend toujours la réponse du pigeon voyageur.'],
  ['neutre', 'Météo marine', 'Mer calme, vent de noroît. Le phare tourne, deux éclats toutes les seize secondes.'],
  ['usc', 'Radio Kutty Libre', 'Publicité : Kutty Cola, la boisson qui fait ronronner tout le secteur.'],
  ['ccp', 'Radio Miaou-Scou', 'Le Gastronom annonce un arrivage de sardines pour 1963. La file d’attente est ouverte.'],
  ['usc', 'Radio Kutty Libre', 'Au cinéma : L’Invasion des souris de Mars. Séance à 21 h, pop-corn au thon.'],
  ['ccp', 'Radio Miaou-Scou', 'Natacha Miaoulova s’entraîne pour devenir le premier chat en orbite. Ou le deuxième.'],
  ['usc', 'Radio Kutty Libre', 'Checkpoint Minou : passage autorisé pour les visiteurs munis d’un sourire.'],
  ['ccp', 'Radio Miaou-Scou', 'Le camarade Igor Ronronov a tricoté 102 pelotes en une nuit. Médaille d’or du travail !'],
  ['neutre', 'Radio du port', 'Tonton Gribouille signale une sardine géante. Personne ne l’a vue. Comme d’habitude.'],
  ['ccp', 'Radio Miaou-Scou', 'Le métro du peuple passe toutes les quatre minutes. Les lustres des stations sont astiqués chaque matin.', lotGo('metro', 'ccp')],
  ['usc', 'Radio Kutty Libre', 'Kutty International : vol pour les îles du Sud toutes les heures. Hôtesses souriantes, croquettes en plateau.', airportGo(0)],
  ['ccp', 'Radio Miaou-Scou', 'L’aéroport du peuple accueille le nouveau Tupolouf. Plus rapide que le vent, presque.', airportGo(1)],
  ['ccp', 'Radio Miaou-Scou', 'Récolte record au kolkhoze Étoile Rouge : 12 000 bottes de blé et un tracteur toujours en marche.', lotGo('kolkhoze')],
  ['usc', 'Radio Kutty Libre', 'Ce soir au stade : les Kutty Sox contre les Pelotes de Port-Sardine. Hot-dogs au saumon à la mi-temps.', lotGo('stade', 'usc')],
  ['usc', 'Radio Kutty Libre', 'Nouveau au supermarché : la boîte de pâtée en conserve géante. Parking gratuit, chariots chromés.', lotGo('supermarche')],
  ['neutre', 'Horloge parlante', 'Au quatrième top, il sera l’heure de faire la sieste. Top, top, top, top.'],
  ['usc', 'Radio Kutty Libre', 'Le Kutty Zéphyr quitte la Gare Centrale. Voitures chromées, wagon-restaurant et vue sur la mer.', trainGo('usc')],
  ['ccp', 'Radio Miaou-Scou', 'Le train du peuple part à l’heure. Toujours. Même quand il n’y a personne dedans.', trainGo('ccp')],
  ['usc', 'Radio Kutty Libre', 'Le métro aérien passe au-dessus de l’avenue. Les pigeons ont porté plainte, la ville a dit non.', metroGo(0)],
  ['ccp', 'Radio Miaou-Scou', 'Le métro aérien du peuple : trois rames, zéro retard, et un contrôleur qui compte les moustaches.', metroGo(1)],
  ['neutre', 'Radio du port', 'Une limousine aux deux fanions passe le Checkpoint Minou. Personne ne sait qui est dedans. Le Sergent non plus.', () => [WALL_A, CHECK_B]],
  ['usc', 'Radio Kutty Libre', 'Rappel : le Rêve des Nations Libres, c’est un frigo plein, une voiture à ailerons et un drive-in le samedi.'],
  ['ccp', 'Radio Miaou-Scou', 'Le Grand Plan du Peuple avance : chaque usine, chaque kolkhoze nous rapproche de l’avenir radieux.']
];
const radioText = $('radioText'), radioStation = $('radioStation'), radioDot = $('radioDot');
let radioIdx = -1, radioX = 0, radioW = 0, radioHold = 0, radioQueue = [], radioSide = 'usc';
let radioGo = null;
const radioEl = $('radio');
function radioShow(item){
  const [side, station, msg, go] = item;
  radioSide = side; radioGo = go || null;
  radioEl.classList.toggle('go', !!radioGo);
  radioEl.title = radioGo ? 'Clique pour y aller' : '';
  radioStation.textContent = '';
  const s1 = document.createElement('span'); s1.textContent = side === 'ccp' ? 'CCR' : side === 'usc' ? 'USC' : 'RADIO';
  const s2 = document.createElement('span'); s2.className = 'rs-name'; s2.textContent = ' · ' + station.toUpperCase();
  radioStation.append(s1, s2);
  radioText.textContent = '';
  const b = document.createElement('b'); b.textContent = side === 'ccp' ? '★' : side === 'usc' ? '♪' : '~';
  radioText.append(b, document.createTextNode(msg.replace(DASHES, ',')));
  if (radioGo){ const g = document.createElement('i'); g.className = 'radio-go'; g.textContent = 'Clique pour y aller'; radioText.append(g); }
  radioX = radioText.parentElement.clientWidth; radioW = radioText.scrollWidth; radioHold = 0;
  if (reduceMotion) radioX = 0;
}
radioEl.addEventListener('click', () => {
  if (!radioGo) return;
  if (state.chatCat) closeChat();
  const g = radioGo.live ? radioGo : radioGo();
  if (!g) return;
  cam.follow = g; if (Z < KDEF) setZoom(KDEF);
});
function radioNext(){
  if (radioQueue.length){ const it = radioQueue.shift(); radioShow(it); sfx(it[0]); return; }
  radioIdx = (radioIdx + 1) % RADIO.length; radioShow(RADIO[radioIdx]);
}
function radioFlash(lot){
  const nm = typeName(lot.type, lot.side).toLowerCase();
  radioQueue.push(lot.side === 'ccp'
    ? ['ccp', 'Radio Miaou-Scou', 'Flash spécial : le peuple inaugure fièrement ' + (TYPES[lot.type].fem ? 'une nouvelle ' : 'un nouveau ') + nm + '. Applaudissements obligatoires !']
    : ['usc', 'Radio Kutty Libre', 'Flash spécial : ' + (TYPES[lot.type].fem ? 'une nouvelle ' : 'un nouveau ') + nm + ' ouvre ses portes. Venez nombreux, c’est gratuit ce soir !']);
}
let satAnnounced = false, paradeAnnounced = false, nightAnnounced = null;
function stepRadio(dt, t){
  if (COLOR){
    const on = paradeHead(t) != null;
    if (on && !paradeAnnounced && !state.uiHidden) radioShow(['ccp', 'Radio Miaou-Scou', 'Direct de l’avenue du Peuple : le grand défilé commence ! Soldats, chars, missiles et fanfare. Tout le monde agite son petit drapeau.', paradeGo]);
    paradeAnnounced = on;
    const night = NIGHT > .5;
    if (nightAnnounced !== null && night !== nightAnnounced) radioQueue.push(night
      ? ['neutre', 'Radio du port', 'La nuit tombe sur l’île. Le phare s’allume et les néons de l’Ouest clignotent.']
      : ['neutre', 'Radio du port', 'Le soleil se lève sur Kutty. Premier café au diner, premier métro à l’Est.']);
    nightAnnounced = night;
  }
  if (COLOR && WEATHER.changed){
    const w = WEATHER.changed; WEATHER.changed = null;
    logDay('both', 'weather', w);
    const msg = { clair: 'Le ciel se dégage sur l’île. Soleil des deux côtés du mur, pour une fois tout le monde est d’accord.',
      pluie: 'Averses sur Kutty. Sortez les parapluies, et rentrez les chats qui détestent l’eau. C’est-à-dire tous.',
      neige: 'Il neige sur l’île ! Les toits blanchissent, les chars du défilé glissent un peu.',
      brouillard: 'Brouillard sur le port. Le phare travaille double, les espions sont ravis.' }[w];
    if (msg) radioQueue.unshift(['neutre', 'Météo marine', msg]);
  }
  if (satVisible(t) && !satAnnounced){ satAnnounced = true; radioQueue.unshift(['ccp', 'Radio Miaou-Scou', 'Bip... bip... Le satellite Spoutchat survole l’île en ce moment. La science du peuple ronronne !']); }
  if (!satVisible(t)) satAnnounced = false;
  radioDot.classList.toggle('off', Math.floor(t * 2) % 2 === 0);
  if (reduceMotion){ radioHold += dt; if (radioHold > 8) radioNext(); return; }
  radioX -= 42 * dt;
  radioText.style.transform = 'translateX(' + Math.round(radioX) + 'px)';
  if (radioX < -radioW - 20) radioNext();
}

/* ================= conversation ================= */
const chatLog = $('chatLog'), chatInput = $('chatInput'), quick = $('quick'), chatNote = $('chatNote'), chatNoteText = $('chatNoteText'), chatAllow = $('chatAllow');
const portraitCv = $('portrait');
let sampleFn = null, sampleOff = false, chatAbort = null, chatTurns = [], chatBusy = false, factIdx = 0;
let permApi = null, sampleState = 'unknown', lastFail = '';
const GAME_NAME = COLOR ? 'Cold Kutty Town' : 'Old Kutty Town';
const QUICK = ['Bonjour !', 'Tu fais quoi ici ?', 'Et l’autre côté du mur ?', 'Raconte-moi un secret', 'Au revoir'];
function updateChatNote(){
  let msg, allow = false;
  if (lastFail) msg = lastFail;
  else if (sampleOff || sampleState === 'unavailable') msg = 'Claude n’est pas disponible ici : les chats répondent avec des phrases toutes faites.';
  else if (sampleState === 'denied') msg = 'Claude est refusé pour cette page : les réponses sont toutes faites. Tu peux le réactiver dans le menu des autorisations de l’artefact.';
  else if (sampleState === 'granted') msg = 'Écris ce que tu veux : Claude répond en direct, dans le rôle du chat.';
  else if (!permApi && sampleFn) msg = 'Écris ce que tu veux : Claude répond en direct, dans le rôle du chat.';
  else { msg = 'Écris ce que tu veux : Claude répond dans le rôle du chat. La première fois, il te demande l’autorisation.'; allow = !!permApi && sampleState === 'prompt'; }
  chatNoteText.textContent = msg; chatAllow.hidden = !allow; chatNote.hidden = false;
}
async function refreshSampleState(){
  if (!permApi) return;
  try { sampleState = await permApi.state('sample'); } catch (_) {}
  updateChatNote();
}
chatAllow.addEventListener('click', async () => {
  if (!permApi) return;
  chatAllow.disabled = true;
  try { const r = await permApi.request(['sample']); sampleState = (r && r.sample) || sampleState; } catch (_) {}
  chatAllow.disabled = false; lastFail = ''; updateChatNote();
});
const SIDE_LABEL = { usc: 'UNITED SANDS OF CATS · USC · OUEST', ccp: 'CATS COMMUNIST REPUBLIK · CCR · EST', neutre: 'NEUTRE' };

function addMsg(text, who, extra){
  const el = document.createElement('div');
  el.className = 'msg ' + who + (extra ? ' ' + extra : '');
  el.textContent = text;
  chatLog.appendChild(el); chatLog.scrollTop = chatLog.scrollHeight;
  return el;
}
function placesList(side){
  const names = new Set();
  for (const l of LOTS) if (l.type && l.type !== 'maison' && l.type !== 'immeuble' && (side === 'neutre' || l.side === side)) names.add(typeName(l.type, l.side).toLowerCase());
  const houses = LOTS.filter(l => (l.type === 'maison' || l.type === 'immeuble') && (side === 'neutre' || l.side === side)).length;
  return [...names].join(', ') + ' et ' + houses + ' logements';
}
function dayMoment(){
  const h = CLOCK.h;
  const hm = Math.floor(h) + ' h ' + String(Math.floor((h % 1) * 60)).padStart(2, '0');
  const w = h < 5.5 ? 'en pleine nuit' : h < 8 ? 'au petit matin' : h < 12 ? 'le matin' : h < 14 ? 'à midi' : h < 18.5 ? 'l’après-midi' : h < 21 ? 'le soir' : 'la nuit';
  return 'Il est ' + hm + ', ' + w + '. ';
}
function rulesFor(c){
  const camp = c.side === 'ccp' ? 'la Cats Communist Republik (CCR), à l’est de l’île : une république populaire de chats façon années 60, avec plans quinquennaux de croquettes, défilés, médailles, immeubles tous pareils, le Gastronom et sa file d’attente, le satellite Spoutchat et la Pravdachat. Son idéal officiel s’appelle le Grand Plan du Peuple'
    : c.side === 'usc' ? 'les United Sands of Cats (USC), à l’ouest de l’île : un pays de chats façon années 50 et 60, avec diners, juke-box, rock’n’roll, voitures à ailerons, publicité, télévision et drive-in. Son idéal officiel s’appelle le Rêve des Nations Libres'
    : 'personne : tu es neutre et tu ne prends parti pour aucun camp';
  const cs = c.side === 'usc' || c.side === 'ccp' ? CAMPS[c.side] : null;
  const campNow = cs ? 'En ce moment la jauge du ' + CAMP_NAME[c.side] + ' est à ' + cs.pct + ' %, et les habitants de ton camp réclament ' + wantLabel(c.side) + ' : tu peux le glisser dans la conversation si ça vient naturellement. ' : '';
  const tensionNow = 'La tension entre les deux camps est au niveau « ' + CAMPS.level + ' ». ';
  const wx = COLOR ? ({ pluie: 'Il pleut. ', neige: 'Il neige, les toits sont blancs. ', brouillard: 'Il y a du brouillard. ', clair: '' })[WEATHER.shown === 'clair' || WEATHER.k < .4 ? 'clair' : WEATHER.shown] : '';
  const extra = !COLOR ? '' : c.side === 'ccp' ? 'De ton côté il y a aussi le métro aérien du peuple, la Gare du Peuple et son train qui s’arrête contre le mur, l’aéroport du peuple et ses avions qui font le tour de l’est de l’île, le kolkhoze et son tracteur, les églises à bulbes, et le grand défilé militaire qui passe régulièrement sur l’avenue du Peuple devant la tribune, avec soldats, chars et missiles. '
    : c.side === 'usc' ? 'De ton côté il y a aussi Kutty International, l’aéroport avec ses avions de ligne qui survolent l’ouest de l’île, la Gare Centrale et le train Kutty Zéphyr, le métro aérien au-dessus de l’avenue, le stade de base-ball, le supermarché et les buildings art déco. '
    : 'Sur l’île il y a deux aéroports, deux gares, deux métros aériens, et à l’est un grand défilé militaire qui passe régulièrement. Une limousine mystérieuse traverse parfois le Checkpoint Minou. ';
  return 'Tu joues ' + c.name + ' (' + c.job + '), un chat qui vit à ' + GAME_NAME + ', ' + (wallUp() ? 'une grande île coupée en deux du nord au sud par un mur appelé le Rideau de Laine' : 'une grande île où deux camps viennent de débarquer, chacun à un bout ; ils avancent l’un vers l’autre et il n’y a pas encore de mur entre eux') + ', en ' + MONTHS[CAL.m] + ' ' + CAL.y + ' (' + seasonOf(CAL.m) + '). ' +
    (feteOf(CAL.m) ? 'En ce moment, c’est ' + feteOf(CAL.m).name + ', avec feu d’artifice la nuit. ' : '') +
    (wallUp() ? 'On passe d’un camp à l’autre par le Checkpoint Minou. ' : '') + 'Tu fais partie de ' + camp + '. ' + extra + (COLOR ? dayMoment() : '') + wx + campNow + tensionNow +
    'Le ton est celui d’une comédie de guerre froide pour tous publics : on se moque gentiment des deux camps, sans méchanceté, sans vraie politique et sans citer de personnes réelles. ' +
    'Ne nomme jamais de pays réel (ni Amérique, ni États-Unis, ni URSS, ni Russie, ni aucun autre) : dans ce monde, il n’existe que l’USC, la CCR et l’île de Kutty. ' +
    'Ton caractère : ' + c.traits + '. ' +
    'Lieux de ton côté en ce moment : ' + placesList(c.side) + '. ' +
    (lastBuilt ? 'Nouveauté du soir : on vient de construire ' + lastBuilt + '. ' : '') +
    'Habitants que tu connais : ' + CATS.filter(o => o !== c).map(o => o.name + ' (' + o.job + ', ' + (o.side === 'ccp' ? 'CCR' : o.side === 'usc' ? 'USC' : 'neutre') + ')').join(', ') + '. ' +
    'Tu parles à un visiteur qui se promène et qui t’écrit librement. Lis bien son dernier message et réponds précisément à ce qu’il dit ou demande, même si c’est inattendu : improvise, invente des détails de ta vie, pose-lui parfois une question en retour. Ne répète pas une réplique que tu as déjà dite. ' +
    'Si le visiteur parle d’un sujet de notre époque (téléphone portable, internet, etc.), fais semblant de ne pas comprendre et ramène-le avec humour en 1961. ' +
    'Réponds en français comme un personnage de jeu vidéo : une à trois phrases courtes, chaleureuses, drôles, avec parfois un petit tic de chat sans en abuser. ' +
    'Reste toujours dans ton personnage, ton camp et ton époque. N’écris que ta réplique, sans guillemets et sans ton nom devant. N’utilise jamais de tiret long ni de tiret moyen. Pas de liste, pas de gras.';
}
function fallbackReply(c, msg){
  const m = msg.toLowerCase();
  if (/au revoir|bye|bonne nuit|à plus/.test(m)) return c.side === 'ccp' ? 'Au revoir, camarade. Reviens quand tu veux, la file d’attente t’attendra.' : 'À bientôt ! Et fais attention au phare, il éblouit les distraits.';
  if (/ça va|ca va|comment/.test(m)) return c.side === 'ccp' ? 'Ça va très bien, comme le dit la Pravdachat. Et toi, camarade ?' : 'Ça va comme un chat au soleil, même la nuit. Et toi ?';
  if (/autre côté|mur|rideau|ccr|ccp|usc|communis|améri/.test(m)) return c.side === 'ccp' ? 'De l’autre côté ? Ils ont des ailerons et du bruit. Nous, on a des plans. Et des médailles.' : c.side === 'usc' ? 'Là-bas ? Tout est carré, même les voitures. Mais leur satellite fait un joli bip.' : 'Moi je parle aux deux. Les poissons aussi, d’ailleurs.';
  const f = c.facts[factIdx % c.facts.length]; factIdx++;
  return f;
}
function openChat(c){
  if (state.chatCat) closeChat(true);
  state.chatCat = c; c.frozen = catPos(c, now() / 1000); c.frozen.moving = false; c.paused = true;
  $('chatName').textContent = c.name; $('chatJob').textContent = c.job;
  $('chatSide').textContent = SIDE_LABEL[c.side];
  drawFlagIcon($('flag'), c.side);
  chatLog.textContent = ''; chatTurns = []; factIdx = 0;
  c.memCounted = false; c.memPrev = memContext(c); c.helloNow = memGreeting(c) || c.hello;
  addMsg(c.helloNow, 'cat');
  chatTurns.push({ role: 'assistant', content: c.helloNow });
  quick.textContent = '';
  for (const q of QUICK){ const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = q; b.addEventListener('click', () => send(q)); quick.appendChild(b); }
  $('chat').hidden = false; document.body.classList.add('chat-open');
  $('inspector').hidden = true;
  lastFail = ''; updateChatNote(); refreshSampleState();
  if (Z < KDEF) setZoom(KDEF);
  cam.target = [c.frozen.a, c.frozen.b];
  drawPortrait(c, now() / 1000, portraitCv);
  if (window.innerWidth > 640) setTimeout(() => chatInput.focus({ preventScroll: true }), 50);
}
function closeChat(silent){
  const c = state.chatCat; if (!c) return;
  if (chatAbort) chatAbort.abort();
  portraitTalk = false;
  c.paused = false; c.frozen = null;
  state.chatCat = null; cam.target = null;
  $('chat').hidden = true; document.body.classList.remove('chat-open');
  $('inspector').hidden = !state.inspOn;
}
$('chatClose').addEventListener('click', () => closeChat());
$('chatForm').addEventListener('submit', e => { e.preventDefault(); const v = chatInput.value.trim(); if (v) send(v); });
// ou placer la camera pour que le chat ne soit pas cache par le panneau
function chatCamTarget(){
  const c = state.chatCat; if (!c || !cam.target) return null;
  const mobile = window.innerWidth <= 640;
  const px = mobile ? 0 : (-Math.min(380, window.innerWidth * .3) / 2) * DPR / Z;
  const py = mobile ? (-window.innerHeight * .3) * DPR / Z : 0;
  const g = groundDelta(-px, -py);
  return [cam.target[0] + g[0], cam.target[1] + g[1]];
}

async function send(text){
  const c = state.chatCat; if (!c || chatBusy) return;
  chatInput.value = '';
  addMsg(text, 'me');
  chatTurns.push({ role: 'user', content: text });
  const bye = /^au revoir/i.test(text);
  chatBusy = true; $('chatSend').disabled = true;
  const bubble = addMsg(c.name.split(' ')[0] + ' réfléchit…', 'cat', 'wait');
  let reply = '';
  if (!sampleOff && sampleFn){
    chatAbort = new AbortController();
    const hist = chatTurns.slice(-12), turns = [{ role: 'user', content: rulesFor(c) + (c.memPrev || '') + '\n\nLe visiteur s’approche. Tu l’as salué ainsi : « ' + (c.helloNow || c.hello) + ' »' }];
    for (const tr of hist){ const lastT = turns[turns.length - 1]; if (lastT.role === tr.role) lastT.content += '\n\n' + tr.content; else turns.push({ role: tr.role, content: tr.content }); }
    try {
      const r = await sampleFn(turns, { modelTier: 'quick', cache: false, signal: chatAbort.signal,
        onText: ({ text: tx }) => { portraitTalk = true; bubble.classList.remove('wait'); bubble.textContent = tx.replace(DASHES, ','); chatLog.scrollTop = chatLog.scrollHeight; } });
      reply = r.text.replace(DASHES, ',').trim();
      if (lastFail || sampleState !== 'granted'){ lastFail = ''; sampleState = 'granted'; updateChatNote(); }
    } catch (err){
      if (err && err.code === 'cancelled'){ chatBusy = false; $('chatSend').disabled = false; portraitTalk = false; return; }
      const code = (err && err.code) || 'upstream_error';
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)){ sampleOff = true; if (code === 'not_granted') sampleState = 'denied'; lastFail = ''; }
      else if (code === 'rate_limited') lastFail = 'Claude est très sollicité : attends un instant avant de réécrire.';
      else if (code === 'session_expired') lastFail = 'Ta session Claude a expiré : reconnecte-toi puis réessaie.';
      else if (code === 'refused') lastFail = 'Claude n’a pas voulu répondre à ce message : essaie autrement.';
      else lastFail = 'Claude n’a pas pu répondre (' + code + ') : réponse de secours.';
      updateChatNote();
      reply = (err && err.text) ? err.text.replace(DASHES, ',') : fallbackReply(c, text);
      if (code === 'rate_limited') reply = 'Miaou, je suis un peu essoufflé. Repose-moi la question dans un instant.';
    }
  } else {
    await new Promise(r => setTimeout(r, 450));
    reply = fallbackReply(c, text);
  }
  bubble.classList.remove('wait'); bubble.textContent = reply;
  chatTurns.push({ role: 'assistant', content: reply });
  memRemember(c, chatTurns);
  portraitTalk = true; setTimeout(() => { if (!chatBusy) portraitTalk = false; }, Math.min(2600, 400 + reply.length * 28));
  chatBusy = false; $('chatSend').disabled = false;
  if (bye) setTimeout(() => { if (state.chatCat === c) closeChat(); }, 1600);
}

/* ================= sauvegarde de la ville ================= */
let saveTimer = 0;
const DBH = { db: null, uid: null };
function snapshotTown(){
  const diff = {}, lvl = {};
  for (const l of LOTS){ if (l.type !== INITIAL[l.id]) diff[l.id] = l.type; if (l.type && (l.lvl || 1) > 1) lvl[l.id] = l.lvl; }
  return { v: 6, mode: GAME.mode, camps: campsSnapshot(), eco: ecoSnapshot(), lots: diff, lvl, deb: { wall: DEB.wall, unlock: [DEB.unlock.usc, DEB.unlock.ccp] }, cal: [CAL.m, CAL.y], roads: USER_ROADS.map(s => [s.o, s.c, s.s0, s.s1]) };
}
function loadTownData(data){
  if (!data || typeof data !== 'object') return false;
  if (Array.isArray(data.roads)){
    USER_ROADS = [];
    for (const r of data.roads.slice(0, 200)){
      if (!Array.isArray(r) || (r[0] !== 'a' && r[0] !== 'b')) continue;
      const s = { o: r[0], c: +r[1], s0: +r[2], s1: +r[3] };
      if (![s.c, s.s0, s.s1].every(isFinite) || s.s1 - s.s0 < 10 || s.s1 - s.s0 > 1200) continue;
      USER_ROADS.push(s);
    }
  }
  if (data.lots) for (const l of LOTS) if (Object.prototype.hasOwnProperty.call(data.lots, l.id)){ const t = String(data.lots[l.id] || ''); l.type = TYPES[t] ? t : ''; }
  if (data.lvl && typeof data.lvl === 'object') for (const l of LOTS){ const v = +data.lvl[l.id]; l.lvl = l.type && v >= 1 && v <= 3 ? v : 1; }
  campsLoad(data.camps); ecoLoad(data.eco);
  if (Array.isArray(data.cal)){ CAL.m = clamp(Math.floor(+data.cal[0]) || 0, 0, 11); CAL.y = clamp(Math.floor(+data.cal[1]) || 1961, 1961, 2999); }
  if (data.deb && GAME.mode === 'deb'){ DEB.wall = !!data.deb.wall; if (DEB.wall) DEB.wallT = -1e9; if (Array.isArray(data.deb.unlock)){ DEB.unlock.usc = clamp(+data.deb.unlock[0] || 0, 0, 3); DEB.unlock.ccp = clamp(+data.deb.unlock[1] || 0, 0, 3); } }
  return true;
}
function applyTown(data){
  if (!loadTownData(data)) return;
  paintRoads(GA0, GA0 + GW / GSC, GB0, GB0 + GH / GSC);
  if (GAME.mode === 'deb' && !DEB.wall) hideStrip();
  refreshBlocked(); buildGraph(); reseatCars(); refreshNeighbors(); rebuildTown(); ecoTally(); updateCamps(false); renderRes(); applySeason(); updateCalUI();
}
let saving = false;
function saveSoon(){
  if (GAME.mp) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const snap = snapshotTown(), keys = MODE_KEYS[GAME.mode]; if (!keys) return;
    try { localStorage.setItem(keys.ls, JSON.stringify(snap)); } catch (_) {}
    if (DBH.db && DBH.uid && !saving){ saving = true; try { await DBH.db.doc('data/users/' + DBH.uid + '/' + keys.doc).set(snap); } catch (_) {} saving = false; }
  }, 900);
}
async function connectCapabilities(){
  const cl = window.claude;
  if (!cl || typeof cl.use !== 'function'){ sampleState = 'unavailable'; return; }
  cl.use('sample').then(fn => { sampleFn = fn; if (!fn) sampleOff = true; if (state.chatCat) updateChatNote(); }).catch(() => { sampleOff = true; });
  cl.use('permissions').then(p => { permApi = p || null; if (permApi) refreshSampleState(); }).catch(() => {});
  try {
    const [db, user] = await Promise.all([cl.use('db'), cl.use('user')]);
    if (!db || !user) return;
    const id = await user.id();
    if (!id) return;
    DBH.db = db; DBH.uid = id;
    if (typeof loadMemories === 'function') loadMemories();
    if (GAME.mode === 'ville' && !GAME.touched){
      const snap = await db.doc('data/users/' + id + '/' + MODE_KEYS.ville.doc).get();
      if (snap.exists && GAME.mode === 'ville' && !GAME.touched) applyTown(snap.data());
    }
  } catch (_) {}
}

/* ================= boucle ================= */
const now = () => performance.now();
let last = now(), compassPhi = null, campT = 0;
function frame(tms){
  const dt = Math.min(0.1, (tms - last) / 1000); last = tms;
  const t = tms / 1000 + (state.tShift || 0);
  NOW_T = t;
  stepKeys(dt);
  if (cam.phiT != null){
    const d = cam.phiT - cam.phi;
    if (Math.abs(d) < .002){ cam.phi = cam.phiT; cam.phiT = null; }
    else cam.phi += d * Math.min(1, dt * 7);
  }
  const ct = chatCamTarget();
  if (ct){ cam.a += (ct[0] - cam.a) * Math.min(1, dt * 4); cam.b += (ct[1] - cam.b) * Math.min(1, dt * 4); clampCam(); }
  else if (cam.follow){
    const live = typeof cam.follow === 'function', f = live ? cam.follow(t) : cam.follow;
    if (!f) cam.follow = null;
    else {
      cam.a += (f[0] - cam.a) * Math.min(1, dt * 2.2); cam.b += (f[1] - cam.b) * Math.min(1, dt * 2.2); clampCam();
      if (!live && Math.hypot(f[0] - cam.a, f[1] - cam.b) < 1.5) cam.follow = null;
    }
  }
  if (state.auto) state.theta = (state.theta + TAU / state.period * dt) % TAU;
  const target = state.patternView ? 1 : 0;
  if (state.spread !== target){ const k = dt / 0.9; state.spread = target > state.spread ? Math.min(1, state.spread + k) : Math.max(0, state.spread - k); }
  stepZoom(dt);
  stepBarriers(dt, t);
  stepCrossings(dt, t);
  stepCars(dt);
  stepWeather(dt, t);
  stepClock(dt);
  stepEco(dt);
  stepEvents(dt, t);
  stepSpace(t);
  stepDeb(dt, t);
  for (const f of HOOKS.step) f(dt, t);
  updateClockUI();
  campT += dt; if (campT > 2){ campT = 0; updateCamps(true); }
  if (OV_ON) drawOverview(t);
  else { render(t); drawInspector(); }
  for (const f of HOOKS.after) f(t);
  if (compassPhi !== cam.phi){ compassPhi = cam.phi; drawCompass(); }
  if (state.chatCat) drawPortrait(state.chatCat, t, portraitCv);
  if (!state.uiHidden) stepRadio(dt, t);
  requestAnimationFrame(frame);
}

let rz = 0;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); sizeInspector(); }, 120); });
const introGo = $('introGo'), introLabel = introGo.textContent, introBtns = ['introGo', 'introDeb', 'introMp'].map($);
introBtns.forEach(b => b.disabled = true); introGo.textContent = 'Chargement de l’île…';
const closeIntro = () => { $('intro').hidden = true; scene.focus({ preventScroll: true }); };
function hasDebSave(){ try { return !!localStorage.getItem(MODE_KEYS.deb.ls); } catch (_) { return false; } }
function openIntro(){
  $('intro').hidden = false;
  $('introDeb').textContent = hasDebSave() ? 'Reprendre le Débarquement' : 'Débarquement';
  $('introDebNew').hidden = !hasDebSave();
}
introGo.addEventListener('click', async () => { GAME.touched = true; if (GAME.mp) mpLeave(); await enterMode('ville'); closeIntro(); });
$('introDeb').addEventListener('click', async () => { GAME.touched = true; if (GAME.mp) mpLeave(); await enterMode('deb'); closeIntro(); });
$('introDebNew').addEventListener('click', async () => { GAME.touched = true; if (GAME.mp) mpLeave(); await enterMode('deb', true); closeIntro(); });
$('introMp').addEventListener('click', () => { openMp(); });
$('btnMenu').addEventListener('click', () => openIntro());
$('btnUndo').addEventListener('click', () => undo());

function start(){
  buildGround();
  buildGridRoads();
  paintRoads(GA0, GA0 + GW / GSC, GB0, GB0 + GH / GSC);
  buildRail();
  buildLots();
  initialLayout();
  setCampGoals();
  VILLE_INITIAL = Object.assign({}, INITIAL);
  ecoCalibrate(); ecoCalMoral();
  let saved = null;
  try { const s = localStorage.getItem(MODE_KEYS.ville.ls); if (s) saved = JSON.parse(s); } catch (_) {}
  if (saved && loadTownData(saved) && USER_ROADS.length) paintRoads(GA0, GA0 + GW / GSC, GB0, GB0 + GH / GSC);
  if (USER_ROADS.length) buildRail();
  refreshBlocked();
  buildGraph();
  spawnCars();
  buildBorder();
  buildLamps();
  buildScatter();
  stepCars(0);
  rebuildTown();
  layout();
  sizeInspector();
  $('camps').hidden = false;
  refreshNeighbors(); ecoTally(); updateCamps(false); renderRes(); applySeason(); updateCalUI(); deliverPaper(true);
  document.body.dataset.mode = GAME.mode;
  if (window.innerWidth < 640) centerOn(-10, -10); else centerOn(-10, 0);
  buildPalette();
  renderCamps();
  updateReadouts();
  setMode('walk');
  radioNext();
  connectCapabilities();
  window.__okt = { state, cam, CATS, CARS, LOTS, openChat, closeChat, placeOn, setMode, typeAt, setZoom, centerOn, unprj, prj, addRoad, roadProblem, removeRoad,
    get USER_ROADS(){ return USER_ROADS; }, get SHADOWS(){ return SHADOWS; }, get lbuf(){ return lb; }, get mbuf(){ return mb; }, get fbuf(){ return fb; }, get ROADS(){ return ROADS; }, get NODES(){ return NODES; }, get NB(){ return NB; }, sideOf,
    CLOCK, AIRPORTS, PARADE, paradeHead, planeState, get NIGHT(){ return NIGHT; }, get STATIC_PARTS(){ return STATIC_PARTS; }, get K(){ return K; }, get KMIN(){ return KMIN; }, get KMAX(){ return KMAX; }, get KDEF(){ return KDEF; }, get view(){ return [W, H]; }, WALL_SEGS, TYPES,
    get Z(){ return Z; }, get ZT(){ return ZT; }, get ZLEVELS(){ return ZLEVELS; }, get OV_ON(){ return OV_ON; }, RAIL, trainState, METRO, metroState, CROSSINGS, limoState, BARRIERS, WEATHER, WX, CAMPS, updateCamps, zoomStep, carHeld, stepCars, RES, SPACE, DEB, EV, GAME, enterMode, undo, forceEvent: () => { EV.next = 0; }, get HISTORY(){ return HISTORY; }, get TOWN_VER(){ return TOWN_VER; },
    CAL, applySeason, updateCalUI, PORTS, fwSalvo, PEDS, PAPER, deliverPaper, MEM, FW, get WET(){ return WET; }, set WET(v){ WET = v; }, BUB, render };
  introBtns.forEach(b => b.disabled = false); introGo.textContent = introLabel; openIntro();
  requestAnimationFrame(frame);
}
setTimeout(start, 60);
