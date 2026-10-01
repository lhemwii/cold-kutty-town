// Affichage de l'image du jeu par PixiJS (etapes 3.1 et 3.2 du plan de migration).
// Le moteur dessine dans ses tampons (forme, matiere, eclairage, camp) ; ici, on les envoie a la carte graphique
// en une texture, et un shader (ground-glsl.ts) fait la mise en couleur par la palette. En mode sol, le shader calcule
// aussi le sol au pixel, a partir de la grille du sol envoyee une fois (puis par morceaux quand elle change).
// L'image reste a la taille du jeu : le navigateur l'agrandit au pixel pres (image-rendering: pixelated), le style est garde.
// Sans WebGL2, on rend la main : le jeu garde son affichage par canvas 2D.
// Ce module ne depend d'aucun module du jeu.
import { Geometry, Mesh, Shader, Texture, BufferImageSource, WebGLRenderer, Container, UniformGroup, RenderTexture, Buffer, BufferUsage } from 'pixi.js';
import { FRAG, FRAG_GROUND, LIGHT_FRAG, LIGHT_VERT, OBJ_FRAG, OBJ_VERT, PAL_W, SHADOW_FRAG, SHADOW_VERT, VERT } from './ground-glsl.ts';

/** les tampons d'une image : un octet par pixel chacun, n pixels */
export interface Frame { fb: Uint8Array; mb: Uint8Array; lb: Uint8Array; ob: Uint8Array; n: number }

/** matieres dont le shader du sol a besoin */
export interface GroundMats {
  /** matiere de chaque type de sol */
  typeMat: number[];
  sea: number; seaMid: number; seaShallow: number; foam: number; beam: number; road: number; reflect: number;
  /** matiere du brouillard jamais vu */
  dark: number;
  /** pour chaque matiere : lumineuse (source de reflet), eau, garde sa teinte dans un reflet */
  glows: Uint8Array; waters: Uint8Array; keepTint: Uint8Array;
}
/** la grille du sol, empaquetee : 2 octets par case (type | classe de mer << 4, teinte), et le quart (variante, phase) */
export interface GroundGrid { gw: number; gh: number; cells: Uint8Array; qw: number; qh: number; quarter: Uint8Array }
/** ce qui change a chaque image pour le sol */
export interface GroundView {
  o: [number, number]; dax: number; dbx: number; day: number; dby: number;
  ga0: number; gb0: number; gsc: number; tx: number; ty: number; tick: number; ring: number;
  /** territoire : une case par octet (camp, + 2 juste conquis), w x h, decalage en cases de sol ; changed si a renvoyer */
  ter: { w: number; h: number; sh: number; own: Uint8Array; changed: boolean } | null;
  beam: { a: number; b: number; c: number; s: number; tn: number; I: number; noise: boolean; pt: number } | null;
  refl: { road: boolean; maxW: number; maxR: number; tick: number; wet: number } | null;
}
/** objets poses par la carte graphique : n quadrilateres de QUAD nombres (x0, y0 a l'image ; w, h du dessin ; echelle ; u, v dans l'atlas ; rang) */
export interface Objects { q: Float32Array; n: number }
export const QUAD = 8;
/** ombres et lumieres de l'image en cours (etape 0.19, 3.4).
 *  tri : triangles des ombres, 6 nombres chacun (trois points a l'image) ;
 *  lights : LIGHT nombres par lumiere (cadre x0, y0, x1, y1 ; cone ou disque, a, b, matiere ; rayon, intensite, attenuation,
 *  longueur ; da, db, tangente, largeur), dans l'ordre du jeu ; o, d, tx, ty, pat : passage des pixels au sol et trame */
export interface Fx {
  tri: Float32Array; nTri: number; lights: Float32Array; nLights: number;
  o: [number, number]; d: [number, number, number, number]; tx: number; ty: number; pat: number;
}
export const LIGHT = 16;

export interface Presenter {
  /** plus grand cote d'une texture sur cette carte graphique */
  readonly maxTex: number;
  /** WebGL est emule par le processeur (pas de vraie carte graphique) : les calculs lourds y sont plus lents qu'en JavaScript */
  readonly software: boolean;
  /** nom du moteur de rendu, tel que le donne le navigateur */
  readonly rendererName: string;
  /** taille de l'image (pixels du jeu) */
  resize(w: number, h: number): void;
  /** palette : pal[ob * stride + ((m << 1 | fb) * 5 + lb)] en ABGR ; ver change quand la palette change */
  palette(pal: Uint32Array, stride: number, ver: string): void;
  /** met l'image en couleur et l'affiche */
  draw(f: Frame): void;
  /** affiche une image deja en couleur (ABGR, un mot par pixel) */
  drawRGBA(px: Uint32Array): void;
  /** matieres du sol (une fois) */
  groundMats(m: GroundMats): void;
  /** toute la grille du sol (nouvelle carte) */
  groundGrid(g: GroundGrid): void;
  /** un rectangle de la grille a change (cases x0..x1, y0..y1) : on ne renvoie que lui */
  groundPatch(x0: number, y0: number, x1: number, y1: number): void;
  /** l'atlas des dessins d'objets (4 octets par texel : matiere, forme | eclairage << 1 | 128 si plein), a la taille w x h */
  objAtlas(buf: Uint8Array, w: number, h: number): void;
  /** un rectangle de l'atlas a change : on ne renvoie que lui */
  objAtlasPatch(x0: number, y0: number, x1: number, y1: number): void;
  /** calcule le sol, pose dessus les objets de la carte graphique et l'image du processeur (mb 255 : rien, db : rang), avec
   *  ombres et lumieres, et affiche */
  drawGround(f: Frame & { db: Uint16Array }, v: GroundView, objs: Objects | null, fx: Fx | null): void;
}

// une texture d'octets : format et taille ; la memoire est a nous, envoyee telle quelle
function byteSource(resource: Uint8Array, width: number, height: number, format: 'rgba8unorm' | 'rg8unorm'){
  return new BufferImageSource({ resource, width, height, format, scaleMode: 'nearest', alphaMode: 'no-premultiply-alpha' });
}

/** essaie d'ouvrir WebGL sur le canvas ; null si ce n'est pas possible (le jeu garde alors le canvas 2D) */
export async function createPresenter(canvas: HTMLCanvasElement, w: number, h: number): Promise<Presenter | null> {
  // on verifie WebGL2 sur un canvas jetable : un canvas ne change plus de sorte de contexte une fois ouvert
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return null;
  const maxTex: number = probe.getParameter(probe.MAX_TEXTURE_SIZE);
  const info = probe.getExtension('WEBGL_debug_renderer_info');
  const rendererName = String(probe.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : probe.RENDERER) || '');
  const software = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(rendererName);
  probe.getExtension('WEBGL_lose_context')?.loseContext();
  const renderer = new WebGLRenderer();
  try {
    await renderer.init({ canvas, width: w, height: h, resolution: 1, autoDensity: false, antialias: false, preserveDrawingBuffer: true, backgroundColor: 0x1d5c96, preferWebGLVersion: 2 });
  } catch (_) { return null; }
  const gl = renderer.gl;

  let W = w, H = h;
  let data = new Uint8Array(W * H * 4), data32 = new Uint32Array(data.buffer);
  const dataSrc = byteSource(data, W, H, 'rgba8unorm');
  let palRows = 1, pal8 = new Uint8Array(PAL_W * 4);
  const palSrc = byteSource(pal8, PAL_W, palRows, 'rgba8unorm');
  let palVer = '';
  // sol : grille, quart, territoire, table des matieres (petites textures vides tant que rien n'est envoye)
  let grid: GroundGrid = { gw: 2, gh: 2, cells: new Uint8Array(8), qw: 2, qh: 2, quarter: new Uint8Array(8) };
  const cellsSrc = byteSource(grid.cells, 2, 2, 'rg8unorm'), quarterSrc = byteSource(grid.quarter, 2, 2, 'rg8unorm');
  let ter8 = new Uint8Array(2 * 2 * 4);
  const terSrc = byteSource(ter8, 2, 2, 'rgba8unorm');
  const lut = new Uint8Array(256 * 2 * 4);
  const lutSrc = byteSource(lut, 256, 2, 'rgba8unorm');
  // objets : atlas des dessins, et la couche des objets de l'image en cours (texture hors ecran, a la taille de l'image)
  let atlas: { buf: Uint8Array; w: number; h: number } = { buf: new Uint8Array(4 * 4), w: 2, h: 2 };
  const atlasSrc = byteSource(atlas.buf, 2, 2, 'rgba8unorm');
  const objRT = RenderTexture.create({ width: W, height: H, scaleMode: 'nearest', antialias: false });
  // ombres et lumieres de l'image en cours (etape 0.19, 3.4)
  const shadowRT = RenderTexture.create({ width: W, height: H, scaleMode: 'nearest', antialias: false });
  const lightRT = RenderTexture.create({ width: W, height: H, scaleMode: 'nearest', antialias: false });

  const quad = (): number[] => [0, 0, W, 0, W, H, 0, H];
  const geometry = new Geometry({ attributes: { aPosition: quad(), aUV: [0, 0, 1, 0, 1, 1, 0, 1] }, indexBuffer: [0, 1, 2, 0, 2, 3] });
  const f32 = (value: number) => ({ value, type: 'f32' as const });
  const v2 = () => ({ value: new Float32Array(2), type: 'vec2<f32>' as const });
  const v3 = () => ({ value: new Float32Array(3), type: 'vec3<f32>' as const });
  const v4 = () => ({ value: new Float32Array(4), type: 'vec4<f32>' as const });
  const params = new UniformGroup({
    uStride: f32(0), uMode: f32(0), uSize: v2(), uO: v2(), uD: v4(), uG0: v3(), uGrid: v4(), uT: v2(), uAnim: v2(),
    uTerI: v4(), uBeamA: v4(), uBeamB: v4(), uPT: f32(0), uMatA: v4(), uMatB: v4(), uRefl: v4(), uReflB: v2(),
  });
  // deux programmes qui partagent textures et reglages : la mise en couleur seule, et le sol
  const resources = { uData: dataSrc, uPal: palSrc, uCells: cellsSrc, uQuarter: quarterSrc, uTer: terSrc, uLut: lutSrc, uObj: objRT.source, uShadow: shadowRT.source, uLight: lightRT.source, uParams: params };
  const shaderPal = Shader.from({ gl: { vertex: VERT, fragment: FRAG, name: 'ckt-palette' }, resources });
  const shaderGround = Shader.from({ gl: { vertex: VERT, fragment: FRAG_GROUND, name: 'ckt-sol' }, resources });
  const U: Record<string, number | Float32Array> = params.uniforms;
  const set = (k: string, ...xs: number[]) => { const u = U[k]; if (u instanceof Float32Array) u.set(xs); };
  const mesh = new Mesh({ geometry, shader: shaderPal, texture: Texture.WHITE });
  const stage = new Container();
  stage.addChild(mesh);
  // la couche des objets : un seul maillage de quadrilateres, redimensionne quand il en faut plus
  let cap = 0;
  const posBuf = new Buffer({ data: new Float32Array(0), usage: BufferUsage.VERTEX | BufferUsage.COPY_DST });
  const quadBuf = new Buffer({ data: new Float32Array(0), usage: BufferUsage.VERTEX | BufferUsage.COPY_DST });
  const texBuf = new Buffer({ data: new Float32Array(0), usage: BufferUsage.VERTEX | BufferUsage.COPY_DST });
  const idxBuf = new Buffer({ data: new Uint32Array(0), usage: BufferUsage.INDEX | BufferUsage.COPY_DST });
  const objGeom = new Geometry({ attributes: { aPos: { buffer: posBuf, format: 'float32x2' }, aQuad: { buffer: quadBuf, format: 'float32x4' }, aTex: { buffer: texBuf, format: 'float32x4' } }, indexBuffer: idxBuf });
  const objParams = new UniformGroup({ uSize: v2() });
  const objShader = Shader.from({ gl: { vertex: OBJ_VERT, fragment: OBJ_FRAG, name: 'ckt-objets' }, resources: { uAtlas: atlasSrc, uObjParams: objParams } });
  const objMesh = new Mesh({ geometry: objGeom, shader: objShader, texture: Texture.WHITE });
  objMesh.blendMode = 'none';
  const objStage = new Container();
  objStage.addChild(objMesh);
  const growObjects = (n: number) => {
    if (n <= cap) return;
    cap = Math.max(n, cap * 2, 256);
    posBuf.data = new Float32Array(cap * 8); quadBuf.data = new Float32Array(cap * 16); texBuf.data = new Float32Array(cap * 16);
    const idx = new Uint32Array(cap * 6);
    for (let k = 0; k < cap; k++){ const v0 = k * 4, j = k * 6; idx[j] = v0; idx[j + 1] = v0 + 1; idx[j + 2] = v0 + 2; idx[j + 3] = v0; idx[j + 4] = v0 + 2; idx[j + 5] = v0 + 3; }
    idxBuf.data = idx;
  };
  // ombres : des triangles ; lumieres : un rectangle par lumiere, avec ses reglages sur chaque coin
  const vbuf = () => new Buffer({ data: new Float32Array(0), usage: BufferUsage.VERTEX | BufferUsage.COPY_DST });
  const shPos = vbuf();
  const shGeom = new Geometry({ attributes: { aPos: { buffer: shPos, format: 'float32x2' } } });
  const fxParams = new UniformGroup({ uSize: v2(), uO: v2(), uD: v4(), uT: v2(), uPat: f32(0) });
  const shMesh = new Mesh({ geometry: shGeom, shader: Shader.from({ gl: { vertex: SHADOW_VERT, fragment: SHADOW_FRAG, name: 'ckt-ombres' }, resources: { uFx: fxParams } }), texture: Texture.WHITE });
  shMesh.blendMode = 'none';
  const shStage = new Container(); shStage.addChild(shMesh);
  const lPos = vbuf(), lA = vbuf(), lB = vbuf(), lC = vbuf();
  const lIdx = new Buffer({ data: new Uint32Array(0), usage: BufferUsage.INDEX | BufferUsage.COPY_DST });
  const lGeom = new Geometry({ attributes: { aPos: { buffer: lPos, format: 'float32x2' }, aL0: { buffer: lA, format: 'float32x4' }, aL1: { buffer: lB, format: 'float32x4' }, aL2: { buffer: lC, format: 'float32x4' } }, indexBuffer: lIdx });
  const lMesh = new Mesh({ geometry: lGeom, shader: Shader.from({ gl: { vertex: LIGHT_VERT, fragment: LIGHT_FRAG, name: 'ckt-lumieres' }, resources: { uFx: fxParams } }), texture: Texture.WHITE });
  lMesh.blendMode = 'none';
  const lStage = new Container(); lStage.addChild(lMesh);
  let lCap = 0;
  const renderFx = (fx: Fx | null) => {
    const FU: Record<string, number | Float32Array> = fxParams.uniforms;
    const setU = (k: string, ...xs: number[]) => { const u = FU[k]; if (u instanceof Float32Array) u.set(xs); };
    setU('uSize', W, H);
    if (fx){ setU('uO', fx.o[0], fx.o[1]); setU('uD', fx.d[0], fx.d[1], fx.d[2], fx.d[3]); setU('uT', fx.tx, fx.ty); FU.uPat = fx.pat; }
    fxParams.update();
    // ombres : triangles (une texture vide s'il n'y en a pas)
    const nt = fx ? fx.nTri : 0;
    const P = new Float32Array(Math.max(1, nt) * 6);
    if (fx) P.set(fx.tri.subarray(0, nt * 6));
    shPos.data = P;
    renderer.render({ container: shStage, target: shadowRT, clear: true, clearColor: [0, 0, 0, 0] });
    // lumieres : de la derniere a la premiere, chacune recouvre les suivantes
    const nl = fx ? fx.nLights : 0;
    if (Math.max(1, nl) > lCap){
      lCap = Math.max(nl, lCap * 2, 64);
      lPos.data = new Float32Array(lCap * 8); lA.data = new Float32Array(lCap * 16); lB.data = new Float32Array(lCap * 16); lC.data = new Float32Array(lCap * 16);
      const idx = new Uint32Array(lCap * 6);
      for (let k = 0; k < lCap; k++){ const v0 = k * 4, j = k * 6; idx[j] = v0; idx[j + 1] = v0 + 1; idx[j + 2] = v0 + 2; idx[j + 3] = v0; idx[j + 4] = v0 + 2; idx[j + 5] = v0 + 3; }
      lIdx.data = idx;
    }
    const LP = lPos.data, L0 = lA.data, L1 = lB.data, L2 = lC.data;
    if (fx) for (let k = 0; k < nl; k++){
      const s = (nl - 1 - k) * LIGHT, q = fx.lights, p = k * 8, x0 = q[s], y0 = q[s + 1], x1 = q[s + 2], y1 = q[s + 3];
      LP[p] = x0; LP[p + 1] = y0; LP[p + 2] = x1; LP[p + 3] = y0; LP[p + 4] = x1; LP[p + 5] = y1; LP[p + 6] = x0; LP[p + 7] = y1;
      for (let v = 0, j = k * 16; v < 4; v++, j += 4){
        L0[j] = q[s + 4]; L0[j + 1] = q[s + 5]; L0[j + 2] = q[s + 6]; L0[j + 3] = q[s + 7];
        L1[j] = q[s + 8]; L1[j + 1] = q[s + 9]; L1[j + 2] = q[s + 10]; L1[j + 3] = q[s + 11];
        L2[j] = q[s + 12]; L2[j + 1] = q[s + 13]; L2[j + 2] = q[s + 14]; L2[j + 3] = q[s + 15];
      }
    }
    LP.fill(0, nl * 8);
    lPos.update(); lA.update(); lB.update(); lC.update();
    renderer.render({ container: lStage, target: lightRT, clear: true, clearColor: [0, 0, 0, 0] });
  };
  // dessine la couche des objets dans sa texture (vide s'il n'y en a pas)
  const renderObjects = (o: Objects | null) => {
    const n = o ? o.n : 0;
    growObjects(Math.max(1, n));
    const P = posBuf.data, Q = quadBuf.data, T = texBuf.data;
    if (o) for (let k = 0; k < n; k++){
      const s = k * QUAD, q = o.q, p = k * 8, x0 = q[s], y0 = q[s + 1], w = q[s + 2], h = q[s + 3], sc = q[s + 4], x1 = x0 + w * sc, y1 = y0 + h * sc;
      P[p] = x0; P[p + 1] = y0; P[p + 2] = x1; P[p + 3] = y0; P[p + 4] = x1; P[p + 5] = y1; P[p + 6] = x0; P[p + 7] = y1;
      for (let v = 0, j = k * 16; v < 4; v++, j += 4){ Q[j] = x0; Q[j + 1] = y0; Q[j + 2] = sc; Q[j + 3] = q[s + 7]; T[j] = q[s + 5]; T[j + 1] = q[s + 6]; T[j + 2] = w; T[j + 3] = h; }
    }
    // le reste du maillage ne dessine rien (quadrilateres plats)
    P.fill(0, n * 8);
    posBuf.update(); quadBuf.update(); texBuf.update();
    const u = objParams.uniforms.uSize; if (u instanceof Float32Array) u.set([W, H]);
    objParams.update();
    renderer.render({ container: objStage, target: objRT, clear: true, clearColor: [0, 0, 0, 0] });
  };

  const render = (mode: number) => {
    U.uMode = mode; set('uSize', W, H);
    params.update();
    mesh.shader = mode === 2 ? shaderGround : shaderPal;
    renderer.render({ container: stage });

  };
  // envoi d'un rectangle d'une texture d'octets deja creee sur la carte graphique
  const patch = (src: BufferImageSource, buf: Uint8Array, rowLen: number, bpp: number, x0: number, y0: number, w0: number, h0: number) => {
    renderer.texture.bindSource(src, 0);
    // (les reglages d'envoi sont ceux laisses par PixiJS : on fixe tous ceux qui comptent, sans alpha premultiplie ni retournement)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, rowLen); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, x0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, y0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, w0, h0, bpp === 2 ? gl.RG : gl.RGBA, gl.UNSIGNED_BYTE, buf);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  };

  return {
    maxTex, software, rendererName,

    resize(nw: number, nh: number){
      if (nw === W && nh === H) return;
      W = nw; H = nh;
      data = new Uint8Array(W * H * 4); data32 = new Uint32Array(data.buffer);
      dataSrc.resource = data; dataSrc.resize(W, H);
      objRT.resize(W, H); shadowRT.resize(W, H); lightRT.resize(W, H);
      geometry.getAttribute('aPosition').buffer.data = new Float32Array(quad());
      renderer.resize(W, H);
    },
    palette(pal: Uint32Array, stride: number, ver: string){
      if (ver === palVer) return;
      palVer = ver;
      const rows = Math.ceil(pal.length / PAL_W);
      if (rows !== palRows){ palRows = rows; pal8 = new Uint8Array(PAL_W * rows * 4); palSrc.resource = pal8; palSrc.resize(PAL_W, rows); }
      new Uint32Array(pal8.buffer).set(pal);
      palSrc.update();
      U.uStride = stride;
    },
    draw(f: Frame){
      const D = data32, FB = f.fb, MB = f.mb, LB = f.lb, OB = f.ob, n = Math.min(f.n, D.length);
      for (let i = 0; i < n; i++) D[i] = MB[i] | (FB[i] << 8) | (LB[i] << 16) | (OB[i] << 24);
      dataSrc.update();
      render(0);
    },
    drawRGBA(px: Uint32Array){
      data32.set(px.length > data32.length ? px.subarray(0, data32.length) : px);
      dataSrc.update();
      render(1);
    },
    groundMats(m: GroundMats){
      lut.fill(0);
      m.typeMat.forEach((mat, t) => { if (t < 256) lut[t * 4] = mat; });
      for (let k = 0; k < 256; k++){ const j = (256 + k) * 4; lut[j + 1] = m.glows[k] ? 255 : 0; lut[j + 2] = m.waters[k] ? 255 : 0; lut[j + 3] = m.keepTint[k] ? 255 : 0; }
      lutSrc.update();
      set('uMatA', m.sea, m.seaMid, m.seaShallow, m.foam); set('uMatB', m.beam, m.road, m.reflect, m.dark);
    },
    groundGrid(g: GroundGrid){
      grid = g;
      cellsSrc.resource = g.cells; cellsSrc.resize(g.gw, g.gh); cellsSrc.update();
      quarterSrc.resource = g.quarter; quarterSrc.resize(g.qw, g.qh); quarterSrc.update();
      set('uGrid', g.gw, g.gh, g.qw, g.qh);
    },
    groundPatch(x0: number, y0: number, x1: number, y1: number){
      const g = grid;
      const xa = Math.max(0, x0), ya = Math.max(0, y0), xb = Math.min(g.gw - 1, x1), yb = Math.min(g.gh - 1, y1);
      if (xb < xa || yb < ya) return;
      patch(cellsSrc, g.cells, g.gw, 2, xa, ya, xb - xa + 1, yb - ya + 1);
    },
    objAtlas(buf: Uint8Array, aw: number, ah: number){
      atlas = { buf, w: aw, h: ah };
      atlasSrc.resource = buf; atlasSrc.resize(aw, ah); atlasSrc.update();
    },
    objAtlasPatch(x0: number, y0: number, x1: number, y1: number){
      const xa = Math.max(0, x0), ya = Math.max(0, y0), xb = Math.min(atlas.w - 1, x1), yb = Math.min(atlas.h - 1, y1);
      if (xb < xa || yb < ya) return;
      patch(atlasSrc, atlas.buf, atlas.w, 4, xa, ya, xb - xa + 1, yb - ya + 1);
    },
    drawGround(f: Frame & { db: Uint16Array }, v: GroundView, objs: Objects | null, fx: Fx | null){
      // pixel pose : matiere, forme | eclairage << 1, rang ; pixel vide : 255, matiere d'une lumiere de nuit, ombre
      const D = data32, FB = f.fb, MB = f.mb, LB = f.lb, DB = f.db, n = Math.min(f.n, D.length);
      for (let i = 0; i < n; i++){ const m = MB[i]; D[i] = m === 255 ? (255 | (FB[i] << 8) | (LB[i] << 16)) : (m | ((FB[i] | (LB[i] << 1)) << 8) | (DB[i] << 16)); }
      dataSrc.update();
      renderObjects(objs);
      renderFx(fx);

      set('uO', v.o[0], v.o[1]); set('uD', v.dax, v.dbx, v.day, v.dby); set('uG0', v.ga0, v.gb0, v.gsc);
      set('uT', v.tx, v.ty); set('uAnim', v.tick, v.ring);
      const t = v.ter;
      if (t){
        if (t.changed || terSrc.width !== t.w || terSrc.height !== t.h){
          if (ter8.length !== t.w * t.h * 4){ ter8 = new Uint8Array(t.w * t.h * 4); terSrc.resource = ter8; terSrc.resize(t.w, t.h); }
          for (let i = 0, j = 0; i < t.own.length; i++, j += 4) ter8[j] = t.own[i];
          terSrc.update();
        }
        set('uTerI', t.w, t.h, t.sh, 1);
      } else set('uTerI', 0, 0, 0, 0);
      const b = v.beam;
      if (b){ set('uBeamA', b.a, b.b, b.c, b.s); set('uBeamB', b.tn === Infinity ? -1 : b.tn, b.I, 1, b.noise ? 1 : 0); U.uPT = b.pt; }
      else set('uBeamB', 0, 0, 0, 0);
      const r = v.refl;
      if (r){ set('uRefl', 1, r.road ? 1 : 0, r.maxW, r.maxR); set('uReflB', r.tick, r.wet); }
      else set('uRefl', 0, 0, 0, 0);
      render(2);
    },
  };
}
