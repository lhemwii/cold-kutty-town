/* ================= voitures : reseau construit depuis les segments, jamais sur l'eau ni a travers le mur ================= */
let NODES = [], NB = new Map();
function buildGraph(){
  const list = allRoads(), idx = new Map();
  NODES = []; NB = new Map();
  const nodeAt = (a, b) => {
    const k = Math.round(a) + ',' + Math.round(b);
    if (!idx.has(k)){ idx.set(k, NODES.length); NODES.push({ a, b, side: sideOf(a) }); NB.set(NODES.length - 1, []); }
    return idx.get(k);
  };
  for (const s of list){
    const st = stopsOf(s, list);
    for (let i = 0; i + 1 < st.length; i++){
      const [pa, pb] = segPt(s, st[i]), [qa, qb] = segPt(s, st[i + 1]);
      if (sideOf(pa) !== sideOf(qa)) continue;
      if (Math.abs(pa - WALL_A) < STRIP || Math.abs(qa - WALL_A) < STRIP) continue;
      const n0 = nodeAt(pa, pb), n1 = nodeAt(qa, qb);
      if (n0 === n1) continue;
      if (!NB.get(n0).includes(n1)) NB.get(n0).push(n1);
      if (!NB.get(n1).includes(n0)) NB.get(n1).push(n0);
    }
  }
}
const CARS = [];
function spawnCars(){
  CARS.length = 0;
  for (let k = 0; k < 26; k++){
    const side = k % 2 ? 'ccp' : 'usc';
    const pool = NODES.map((n, i) => i).filter(i => NODES[i].side === side && NB.get(i).length);
    if (!pool.length) continue;
    const n0 = pool[Math.floor(hash2(k, 5) * pool.length)];
    const nb = NB.get(n0), n1 = nb[Math.floor(hash2(k, 9) * nb.length)];
    CARS.push({ id: k, side, n0, n1, s: hash2(k, 3), v: 13 + hash2(k, 11) * 7, hops: 0,
      light: { kind: 'cone', a: 0, b: 0, da: 1, db: 0, tan: .32, w0: 1.5, len: 32, k: 1.4, att: .8, m: M.GLOW }, pos: null });
  }
}
// apres un changement de routes : chaque voiture reprend l'arete la plus proche
function reseatCars(){
  for (const c of CARS){
    const p = c.pos || { a: NODES[c.n0].a, b: NODES[c.n0].b };
    let best = null, bd = 1e9;
    for (let i = 0; i < NODES.length; i++){
      const n = NODES[i]; if (n.side !== c.side) continue;
      for (const j of NB.get(i)){
        const m = NODES[j], L = Math.hypot(m.a - n.a, m.b - n.b) || 1;
        const s = clamp(((p.a - n.a) * (m.a - n.a) + (p.b - n.b) * (m.b - n.b)) / (L * L), 0, 1);
        const d = Math.hypot(n.a + (m.a - n.a) * s - p.a, n.b + (m.b - n.b) * s - p.b);
        if (d < bd){ bd = d; best = [i, j, s]; }
      }
    }
    if (best){ c.n0 = best[0]; c.n1 = best[1]; c.s = best[2]; }
  }
}
// une voiture s'arrete devant un passage a niveau ferme, ou derriere une voiture arretee
function carHeld(c){
  const p = c.pos; if (!p) return false;
  if (p.axis === 'b'){
    const d = (RAIL_B - p.b) * p.dir;
    if (d > 13 && d < 20){ const cr = crossingAt(p.a); if (cr && cr.closed) return true; }
  }
  for (const q of CARS){
    if (q === c || !q.pos || !q.held || q.pos.axis !== p.axis || q.pos.dir !== p.dir) continue;
    const lat = p.axis === 'a' ? q.pos.b - p.b : q.pos.a - p.a; if (Math.abs(lat) > 1.2) continue;
    const ahead = (p.axis === 'a' ? q.pos.a - p.a : q.pos.b - p.b) * p.dir;
    if (ahead > 0 && ahead < 14) return true;
  }
  return false;
}
function stepCars(dt){
  for (const c of CARS) c.held = carHeld(c);
  for (const c of CARS){
    if (!NB.get(c.n0) || !NODES[c.n1]) continue;
    if (c.held && c.pos) continue;
    const A = NODES[c.n0], B = NODES[c.n1], len = Math.hypot(B.a - A.a, B.b - A.b) || 1;
    c.s += c.v * dt / len;
    let guard = 0;
    while (c.s >= 1 && guard++ < 8){
      c.s -= 1; c.hops++;
      const nb = NB.get(c.n1).filter(n => n !== c.n0);
      const choice = nb.length ? nb[Math.floor(hash2(c.id * 97 + c.hops, 31) * nb.length)] : c.n0;
      c.n0 = c.n1; c.n1 = choice;
    }
    const P = NODES[c.n0], Q = NODES[c.n1];
    const da = Math.sign(Q.a - P.a), db = Math.sign(Q.b - P.b);
    const a = P.a + (Q.a - P.a) * c.s + db * 3, b = P.b + (Q.b - P.b) * c.s - da * 3;
    c.pos = { a, b, axis: da ? 'a' : 'b', dir: da || db || 1 };
    Object.assign(c.light, { a: a + da * 6, b: b + db * 6, da, db });
  }
}

/* ================= les chats ================= */
function walkA(i, j, side){ const a = A_LINES[i] + side * 7.5; return [[a, B_LINES[j] + 12], [a, B_LINES[j + 1] - 12]]; }
function walkB(i, j, side){ const b = B_LINES[j] + side * 7.5; return [[A_LINES[i] + 12, b], [A_LINES[i + 1] - 12, b]]; }
const CATS = [
  { name:'Minou Lavigne', job:'Maire du secteur USC', side:'usc', col:'white', look:'fedora', outfit:'veste', path: walkB(6, 5, 1), sp: 5,
    traits:'solennel mais gourmand, fait des discours pour tout, très fier de la démocratie des croquettes et de sa nouvelle télévision',
    hello:'Bonsoir, bonsoir ! Minou Lavigne, maire du secteur USC. Bienvenue du bon côté de la laine, mon ami !',
    facts:['J’ai inauguré le diner trois fois. Par erreur, mais avec beaucoup de conviction.', 'On a la télévision à la mairie maintenant. En noir et blanc, comme tout le monde.', 'Le Général Moustachenko ? Charmant. On se salue de loin, avec des jumelles.'] },
  { name:'Caramel', job:'Serveuse au diner', side:'usc', col:'tabby', look:'coiffe', outfit:'robe', path: walkB(6, 7, -1), sp: 6,
    traits:'pétillante, parle vite, connaît tous les ragots, adore le rock’n’roll, appelle tout le monde chou',
    hello:'Hé, salut chou ! Moi c’est Caramel, du diner. Un milkshake à la sardine ? C’est la spécialité de la maison !',
    facts:['Le juke-box ne passe que du rock et du twist. Personne ne s’en plaint.', 'Mistigri vient tous les soirs, toujours la même tarte au thon.', 'Il paraît qu’en CCR la file d’attente du Gastronom fait trois fois le tour du pâté de maisons.'] },
  { name:'Mistigri', job:'Projectionniste du cinéma', side:'usc', col:'black', look:'beret', outfit:'pull', path: walkA(6, 6, -1), sp: 4,
    traits:'cinéphile rêveur, cite des films de science-fiction en noir et blanc, un peu dramatique',
    hello:'Bonsoir, étranger. Mistigri, projectionniste. Ce soir : L’Invasion des souris de Mars. Séance à vingt et une heures.',
    facts:['La bobine a brûlé mardi. J’ai raconté la fin moi-même. Ils ont applaudi.', 'Au cinéma, les chats noirs ont les meilleures places. On ne nous voit pas dans le noir.', 'Un jour je tournerai un film sur le Rideau de Laine. Un drame. Avec des moustaches.'] },
  { name:'Pompon', job:'Garagiste de la station-service', side:'usc', col:'gray', look:'casquette', outfit:'salopette', path: walkB(5, 7, 1), sp: 5,
    traits:'bourru mais généreux, passionné de moteurs, de chromes et d’ailerons, sent un peu l’essence',
    hello:'Salut, salut. Pompon, de la station. Si ta bagnole tousse, tu me l’amènes, je lui parle.',
    facts:['Les ailerons, ça ne sert à rien. C’est pour ça que c’est beau.', 'Les voitures d’en face sont carrées comme des boîtes à croquettes. Mais elles démarrent.', 'Les voitures ne vont jamais sur l’eau ici. J’ai essayé une fois, ça ne marche pas.'] },
  { name:'Zazou', job:'Fan de rock’n’roll', side:'usc', col:'white', look:'banane', outfit:'blouson', path: walkB(6, 6, -1), sp: 6,
    traits:'jeune, énergique, dit « c’est dans le vent », banane gominée, rêve de passer à la radio',
    hello:'Salut les copains ! Zazou ! T’as entendu le dernier disque ? C’est complètement dans le vent !',
    facts:['J’ai un transistor. Je capte même Radio Miaou-Scou, mais ils ne passent que des marches militaires.', 'Au bal du samedi, je danse le twist jusqu’à minuit pile.', 'Un jour je jouerai de la guitare sur le mur. Des deux côtés. La paix par le rock !'] },
  { name:'Praline', job:'Standardiste au central téléphonique', side:'usc', col:'gray', look:'lunettes', outfit:'robe', path: walkA(5, 5, 1), sp: 4,
    traits:'polie, curieuse, relie tout le monde, dit « ne quittez pas », adore écouter les lignes',
    hello:'Allô, bonsoir ! Praline, du central. Ne quittez pas, je vous passe... ah non, vous êtes là.',
    facts:['Il y a un téléphone rouge entre la mairie et le Palais du Peuple. Il sonne surtout pour commander des pizzas.', 'Quatorze téléphones de ce côté. Je les reconnais tous à leur sonnerie.', 'Je n’écoute jamais les conversations. Enfin, presque jamais.'] },
  { name:'Bijou', job:'Couturière, reine du bal du samedi', side:'usc', col:'white', look:'noeud', outfit:'pois', path: walkB(5, 4, -1), sp: 4,
    traits:'élégante, romantique, parle mode, robes à pois et jupons, un peu coquette',
    hello:'Bonsoir, bonsoir ! Bijou, couturière. Jolie tenue... mais un nœud papillon t’irait à merveille.',
    facts:['Les robes à pois, c’est la folie cette saison.', 'Natacha, en face, m’a demandé un patron de robe par-dessus le mur. Je lui ai lancé dans une boîte de sardines.', 'Au bal, c’est Réglisse qui joue. Tout le monde danse.'] },
  { name:'Réglisse', job:'Trompettiste de jazz', side:'usc', col:'black', look:'noires', outfit:'veste', path: walkA(5, 7, -1), sp: 5,
    traits:'cool, parle en jargon de jazz, détendu, dit souvent « mon pote »',
    hello:'Yeah, bonsoir mon pote. Réglisse, trompette. Le kiosque swingue le dimanche, faut pas rater ça.',
    facts:['Le jazz, c’est comme ronronner, mais en cuivre.', 'Une nuit j’ai joué près du mur. De l’autre côté, quelqu’un tapait du pied.', 'Quand la lune est pleine, je joue pour les mouettes du port.'] },
  { name:'Sergent Buddy Moustaches', job:'Police militaire, Checkpoint Minou', side:'usc', col:'tabby', look:'casque', outfit:'uniforme-usc', fixed: [WALL_A - 10, CHECK_B - 6.5], sp: 0,
    traits:'carré, réglementaire, mâche du chewing-gum, au fond très sentimental, parle avec des mots d’anglais',
    hello:'Halte ! Checkpoint Minou, secteur USC. Sergent Buddy Moustaches. Papiers, s’il vous plaît. Ou un sourire, ça marche aussi.',
    facts:['Mon collègue d’en face, le Général, je lui fais coucou tous les matins. Il ne répond jamais. Mais je vois sa moustache bouger.', 'La barrière monte et descend. C’est le seul sport qu’on fait ici.', 'Le règlement dit : aucun chat ne passe sans raison. Le règlement n’a jamais vu un chaton pleurer.'] },
  { name:'Filou', job:'Livreur de journaux en scooter', side:'usc', col:'tabby', look:'gavroche', outfit:'pull', path: walkB(4, 5, 1), sp: 7,
    traits:'rapide, farceur, toujours pressé, connaît toutes les rues du secteur',
    hello:'Salut ! Filou, je livre la Gazette de Kutty. Pas le temps, pas le temps ! Enfin, deux minutes.',
    facts:['La une de demain : « Le satellite Spoutchat a fait bip au-dessus du diner ».', 'Je fais le tour du secteur en neuf minutes. Record officieux.', 'Si on construit un nouveau bâtiment, je suis le premier au courant.'] },
  { name:'Moustache', job:'Gardien du phare', side:'neutre', col:'black', look:'marin', outfit:'caban', pipe: true, fixed: [LH.a + 10, LH.b + 9], sp: 0, sit: true,
    traits:'taiseux, sage, parle de la mer et des bateaux, humour pince-sans-rire, neutre comme la Suisse',
    hello:'Hm. Bonsoir. Moustache, gardien du phare. Le phare éclaire les deux côtés. La mer, elle, ne connaît pas de mur.',
    facts:['Seize secondes pour un tour. Deux éclats. Les marins le savent par cœur.', 'Je monte les cent douze marches chaque soir. Les pattes s’en souviennent.', 'Le phare, on ne le peint ni en rouge ni en bleu. Je le peins en rayures. Tout le monde est content.'] },
  { name:'Tonton Gribouille', job:'Pêcheur', side:'neutre', col:'tabby', look:'bonnet', outfit:'mariniere', fixed: [LH.a, LH.b + 35], sp: 0, sit: true,
    traits:'conteur, exagère toutes ses histoires de poissons, rit fort, vend ses sardines aux deux camps',
    hello:'Ohé ! Tonton Gribouille, pêcheur. Assieds-toi, je vais te raconter la sardine géante.',
    facts:['La sardine faisait deux mètres. Bon, deux centimètres. Mais elle était costaude.', 'Je vends aux deux camps. Les sardines, elles, ne votent pas.', 'Quand le phare balaie l’eau, les poissons remontent. Enfin, c’est ce que je dis.'] },
  { name:'Général Moustachenko', job:'Commandant du Checkpoint, CCR', side:'ccp', col:'gray', look:'kepi', outfit:'uniforme-ccp', fixed: [WALL_A + 10, CHECK_B + 7], sp: 0,
    traits:'très sérieux en apparence, adore les médailles et les défilés, cache un faible pour le rock’n’roll d’en face, parle de plans quinquennaux',
    hello:'Halte, camarade ! Général Moustachenko, Cats Communist Republik. Ici commence le paradis des travailleurs. Et des siestes.',
    facts:['J’ai quarante-deux médailles. Dont une pour avoir compté mes médailles.', 'Le plan quinquennal de croquettes est dépassé de trois cents pour cent. Sur le papier.', 'Le sergent d’en face me fait coucou. Je ne réponds pas. Mais ma moustache, elle, n’obéit pas toujours.'] },
  { name:'Babouchka Grisetova', job:'Vendeuse au Gastronom', side:'ccp', col:'gray', look:'foulard', outfit:'tablier', path: walkB(8, 7, -1), sp: 3,
    traits:'maternelle, bourrue, compte tout, gère la file d’attente d’une patte de fer, donne des conseils de soupe',
    hello:'Ah, un visiteur ! Babouchka Grisetova, du Gastronom. Tu as mangé ? Non ? Fais la queue, comme tout le monde.',
    facts:['Arrivage de sardines prévu en 1963. On commence déjà la file.', 'Ma soupe de chou au poisson guérit tout. Même le capitalisme.', 'Le rayon « luxe » du Gastronom, c’est une boîte de pâtée. Elle est très bien exposée.'] },
  { name:'Igor Ronronov', job:'Ouvrier modèle de l’usine n° 7', side:'ccp', col:'tabby', look:'ushanka', outfit:'bleu', path: walkA(10, 7, -1), sp: 4,
    traits:'costaud, fier, enthousiaste, parle en chiffres de production, héros du travail un peu naïf',
    hello:'Salut, camarade ! Igor Ronronov, ouvrier modèle. Cette nuit j’ai tricoté cent deux pelotes de laine pour la patrie !',
    facts:['Mon record : cent deux pelotes en une nuit. Médaille d’or du travail.', 'À l’usine n° 7 on fabrique des tracteurs. Et des tracteurs pour fabriquer des tracteurs.', 'Le Rideau de Laine ? C’est nous qui l’avons tricoté. Très solide. Un peu qui gratte.'] },
  { name:'Natacha Miaoulova', job:'Cosmonaute en formation', side:'ccp', col:'white', look:'cosmo', outfit:'combi', path: walkA(11, 7, -1), sp: 5,
    traits:'rêveuse, courageuse, passionnée d’étoiles et de fusées, veut être le premier chat en orbite',
    hello:'Privet ! Natacha Miaoulova, cosmonaute en formation. Tu as vu passer Spoutchat ? Il fait bip, bip. C’est mon ami.',
    facts:['Un jour je serai le premier chat sur la Lune. Ou le deuxième, si le chien passe avant.', 'Dans la centrifugeuse, je tourne comme une pelote. J’adore.', 'Vue de l’espace, l’île est toute petite. Et le mur ne se voit même pas.'] },
  { name:'Boris Pattov', job:'Grand maître d’échecs', side:'ccp', col:'black', look:'lunettes', outfit:'costume', path: walkB(8, 5, 1), sp: 3,
    traits:'calme, calculateur, parle en coups d’échecs, pense toujours douze coups à l’avance, humour sec',
    hello:'Bonsoir. Boris Pattov, grand maître. Je savais que tu viendrais. Je l’avais prévu il y a douze coups.',
    facts:['Aux échecs, le roi est lent et la dame fait tout. Comme au Palais du Peuple.', 'J’ai proposé une partie au maire d’en face. Par pigeon voyageur. Le pigeon a mangé le cavalier.', 'La vie est une partie. Moi je joue les noirs. Évidemment.'] },
  { name:'Olga Pravdacha', job:'Crieuse de la Pravdachat', side:'ccp', col:'white', look:'gavroche', outfit:'pull', path: walkB(7, 6, 1), sp: 6,
    traits:'énergique, voix forte, annonce toutes les nouvelles comme des victoires, ne dit jamais rien de négatif',
    hello:'Demandez la Pravdachat ! Olga, crieuse officielle. Grande nouvelle : tout va très bien, comme d’habitude !',
    facts:['Titre du jour : « Record battu ». On ne précise pas lequel, c’est plus simple.', 'La météo est toujours ensoleillée dans la Pravdachat. Même la nuit.', 'J’aimerais lire la Gazette d’en face. Pour la corriger, évidemment.'] },
  { name:'Shérif Tom Griffon', job:'Shérif du secteur USC', side:'usc', col:'gray', look:'cowboy', outfit:'gilet-sherif', path: walkA(4, 6, 1), sp: 4,
    traits:'lent, flegmatique, parle comme dans un western, mâchonne une brindille, très attaché à la loi et à la sieste',
    hello:'Salut, étranger. Tom Griffon, shérif. Dans cette ville, y’a deux règles : on ne court pas après les souris, et on ne court pas tout court.',
    facts:['Mon cheval s’appelle Moteur. C’est une Cadillatte. Elle est plus rapide qu’un cheval.', 'La dernière fois qu’il y a eu un duel ici, c’était pour la dernière part de tarte au thon.', 'Le mur, je le surveille de loin. De très loin. Depuis mon hamac.'] },
  { name:'Madame Minette', job:'Reine des réunions de voisinage', side:'usc', col:'white', look:'bigoudis', outfit:'pois', path: walkB(4, 7, -1), sp: 3,
    traits:'bavarde, organisée, invite tout le monde à des réunions de boîtes hermétiques, adore son frigidaire et son aspirateur neuf',
    hello:'Oh, un invité ! Madame Minette. Vous tombez bien, j’organise une réunion de boîtes hermétiques jeudi. Il y aura du cake à la sardine.',
    facts:['Mon nouvel aspirateur fait un bruit de fusée. Le chat du voisin a déménagé.', 'Une cuisine moderne, c’est une cuisine où l’on ne cuisine plus. Tout est en boîte.', 'Je mets mes bigoudis tous les soirs. Pour le bal, pour la télé, pour le facteur.'] },
  { name:'Docteur Hector Propulse', job:'Ingénieur de la base spatiale USC', side:'usc', col:'black', look:'lunettes', outfit:'blouse', path: walkA(3, 6, 1), sp: 4,
    traits:'distrait, génial, parle en calculs et en comptes à rebours, obsédé par l’idée de battre le Cosmodrome d’en face',
    hello:'Dix, neuf, huit... ah, pardon, bonsoir. Docteur Hector Propulse. Je compte à rebours, c’est plus fort que moi.',
    facts:['Notre fusée est prête. Il manque juste le carburant. Et la fusée.', 'En face, ils ont un satellite qui fait bip. Nous, on travaille sur un satellite qui fait miaou.', 'La gravité, c’est ce qui fait tomber les tartines côté beurre. Et les chats sur leurs pattes.'] },
  { name:'Lulu Strike', job:'Championne de bowling', side:'usc', col:'tabby', look:'bandeau', outfit:'bowling', path: walkB(5, 4, 1), sp: 6,
    traits:'sportive, compétitive, énergique, parle de strikes et de quilles, lance des défis à tout le monde',
    hello:'Hé ! Lulu Strike, trois fois championne du bowling. Tu joues ? Non ? Tu vas apprendre, je te fais une démo.',
    facts:['Un strike, c’est comme renverser un verre sur une table. Mais c’est autorisé.', 'Ma boule s’appelle Pelote. Elle a son propre casier.', 'J’ai défié l’athlète d’en face par haut-parleur. Elle a répondu en faisant cent pompes.'] },
  { name:'Agent X', job:'Personne ne sait vraiment', side:'neutre', col:'siamois', look:'espion', outfit:'trench', path: walkA(6, 4, 1), sp: 3,
    traits:'mystérieux, parle à voix basse et par énigmes, change de sujet dès qu’on parle de lui, travaille peut-être pour les deux camps',
    hello:'Psst. Ne vous retournez pas. Appelez-moi X. Nous ne nous sommes jamais parlé.',
    facts:['Le phare cligne deux fois. C’est pour les bateaux. Officiellement.', 'J’ai un appareil photo dans mon collier et un autre dans mon autre collier.', 'La vérité ? Elle est des deux côtés du mur. Surtout du côté des croquettes.'] },
  { name:'Grigori Pompidov', job:'Clown du Cirque du Peuple', side:'ccp', col:'white', look:'haut-de-forme', outfit:'fraise', path: walkB(9, 6, 1), sp: 4,
    traits:'drôle, mélancolique, fait des tours de magie ratés, raconte des blagues approuvées par le comité des blagues',
    hello:'Bonsoir, camarade ! Grigori Pompidov, clown du Cirque du Peuple. Voulez-vous voir un tour ? Il est approuvé par le comité.',
    facts:['Ma blague préférée a été validée en 1958. Je la raconte depuis. Tous les soirs.', 'Je sors un lapin de mon chapeau. Enfin, une pelote. Le lapin est en rupture.', 'Au cirque, l’ours fait du vélo et le public applaudit selon le plan.'] },
  { name:'Svetlana Sprintova', job:'Athlète olympique', side:'ccp', col:'gray', look:'bandeau', outfit:'survet', path: walkA(9, 5, 1), sp: 7,
    traits:'rapide, disciplinée, franche, compte ses foulées, veut battre tous les records du monde avant le petit-déjeuner',
    hello:'Privet ! Svetlana Sprintova, athlète du peuple. J’ai fait le tour de l’île deux fois pendant que tu me regardais.',
    facts:['Mon entraîneur est un chronomètre. Il ne parle jamais, mais il juge.', 'La championne de bowling d’en face m’a défiée. Je lui ai répondu en courant.', 'Je mange des croquettes protéinées du plan quinquennal. Elles ont un goût de médaille.'] },
  { name:'Ivan Bétonov', job:'Contremaître du grand chantier', side:'ccp', col:'tabby', look:'chantier', outfit:'bleu', path: walkB(9, 4, -1), sp: 4,
    traits:'bourru, fier de son béton, rêve de construire des immeubles jusqu’au ciel, parle en mètres cubes',
    hello:'Salut, camarade ! Ivan Bétonov, contremaître. Tu vois ces immeubles ? Tous pareils. C’est ça, la perfection.',
    facts:['Un immeuble par semaine. Si on oublie les fenêtres, deux.', 'Le béton, c’est comme la soupe de Babouchka : épais et éternel.', 'Si tu construis une route, préviens-moi. J’adore les routes. Elles sont plates comme mes blagues.'] },
  { name:'Anatoli Bortchov', job:'Cuisinier de la cantine du peuple', side:'ccp', col:'gray', look:'toque', outfit:'tablier', path: walkB(8, 6, -1), sp: 3,
    traits:'jovial, généreux, parle de soupe, de betteraves et de louches, nourrit tout le monde même ceux qui n’ont pas faim',
    hello:'Ah ! Un estomac vide ! Anatoli Bortchov, cantine du peuple. Aujourd’hui : soupe. Demain : soupe. C’est le plan.',
    facts:['Ma soupe de betterave est rouge. Comme tout le reste, remarque.', 'Babouchka dit que sa soupe est meilleure. Nous réglerons ça au prochain congrès.', 'Le secret d’une bonne cantine : une grande louche et beaucoup de patience.'] }
];
CATS.forEach((c, k) => { c.id = k; c.paused = false; c.t0 = hash2(k, 77) * 50; });

function catPos(c, t){
  if (c.fixed) return { a: c.fixed[0], b: c.fixed[1], da: 0, db: 0, moving: false };
  if (c.paused && c.frozen) return c.frozen;
  const [p0, p1] = c.path;
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const per = 2 * len / c.sp, ph = (((t + c.t0) / per) % 1);
  const f = ph < .5 ? ph * 2 : 2 - ph * 2, fwd = ph < .5;
  const a = p0[0] + (p1[0] - p0[0]) * f, b = p0[1] + (p1[1] - p0[1]) * f;
  const da = (p1[0] - p0[0]) * (fwd ? 1 : -1), db = (p1[1] - p0[1]) * (fwd ? 1 : -1);
  return { a, b, da, db, moving: true };
}
const HATTED = ['ushanka', 'kepi', 'casque', 'fedora', 'foulard', 'cosmo', 'marin', 'bonnet', 'casquette', 'gavroche', 'beret', 'cowboy', 'chantier', 'toque', 'haut-de-forme', 'espion', 'bigoudis'];
const catMat = (c) => c.col === 'tabby' ? M.CAT_OR : c.col === 'siamois' ? M.CAT_SIAM : c.col === 'gray' ? M.CAT_GRAY : c.col === 'black' ? M.CAT_BLACK : M.CAT;
// chat sur la carte : petit sprite, avec un bout de chapeau
function catPixels(c, fr, f, lit){
  const px = [];
  const S = (x, y, part) => px.push([x * f, y, part]);
  const hatted = HATTED.includes(c.look);
  if (!hatted){ S(2, -6, 'ear'); S(4, -6, 'ear'); }
  for (let x = 2; x <= 4; x++){ S(x, -5, 'head'); S(x, -4, 'head'); }
  if (c.sit){
    for (let x = -1; x <= 3; x++){ S(x, -3, 'body'); S(x, -2, 'body'); S(x, -1, 'body'); }
    S(-2, -1, 'tail'); S(-3, -1, 'tail'); S(-4, -2, 'tail');
  } else {
    for (let x = -3; x <= 3; x++){ S(x, -3, 'body'); S(x, -2, 'body'); }
    S(-4, -3, 'tail'); S(-5, -4, 'tail'); S(-5, -5, 'tail');
    const legs = fr === 0 ? [-3, 1, 3] : fr === 1 ? [-2, 0, 2] : [-3, -1, 1, 3];
    for (const x of legs) S(x, -1, 'leg');
  }
  if (hatted){
    const L = c.look;
    if (L === 'ushanka' || L === 'cosmo' || L === 'fedora' || L === 'espion' || L === 'cowboy'){ for (let x = 1; x <= 5; x++) S(x, -6, 'hat'); for (let x = 2; x <= 4; x++) S(x, -7, 'hat'); if (L === 'cowboy'){ S(0, -7, 'hat'); S(6, -7, 'hat'); } }
    else if (L === 'kepi'){ for (let x = 2; x <= 5; x++) S(x, -6, 'hat'); for (let x = 1; x <= 5; x++) S(x, -7, 'hat'); S(6, -6, 'hat'); }
    else if (L === 'foulard'){ for (let x = 1; x <= 5; x++) S(x, -6, 'hat'); S(1, -5, 'hat'); S(1, -4, 'hat'); }
    else if (L === 'toque' || L === 'haut-de-forme'){ for (let x = 2; x <= 4; x++){ S(x, -6, 'hat'); S(x, -7, 'hat'); S(x, -8, 'hat'); } if (L === 'haut-de-forme'){ S(1, -6, 'hat'); S(5, -6, 'hat'); } }
    else if (L === 'bigoudis'){ S(2, -6, 'hat'); S(4, -6, 'hat'); S(3, -7, 'hat'); }
    else { for (let x = 2; x <= 4; x++) S(x, -6, 'hat'); S(5, -6, 'hat'); }
  }
  const out = [];
  const hatC = (c.col === 'black' || c.col === 'gray') ? 1 : 0;
  for (const [x, y, part] of px){
    let v;
    if (part === 'hat') v = (c.look === 'toque' || c.look === 'chantier') ? 1 : hatC;
    else if (c.col === 'white') v = 1;
    else if (c.col === 'siamois') v = (part === 'ear' || part === 'tail' || (part === 'head' && y === -4)) ? 0 : 1;
    else if (c.col === 'gray') v = part === 'ear' ? 1 : (bay(x, y) < 8 ? 1 : 0);
    else if (c.col === 'tabby') v = part === 'body' ? ((x & 1) ? 1 : 0) : 1;
    else v = (part === 'ear' || (part === 'head' && y === -5) || (part === 'body' && y === -3 && (x & 1))) ? 1 : 0;
    out.push([x, y, v]);
  }
  const ex = 4 * f;
  if (lit){ out.push([ex, -5, 1]); out.push([ex - f, -5, (c.col === 'white' || c.col === 'siamois') ? 0 : 1]); }
  else out.push([ex, -5, 0]);
  return out;
}

/* ================= la ville de depart : USC a l'ouest, CCR a l'est ================= */
const SPECIAL = [
  // USC
  ['mairie', -127, -14.5], ['diner', -73, 65.5], ['cinema', -127, 34.5], ['drivein', -307, 114.5], ['motel', -253, -94.5],
  ['bowling', -163, -94.5], ['station', -217, 65.5], ['epicerie', -37, 114.5], ['panneau', -37, -14.5], ['statue', -73, -94.5],
  ['kiosque', -163, 145.5], ['chateau', -307, -45.5], ['radio', -253, 194.5], ['fusee', -343, 34.5], ['parc', -127, -45.5],
  ['parc', -217, -174.5], ['fontaine', -163, 34.5], ['cinema', -253, -14.5], ['diner', -307, -125.5], ['motel', -217, 145.5],
  // CCR
  ['peuple', 107, -14.5], ['statue', 53, -14.5], ['panneau', 17, 65.5], ['usine', 233, 114.5], ['usine', 287, -45.5],
  ['epicerie', 107, 65.5], ['cirque', 197, 34.5], ['fusee', 323, 145.5], ['radio', 233, -125.5], ['chateau', 197, -174.5],
  ['fontaine', 143, 34.5], ['parc', 143, -94.5], ['motel', 197, -45.5], ['epicerie', 287, 65.5], ['statue', 197, 114.5],
  ['panneau', 233, 194.5], ['parc', 53, 145.5],
  // nouveaux quartiers
  ['artdeco', -73, 34.5], ['artdeco', -163, -14.5], ['supermarche', -253, 65.5], ['stade', -397, 114.5], ['metro', -73, -45.5], ['metro', -217, -14.5],
  ['kolkhoze', -433, -94.5], ['grandmagasin', -127, 114.5], ['kolkhoze', -397, 225.5], ['parc', -433, 34.5], ['diner', -397, -14.5], ['motel', -433, 145.5],
  ['fontaine', 143, -14.5], ['stalinien', 377, -14.5], ['stalinien', 233, 34.5], ['kolkhoze', 377, -94.5], ['kolkhoze', 413, 194.5], ['bulbes', 143, 114.5], ['grandmagasin', 53, 34.5],
  ['metro', 107, -45.5], ['tribune', 143, -45.5], ['gare', -73, -365.5], ['gare', 53, -365.5], ['metro', 287, 34.5], ['stade', 377, 34.5], ['bulbes', 323, -125.5], ['stalinien', 287, 225.5], ['usine', 413, 114.5], ['parc', 377, 145.5]
];
let INITIAL = {};
function initialLayout(){
  const used = new Set();
  for (const [type, a, b] of SPECIAL){ const l = nearestLot(a, b); if (l && !used.has(l.id) && Math.hypot(l.ca - a, l.cb - b) < 40){ l.type = type; used.add(l.id); } }
  LOTS.forEach(l => {
    if (used.has(l.id)) return;
    const r = hash2(Math.round(l.ca), Math.round(l.cb) + 7);
    if (l.side === 'usc') l.type = r < .56 ? 'maison' : r < .66 ? 'parc' : '';
    else l.type = r < .52 ? 'immeuble' : r < .62 ? 'maison' : r < .7 ? 'parc' : '';
  });
  INITIAL = {}; for (const l of LOTS) INITIAL[l.id] = l.type;
}

/* ================= reconstruction des objets ================= */
let BUILT = [], STATIC_PARTS = [], DECALS = [], LIGHTS_STATIC = [];
const USC_MATS = [M.USC, M.USC2, M.USC3, M.USC4, M.USC5], CCP_MATS = [M.CCP, M.CCP2, M.CCP3];
const BUILD_MAT = { diner: M.CHROME, usine: M.BRICK, peuple: M.SANDSTONE, mairie: M.SANDSTONE, cinema: M.BRICK, station: M.USC5, bowling: M.USC5 };
const SHADOW_EXTRA = {
  chateau: (l) => circ(l.ca, l.cb, 8, 31, 12).concat(circ(l.ca, l.cb, 6, 0, 4)),
  kiosque: (l) => circ(l.ca, l.cb, 11, 12, 12).concat(circ(l.ca, l.cb, 9, 0, 8)),
  cirque: (l) => circ(l.ca, l.cb - 2, 12, 7, 12).concat([l.ca, l.cb - 2, 27]),
  radio: (l) => circ(l.ca - 5, l.cb - 3, 6, 0, 4).concat(circ(l.ca - 5, l.cb - 3, 1, 57, 4)),
  fusee: (l) => circ(l.ca - 2, l.cb, 2.2, 36, 6).concat(circ(l.ca - 2, l.cb, 2.2, 2, 6), circ(l.ca + 6.5, l.cb - .5, 1.6, 36, 4)),
  statue: (l) => circ(l.ca, l.cb, 1.6, 28, 6),
  panneau: (l) => [l.ca - 7, l.cb, 19, l.ca + 7, l.cb, 19, l.ca - 7, l.cb, 0, l.ca + 7, l.cb, 0, l.ca - 7, l.cb + .4, 19, l.ca + 7, l.cb + .4, 19],
  fontaine: (l) => circ(l.ca, l.cb, 8, 2, 10)
};
let TOWN_VER = 0, TRIBUNE_OK = true;
function rebuildTown(){
  TOWN_VER++;
  BUILT = []; STATIC_PARTS = []; DECALS = []; LIGHTS_STATIC = [];
  for (const l of LOTS){
    if (!l.type || !TYPES[l.type]) continue;
    const r = TYPES[l.type].build(l, seedOf(l));
    BUILT.push({ lot: l, r });
    const sd = seedOf(l), bm = BUILD_MAT[l.type] || (l.side === 'ccp' ? CCP_MATS[sd % 3] : USC_MATS[sd % 5]);
    for (const p of r.parts){ if (p.m == null) p.m = bm; p.side = l.side; p.lot = l; }
    if (r.parts[0]){ const sh = (SHADOW_EXTRA[l.type] ? SHADOW_EXTRA[l.type](l) : []).concat(r.shadowPts || []); if (sh.length) r.parts[0].shadow = sh; }
    STATIC_PARTS.push(...r.parts); LIGHTS_STATIC.push(...(r.lights || [])); if (r.decals) DECALS.push(...r.decals.map(d => (t) => { if (l.buildT && t < l.buildT + BUILD_DUR) return; CUR_SIDE = l.side; CUR = l.side === 'ccp' ? M.CCP : M.USC; d(t); }));
  }
  for (const [a, b] of LAMP_POS){ if (!wallUp() && Math.abs(a - WALL_A) < 14) continue; const p = part(a, b, 0, () => { CUR = M.METAL; blitAt(LAMP_SPR, a, b, 0); }); p.shadow = circ(a, b, .25, 0, 4).concat(circ(a + 1, b, .3, 15, 4)); STATIC_PARTS.push(p); LIGHTS_STATIC.push(Lc(a, b, 13, 1.25)); }
  for (const [a, b, r] of TREES){ if (typeAt(a, b) !== T_GRASS) continue; const deco = hash2(a, b) < .45; const p = part(a, b, 0, (t) => { CUR = M.TREE; blitAt(treeSpr(r), a, b, 0); if (deco && XMAS_ON) drawTreeLights(a, b, r, t); }); p.shadow = circ(a, b, r * .4, 0, 6).concat(circ(a, b, r * .9, r + 3, 8)); STATIC_PARTS.push(p); }
  for (const p of PROPS){ if (typeAt(p.a, p.b) !== T_WALK) continue; STATIC_PARTS.push(part(p.a, p.b, 0, (t) => drawProp(p, t))); }
  if (wallUp()){
    for (const w of WALL_SEGS) STATIC_PARTS.push(part(WALL_A, (w.s0 + w.s1) / 2, 0, () => { if (wallReveal((w.s0 + w.s1) / 2)) drawWallSeg(w); }));
    for (const [a, b] of TRAPS) STATIC_PARTS.push(part(a, b, 0, () => { if (!wallReveal(b)) return; CUR = M.METAL; blitAt(TRAP_SPR, a, b, 0); }));
    for (const tw of TOWERS) STATIC_PARTS.push(part(tw.a, tw.b, 0, (t) => { if (wallReveal(tw.b)) drawTower(tw, t); }));
    for (const br of BARRIERS) STATIC_PARTS.push(part(br.a, CHECK_B, 0, (t) => drawBarrier(br, t)));
    for (const bo of BOOTHS) STATIC_PARTS.push(part((bo.a0 + bo.a1) / 2, (bo.b0 + bo.b1) / 2, 0, (t) => drawBooth(bo, t)));
    for (const sd of ['usc', 'ccp']){ const [a, b] = SECTOR_SIGNS[sd]; STATIC_PARTS.push(part(a, b, 0, () => drawSectorSign(sd))); }
  }
  TRIBUNE_OK = LOTS.some(l => l.type === 'tribune' && l.side === 'ccp');
  { const p = part(LH.a, LH.b, 0, () => drawLighthouse()); p.shadow = circ(LH.a, LH.b, 7, 0, 10).concat(circ(LH.a, LH.b, 5, 46, 10)); STATIC_PARTS.push(p); }
  MOORED.forEach((m, k) => STATIC_PARTS.push(part(m[0], m[1], 0, (t) => drawMoored(k, t))));
  { const tp = transitParts(); STATIC_PARTS.push(...tp.parts); LIGHTS_STATIC.push(...tp.lights); }
  for (const ap of AIRPORTS){ STATIC_PARTS.push(...airportParts(ap)); DECALS.push(airportDecal(ap)); const T = ap.terminal; LIGHTS_STATIC.push(Lc((T[0] + T[1]) / 2, T[2] - 6, 14, 1.3), Lc((T[0] + T[1]) / 2, T[3] + 6, 12, 1.2)); }
  for (const f of HOOKS.town) f(STATIC_PARTS, LIGHTS_STATIC);
  for (const p of STATIC_PARTS){ if (p.m == null) p.m = M.METAL; if (!p.side) p.side = sideOf(p.a); }
  if (wallUp()) LIGHTS_STATIC.push(Lc(WALL_A, CHECK_B, 14, 1.2));
  if (COLOR) buildShadows();
}
function buildShadows(){
  SHADOWS = [];
  for (const p of STATIC_PARTS){
    if (p.lot && p.lot.buildT && NOW_T < p.lot.buildT + BUILD_DUR) continue;
    CAPTURE = [];
    try { p.draw(0); } catch (_) {}
    const pts = CAPTURE; CAPTURE = null;
    if (p.shadow) for (const v of p.shadow) pts.push(v);
    if (pts.length < 9) continue;
    const h = shadowHull(pts); if (h) SHADOWS.push(h);
  }
}
