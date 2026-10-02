// Usage (depuis un dossier de travail, hors dépôt) :
//   npm i pdf-lib opentype.js @fontsource/inter qrcode
//   node generer-carte.mjs <chemin>/site/public/brand/dl-proprete-logo-blanc-web.svg carte-cassandre.pdf
// Couleurs CMJN indicatives (charte : à caler sur BAT avec l'imprimeur).
// Carte de visite DL Propreté — direction B — PDF imprimeur 91 x 61 mm (fond perdu 3 mm).
import fs from "node:fs";
import { PDFDocument, cmyk } from "pdf-lib";
import opentype from "opentype.js";
import QR from "qrcode";

const MM = 72 / 25.4;
const W = 91, H = 61, BLEED = 3;
const Wpt = W * MM, Hpt = H * MM;
const C = {
  marine: cmyk(0.85, 0.65, 0.45, 0.40),
  k100: cmyk(0, 0, 0, 1),
  gris: cmyk(0.25, 0, 0, 0.65),
  blanc: cmyk(0, 0, 0, 0),
};

const load = (f) => {
  const b = fs.readFileSync("node_modules/@fontsource/inter/files/" + f);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
const regular = load("inter-latin-400-normal.woff");
const medium = load("inter-latin-500-normal.woff");

const draw = (page, d, color) => page.drawSvgPath(d, { x: 0, y: Hpt, color, borderWidth: 0 });

// Placement glyphe par glyphe avec crénage : contourne le GSUB d'Inter que
// opentype.js ne sait pas lire (aucune ligature ni substitution dans ces textes).
function layout(font, str, x, y, sizePt, trackEm = 0) {
  const scale = sizePt / font.unitsPerEm;
  let d = "", prev = null;
  const x0 = x;
  for (const ch of str) {
    const g = font.charToGlyph(ch);
    if (g.index === 0) throw new Error(`glyphe absent : « ${ch} »`);
    if (prev) x += font.getKerningValue(prev, g) * scale + trackEm * sizePt;
    d += g.getPath(x, y, sizePt).toPathData(3);
    x += g.advanceWidth * scale;
    prev = g;
  }
  return { d, width: x - x0 };
}
const measure = (font, str, sizePt, trackEm = 0) => layout(font, str, 0, 0, sizePt, trackEm).width;

// Texte vectorisé : x, baseline en mm depuis le coin haut-gauche du document (fond perdu inclus).
function text(page, font, str, sizePt, xMm, baseMm, color, align = "left", trackEm = 0) {
  let x = xMm * MM;
  if (align === "center") x -= measure(font, str, sizePt, trackEm) / 2;
  if (align === "right") x -= measure(font, str, sizePt, trackEm);
  draw(page, layout(font, str, x, baseMm * MM, sizePt, trackEm).d, color);
}
// Logo : tracés du SVG officiel (version recadrée), replacés tels quels.
function logoPaths(svgFile, leftMm, topMm, widthMm) {
  const svg = fs.readFileSync(svgFile, "utf8");
  const k = widthMm / 728.56;
  const out = [];
  for (const m of svg.matchAll(/transform="translate\(([\d.]+),([\d.]+)\) scale\(([\d.]+),-[\d.]+\)" d="([^"]+)"/g)) {
    const [tx, ty, s] = [+m[1], +m[2], +m[3]];
    const pt = (x, y) => {
      const sx = tx + s * x, sy = ty - s * y;
      return `${((leftMm + (sx - 87.27) * k) * MM).toFixed(3)} ${((topMm + (sy - 87.27) * k) * MM).toFixed(3)}`;
    };
    const tok = m[4].match(/[MLHVCZ]|-?\d*\.?\d+/g);
    let i = 0, cx = 0, cy = 0, d = "";
    const num = () => +tok[i++];
    while (i < tok.length) {
      const c = tok[i++];
      if (c === "M" || c === "L") { cx = num(); cy = num(); d += `${c}${pt(cx, cy)}`; }
      else if (c === "H") { cx = num(); d += `L${pt(cx, cy)}`; }
      else if (c === "V") { cy = num(); d += `L${pt(cx, cy)}`; }
      else if (c === "C") { const a = [num(), num(), num(), num(), num(), num()]; cx = a[4]; cy = a[5]; d += `C${pt(a[0], a[1])} ${pt(a[2], a[3])} ${pt(cx, cy)}`; }
      else if (c === "Z") d += "Z";
      else throw new Error("commande SVG inattendue : " + c);
    }
    out.push(d);
  }
  if (out.length === 0) throw new Error("aucun tracé trouvé dans " + svgFile);
  return out.join(" ");
}

// QR : modules noirs fusionnés par ligne, boîte marge de 4 modules comprise.
function qrPath(url, leftMm, topMm, boxMm) {
  const q = QR.create(url, { errorCorrectionLevel: "M" });
  const n = q.modules.size, m = boxMm / (n + 8);
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; ) {
      if (!q.modules.get(r, c)) { c++; continue; }
      let e = c;
      while (e < n && q.modules.get(r, e)) e++;
      const x = (leftMm + (4 + c) * m) * MM, y = (topMm + (4 + r) * m) * MM;
      d += `M${x.toFixed(3)} ${y.toFixed(3)}h${((e - c) * m * MM).toFixed(3)}v${(m * MM).toFixed(3)}h${(-(e - c) * m * MM).toFixed(3)}Z`;
      c = e;
    }
  }
  return { d, version: q.version, codeMm: n * m };
}

(async () => {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Carte de visite — Cassandre Lemière — DL Propreté");
  pdf.setCreator("DL Propreté");

  const page = () => {
    const p = pdf.addPage([Wpt, Hpt]);
    p.setBleedBox(0, 0, Wpt, Hpt);
    p.setTrimBox(BLEED * MM, BLEED * MM, (W - 2 * BLEED) * MM, (H - 2 * BLEED) * MM);
    return p;
  };

  // Recto : aplat marine plein (fond perdu), logo blanc officiel de 44 mm et,
  // dessous, « DEPUIS 2011 » (mention séparée, pas une partie du signe) :
  // écart logo → capitales = hauteur du D, l'ensemble centré sur la carte.
  const recto = page();
  recto.drawRectangle({ x: 0, y: 0, width: Wpt, height: Hpt, color: C.marine });
  const logoW = 44, logoH = logoW * 117.26 / 728.56, dHeight = logoW * 87.27 / 728.56;
  const mentionPt = 7, capMm = (regular.tables.os2.sCapHeight / regular.unitsPerEm) * mentionPt / MM;
  const blockTop = (H - (logoH + dHeight + capMm)) / 2;
  draw(recto, logoPaths(process.argv[2], (W - logoW) / 2, blockTop, logoW), C.blanc);
  text(recto, regular, "DEPUIS 2011", mentionPt, W / 2, blockTop + logoH + dHeight + capMm, C.blanc, "center", 0.14);

  // Verso : papier blanc. Zone de sécurité 7 → 84 mm (x), 7 → 54 mm (y).
  // Hiérarchie : nom (marine) > fonction (gris) > activité (gris, 2 lignes) >
  // coordonnées (marine, blanc élargi au-dessus) > adresse + zone (gris).
  // Ni filet, ni aplat, ni second logo au verso.
  const verso = page();
  const qrBox = 23, qrLeft = 61, quiet = (qrBox / 37) * 4;
  text(verso, medium, "Cassandre Lemière", 12, 7, 10.3, C.marine);
  text(verso, regular, "Gérante · DL Propreté", 8, 7, 14.7, C.gris);
  const activite = ["Nettoyage de bureaux, locaux professionnels", "et industriels, parties communes"];
  for (const [i, l] of activite.entries()) {
    const fin = 7 + measure(regular, l, 7) / MM;
    // La marge blanche du QR (4 modules) doit rester vierge.
    if (fin >= qrLeft) throw new Error(`activité trop longue (${fin.toFixed(2)} mm) : « ${l} »`);
    text(verso, regular, l, 7, 7, 19.6 + i * 3.3, C.gris);
  }
  text(verso, regular, "06 33 58 18 34", 8, 7, 38.6, C.marine);
  text(verso, regular, "cassandre@dlproprete.fr", 8, 7, 42.3, C.marine);
  text(verso, regular, "www.dlproprete.fr", 8, 7, 46.0, C.marine);
  text(verso, regular, "3 rue de Verdun, 14460 Colombelles", 7, 7, 50.0, C.gris);
  text(verso, regular, "Caen et Calvados", 7, 7, 53.3, C.gris);
  // QR en haut à droite : le haut visible du code (hors marge blanche de
  // 4 modules) s'aligne sur le haut des capitales du nom. « Contact » centré
  // sur la largeur du code, 2 mm sous le code, à la taille de la fonction.
  const capOf = (font, pt) => (font.tables.os2.sCapHeight / font.unitsPerEm) * pt / MM;
  const nameCapTop = 10.3 - capOf(medium, 12);
  const qr = qrPath("https://www.dlproprete.fr/c/cassandre", qrLeft, nameCapTop - quiet, qrBox);
  draw(verso, qr.d, C.k100);
  const codeCenter = qrLeft + quiet + qr.codeMm / 2, codeBottom = nameCapTop + qr.codeMm;
  text(verso, medium, "Contact", 8, codeCenter, codeBottom + 2 + capOf(medium, 8), C.marine, "center");

  fs.writeFileSync(process.argv[3], await pdf.save());
  console.log(`OK — QR v${qr.version}, code ${qr.codeMm.toFixed(1)} mm`);
})();
