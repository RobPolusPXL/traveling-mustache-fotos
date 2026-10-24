// Maakt kleinere versies (640 en 1280 px breed) van alle foto's in images/, voor snellere pagina's.
// De originelen blijven ongewijzigd. Versies komen in formaten/<breedte>/images/..., met een overzicht in formaten/index.json:
//   { "images/x.webp": { "w": 3200, "h": 1800, "v": [640, 1280] } }
// Draait automatisch via .github/workflows/formaten.yml bij elke push met nieuwe of gewijzigde foto's.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const BREEDTES = [640, 1280];
const INDEX = "formaten/index.json";

function webps(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.posix.join(dir, e.name);
    return e.isDirectory() ? webps(p) : e.name.endsWith(".webp") ? [p] : [];
  });
}

const index = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : {};
const fotos = webps("images").sort();
let nieuw = 0;

for (const src of fotos) {
  const oud = index[src];
  const grootte = fs.statSync(src).size; // bestandsgrootte: verandert ze, dan is de foto vervangen
  if (oud && oud.b === grootte && oud.v.every((b) => fs.existsSync(`formaten/${b}/${src}`))) continue;
  const { width: w, height: h } = await sharp(src).metadata();
  const v = [];
  for (const b of BREEDTES) {
    if (w <= b * 1.15) continue; // te klein: het origineel volstaat
    const doel = `formaten/${b}/${src}`;
    fs.mkdirSync(path.dirname(doel), { recursive: true });
    await sharp(src).rotate().resize({ width: b }).webp({ quality: 82, effort: 6 }).toFile(doel);
    v.push(b);
  }
  index[src] = { w, h, v, b: grootte };
  nieuw++;
}

// verwijderde foto's ook uit de versies halen
for (const src of Object.keys(index)) {
  if (fotos.includes(src)) continue;
  for (const b of BREEDTES) fs.rmSync(`formaten/${b}/${src}`, { force: true });
  delete index[src];
}

const gesorteerd = Object.fromEntries(Object.keys(index).sort().map((k) => [k, index[k]]));
fs.mkdirSync("formaten", { recursive: true });
fs.writeFileSync(INDEX, JSON.stringify(gesorteerd).replace(/\},"/g, '},\n"') + "\n");
console.log(`formaten: ${fotos.length} foto's, ${nieuw} nieuw of gewijzigd`);
