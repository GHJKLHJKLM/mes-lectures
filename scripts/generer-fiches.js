
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://omcresume.github.io/one-more-chapter";
const API_URL = process.env.SUPABASE_URL;
const API_KEY = process.env.SUPABASE_ANON_KEY;
const ROOT = process.cwd();

if (!API_URL || !API_KEY) {
  throw new Error("Variables Supabase manquantes.");
}

async function getTable(table) {
  const response = await fetch(
    `${API_URL}/rest/v1/${table}?select=*`,
    {
      headers: {
        apikey: API_KEY,
        Authorization: `Bearer ${API_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `Erreur lecture ${table}: ${response.status} ${await response.text()}`
    );
  }

  return response.json();
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function slugify(value) {
  return String(value || "livre")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "livre";
}

async function main() {
  const livres = await getTable("livres");
  const personnages = await getTable("personnages");

  const dossier = path.join(ROOT, "livres");
  fs.mkdirSync(dossier, { recursive: true });

  const urls = [
    `${BASE_URL}/`
  ];

  const indexPages = [];

  for (const livre of livres) {
    const slug = `${slugify(livre.titre)}-${livre.id}`;
    const url = `${BASE_URL}/livres/${slug}/`;
    const destination = path.join(dossier, slug);
    fs.mkdirSync(destination, { recursive: true });

    const listePersonnages = personnages
      .filter(p => String(p.livre_id) === String(livre.id))
      .map(p => `
        <article>
          <h3>${escapeHTML(p.nom)}</h3>
          <p>${escapeHTML(p.description || "")}</p>
        </article>
      `).join("\n");

    const titre = escapeHTML(livre.titre || "Livre");
    const auteur = escapeHTML(livre.auteur || "");
    const resume = escapeHTML(livre.resume || "");
    const genre = escapeHTML(livre.genre || "");
    const couverture = livre.couverture || "";
    const image = couverture
      ? `<img src="${escapeHTML(couverture)}" alt="Couverture de ${titre}" style="max-width:260px;height:auto">`
      : "";

    const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre}${auteur ? " — " + auteur : ""} | One More Chapter</title>
<meta name="description" content="${resume.slice(0, 155)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${titre}">
<meta property="og:description" content="${resume.slice(0, 200)}">
${couverture ? `<meta property="og:image" content="${escapeHTML(couverture)}">` : ""}
<style>
body{font-family:Arial,sans-serif;max-width:850px;margin:40px auto;padding:0 20px;line-height:1.6;color:#292524}
a{color:#7c3aed}img{display:block;margin:20px 0}
</style>
</head>
<body>
<p><a href="${BASE_URL}/">← Retour à One More Chapter</a></p>
<main>
<h1>${titre}</h1>
${auteur ? `<p><strong>Auteur :</strong> ${auteur}</p>` : ""}
${genre ? `<p><strong>Genre :</strong> ${genre}</p>` : ""}
${livre.date_parution ? `<p><strong>Date de parution :</strong> ${escapeHTML(livre.date_parution)}</p>` : ""}
${image}
<h2>Résumé</h2>
<p>${resume || "Résumé non disponible."}</p>
${listePersonnages ? `<section><h2>Personnages</h2>${listePersonnages}</section>` : ""}
</main>
</body>
</html>`;

    fs.writeFileSync(path.join(destination, "index.html"), html, "utf8");
    urls.push(url);
    indexPages.push({ titre, auteur, url });
  }

  const liens = indexPages.map(livre =>
    `<li><a href="${livre.url}">${livre.titre}</a>${livre.auteur ? " — " + livre.auteur : ""}</li>`
  ).join("\n");

  fs.writeFileSync(
    path.join(ROOT, "livres.html"),
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Les livres | One More Chapter</title><meta name="description" content="Découvrez les livres référencés sur One More Chapter."></head><body><h1>Les livres</h1><ul>${liens}</ul><p><a href="${BASE_URL}/">Accueil</a></p></body></html>`,
    "utf8"
  );

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>
`;

  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap, "utf8");
  console.log(`${livres.length} fiches générées.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

