// Affichage de l'image du jeu par PixiJS (etape 3.1 du plan de migration).
// Le moteur dessine toujours dans ses tampons (forme, matiere, eclairage, camp) ; ici, on les envoie a la carte graphique
// en une texture, et un shader fait la mise en couleur par la palette (ce que faisait la boucle de pixels).
// L'image reste a la taille du jeu : le navigateur l'agrandit au pixel pres (image-rendering: pixelated), le style est garde.
// Sans WebGL, on rend la main : le jeu garde son affichage par canvas 2D.
// Ce module ne depend d'aucun module du jeu.
import { Geometry, Mesh, Shader, Texture, BufferImageSource, WebGLRenderer, Container } from 'pixi.js';

/** les tampons d'une image : un octet par pixel chacun, n pixels */
export interface Frame { fb: Uint8Array; mb: Uint8Array; lb: Uint8Array; ob: Uint8Array; n: number }

export interface Presenter {
  /** taille de l'image (pixels du jeu) */
  resize(w: number, h: number): void;
  /** palette : pal[ob * stride + ((m << 1 | fb) * 5 + lb)] en ABGR ; ver change quand la palette change */
  palette(pal: Uint32Array, stride: number, ver: string): void;
  /** met l'image en couleur et l'affiche */
  draw(f: Frame): void;
  /** affiche une image deja en couleur (ABGR, un mot par pixel) */
  drawRGBA(px: Uint32Array): void;
}

const PAL_W = 1024;

const VERT = `#version 300 es
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main(){
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}`;

// d : r = matiere, g = forme (0 ou 1), b = eclairage (0 a 4), a = camp (0 a 4)
const FRAG = `#version 300 es
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uData;
uniform sampler2D uPal;
uniform float uStride;
uniform float uDirect;
void main(){
  if (uDirect > 0.5){ finalColor = vec4(texture(uData, vUV).rgb, 1.0); return; }
  vec4 d = texture(uData, vUV) * 255.0 + 0.5;
  int m = int(d.r), f = int(d.g), l = int(d.b), o = int(d.a);
  int i = o * int(uStride) + ((m * 2 + f) * 5 + l);
  finalColor = vec4(texelFetch(uPal, ivec2(i % ${PAL_W}, i / ${PAL_W}), 0).rgb, 1.0);
}`;

/** essaie d'ouvrir WebGL sur le canvas ; null si ce n'est pas possible (le jeu garde alors le canvas 2D) */
export async function createPresenter(canvas: HTMLCanvasElement, w: number, h: number): Promise<Presenter | null> {
  // on verifie WebGL2 sur un canvas jetable : un canvas ne change plus de sorte de contexte une fois ouvert
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return null;
  probe.getExtension('WEBGL_lose_context')?.loseContext();
  const renderer = new WebGLRenderer();
  try {
    await renderer.init({ canvas, width: w, height: h, resolution: 1, autoDensity: false, antialias: false, preserveDrawingBuffer: true, backgroundColor: 0x1d5c96, preferWebGLVersion: 2 });
  } catch (_) { return null; }

  let W = w, H = h;
  let data = new Uint8Array(W * H * 4), data32 = new Uint32Array(data.buffer);
  const dataSrc = new BufferImageSource({ resource: data, width: W, height: H, format: 'rgba8unorm', scaleMode: 'nearest', alphaMode: 'no-premultiply-alpha' });
  let palRows = 1, pal8 = new Uint8Array(PAL_W * 4);
  const palSrc = new BufferImageSource({ resource: pal8, width: PAL_W, height: palRows, format: 'rgba8unorm', scaleMode: 'nearest', alphaMode: 'no-premultiply-alpha' });
  let palVer = '';

  const quad = (): number[] => [0, 0, W, 0, W, H, 0, H];
  const geometry = new Geometry({ attributes: { aPosition: quad(), aUV: [0, 0, 1, 0, 1, 1, 0, 1] }, indexBuffer: [0, 1, 2, 0, 2, 3] });
  const shader = Shader.from({
    gl: { vertex: VERT, fragment: FRAG, name: 'ckt-palette' },
    resources: { uData: dataSrc, uPal: palSrc, uParams: { uStride: { value: 0, type: 'f32' }, uDirect: { value: 0, type: 'f32' } } },
  });
  const mesh = new Mesh({ geometry, shader, texture: Texture.WHITE });
  const stage = new Container();
  stage.addChild(mesh);

  return {
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
      shader.resources.uParams.uniforms.uStride = stride;
    },
    draw(f: Frame){
      const D = data32, FB = f.fb, MB = f.mb, LB = f.lb, OB = f.ob, n = Math.min(f.n, D.length);
      for (let i = 0; i < n; i++) D[i] = MB[i] | (FB[i] << 8) | (LB[i] << 16) | (OB[i] << 24);
      dataSrc.update();
      shader.resources.uParams.uniforms.uDirect = 0;
      renderer.render({ container: stage });
    },
    drawRGBA(px: Uint32Array){
      data32.set(px.length > data32.length ? px.subarray(0, data32.length) : px);
      dataSrc.update();
      shader.resources.uParams.uniforms.uDirect = 1;
      renderer.render({ container: stage });
    },

  };
}
