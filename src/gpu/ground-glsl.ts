// Shader de l'image du jeu (etapes 3.1 et 3.2 du plan de migration), en GLSL ES 3.00.
// Trois facons de faire, selon uMode :
//  0 : l'image est entierement faite par le processeur ; on la met seulement en couleur par la palette.
//  1 : l'image est deja en couleur (le globe) ; on l'affiche telle quelle.
//  2 : le sol est calcule ici, au pixel, comme le faisait renderGround (11-render) : herbe, mer, ecume, faisceau du phare,
//      teinte et frontieres des camps. Le processeur n'a dessine que ce qui est pose dessus (uData, 255 : rien).
//      Pour un pixel vide, il a laisse deux indications : ombre portee (b = 4) et lumiere de nuit (g = sa matiere).
//      Les reflets de nuit (eau, routes mouillees, 18-life) sont faits ici aussi, a la fin.
// Les regles et les bruits sont les memes que sur le processeur (hash2 en entiers 32 bits), l'image est la meme.

export const VERT = `#version 300 es
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

export const PAL_W = 1024;

const FRAG_SRC = `#version 300 es
__DEFINES__
precision highp float;
precision highp int;
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uData;     // r matiere, g forme, b eclairage, a camp (mode 0) ; en mode 2, ce qui est pose sur le sol
uniform sampler2D uPal;      // palette, ${PAL_W} couleurs par ligne
uniform sampler2D uCells;    // grille du sol : r = type | classe de mer << 4, g = teinte
uniform sampler2D uQuarter;  // grille au quart : r = variante de l'herbe, g = phase de l'ecume
uniform sampler2D uTer;      // territoire : r = camp (+ 2 juste conquis)
uniform sampler2D uLut;      // ligne 0 : matiere de chaque type de sol ; ligne 1 : g lumineux, b eau, a garde sa teinte
uniform sampler2D uObj;      // objets poses par la carte graphique (etape 0.19, 3.3) : r matiere, g forme | eclairage << 1, b + a * 256 rang (0 : rien)
uniform sampler2D uShadow;   // ombres portees (etape 3.4) : r > 0 dans l'ombre
uniform sampler2D uLight;    // lumieres de nuit (etape 3.4) : r = matiere de la lumiere (0 : aucune)
uniform float uStride;
uniform float uMode;
uniform vec2 uSize;          // taille de l'image
uniform vec2 uO;             // point du sol au centre du premier pixel
uniform vec4 uD;             // pas au sol : (da, db) par pixel en x, puis par pixel en y
uniform vec3 uG0;            // origine de la grille (a, b) et cases par unite
uniform vec4 uGrid;          // grille : largeur, hauteur ; quart : largeur, hauteur
uniform vec2 uT;             // ancrage de la trame (TX, TY)
uniform vec2 uAnim;          // tick de l'ecume, anneaux
uniform vec4 uTerI;          // territoire : largeur, hauteur, decalage (cases de sol par case), present
uniform vec4 uBeamA;         // phare : a, b, cos, sin
uniform vec4 uBeamB;         // phare : tangente du cone (negative : tout), intensite, allume, trame de bruit
uniform float uPT;           // trame du faisceau, 16 bits
uniform vec4 uMatA;          // matieres : mer profonde, mer moyenne, haut-fond, ecume
uniform vec4 uMatB;          // matieres : faisceau, route, reflet
uniform vec4 uRefl;          // reflets : allumes, routes mouillees, portee dans l'eau, portee sur la route
uniform vec2 uReflB;         // reflets : tick, mouille

const int BAYER[16] = int[16](0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5);

float hash2(int x, int y){
  uint h = uint(x) * 374761393u + uint(y) * 668265263u;
  h = (h ^ (h >> 13u)) * 1274126177u;
  h ^= h >> 16u;
  return float(h) / 4294967296.0;
}
int byte(float v){ return int(v * 255.0 + 0.5); }
ivec4 bytes(vec4 v){ return ivec4(v * 255.0 + 0.5); }
#ifdef GROUND
int lutType(int t){ return byte(texelFetch(uLut, ivec2(t, 0), 0).r); }
ivec4 lutMat(int m){ return bytes(texelFetch(uLut, ivec2(m, 1), 0)); }

// point du sol sous un pixel, en cases de la grille
vec2 cellPos(int x, int y){
  vec2 w = uO + float(x) * uD.xy + float(y) * uD.zw;
  return (w - uG0.xy) * uG0.z;
}
bool inGrid(vec2 f){ return f.x >= 0.0 && f.y >= 0.0 && f.x < uGrid.x && f.y < uGrid.y; }
// camp d'un pixel (0 : personne ; 3 et 4 : juste conquis), seulement sur la terre ferme
int ownAt(int x, int y){
  if (uTerI.w < 0.5) return 0;
  vec2 f = cellPos(x, y);
  if (!inGrid(f)) return 0;
  ivec2 c = ivec2(f);
  if ((byte(texelFetch(uCells, c, 0).r) & 15) == 0) return 0;
  int sh = int(uTerI.z);
  return byte(texelFetch(uTer, ivec2(c.x >> sh, c.y >> sh), 0).r);
}
int baseOf(int o){ return o > 2 ? o - 2 : o; }
// ce qui est dessus en un pixel : ce qu'a dessine le processeur ou un objet pose par la carte graphique, le plus haut rang
// l'emporte (a rang egal, le processeur). Rend faux s'il n'y a rien (le sol).
bool topAt(ivec2 q, out int m, out int f, out int l, out int rk){
  ivec4 u = bytes(texelFetch(uData, q, 0)), ob = bytes(texelFetch(uObj, q, 0));
  int ru = u.b + u.a * 256, ro = ob.b + ob.a * 256;
  bool hu = u.r != 255, ho = ro > 0;
  if (hu && (!ho || ru >= ro)){ m = u.r; f = u.g & 1; l = (u.g >> 1) & 7; rk = ru; return true; }
  if (ho){ m = ob.r; f = ob.g & 1; l = (ob.g >> 1) & 7; rk = ro; return true; }
  m = 0; f = 0; l = 0; rk = 0; return false;
}
#endif

void main(){
  int x = int(vUV.x * uSize.x), y = int(vUV.y * uSize.y);
  ivec2 p = ivec2(x, y);
  vec4 dv = texelFetch(uData, p, 0);
  if (uMode > 0.5 && uMode < 1.5){ finalColor = vec4(dv.rgb, 1.0); return; }
  ivec4 d = bytes(dv);
  int m, f, l, o;
  if (uMode < 0.5){ m = d.r; f = d.g; l = d.b; o = d.a; }
#ifdef GROUND
  else {
    // ---- le sol ----
    int tx = int(uT.x), ty = int(uT.y), tick = int(uAnim.x);
    int ry = ((y - ty) & 3) << 2;
    vec2 fc = cellPos(x, y);
    int tone = 0, gm = int(uMatA.x), lv = 0, own = 0;
    ivec2 c = ivec2(0);
    if (inGrid(fc)){
      c = ivec2(fc);
      ivec2 cell = bytes(texelFetch(uCells, c, 0)).rg;
      int ty2 = cell.r & 15; tone = cell.g;
      if (ty2 == 0){ int cls = cell.r >> 4; gm = cls == 0 ? int(uMatA.z) : cls == 1 ? int(uMatA.y) : int(uMatA.x); }
      else {
        gm = lutType(ty2);
        if (ty2 == 1) lv = byte(texelFetch(uQuarter, ivec2(c.x >> 2, c.y >> 2), 0).r);
        if (uTerI.w > 0.5){ int sh = int(uTerI.z); own = byte(texelFetch(uTer, ivec2(c.x >> sh, c.y >> sh), 0).r); }
      }
    }
    int v = 0;
    if (tone != 0){
      if (tone >= 32){
        gm = int(uMatA.w);
        int dd = tone - 32, ia = c.x, ib = c.y;
        if (dd <= 2) v = hash2((ia >> 2) + tick * 3, ib >> 1) < 0.6 ? 1 : 0;
        else if (dd <= 4) v = hash2(ia * 5 + tick, ib * 3) < 0.12 ? 1 : 0;
        else {
          float ph = float(byte(texelFetch(uQuarter, ivec2(ia >> 2, ib >> 2), 0).g));
          float r = 5.2 - mod(uAnim.y + ph / 15.0, 3.6), q = float(dd) * 0.5 - r;
          v = (q < 0.35 && q > -0.35 && hash2((ia >> 1) + tick, ib * 7) < 0.45) ? 1 : 0;
        }
      } else if (tone >= 16) v = 1;
      else v = BAYER[ry | ((x - tx) & 3)] < tone ? 1 : 0;
    }
    // faisceau du phare, la nuit
    if (v == 0 && uBeamB.z > 0.5){
      vec2 w = uO + float(x) * uD.xy + float(y) * uD.zw - uBeamA.xy;
      float al = w.x * uBeamA.z + w.y * uBeamA.w, pe = w.y * uBeamA.z - w.x * uBeamA.w;
      if (uBeamB.x < 0.0 || abs(pe) <= abs(al) * uBeamB.x + 1.2){
        if (uBeamB.w > 0.5) v = hash2((x - tx) * 7 + 1013, (y - ty) * 13 + 7) < uBeamB.y ? 1 : 0;
        else v = (int(uPT) >> (ry | ((x - tx) & 3))) & 1;
        if (v != 0) gm = int(uMatB.x);
      }
    }
    // camp et frontiere : un pixel de couleur franche de chaque cote du changement de camp
    o = own;
    int base = baseOf(own);
    if (base != 0){
      int W = int(uSize.x), H = int(uSize.y);
      bool edge = (x > 0 && baseOf(ownAt(x - 1, y)) != base) || (x < W - 1 && baseOf(ownAt(x + 1, y)) != base)
        || (y > 0 && baseOf(ownAt(x, y - 1)) != base) || (y < H - 1 && baseOf(ownAt(x, y + 1)) != base);
      if (edge) o = base + 2;
    }
    // ce qui est pose sur le sol l'emporte ; sinon le sol, avec son ombre et sa lumiere de nuit
    // ombres et lumieres, dans l'ordre du processeur : ombres portees, puis lumieres de nuit (sur un pixel sombre), puis
    // ombres des arbres (d.b = 4 pour un pixel vide ; eclairage 4 pour un pixel pose). Elles ne touchent que le sol et ce qui
    // a ete pose avant les objets (rang 0 : vagues, decors au sol).
    bool sh = texelFetch(uShadow, p, 0).r > 0.0;
    int lm = byte(texelFetch(uLight, p, 0).r), rk;
    if (!topAt(p, m, f, l, rk)){
      bool tree = d.b == 4;
      m = gm; f = v; l = (sh || tree) ? 4 : lv;
      int lk = d.g != 0 ? d.g : lm;
      if (lk != 0 && v == 0){ m = lk; f = 1; l = tree ? 4 : 0; }
    } else if (rk == 0){
      if (lm != 0 && f == 0){ m = lm; f = 1; l = l == 4 ? 4 : 0; }
      else if (sh) l = 4;
    }
    // reflets de nuit : sous une lumiere, l'eau et les routes mouillees renvoient sa couleur
    if (uRefl.x > 0.5){
      ivec4 me = lutMat(m);
      bool water = me.b != 0, road = uRefl.y > 0.5 && m == int(uMatB.y) && f == 0;
      if ((water || road) && !(f == 1 && me.g != 0)){
        int maxW = int(uRefl.z), dist = 0, gm2 = 0;
        for (int k = 1; k <= 40; k++){
          if (k > maxW || y - k < 0) break;
          int um, uf, ul, ur;
          if (topAt(ivec2(x, y - k), um, uf, ul, ur) && uf == 1 && lutMat(um).g != 0){ dist = k; gm2 = um; break; }

        }
        if (dist > 0){
          int rt = int(uReflB.x), refl = lutMat(gm2).a != 0 ? gm2 : int(uMatB.z);
          float fd = float(dist);
          if (water){
            if (((y + (rt >> 1)) % 3) != 0 && hash2(x * 3 + ((y + rt) >> 1), y) < 0.7 - fd / float(maxW)){ f = 1; m = refl; l = 0; }
          } else if (fd <= uRefl.w){
            if (hash2(x, y + rt * 3) < (0.5 - fd / (uRefl.w * 2.2)) * uReflB.y){ f = 1; m = refl; l = 0; }
          }
        }
      }
    }
  }
#else
  else { m = d.r; f = d.g; l = d.b; o = d.a; }
#endif
  int i = o * int(uStride) + ((m * 2 + f) * 5 + l);
  finalColor = vec4(texelFetch(uPal, ivec2(i % ${PAL_W}, i / ${PAL_W}), 0).rgb, 1.0);
}`;

// deux programmes : la mise en couleur seule (modes 0 et 1), et le sol (mode 2), pour ne payer le sol que quand il sert
export const FRAG = FRAG_SRC.replace('__DEFINES__', '');
export const FRAG_GROUND = FRAG_SRC.replace('__DEFINES__', '#define GROUND 1');

// Couche des objets (etape 3.3) : chaque objet pose par la carte graphique est un quadrilatere qui lit son dessin dans
// l'atlas (r matiere, g forme | eclairage << 1 | 128 si le pixel est plein). On ecrit le rang de l'objet a cote, pour que
// le shader de l'image garde ce qui est devant. Les quadrilateres sont dessines dans l'ordre : le suivant recouvre.
// La position est en pixels de l'image, ligne 0 en haut, rangee telle quelle dans la texture (ligne 0 = premiere ligne).
export const OBJ_VERT = `#version 300 es
in vec2 aPos;
in vec4 aQuad;   // origine (x, y) a l'image, echelle, rang
in vec4 aTex;    // coin dans l'atlas (u, v), taille du dessin (w, h)
flat out vec4 vQuad;
flat out vec4 vTex;
uniform vec2 uSize;
void main(){
  gl_Position = vec4(aPos.x / uSize.x * 2.0 - 1.0, aPos.y / uSize.y * 2.0 - 1.0, 0.0, 1.0);
  vQuad = aQuad; vTex = aTex;
}`;

// le texel lu est calcule comme sprBlit (11-render) : floor((pixel + 0,5 - origine) / echelle), sur chaque axe
export const OBJ_FRAG = `#version 300 es
precision highp float;
precision highp int;
flat in vec4 vQuad;
flat in vec4 vTex;
out vec4 finalColor;
uniform sampler2D uAtlas;
void main(){
  float inv = 1.0 / vQuad.z;
  int sx = int(floor((gl_FragCoord.x - vQuad.x) * inv)), sy = int(floor((gl_FragCoord.y - vQuad.y) * inv));
  if (sx < 0 || sy < 0 || sx >= int(vTex.z) || sy >= int(vTex.w)) discard;
  ivec4 a = ivec4(texelFetch(uAtlas, ivec2(int(vTex.x) + sx, int(vTex.y) + sy), 0) * 255.0 + 0.5);
  if ((a.g & 128) == 0) discard;
  int r = int(vQuad.w + 0.5);
  finalColor = vec4(float(a.r), float(a.g & 127), float(r & 255), float(r >> 8)) / 255.0;
}`;

// Ombres portees (etape 3.4) : chaque ombre est un polygone convexe, en triangles, en pixels de l'image.
export const SHADOW_VERT = `#version 300 es
in vec2 aPos;
uniform vec2 uSize;
void main(){ gl_Position = vec4(aPos.x / uSize.x * 2.0 - 1.0, aPos.y / uSize.y * 2.0 - 1.0, 0.0, 1.0); }`;
export const SHADOW_FRAG = `#version 300 es
precision highp float;
out vec4 finalColor;
void main(){ finalColor = vec4(1.0, 0.0, 0.0, 1.0); }`;

// Lumieres de nuit (etape 3.4) : un rectangle par lumiere (son cadre a l'image) ; le shader refait le calcul d'applyLights
// (11-render) : disque ou cone au sol, attenuation, trame. Dessinees de la derniere a la premiere : la premiere l'emporte.
export const LIGHT_VERT = `#version 300 es
in vec2 aPos;
in vec4 aL0;   // cone (1) ou disque (0), a, b, matiere
in vec4 aL1;   // rayon, intensite, attenuation, longueur du cone
in vec4 aL2;   // direction du cone (da, db), tangente, largeur au pied
flat out vec4 vL0;
flat out vec4 vL1;
flat out vec4 vL2;
uniform vec2 uSize;
void main(){
  gl_Position = vec4(aPos.x / uSize.x * 2.0 - 1.0, aPos.y / uSize.y * 2.0 - 1.0, 0.0, 1.0);
  vL0 = aL0; vL1 = aL1; vL2 = aL2;
}`;
export const LIGHT_FRAG = `#version 300 es
precision highp float;
precision highp int;
flat in vec4 vL0;
flat in vec4 vL1;
flat in vec4 vL2;
out vec4 finalColor;
uniform vec2 uO;       // point du sol au centre du premier pixel
uniform vec4 uD;       // pas au sol par pixel en x, puis en y
uniform vec2 uT;       // ancrage de la trame (TX, TY)
uniform float uPat;    // trame : 0 points, 1 rayures, 2 bruit, 3 losanges
const int BAYER[16] = int[16](0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5);
float hash2(int x, int y){
  uint h = uint(x) * 374761393u + uint(y) * 668265263u;
  h = (h ^ (h >> 13u)) * 1274126177u;
  h ^= h >> 16u;
  return float(h) / 4294967296.0;
}
// litAt (01-core)
bool litAt(int x, int y, int mode, float I){
  if (mode == 0) return float(BAYER[((y & 3) << 2) | (x & 3)]) < I * 16.0;
  if (mode == 1) return float((x + y) & 3) < I * 4.0;
  if (mode == 2) return hash2(x * 7 + 1013, y * 13 + 7) < I;
  int dx = x & 3, dy = y & 3;
  if (dx > 2) dx -= 4; if (dy > 2) dy -= 4;
  return float(abs(dx) + abs(dy)) < I * 4.0;
}
void main(){
  int x = int(gl_FragCoord.x), y = int(gl_FragCoord.y);
  vec2 w = uO + float(x) * uD.xy + float(y) * uD.zw - vL0.yz;
  float tt;
  if (vL0.x < 0.5){
    float d2 = dot(w, w), r = vL1.x;
    if (d2 > r * r) discard;
    tt = sqrt(d2) / r;
  } else {
    float al = w.x * vL2.x + w.y * vL2.y, pe = w.y * vL2.x - w.x * vL2.y;
    if (al < 0.0 || al > vL1.w || abs(pe) > al * vL2.z + vL2.w) discard;
    tt = al / vL1.w;
  }
  if (!litAt(x - int(uT.x), y - int(uT.y), int(uPat), vL1.y * (1.0 - vL1.z * tt))) discard;
  finalColor = vec4(vL0.w / 255.0, 0.0, 0.0, 1.0);
}`;
