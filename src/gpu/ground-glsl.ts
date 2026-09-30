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
    if (d.r != 255){ m = d.r; f = d.g; l = d.b; }
    else {
      m = gm; f = v; l = d.b == 4 ? 4 : lv;
      if (d.g != 0 && v == 0){ m = d.g; f = 1; l = 0; }
    }
    // reflets de nuit : sous une lumiere, l'eau et les routes mouillees renvoient sa couleur
    if (uRefl.x > 0.5){
      ivec4 me = lutMat(m);
      bool water = me.b != 0, road = uRefl.y > 0.5 && m == int(uMatB.y) && f == 0;
      if ((water || road) && !(f == 1 && me.g != 0)){
        int maxW = int(uRefl.z), dist = 0, gm2 = 0;
        for (int k = 1; k <= 40; k++){
          if (k > maxW || y - k < 0) break;
          ivec4 u = bytes(texelFetch(uData, ivec2(x, y - k), 0));
          if (u.r != 255 && u.g == 1 && lutMat(u.r).g != 0){ dist = k; gm2 = u.r; break; }
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
