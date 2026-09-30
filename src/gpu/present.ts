// Affichage de l'image du jeu par PixiJS (etapes 3.1 et 3.2 du plan de migration).
// Le moteur dessine dans ses tampons (forme, matiere, eclairage, camp) ; ici, on les envoie a la carte graphique
// en une texture, et un shader (ground-glsl.ts) fait la mise en couleur par la palette. En mode sol, le shader calcule
// aussi le sol au pixel, a partir de la grille du sol envoyee une fois (puis par morceaux quand elle change).
// L'image reste a la taille du jeu : le navigateur l'agrandit au pixel pres (image-rendering: pixelated), le style est garde.
// Sans WebGL2, on rend la main : le jeu garde son affichage par canvas 2D.
// Ce module ne depend d'aucun module du jeu.
import { Geometry, Mesh, Shader, Texture, BufferImageSource, WebGLRenderer, Container, UniformGroup } from 'pixi.js';
import { FRAG, FRAG_GROUND, PAL_W, VERT } from './ground-glsl.ts';

/** les tampons d'une image : un octet par pixel chacun, n pixels */
export interface Frame { fb: Uint8Array; mb: Uint8Array; lb: Uint8Array; ob: Uint8Array; n: number }

/** matieres dont le shader du sol a besoin */
export interface GroundMats {
  /** matiere de chaque type de sol */
  typeMat: number[];
  sea: number; seaMid: number; seaShallow: number; foam: number; beam: number; road: number; reflect: number;
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

export interface Presenter {
  /** plus grand cote d'une texture sur cette carte graphique */
  readonly maxTex: number;
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
  /** calcule le sol, pose l'image du processeur dessus (mb 255 : rien), et affiche */
  drawGround(f: Frame, v: GroundView): void;
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
  const resources = { uData: dataSrc, uPal: palSrc, uCells: cellsSrc, uQuarter: quarterSrc, uTer: terSrc, uLut: lutSrc, uParams: params };
  const shaderPal = Shader.from({ gl: { vertex: VERT, fragment: FRAG, name: 'ckt-palette' }, resources });
  const shaderGround = Shader.from({ gl: { vertex: VERT, fragment: FRAG_GROUND, name: 'ckt-sol' }, resources });
  const U: Record<string, number | Float32Array> = params.uniforms;
  const set = (k: string, ...xs: number[]) => { const u = U[k]; if (u instanceof Float32Array) u.set(xs); };
  const mesh = new Mesh({ geometry, shader: shaderPal, texture: Texture.WHITE });
  const stage = new Container();
  stage.addChild(mesh);

  const render = (mode: number) => {
    U.uMode = mode; set('uSize', W, H);
    params.update();
    mesh.shader = mode === 2 ? shaderGround : shaderPal;
    renderer.render({ container: stage });

  };
  // envoi d'un rectangle d'une texture d'octets deja creee sur la carte graphique
  const patch = (src: BufferImageSource, buf: Uint8Array, rowLen: number, bpp: number, x0: number, y0: number, w0: number, h0: number) => {
    renderer.texture.bindSource(src, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, rowLen); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, x0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, y0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, w0, h0, bpp === 2 ? gl.RG : gl.RGBA, gl.UNSIGNED_BYTE, buf);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  };

  return {
    maxTex,
    resize(nw: number, nh: number){
      if (nw === W && nh === H) return;
      W = nw; H = nh;
      data = new Uint8Array(W * H * 4); data32 = new Uint32Array(data.buffer);
      dataSrc.resource = data; dataSrc.resize(W, H);
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
      set('uMatA', m.sea, m.seaMid, m.seaShallow, m.foam); set('uMatB', m.beam, m.road, m.reflect, 0);
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
    drawGround(f: Frame, v: GroundView){
      const D = data32, FB = f.fb, MB = f.mb, LB = f.lb, n = Math.min(f.n, D.length);
      for (let i = 0; i < n; i++) D[i] = MB[i] | (FB[i] << 8) | (LB[i] << 16);
      dataSrc.update();
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
