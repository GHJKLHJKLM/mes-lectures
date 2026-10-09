
const fs = require("fs");
const path = require("path");

const BASE = "https://omcresume.github.io/one-more-chapter";
const API = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;
const ROOT = process.cwd();

function esc(v = "") {
  return String(v).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);
}

function slug(v) {
  return String(v || "livre")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "livre";
}

async function table(name) {
  const r = await fetch(
    `${API}/rest/v1/${name}?select=*`,
    {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`
      }
    }
  );

  if (!r.ok) {
    throw new Error(`Supabase (${name}): ${r.status} ${await r.text()}`);
  }

  return r.json();
}

function dateFR(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return esc(value);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}

function pageLivre(livre, personnages, url) {
  const titre = esc(livre.titre || "Livre");
  const auteur = esc(livre.auteur || "");
  const genre = esc(livre.genre || "");
  const resume = esc(livre.resume || "");
  const couverture = String(livre.couverture || "");
  const image = couverture
    ? `<img class="detail-cover" src="${esc(couverture)}" alt="Couverture de ${titre}">`
    : `<div class="no-cover">Couverture indisponible</div>`;

  const liste = personnages.length
    ? personnages.map(p => `
        <article class="character">
          <h3>${esc(p.nom || "")}</h3>
          <p>${esc(p.description || "")}</p>
        </article>
      `).join("")
    : `<p>Aucun personnage renseigné pour le moment.</p>`;

  const description = String(livre.resume || "")
    .replace(/\s+/g, " ")
    .slice(0, 155);

  const jsonLD = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: livre.titre || "Livre",
    author: livre.auteur
      ? { "@type": "Person", name: livre.auteur }
      : undefined,
    genre: livre.genre || undefined,
    datePublished: livre.date_parution || undefined,
    image: couverture || undefined,
    description: livre.resume || undefined,
    url
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre}${auteur ? " — " + auteur : ""} | One More Chapter</title>
<meta name="description" content="${esc(description || "Découvrez ce livre sur One More Chapter.")}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<meta property="og:type" content="book">
<meta property="og:site_name" content="One More Chapter">
<meta property="og:title" content="${titre}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
${couverture ? `<meta property="og:image" content="${esc(couverture)}">` : ""}
<script type="application/ld+json">${JSON.stringify(jsonLD).replace(/</g, "\\u003c")}</script>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:Georgia,serif;background:#f7f3ed;color:#302c28}
header{padding:45px 20px 35px;text-align:center;background:#e8dfd2}
header h1{margin:0 0 12px;font-size:42px;font-weight:normal}
header p{margin:0;font-size:18px;color:#6d6258}
.container{max-width:1100px;margin:40px auto;padding:0 20px}
.back-button{display:inline-block;margin-bottom:30px;color:#5d5146;text-decoration:none;font-size:16px}
.back-button:hover{text-decoration:underline}
.detail{background:white;border-radius:14px;padding:35px;box-shadow:0 4px 20px rgba(0,0,0,.06)}
.detail-top{display:grid;grid-template-columns:280px minmax(0,1fr);gap:40px;margin-bottom:40px}
.detail-cover{display:block;width:100%;max-height:430px;object-fit:contain;object-position:top;border-radius:8px}
.no-cover{height:300px;background:#eee6dc;border-radius:8px;display:grid;place-items:center;color:#756a60;text-align:center;padding:20px}
.detail h1{font-size:42px;font-weight:normal;margin:0 0 10px;overflow-wrap:anywhere}
.detail-author{font-size:21px;color:#756a60;margin-bottom:25px}
.info{color:#62584f;line-height:1.9;margin-bottom:25px}
.genre{display:inline-block;padding:5px 11px;border-radius:20px;background:#eee6dc;font-size:13px;color:#65594e}
.section{margin-top:35px}
.section h2{font-size:27px;font-weight:normal;border-bottom:1px solid #ddd3c8;padding-bottom:10px;margin-bottom:20px}
.summary{line-height:1.9;white-space:pre-line;overflow-wrap:anywhere}
.character{padding:18px 0;border-bottom:1px solid #eee7df}
.character:last-child{border-bottom:none}
.character h3{margin:0 0 7px;font-size:20px;font-weight:normal}
.character p{margin:0;color:#665c53;line-height:1.7;white-space:pre-line}
footer{text-align:center;color:#756a60;padding:30px 20px;font-size:14px}
footer a{color:#5d5146}
@media(max-width:700px){
 header h1{font-size:34px}
 .container{margin:25px auto}
 .detail{padding:22px}
 .detail-top{grid-template-columns:1fr;gap:25px}
 .detail-cover{max-width:280px;max-height:400px}
 .detail h1{font-size:34px}
}
</style>
</head>
<body>
<header>
  <h1>One more chapter</h1>
  <p>Les livres, les personnages et les résumés.</p>
</header>
<main class="container">
  <a class="back-button" href="${BASE}/">← Retour à One more chapter</a>
  <article class="detail">
    <div class="detail-top">
      <div>${image}</div>
      <div>
        <h1>${titre}</h1>
        ${auteur ? `<div class="detail-author">${auteur}</div>` : ""}
        <div class="info">
          ${genre ? `<p><span class="genre">${genre}</span></p>` : ""}
          ${livre.date_parution
            ? `<p><strong>Date de parution :</strong> ${dateFR(livre.date_parution)}</p>`
            : ""}
        </div>
      </div>
    </div>
    ${resume ? `
      <section class="section">
        <h2>Résumé</h2>
        <div class="summary">${resume}</div>
      </section>` : ""}
    <section class="section">
      <h2>Personnages</h2>
      ${liste}
    </section>
  </article>
</main>
<footer>
  <a href="${BASE}/">One More Chapter</a> · Les livres, les personnages et les résumés.
</footer>
</body>
</html>`;
}

async function main() {
  if (!API || !KEY) {
    throw new Error("Secrets Supabase manquants.");
  }

  const [livres, personnages] = await Promise.all([
    table("livres"),
    table("personnages")
  ]);

  const dossier = path.join(ROOT, "livres");
  fs.mkdirSync(dossier, { recursive: true });

  const urls = [`${BASE}/`];
  const liens = [];

  for (const livre of livres) {
    const nom = `${slug(livre.titre)}-${livre.id}`;
    const url = `${BASE}/livres/${nom}/`;
    const destination = path.join(dossier, nom);

    fs.mkdirSync(destination, { recursive: true });

    const associes = personnages.filter(
      p => String(p.livre_id) === String(livre.id)
    );

    fs.writeFileSync(
      path.join(destination, "index.html"),
      pageLivre(livre, associes, url),
      "utf8"
    );

    urls.push(url);
    liens.push(
      `<li><a href="${url}">${esc(livre.titre || "Livre")}</a>` +
      `${livre.auteur ? " — " + esc(livre.auteur) : ""}</li>`
    );
  }

  fs.writeFileSync(
    path.join(ROOT, "livres.html"),
    `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Les livres | One More Chapter</title>
<meta name="description" content="Découvrez les livres et leurs résumés sur One More Chapter.">
<style>
body{margin:0;background:#f7f3ed;color:#302c28;font-family:Georgia,serif}
header{text-align:center;padding:40px 20px;background:#e8dfd2}
main{max-width:900px;margin:40px auto;padding:0 20px}
li{padding:12px 0;border-bottom:1px solid #ddd3c8}
a{color:#5d5146}
</style>
</head>
<body>
<header><h1>One more chapter</h1><p>Les livres, les personnages et les résumés.</p></header>
<main><h2>Tous les livres</h2><ul>${liens.join("\n")}</ul>
<p><a href="${BASE}/">Retour à l'accueil</a></p></main>
</body>
</html>`,
    "utf8"
  );

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>
`;

  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap, "utf8");

  console.log(`${livres.length} fiches de livres générées.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
