/* ================= la planete : tout au bout du dezoom, l'ile sur son globe, l'espace derriere ================= */
// L'ile est un morceau de la surface d'une planete de rayon RP (en unites du monde) : a = longitude * RP, b = -latitude * RP.
// Sur la carte du monde (la grille), on reprend la carte plate de l'ile (MAPV : sol, territoires, batiments) ;
// ailleurs, une texture tiree au sort avec la graine de l'ile : ocean, autres continents, banquise, nuages.
const PLANET = { RP: 2600, W: 1024, H: 512, seed: -1, tex: null, cloud: null, stars: null, spin: 0 };
const PLANET_T = .14;
const planetOn = () => Z < KMIN * PLANET_T - 1e-6;
function planetBuild(seed){
  PLANET.seed = seed;
  const w = PLANET.W, h = PLANET.H, tex = new Uint32Array(w * h), cloud = new Uint8Array(w * h);
  const ox = (seed % 997) * .37, oy = (seed % 613) * .53;
  const rgb = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
  for (let j = 0; j < h; j++){
    const lat = (.5 - (j + .5) / h) * Math.PI, cl = Math.cos(lat);
    for (let i = 0; i < w; i++){
      const lon = ((i + .5) / w - .5) * TAU, cx = Math.cos(lon) * cl, sy = Math.sin(lon) * cl;
      // bruit continu sur la sphere : deux bruits plans colles l'un a l'autre, sans couture en longitude
      const n = vnoise(cx * 2.2 + ox, sy * 2.2 + lat * 1.3 + oy) * .55 + vnoise(sy * 4.4 + lat * 2 + oy, cx * 4.4 + ox) * .3 + vnoise(cx * 11 + lat * 3, sy * 11 + ox) * .15;
      // pas d'autre continent pres de notre ile : elle reste seule dans son ocean
      const d = Math.acos(clamp(cl * Math.cos(lon), -1, 1)), calm = Math.max(0, 1 - d / .95);
      const land = n - calm * .45;
      let c;
      const al = Math.abs(lat);
      if (al > 1.22 + (vnoise(lon * 3, 7) - .5) * .12) c = rgb(232, 238, 244);
      else if (land > .6){
        const m = vnoise(cx * 9 + 40, sy * 9 + lat * 5), dry = al < .45 && m > .55;
        c = land > .74 ? (land > .8 ? rgb(236, 238, 240) : rgb(128, 122, 114)) : dry ? rgb(205, 178, 118) : (m > .5 ? rgb(58, 112, 50) : rgb(96, 150, 70));
      } else if (land > .565) c = rgb(63, 169, 204);
      else {
        // pres de l'ile, exactement le bleu de la carte de l'ile ; plus loin, un ocean plus profond
        const near = clamp(1 - (d - .38) / .5, 0, 1), k = clamp(.4 + land, 0, 1) * (1 - near) + near;
        c = rgb(Math.round(14 + 15 * k), Math.round(52 + 40 * k), Math.round(98 + 52 * k));
      }
      tex[j * w + i] = c;
      const cn = vnoise(cx * 5 + 90 + oy, sy * 5 + lat * 4) * .65 + vnoise(cx * 16 + 20, sy * 16 + lat * 9 + ox) * .35;
      // moins de nuages au-dessus de l'ile, pour qu'on la voie depuis l'espace
      cloud[j * w + i] = Math.round(clamp((cn - .56) * 3.2, 0, .85) * (1 - clamp(1 - (d - .3) / .4, 0, 1) * .85) * 255);
    }
  }
  PLANET.tex = tex; PLANET.cloud = cloud;
  PLANET.stars = []; for (let k = 0; k < 420; k++) PLANET.stars.push([hash2(k, seed) * 2 - 1, hash2(k + 7, seed + 3) * 2 - 1, hash2(k + 11, 5), hash2(k, 99) < .08 ? 2 : 1]);
}
function renderPlanet(t){
  if (PLANET.seed !== GAME.seed || !PLANET.tex) planetBuild(GAME.seed);
  if (!MAPV.cv) mapInit();
  mapUpdate();
  const w = W, h = H, PX = px32, space = (255 << 24) | (20 << 16) | (9 << 8) | 5;
  PX.fill(space);
  // etoiles, qui tournent avec la vue
  const pc = Math.cos(cam.phi), ps = Math.sin(cam.phi), half = Math.max(w, h) * .75;
  for (const [sx, sy, br, sz] of PLANET.stars){
    const x = Math.round(w / 2 + (sx * pc - sy * ps) * half), y = Math.round(h / 2 + (sx * ps + sy * pc) * half);
    if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) continue;
    const v = Math.round(120 + 135 * br * (.7 + .3 * Math.sin(t * (1 + br * 3) + sx * 50))), col = (255 << 24) | (v << 16) | (v << 8) | Math.round(v * .92);
    PX[y * w + x] = col; if (sz > 1){ PX[y * w + x + 1] = col; PX[(y + 1) * w + x] = col; }
  }
  const R = PLANET.RP * SC, cxs = w / 2, cys = h / 2;
  const lat0 = -cam.b / PLANET.RP, lon0 = cam.a / PLANET.RP + PLANET.spin, sl0 = Math.sin(lat0), cl0 = Math.cos(lat0);
  // la vue tourne comme en jeu : l'axe a de l'ile garde son sens a l'ecran
  const th = cam.phi + Math.PI / 4, tc = Math.cos(th), ts = Math.sin(th);
  // soleil : midi sur l'ile a 12 h, un peu au nord ou au sud selon la saison
  const sLon = (12 - CLOCK.h) / 24 * TAU, sLat = .35 * Math.sin((CAL.m - 2.5) / 12 * TAU);
  const SX = Math.cos(sLat) * Math.cos(sLon), SY = Math.cos(sLat) * Math.sin(sLon), SZ = Math.sin(sLat);
  const TW = PLANET.W, TH = PLANET.H, TEX = PLANET.tex, CL = PLANET.cloud, MP = MAPV.px, MW = MAPV.W, MH = MAPV.H;
  const ga0 = GA0, gb0 = GB0, ga1 = GA0 + GW / GSC, gb1 = GB0 + GH / GSC, RP = PLANET.RP, cdrift = t * .004;
  const x0 = Math.max(0, Math.floor(cxs - R - 4)), x1 = Math.min(w - 1, Math.ceil(cxs + R + 4)), y0 = Math.max(0, Math.floor(cys - R - 4)), y1 = Math.min(h - 1, Math.ceil(cys + R + 4));
  // on calcule un pixel sur deux dans chaque sens, et on le recopie : la planete reste nette et legere
  const step = R > 90 ? 2 : 1, rim = Math.max(2, R * .035);
  for (let y = y0; y <= y1; y += step){
    for (let x = x0; x <= x1; x += step){
      const dx = (x + step / 2 - cxs) / R, dy = (y + step / 2 - cys) / R, rr = dx * dx + dy * dy;
      let col;
      if (rr > 1){
        // halo de l'atmosphere autour du disque
        const e = (Math.sqrt(rr) - 1) * R / rim; if (e > 1) continue;
        const a = (1 - e) * (1 - e) * .8, base = PX[y * w + x], br = base & 255, bg = (base >> 8) & 255, bb = (base >> 16) & 255;
        col = (255 << 24) | (Math.round(bb + (255 - bb) * a) << 16) | (Math.round(bg + (200 - bg) * a) << 8) | Math.round(br + (120 - br) * a);
      } else {
        const u = dx * tc + dy * ts, v = -dx * ts + dy * tc, wy = -v, nz = Math.sqrt(1 - rr);
        const lat = Math.asin(clamp(nz * sl0 + wy * cl0, -1, 1)), lon = lon0 + Math.atan2(u, nz * cl0 - wy * sl0);
        const a = lon * RP, b = -lat * RP;
        let c;
        if (a >= ga0 && a < ga1 && b >= gb0 && b < gb1){ const mx = ((a - ga0) / 2) | 0, my = ((b - gb0) / 2) | 0; c = MP[(my < MH ? my : MH - 1) * MW + (mx < MW ? mx : MW - 1)]; }
        else { let ti = Math.floor(((lon / TAU + .5) % 1 + 1) % 1 * TW), tj = Math.floor((.5 - lat / Math.PI) * TH); if (tj < 0) tj = 0; else if (tj >= TH) tj = TH - 1; c = TEX[tj * TW + ti]; }
        let r = c & 255, g = (c >> 8) & 255, bl = (c >> 16) & 255;
        // nuages qui derivent lentement
        let ci = Math.floor((((lon + cdrift) / TAU + .5) % 1 + 1) % 1 * TW), cj = Math.floor((.5 - lat / Math.PI) * TH); if (cj < 0) cj = 0; else if (cj >= TH) cj = TH - 1;
        const ca = CL[cj * TW + ci] / 255;
        if (ca > 0){ r += (248 - r) * ca; g += (250 - g) * ca; bl += (252 - bl) * ca; }
        // jour et nuit, bord du disque un peu plus sombre et bleute
        const cl = Math.cos(lat), P0 = cl * Math.cos(lon), P1 = cl * Math.sin(lon), P2 = Math.sin(lat);
        const sun = P0 * SX + P1 * SY + P2 * SZ, day = clamp(sun * 1.6 + .35, .16, 1), edge = .55 + .45 * nz;
        r = r * day * edge; g = g * day * edge; bl = bl * day * edge + (1 - day) * 18;
        const haze = (1 - nz) * .45; r += (120 - r) * haze * .5; g += (190 - g) * haze * .5; bl += (255 - bl) * haze * .6;
        col = (255 << 24) | (clamp(Math.round(bl), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(r), 0, 255);
      }
      PX[y * w + x] = col;
      if (step === 2){ if (x + 1 < w) PX[y * w + x + 1] = col; if (y + 1 < h){ PX[(y + 1) * w + x] = col; if (x + 1 < w) PX[(y + 1) * w + x + 1] = col; } }
    }
  }
  ctx.putImageData(img, 0, 0);
}
