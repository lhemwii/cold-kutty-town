import { SH } from './00-shared.js';
import { COLOR, HOOKS, M, MOON, PC, PS, SC, SUN, TAU, TX, TY, bay, blitAt, fb, fput, hash2, prj, setView } from './01-core.js';
import { GA0, GB0, GH, GSC, GW, T_BEACH, T_ROCK, T_SEA, baseAt, landDAt, seaDAt } from './02-ground.js';
import { LAMP_SPR, Lc, part } from './03-buildings-base.js';
import { TYPES, seedOf } from './04-types.js';
import { DIR_V } from './06-types-more.js';
import { LAMP_POS, VEST, drawTower, drawWallPiece, peaksIn } from './07-world.js';
import { sideAt } from './08-territory.js';
import { RW, rectRoadDist } from './09-roads.js';
/* ================= la ville : batiments poses librement, chats qui arrivent avec eux ================= */
// un batiment : type, camp, emprise au sol (a0..a1, b0..b1), niveau, chantier en cours, direction de la mer pour la cote
SH.BLD = []; export let BLD_ID = 1;
// emprise au sol de chaque type (largeur en a, profondeur en b) ; le reste prend un terrain de 36 x 31
export const FOOT = { statue: [16, 16], fontaine: [32, 32], panneau: [46, 10], drapeau: [18, 16], parc: [32, 28], kiosque: [32, 30], chateau: [18, 18],
  phare: [18, 18], port: [32, 32], pecherie: [28, 28], checkpoint: [22, 18], maison: [28, 26], radio: [30, 28], epicerie: [26, 24], diner: [32, 22] };
export const footOf = (type) => FOOT[type] || [36, 31];
export function makeBuilding(type, side, ca, cb, dir){
  const [fa, fb] = (dir === 1 || dir === 3) && FOOT[type] ? [footOf(type)[1], footOf(type)[0]] : footOf(type);
  const l = { id: BLD_ID++, type, side, ca, cb, a0: ca - fa / 2, a1: ca + fa / 2, b0: cb - fb / 2, b1: cb + fb / 2, lvl: 1, dir: dir || 0, done: false, buildT: 0, bdur: 0, upT: 0, active: true };
  return l;
}
export const bldAt = (a, b) => { for (let k = SH.BLD.length - 1; k >= 0; k--){ const l = SH.BLD[k]; if (a >= l.a0 && a < l.a1 && b >= l.b0 && b < l.b1) return l; } return null; };
// direction de la mer pour un batiment de la cote pose en (ca, cb) : celle ou l'eau est la plus profonde devant
export function coastDir(ca, cb){
  let best = -1, bs = -1;
  for (let d = 0; d < 4; d++){
    const v = DIR_V[d], s1 = seaDAt(ca + v[0] * 24, cb + v[1] * 24), s2 = seaDAt(ca + v[0] * 38, cb + v[1] * 38);
    if (baseAt(ca + v[0] * 24, cb + v[1] * 24) !== T_SEA || s2 < 6) continue;
    const sc = s1 + s2; if (sc > bs){ bs = sc; best = d; }
  }
  return best;
}
// peut-on poser ce batiment ici ? renvoie '' si oui, sinon la raison
export function placeProblem(type, side, ca, cb, dir, free){
  const e = SH.ECO[type]; if (!e) return 'Bâtiment inconnu.';
  const l = makeBuilding(type, side, ca, cb, dir);
  if (l.a0 < GA0 + 4 || l.b0 < GB0 + 4 || l.a1 > GA0 + GW / GSC - 4 || l.b1 > GB0 + GH / GSC - 4) return 'Trop près du bord de la carte.';
  let land = 0, n = 0, bad = '';
  for (let a = l.a0 + 1; a <= l.a1 - 1; a += 4) for (let b = l.b0 + 1; b <= l.b1 - 1; b += 4){
    n++;
    const t = baseAt(a, b);
    if (t === T_SEA) continue;
    land++;
    if (t === T_ROCK) bad = 'Des rochers : choisis un terrain plat.';
    else if (t === T_BEACH && !e.coast && landDAt(a, b) < 5) bad = 'Trop près de l’eau : le sable ne tient pas.';
    if (!free && sideAt(a, b) !== side) return sideAt(a, b) ? 'Ce terrain appartient à l’autre camp.' : 'Ce terrain n’est pas encore à toi : étends ton territoire.';
  }
  if (e.coast){
    if (dir < 0) return 'Ce bâtiment se pose au bord de l’eau, face à la mer.';
    if (land < n * .6) return 'Pas assez de terre ferme ici.';
  } else if (land < n) return 'Pas de construction dans l’eau.';
  if (bad) return bad;
  for (const o of SH.BLD) if (l.a0 < o.a1 + 1 && l.a1 > o.a0 - 1 && l.b0 < o.b1 + 1 && l.b1 > o.b0 - 1) return 'Il y a déjà un bâtiment ici.';
  // les montagnes debordent de la roche : on ne bati pas sous leurs pentes
  let peak = false; peaksIn(l.a0 - 70, l.a1 + 70, l.b0 - 70, l.b1 + 70, (pk) => { const da = Math.max(l.a0 - pk.a, 0, pk.a - l.a1), db = Math.max(l.b0 - pk.b, 0, pk.b - l.b1); if (Math.hypot(da, db) < pk.R * .85) peak = true; });
  if (peak) return 'Une montagne se dresse ici.';
  for (const v of VEST) if (!v.looted && v.a > l.a0 - (v.kind === 'statue' ? 32 : 14) && v.a < l.a1 + 14 && v.b > l.b0 - (v.kind === 'statue' ? 16 : 14) && v.b < l.b1 + 14) return 'Des vestiges catzi sont ici : fouille-les d’abord.';
  for (const r of SH.ROADS) if (rectRoadDist(l, r) < RW + .5) return 'Une route passe ici.';
  for (const w of SH.WALLS){ const m = [(w.pa + w.qa) / 2, (w.pb + w.qb) / 2]; if (m[0] > l.a0 - 6 && m[0] < l.a1 + 6 && m[1] > l.b0 - 6 && m[1] < l.b1 + 6) return 'Le Rideau de Laine passe ici.'; }
  if (type === 'checkpoint' && !SH.WALLS.some(w => Math.hypot((w.pa + w.qa) / 2 - ca, (w.pb + w.qb) / 2 - cb) < 45)) return 'Le Checkpoint se pose à côté d’un Rideau de Laine.';
  if (type === 'qg' && SH.BLD.some(o => o.type === 'qg' && o.side === side)) return 'Un seul QG par camp.';
  return '';
}
// cherche un emplacement libre pres d'un point (pour les debarquements et l'IA)
export function findSpot(type, side, a, b, R, free){
  const e = SH.ECO[type];
  for (let r = 0; r <= R; r += 6){
    const n = Math.max(1, Math.round(r * .5));
    for (let k = 0; k < n; k++){
      const an = k / n * TAU + r * .37, ca = Math.round(a + Math.cos(an) * r), cb = Math.round(b + Math.sin(an) * r);
      const dir = e && e.coast ? coastDir(ca, cb) : 0;
      if (!placeProblem(type, side, ca, cb, dir, free)) return [ca, cb, dir];
    }
  }
  return null;
}

/* ================= les chats qui ont un nom : chacun arrive quand son batiment est construit ================= */
export const CAT_DEFS = [
  { home: 'qg', name:'Minou Lavigne', job:'Maire du secteur USC', side:'usc', col:'white', look:'fedora', outfit:'veste', sp: 5,
    traits:'solennel mais gourmand, fait des discours pour tout, très fier de la démocratie des croquettes et de sa nouvelle télévision',
    hello:'Bonsoir, bonsoir ! Minou Lavigne, maire du secteur USC. Bienvenue du bon côté de la laine, mon ami !',
    facts:['J’ai inauguré le diner trois fois. Par erreur, mais avec beaucoup de conviction.', 'On a la télévision à la mairie maintenant. En noir et blanc, comme tout le monde.', 'Le Général Moustachenko ? Charmant. On se salue de loin, avec des jumelles.'] },
  { home: 'diner', name:'Caramel', job:'Serveuse au diner', side:'usc', col:'tabby', look:'coiffe', outfit:'robe', sp: 6,
    traits:'pétillante, parle vite, connaît tous les ragots, adore le rock’n’roll, appelle tout le monde chou',
    hello:'Hé, salut chou ! Moi c’est Caramel, du diner. Un milkshake à la sardine ? C’est la spécialité de la maison !',
    facts:['Le juke-box ne passe que du rock et du twist. Personne ne s’en plaint.', 'Mistigri vient tous les soirs, toujours la même tarte au thon.', 'Il paraît qu’en CCR la file d’attente du Gastronom fait trois fois le tour du pâté de maisons.'] },
  { home: 'cinema', name:'Mistigri', job:'Projectionniste du cinéma', side:'usc', col:'black', look:'beret', outfit:'pull', sp: 4,
    traits:'cinéphile rêveur, cite des films de science-fiction en noir et blanc, un peu dramatique',
    hello:'Bonsoir, étranger. Mistigri, projectionniste. Ce soir : L’Invasion des souris de Mars. Séance à vingt et une heures.',
    facts:['La bobine a brûlé mardi. J’ai raconté la fin moi-même. Ils ont applaudi.', 'Au cinéma, les chats noirs ont les meilleures places. On ne nous voit pas dans le noir.', 'Un jour je tournerai un film sur le Rideau de Laine. Un drame. Avec des moustaches.'] },
  { home: 'station', name:'Pompon', job:'Garagiste de la station-service', side:'usc', col:'gray', look:'casquette', outfit:'salopette', sp: 5,
    traits:'bourru mais généreux, passionné de moteurs, de chromes et d’ailerons, sent un peu l’essence',
    hello:'Salut, salut. Pompon, de la station. Si ta bagnole tousse, tu me l’amènes, je lui parle.',
    facts:['Les ailerons, ça ne sert à rien. C’est pour ça que c’est beau.', 'Les voitures d’en face sont carrées comme des boîtes à croquettes. Mais elles démarrent.', 'Les voitures ne vont jamais sur l’eau ici. J’ai essayé une fois, ça ne marche pas.'] },
  { home: 'drivein', name:'Zazou', job:'Fan de rock’n’roll', side:'usc', col:'white', look:'banane', outfit:'blouson', sp: 6,
    traits:'jeune, énergique, dit « c’est dans le vent », banane gominée, rêve de passer à la radio',
    hello:'Salut les copains ! Zazou ! T’as entendu le dernier disque ? C’est complètement dans le vent !',
    facts:['J’ai un transistor. Je capte même Radio Miaou-Scou, mais ils ne passent que des marches militaires.', 'Au bal du samedi, je danse le twist jusqu’à minuit pile.', 'Un jour je jouerai de la guitare sur le mur. Des deux côtés. La paix par le rock !'] },
  { home: 'radio', name:'Praline', job:'Standardiste au central téléphonique', side:'usc', col:'gray', look:'lunettes', outfit:'robe', sp: 4,
    traits:'polie, curieuse, relie tout le monde, dit « ne quittez pas », adore écouter les lignes',
    hello:'Allô, bonsoir ! Praline, du central. Ne quittez pas, je vous passe... ah non, vous êtes là.',
    facts:['Il y a un téléphone rouge entre la mairie et le Palais du Peuple. Il sonne surtout pour commander des pizzas.', 'Quatorze téléphones de ce côté. Je les reconnais tous à leur sonnerie.', 'Je n’écoute jamais les conversations. Enfin, presque jamais.'] },
  { home: 'grandmagasin', name:'Bijou', job:'Couturière, reine du bal du samedi', side:'usc', col:'white', look:'noeud', outfit:'pois', sp: 4,
    traits:'élégante, romantique, parle mode, robes à pois et jupons, un peu coquette',
    hello:'Bonsoir, bonsoir ! Bijou, couturière. Jolie tenue... mais un nœud papillon t’irait à merveille.',
    facts:['Les robes à pois, c’est la folie cette saison.', 'Natacha, en face, m’a demandé un patron de robe par-dessus le mur. Je lui ai lancé dans une boîte de sardines.', 'Au bal, c’est Réglisse qui joue. Tout le monde danse.'] },
  { home: 'kiosque', name:'Réglisse', job:'Trompettiste de jazz', side:'usc', col:'black', look:'noires', outfit:'veste', sp: 5,
    traits:'cool, parle en jargon de jazz, détendu, dit souvent « mon pote »',
    hello:'Yeah, bonsoir mon pote. Réglisse, trompette. Le kiosque swingue le dimanche, faut pas rater ça.',
    facts:['Le jazz, c’est comme ronronner, mais en cuivre.', 'Une nuit j’ai joué près du mur. De l’autre côté, quelqu’un tapait du pied.', 'Quand la lune est pleine, je joue pour les mouettes du port.'] },
  { home: 'checkpoint', guard: true, name:'Sergent Buddy Moustaches', job:'Police militaire, Checkpoint Minou', side:'usc', col:'tabby', look:'casque', outfit:'uniforme-usc', sp: 0,
    traits:'carré, réglementaire, mâche du chewing-gum, au fond très sentimental, parle avec des mots d’anglais',
    hello:'Halte ! Checkpoint Minou, secteur USC. Sergent Buddy Moustaches. Papiers, s’il vous plaît. Ou un sourire, ça marche aussi.',
    facts:['Mon collègue d’en face, le Général, je lui fais coucou tous les matins. Il ne répond jamais. Mais je vois sa moustache bouger.', 'La barrière monte et descend. C’est le seul sport qu’on fait ici.', 'Le règlement dit : aucun chat ne passe sans raison. Le règlement n’a jamais vu un chaton pleurer.'] },
  { home: 'maison', name:'Filou', job:'Livreur de journaux en scooter', side:'usc', col:'tabby', look:'gavroche', outfit:'pull', sp: 7,
    traits:'rapide, farceur, toujours pressé, connaît toutes les rues du secteur',
    hello:'Salut ! Filou, je livre la Gazette de Kutty. Pas le temps, pas le temps ! Enfin, deux minutes.',
    facts:['La une de demain : « Le satellite Spoutchat a fait bip au-dessus du diner ».', 'Je fais le tour du secteur en neuf minutes. Record officieux.', 'Si on construit un nouveau bâtiment, je suis le premier au courant.'] },
  { home: 'phare', name:'Moustache', job:'Gardien du phare', side:'neutre', col:'black', look:'marin', outfit:'caban', pipe: true, sp: 0, sit: true,
    traits:'taiseux, sage, parle de la mer et des bateaux, humour pince-sans-rire, neutre comme une pelote posée sur le mur',
    hello:'Hm. Bonsoir. Moustache, gardien du phare. Le phare éclaire les deux côtés. La mer, elle, ne connaît pas de mur.',
    facts:['Seize secondes pour un tour. Deux éclats. Les marins le savent par cœur.', 'Je monte les cent douze marches chaque soir. Les pattes s’en souviennent.', 'Le phare, on ne le peint ni en rouge ni en bleu. Je le peins en rayures. Tout le monde est content.'] },
  { home: 'pecherie', name:'Tonton Gribouille', job:'Pêcheur', side:'neutre', col:'tabby', look:'bonnet', outfit:'mariniere', sp: 0, sit: true,
    traits:'conteur, exagère toutes ses histoires de poissons, rit fort, vend ses sardines aux deux camps',
    hello:'Ohé ! Tonton Gribouille, pêcheur. Assieds-toi, je vais te raconter la sardine géante.',
    facts:['La sardine faisait deux mètres. Bon, deux centimètres. Mais elle était costaude.', 'Je vends aux deux camps. Les sardines, elles, ne votent pas.', 'Quand le phare balaie l’eau, les poissons remontent. Enfin, c’est ce que je dis.'] },
  { home: 'checkpoint', guard: true, name:'Général Moustachenko', job:'Commandant du Checkpoint, CCR', side:'ccp', col:'gray', look:'kepi', outfit:'uniforme-ccp', sp: 0,
    traits:'très sérieux en apparence, adore les médailles et les défilés, cache un faible pour le rock’n’roll d’en face, parle de plans quinquennaux',
    hello:'Halte, camarade ! Général Moustachenko, Cats Communist Republic. Ici commence le paradis des travailleurs. Et des siestes.',
    facts:['J’ai quarante-deux médailles. Dont une pour avoir compté mes médailles.', 'Le plan quinquennal de croquettes est dépassé de trois cents pour cent. Sur le papier.', 'Le sergent d’en face me fait coucou. Je ne réponds pas. Mais ma moustache, elle, n’obéit pas toujours.'] },
  { home: 'epicerie', name:'Babouchka Grisetova', job:'Vendeuse au Gastronom', side:'ccp', col:'gray', look:'foulard', outfit:'tablier', sp: 3,
    traits:'maternelle, bourrue, compte tout, gère la file d’attente d’une patte de fer, donne des conseils de soupe',
    hello:'Ah, un visiteur ! Babouchka Grisetova, du Gastronom. Tu as mangé ? Non ? Fais la queue, comme tout le monde.',
    facts:['Arrivage de sardines prévu au prochain plan. On commence déjà la file.', 'Ma soupe de chou au poisson guérit tout. Même le capitalisme.', 'Le rayon « luxe » du Gastronom, c’est une boîte de pâtée. Elle est très bien exposée.'] },
  { home: 'usine', name:'Igor Ronronov', job:'Ouvrier modèle de l’usine n° 7', side:'ccp', col:'tabby', look:'ushanka', outfit:'bleu', sp: 4,
    traits:'costaud, fier, enthousiaste, parle en chiffres de production, héros du travail un peu naïf',
    hello:'Salut, camarade ! Igor Ronronov, ouvrier modèle. Cette nuit j’ai tricoté cent deux pelotes de laine pour la patrie !',
    facts:['Mon record : cent deux pelotes en une nuit. Médaille d’or du travail.', 'À l’usine n° 7 on fabrique des tracteurs. Et des tracteurs pour fabriquer des tracteurs.', 'Le Rideau de Laine ? C’est nous qui l’avons tricoté. Très solide. Un peu qui gratte.'] },
  { home: 'fusee', name:'Natacha Miaoulova', job:'Cosmonaute en formation', side:'ccp', col:'white', look:'cosmo', outfit:'combi', sp: 5,
    traits:'rêveuse, courageuse, passionnée d’étoiles et de fusées, veut être le premier chat en orbite',
    hello:'Privet ! Natacha Miaoulova, cosmonaute en formation. Tu as vu passer Spoutchat ? Il fait bip, bip. C’est mon ami.',
    facts:['Un jour je serai le premier chat sur la Lune. Ou le deuxième, si le chien passe avant.', 'Dans la centrifugeuse, je tourne comme une pelote. J’adore.', 'Vue de l’espace, l’île est toute petite. Et le mur ne se voit même pas.'] },
  { home: 'bulbes', name:'Boris Pattov', job:'Grand maître d’échecs', side:'ccp', col:'black', look:'lunettes', outfit:'costume', sp: 3,
    traits:'calme, calculateur, parle en coups d’échecs, pense toujours douze coups à l’avance, humour sec',
    hello:'Bonsoir. Boris Pattov, grand maître. Je savais que tu viendrais. Je l’avais prévu il y a douze coups.',
    facts:['Aux échecs, le roi est lent et la dame fait tout. Comme au Palais du Peuple.', 'J’ai proposé une partie au maire d’en face. Par pigeon voyageur. Le pigeon a mangé le cavalier.', 'La vie est une partie. Moi je joue les noirs. Évidemment.'] },
  { home: 'qg', name:'Olga Pravdacha', job:'Crieuse de la Pravdachat', side:'ccp', col:'white', look:'gavroche', outfit:'pull', sp: 6,
    traits:'énergique, voix forte, annonce toutes les nouvelles comme des victoires, ne dit jamais rien de négatif',
    hello:'Demandez la Pravdachat ! Olga, crieuse officielle. Grande nouvelle : tout va très bien, comme d’habitude !',
    facts:['Titre du jour : « Record battu ». On ne précise pas lequel, c’est plus simple.', 'La météo est toujours ensoleillée dans la Pravdachat. Même la nuit.', 'J’aimerais lire la Gazette d’en face. Pour la corriger, évidemment.'] },
  { home: 'maison', name:'Shérif Tom Griffon', job:'Shérif du secteur USC', side:'usc', col:'gray', look:'cowboy', outfit:'gilet-sherif', sp: 4,
    traits:'lent, flegmatique, parle comme dans un western, mâchonne une brindille, très attaché à la loi et à la sieste',
    hello:'Salut, étranger. Tom Griffon, shérif. Dans cette ville, y’a deux règles : on ne court pas après les souris, et on ne court pas tout court.',
    facts:['Mon cheval s’appelle Moteur. C’est une Cadillatte. Elle est plus rapide qu’un cheval.', 'La dernière fois qu’il y a eu un duel ici, c’était pour la dernière part de tarte au thon.', 'Le mur, je le surveille de loin. De très loin. Depuis mon hamac.'] },
  { home: 'immeuble', name:'Madame Minette', job:'Reine des réunions de voisinage', side:'usc', col:'white', look:'bigoudis', outfit:'pois', sp: 3,
    traits:'bavarde, organisée, invite tout le monde à des réunions de boîtes hermétiques, adore son frigidaire et son aspirateur neuf',
    hello:'Oh, un invité ! Madame Minette. Vous tombez bien, j’organise une réunion de boîtes hermétiques jeudi. Il y aura du cake à la sardine.',
    facts:['Mon nouvel aspirateur fait un bruit de fusée. Le chat du voisin a déménagé.', 'Une cuisine moderne, c’est une cuisine où l’on ne cuisine plus. Tout est en boîte.', 'Je mets mes bigoudis tous les soirs. Pour le bal, pour la télé, pour le facteur.'] },
  { home: 'fusee', name:'Docteur Hector Propulse', job:'Ingénieur de la base spatiale USC', side:'usc', col:'black', look:'lunettes', outfit:'blouse', sp: 4,
    traits:'distrait, génial, parle en calculs et en comptes à rebours, obsédé par l’idée de battre le Cosmodrome d’en face',
    hello:'Dix, neuf, huit... ah, pardon, bonsoir. Docteur Hector Propulse. Je compte à rebours, c’est plus fort que moi.',
    facts:['Notre fusée est prête. Il manque juste le carburant. Et la fusée.', 'En face, ils ont un satellite qui fait bip. Nous, on travaille sur un satellite qui fait miaou.', 'La gravité, c’est ce qui fait tomber les tartines côté beurre. Et les chats sur leurs pattes.'] },
  { home: 'bowling', name:'Lulu Strike', job:'Championne de bowling', side:'usc', col:'tabby', look:'bandeau', outfit:'bowling', sp: 6,
    traits:'sportive, compétitive, énergique, parle de strikes et de quilles, lance des défis à tout le monde',
    hello:'Hé ! Lulu Strike, trois fois championne du bowling. Tu joues ? Non ? Tu vas apprendre, je te fais une démo.',
    facts:['Un strike, c’est comme renverser un verre sur une table. Mais c’est autorisé.', 'Ma boule s’appelle Pelote. Elle a son propre casier.', 'J’ai défié l’athlète d’en face par haut-parleur. Elle a répondu en faisant cent pompes.'] },
  { home: 'port', name:'Agent X', job:'Personne ne sait vraiment', side:'neutre', col:'siamois', look:'espion', outfit:'trench', sp: 3,
    traits:'mystérieux, parle à voix basse et par énigmes, change de sujet dès qu’on parle de lui, travaille peut-être pour les deux camps',
    hello:'Psst. Ne vous retournez pas. Appelez-moi X. Nous ne nous sommes jamais parlé.',
    facts:['Le phare cligne deux fois. C’est pour les bateaux. Officiellement.', 'J’ai un appareil photo dans mon collier et un autre dans mon autre collier.', 'La vérité ? Elle est des deux côtés du mur. Surtout du côté des croquettes.'] },
  { home: 'cirque', name:'Grigori Pompidov', job:'Clown du Cirque du Peuple', side:'ccp', col:'white', look:'haut-de-forme', outfit:'fraise', sp: 4,
    traits:'drôle, mélancolique, fait des tours de magie ratés, raconte des blagues approuvées par le comité des blagues',
    hello:'Bonsoir, camarade ! Grigori Pompidov, clown du Cirque du Peuple. Voulez-vous voir un tour ? Il est approuvé par le comité.',
    facts:['Ma blague préférée a été validée il y a des années. Je la raconte depuis. Tous les soirs.', 'Je sors un lapin de mon chapeau. Enfin, une pelote. Le lapin est en rupture.', 'Au cirque, l’ours fait du vélo et le public applaudit selon le plan.'] },
  { home: 'stade', name:'Svetlana Sprintova', job:'Athlète olympique', side:'ccp', col:'gray', look:'bandeau', outfit:'survet', sp: 7,
    traits:'rapide, disciplinée, franche, compte ses foulées, veut battre tous les records du monde avant le petit-déjeuner',
    hello:'Privet ! Svetlana Sprintova, athlète du peuple. J’ai fait le tour de l’île deux fois pendant que tu me regardais.',
    facts:['Mon entraîneur est un chronomètre. Il ne parle jamais, mais il juge.', 'La championne de bowling d’en face m’a défiée. Je lui ai répondu en courant.', 'Je mange des croquettes protéinées du plan quinquennal. Elles ont un goût de médaille.'] },
  { home: 'immeuble', name:'Ivan Bétonov', job:'Contremaître du grand chantier', side:'ccp', col:'tabby', look:'chantier', outfit:'bleu', sp: 4,
    traits:'bourru, fier de son béton, rêve de construire des immeubles jusqu’au ciel, parle en mètres cubes',
    hello:'Salut, camarade ! Ivan Bétonov, contremaître. Tu vois ces immeubles ? Tous pareils. C’est ça, la perfection.',
    facts:['Un immeuble par semaine. Si on oublie les fenêtres, deux.', 'Le béton, c’est comme la soupe de Babouchka : épais et éternel.', 'Si tu construis une route, préviens-moi. J’adore les routes. Elles sont plates comme mes blagues.'] },
  { home: 'kolkhoze', name:'Anatoli Bortchov', job:'Cuisinier de la cantine du peuple', side:'ccp', col:'gray', look:'toque', outfit:'tablier', sp: 3,
    traits:'jovial, généreux, parle de soupe, de betteraves et de louches, nourrit tout le monde même ceux qui n’ont pas faim',
    hello:'Ah ! Un estomac vide ! Anatoli Bortchov, cantine du peuple. Aujourd’hui : soupe. Demain : soupe. C’est le plan.',
    facts:['Ma soupe de betterave est rouge. Comme tout le reste, remarque.', 'Babouchka dit que sa soupe est meilleure. Nous réglerons ça au prochain congrès.', 'Le secret d’une bonne cantine : une grande louche et beaucoup de patience.'] }
];
SH.CATS = [];
export function spawnCats(){
  const keep = new Set(SH.CATS.map(c => c.name));
  for (const d of CAT_DEFS){
    if (keep.has(d.name)) continue;
    const want = d.side === 'neutre' ? null : d.side;
    const home = SH.BLD.find(l => l.done && l.type === d.home && (!want || l.side === want) && !SH.CATS.some(c => c.homeId === l.id && c.name !== d.name && d.home !== 'qg'));
    if (!home) continue;
    const c = Object.assign({}, d, { id: SH.CATS.length, homeId: home.id, paused: false, t0: hash2(SH.CATS.length, 77) * 50 });
    placeCat(c, home);
    SH.CATS.push(c);
  }
}
// le chat fait les cent pas devant chez lui, ou reste assis a son poste
export function placeCat(c, l){
  const fb = l.b1 + 4.5, k = SH.CATS.filter(o => o.homeId === l.id).length;
  if (c.guard) c.fixed = [l.a0 + 3, l.b1 + 2];
  else if (c.sit || !c.sp) c.fixed = [l.a0 + 4 + k * 5, fb];
  else { c.fixed = null; c.path = [[l.a0 + 1, fb + k * 2], [l.a1 - 1, fb + k * 2]]; }
}
export function catPos(c, t){
  if (c.fixed) return { a: c.fixed[0], b: c.fixed[1], da: 0, db: 0, moving: false };
  if (c.paused && c.frozen) return c.frozen;
  const [p0, p1] = c.path;
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
  const per = 2 * len / c.sp, ph = (((t + c.t0) / per) % 1);
  const f = ph < .5 ? ph * 2 : 2 - ph * 2, fwd = ph < .5;
  const a = p0[0] + (p1[0] - p0[0]) * f, b = p0[1] + (p1[1] - p0[1]) * f;
  const da = (p1[0] - p0[0]) * (fwd ? 1 : -1), db = (p1[1] - p0[1]) * (fwd ? 1 : -1);
  return { a, b, da, db, moving: true };
}
export const HATTED = ['ushanka', 'kepi', 'casque', 'fedora', 'foulard', 'cosmo', 'marin', 'bonnet', 'casquette', 'gavroche', 'beret', 'cowboy', 'chantier', 'toque', 'haut-de-forme', 'espion', 'bigoudis'];
export const catMat = (c) => c.col === 'tabby' ? M.CAT_OR : c.col === 'siamois' ? M.CAT_SIAM : c.col === 'gray' ? M.CAT_GRAY : c.col === 'black' ? M.CAT_BLACK : M.CAT;
// chat sur la carte : petit sprite, avec un bout de chapeau
export function catPixels(c, fr, f, lit){
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


/* ================= reconstruction des objets ================= */
export let BUILT = [], STATIC_PARTS = [], DECALS = [], LIGHTS_STATIC = [], BEACONS = [];
export const USC_MATS = [M.USC, M.USC2, M.USC3, M.USC4, M.USC5], CCP_MATS = [M.CCP, M.CCP2, M.CCP3];
export const BUILD_MAT = { diner: M.CHROME, usine: M.BRICK, peuple: M.SANDSTONE, mairie: M.SANDSTONE, qg: M.SANDSTONE, cinema: M.BRICK, station: M.USC5, bowling: M.USC5, port: M.PIER, pecherie: M.PIER };
export const SHADOW_EXTRA = {
  chateau: (l) => SH.circ(l.ca, l.cb, 8, 31, 12).concat(SH.circ(l.ca, l.cb, 6, 0, 4)),
  kiosque: (l) => SH.circ(l.ca, l.cb, 11, 12, 12).concat(SH.circ(l.ca, l.cb, 9, 0, 8)),
  cirque: (l) => SH.circ(l.ca, l.cb - 2, 12, 7, 12).concat([l.ca, l.cb - 2, 27]),
  radio: (l) => SH.circ(l.ca - 5, l.cb - 3, 6, 0, 4).concat(SH.circ(l.ca - 5, l.cb - 3, 1, 57, 4)),
  fusee: (l) => SH.circ(l.ca - 2, l.cb, 2.2, 36, 6).concat(SH.circ(l.ca - 2, l.cb, 2.2, 2, 6), SH.circ(l.ca + 6.5, l.cb - .5, 1.6, 36, 4)),
  statue: (l) => SH.circ(l.ca, l.cb, 1.6, 28, 6),
  panneau: (l) => [l.ca - 22, l.cb, 29, l.ca + 22, l.cb, 29, l.ca - 12, l.cb, 0, l.ca + 12, l.cb, 0, l.ca - 22, l.cb + .4, 9, l.ca + 22, l.cb + .4, 9],
  fontaine: (l) => SH.circ(l.ca, l.cb, 8, 2, 10)
};
SH.TOWN_VER = 0;
// galons au-dessus de la porte : un par niveau gagne
export function levelBadge(l){
  const p = prj(l.ca, l.b1 + 1, 0), x = Math.round(p[0]) - (l.lvl - 1) * 3, y = Math.round(p[1]) + 3;
  SH.CUR = M.ICON_Y;
  for (let k = 0; k < l.lvl - 1; k++) for (let d = 0; d < 3; d++){ fput(x + k * 6 + d, y - d, 1); fput(x + k * 6 + 4 - d, y - d, 1); }
}
/* ---- batiments tournes : on les construit face a +b, puis on les tourne d'un quart de tour autour de leur centre ---- */
// le port et la pecherie gerent eux-memes leur direction (face a la mer)
export const SELF_DIR = { port: 1, pecherie: 1 };
export const DIR_ROT = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
// dessin tourne : meme centre a l'ecran, projection tournee de l'angle, soleil et lune ramenes dans le repere du batiment
export function turnDraw(ca, cb, th, fn){
  const c = Math.cos(th), s = Math.sin(th);
  return (t) => {
    const sv = [PC, PS, TX, TY], su = [SUN[0], SUN[1]], mo = [MOON[0], MOON[1]];
    const X = TX + ((ca * PC - cb * PS) - (ca * PS + cb * PC)) * SC, Y = TY + ((ca * PC - cb * PS) + (ca * PS + cb * PC)) * .5 * SC;
    const pc = PC * c - PS * s, ps = PS * c + PC * s;
    setView({ PC: pc, PS: ps, TX: Math.round(X - ((ca * pc - cb * ps) - (ca * ps + cb * pc)) * SC), TY: Math.round(Y - ((ca * pc - cb * ps) + (ca * ps + cb * pc)) * .5 * SC) });
    SUN[0] = su[0] * c + su[1] * s; SUN[1] = -su[0] * s + su[1] * c; MOON[0] = mo[0] * c + mo[1] * s; MOON[1] = -mo[0] * s + mo[1] * c;
    const cap = SH.CAPTURE ? SH.CAPTURE.length : -1;
    try { fn(t); }
    finally {
      setView({ PC: sv[0], PS: sv[1], TX: sv[2], TY: sv[3] }); SUN[0] = su[0]; SUN[1] = su[1]; MOON[0] = mo[0]; MOON[1] = mo[1];
      if (SH.CAPTURE && cap >= 0) for (let i = cap; i + 1 < SH.CAPTURE.length; i += 3){ const a = SH.CAPTURE[i] - ca, b = SH.CAPTURE[i + 1] - cb; SH.CAPTURE[i] = ca + a * c - b * s; SH.CAPTURE[i + 1] = cb + a * s + b * c; }
    }
  };
}
export const turnsItself = (l) => !l.dir || SELF_DIR[l.type] || (SH.ECO[l.type] && SH.ECO[l.type].coast);
// construit le dessin d'un batiment dans sa direction
export function buildParts(l, seed){
  if (turnsItself(l)) return TYPES[l.type].build(l, seed);
  const [fa, fb] = footOf(l.type), th = DIR_ROT[l.dir], c = Math.cos(th), s = Math.sin(th), ca = l.ca, cb = l.cb;
  const lot = Object.assign({}, l, { a0: ca - fa / 2, a1: ca + fa / 2, b0: cb - fb / 2, b1: cb + fb / 2, dir: 0 });
  const r = TYPES[l.type].build(lot, seed);
  const R = (a, b) => [ca + (a - ca) * c - (b - cb) * s, cb + (a - ca) * s + (b - cb) * c];
  const Rpts = (pts) => { const o = pts.slice(); for (let i = 0; i + 1 < o.length; i += 3){ const q = R(o[i], o[i + 1]); o[i] = q[0]; o[i + 1] = q[1]; } return o; };
  for (const p of r.parts){ const q = R(p.a, p.b); p.a = q[0]; p.b = q[1]; p.draw = turnDraw(ca, cb, th, p.draw); if (p.shadow) p.shadow = Rpts(p.shadow); }
  if (r.shadowPts) r.shadowPts = Rpts(r.shadowPts);
  if (r.decals) r.decals = r.decals.map(d => turnDraw(ca, cb, th, d));
  for (const L of r.lights || []){ const q = R(L.a, L.b); L.a = q[0]; L.b = q[1]; if (L.da != null){ const da = L.da * c - L.db * s, db = L.da * s + L.db * c; L.da = da; L.db = db; } }
  if (r.beacon){ const q = R(r.beacon[0], r.beacon[1]); r.beacon = [q[0], q[1]].concat(r.beacon.slice(2)); }
  r.turned = R;
  return r;
}
export function rebuildTown(){
  SH.TOWN_VER++;
  BUILT = []; STATIC_PARTS = []; DECALS = []; LIGHTS_STATIC = []; BEACONS = [];
  for (const l of SH.BLD){
    if (!l.done || !TYPES[l.type]) continue;
    const sd = seedOf(l), r = buildParts(l, sd);
    BUILT.push({ lot: l, r });
    const bm = BUILD_MAT[l.type] || (l.side === 'ccp' ? CCP_MATS[sd % 3] : USC_MATS[sd % 5]);
    for (const p of r.parts){ if (p.m == null) p.m = bm; p.side = l.side; p.lot = l; }
    if (r.parts[0]){ let ex = SHADOW_EXTRA[l.type] ? SHADOW_EXTRA[l.type](l) : []; if (r.turned){ ex = ex.slice(); for (let i = 0; i + 1 < ex.length; i += 3){ const q = r.turned(ex[i], ex[i + 1]); ex[i] = q[0]; ex[i + 1] = q[1]; } } const sh = ex.concat(r.shadowPts || []); if (sh.length) r.parts[0].shadow = sh; }
    if (l.lvl > 1 && !SH.LVL_POP[l.type] && l.type !== 'port') STATIC_PARTS.push(Object.assign(part(l.ca, l.b1 + 1, .05, () => levelBadge(l)), { side: l.side, lot: l }));
    STATIC_PARTS.push(...r.parts); LIGHTS_STATIC.push(...(r.lights || []));
    if (r.beacon) BEACONS.push(r.beacon);
    if (r.decals) DECALS.push(...r.decals.map(d => (t) => { SH.CUR_SIDE = l.side; SH.CUR = l.side === 'ccp' ? M.CCP : M.USC; d(t); }));
  }
  for (const w of SH.WALLS) STATIC_PARTS.push(Object.assign(part((w.pa + w.qa) / 2, (w.pb + w.qb) / 2, 0, () => drawWallPiece(w.pa, w.pb, w.qa, w.qb, w.g, w.side)), { side: w.side, m: M.WALL }));
  for (const tw of SH.WALL_TOWERS) STATIC_PARTS.push(Object.assign(part(tw.a, tw.b, .1, (t) => drawTower(tw, t)), { side: tw.side, m: M.METAL }));
  for (const [a, b] of LAMP_POS){ const p = part(a, b, 0, () => { SH.CUR = M.METAL; blitAt(LAMP_SPR, a, b, 0); }); p.shadow = SH.circ(a, b, .25, 0, 4).concat(SH.circ(a + 1, b, .3, 15, 4)); STATIC_PARTS.push(p); LIGHTS_STATIC.push(Lc(a, b, 13, 1.25)); }
  for (const f of HOOKS.town) f(STATIC_PARTS, LIGHTS_STATIC);
  for (const p of STATIC_PARTS){ if (p.m == null) p.m = M.METAL; if (!p.side) p.side = 'usc'; }
  if (COLOR) buildShadows();
  spawnCats();
}
export function buildShadows(){
  SH.SHADOWS = [];
  for (const p of STATIC_PARTS){
    SH.CAPTURE = [];
    try { p.draw(0); } catch (_) {}
    const pts = SH.CAPTURE; SH.CAPTURE = null;
    if (p.shadow) for (const v of p.shadow) pts.push(v);
    if (pts.length < 9) continue;
    const h = SH.shadowHull(pts); if (h) SH.SHADOWS.push(h);
  }
}
