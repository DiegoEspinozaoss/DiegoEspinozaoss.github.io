import fs from 'fs';
import path from 'path';

const root = process.cwd();
const assetsDir = path.join(root, 'assets');
const photoPath = path.join(assetsDir, 'profile-photo.jpeg');
const texPath = path.join(root, 'overleaf_project', 'main.tex');
const outPath = path.join(root, 'index.html');

const githubUser = 'DiegoEspinozaoss';
const githubApi = `https://api.github.com/users/${githubUser}`;
const githubReposApi = `https://api.github.com/users/${githubUser}/repos?per_page=100&sort=updated`;

const featuredRepos = [
  {
    name: 'Astroinformatica-Ramo-',
    description: 'Códigos que usé en el ramo astroinformática para tareas individuales y grupales',
    language: 'Jupyter Notebook',
    html_url: 'https://github.com/DiegoEspinozaoss/Astroinformatica-Ramo-',
  },
  {
    name: 'Astronomia-Experimental',
    description: 'Informes y Códigos del ramo astronomía experimental',
    language: 'Jupyter Notebook',
    html_url: 'https://github.com/DiegoEspinozaoss/Astronomia-Experimental',
  },
  {
    name: 'Trabajo-Tutorial-Basico',
    description: 'Código e informe del intento de determinar la existencia de materia oscura en el exterior del cúmulo globular NGC 5694.',
    language: 'Jupyter Notebook',
    html_url: 'https://github.com/DiegoEspinozaoss/Trabajo-Tutorial-Basico',
  },
  {
    name: 'Mecanica-Cuantica',
    description: 'Código usado para una tarea en el ramo Mecánica Cuántica',
    language: 'Python',
    html_url: 'https://github.com/DiegoEspinozaoss/Mecanica-Cuantica',
  },
];

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeWhitespace(text) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'capitulo';
}

function stripKnownCommands(text) {
  let out = text;
  out = out.replace(/\\justifying\{([\s\S]*?)\}/g, '$1');
  out = out.replace(/\\justify\{([\s\S]*?)\}/g, '$1');
  out = out.replace(/\\textit\{([\s\S]*?)\}/g, '$1');
  out = out.replace(/\\emph\{([\s\S]*?)\}/g, '$1');
  out = out.replace(/\\chapter\{[\s\S]*?\}/g, '');
  out = out.replace(/\\epigraph\{[\s\S]*?\}\{[\s\S]*?\}/g, '');
  out = out.replace(/\\maketitle/g, '');
  out = out.replace(/\\documentclass\{[\s\S]*?\}/g, '');
  out = out.replace(/\\usepackage(?:\[[^\]]*\])?\{[\s\S]*?\}/g, '');
  out = out.replace(/%.*$/gm, '');
  out = out.replace(/\\[a-zA-Z@]+(?:\[[^\]]*\])?(?:\{[^{}]*\})?/g, '');
  out = out.replace(/[{}]/g, '');
  out = out.replace(/\s+\./g, '.');
  out = out.replace(/\s+,/g, ',');
  out = out.replace(/\s+;/g, ';');
  out = out.replace(/\s+:/g, ':');
  out = out.replace(/\n[ \t]*\n/g, '\n\n');
  out = out.replace(/[ \t]{2,}/g, ' ');
  return normalizeWhitespace(out);
}

function paragraphize(text) {
  return normalizeWhitespace(text)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n+/g, ' ').trim())
    .filter(Boolean);
}

function splitChapters(body) {
  const chapterRegex = /\\chapter\{([^}]*)\}/g;
  const matches = [...body.matchAll(chapterRegex)];
  return matches.map((match, index) => {
    const title = match[1].trim();
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : body.length;
    return { title, chunk: body.slice(start, end) };
  });
}

function extractEpigraphs(chunk) {
  const epigraphs = [];
  const regex = /\\epigraph\{([\s\S]*?)\}\{\\textit\{([\s\S]*?)\}\}/g;
  for (const match of chunk.matchAll(regex)) {
    const quote = stripKnownCommands(match[1]).replace(/\s+/g, ' ').trim();
    const author = stripKnownCommands(match[2]).replace(/\s+/g, ' ').trim();
    epigraphs.push({ quote, author });
  }
  return epigraphs;
}

function parseFirstParagraphs(body, count = 3) {
  const clean = stripKnownCommands(body);
  const paragraphs = paragraphize(clean);
  return paragraphs.slice(0, count);
}

function buildChapterHtml(title, epigraphs, body) {
  const paragraphs = paragraphize(stripKnownCommands(body));
  const bodyHtml = paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('\n');

  const epigraphHtml = epigraphs.length
    ? epigraphs
        .map(
          (item) => `
            <figure class="epigraph">
              <blockquote>${escapeHtml(item.quote)}</blockquote>
              <figcaption>${escapeHtml(item.author)}</figcaption>
            </figure>`
        )
        .join('\n')
    : '';

  return `
    <article class="chapter-card" id="${slugify(title)}">
      <div class="chapter-kicker">Capítulo</div>
      <h3>${escapeHtml(title)}</h3>
      ${epigraphHtml}
      <div class="chapter-body">
        ${bodyHtml}
      </div>
    </article>`;
}

function sectionCard(title, subtitle, content) {
  return `
    <section class="card">
      <div class="section-kicker">${escapeHtml(subtitle)}</div>
      <h2>${escapeHtml(title)}</h2>
      ${content}
    </section>`;
}

function repoCard(repo) {
  const desc = repo.description ? repo.description : 'Repositorio público sin descripción publicada.';
  const language = repo.language ? repo.language : 'Sin lenguaje principal declarado';
  return `
    <article class="repo-card">
      <div class="repo-top">
        <span class="repo-lang">${escapeHtml(language)}</span>
        <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noreferrer">Abrir</a>
      </div>
      <h3>${escapeHtml(repo.name)}</h3>
      <p>${escapeHtml(desc)}</p>
    </article>`;
}

const [profileResponse, reposResponse] = await Promise.all([
  fetch(githubApi, {
    headers: { 'User-Agent': 'codex-site-builder' },
  }),
  fetch(githubReposApi, {
    headers: { 'User-Agent': 'codex-site-builder' },
  }),
]);

if (!profileResponse.ok) {
  throw new Error(`GitHub profile request failed: ${profileResponse.status}`);
}

if (!reposResponse.ok) {
  throw new Error(`GitHub repos request failed: ${reposResponse.status}`);
}

const profile = await profileResponse.json();
const repos = await reposResponse.json();
const topRepos = repos
  .filter((repo) => !repo.fork)
  .slice(0, 8)
  .map((repo) => ({
    name: repo.name,
    description: repo.description,
    language: repo.language,
    html_url: repo.html_url,
  }));

const rawReadme = await (await fetch(`https://raw.githubusercontent.com/${githubUser}/${githubUser}/main/README.md`)).text();
const readmeLines = rawReadme
  .replace(/\r\n/g, '\n')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);
const readmeSummary = readmeLines
  .filter((line) => line.startsWith('I am') || line.startsWith('My thesis') || line.startsWith('I also currently work'))
  .slice(0, 3);
const interests = [
  'Machine learning',
  'Astronomía',
  'Scientific computing',
  'Football',
  'Gym training',
];

const rawTex = fs.readFileSync(texPath, 'utf8');
const texTitle = (rawTex.match(/\\title\{([\s\S]*?)\}/) || [null, 'Proyecto Overleaf'])[1].trim();
const texAuthor = (rawTex.match(/\\author\{([\s\S]*?)\}/) || [null, 'Autor no indicado'])[1].trim();
const texDate = (rawTex.match(/\\date\{([\s\S]*?)\}/) || [null, 'Sin fecha'])[1].trim();
const texBody = rawTex.slice(rawTex.indexOf('\\begin{document}') + '\\begin{document}'.length, rawTex.lastIndexOf('\\end{document}'));
const chapters = splitChapters(texBody).map((chapter) => ({
  title: chapter.title,
  epigraphs: extractEpigraphs(chapter.chunk),
  body: chapter.chunk,
}));
const chapterNav = chapters
  .map((chapter) => `<a href="#${slugify(chapter.title)}">${escapeHtml(chapter.title)}</a>`)
  .join('');
const chapterHtml = chapters
  .map((chapter) => buildChapterHtml(chapter.title, chapter.epigraphs, chapter.body))
  .join('\n');

const texPreview = parseFirstParagraphs(texBody, 4)
  .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
  .join('');

const repoCards = [...featuredRepos, ...topRepos]
  .slice(0, 8)
  .map(repoCard)
  .join('');

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Portafolio de Diego Ignacio Espinoza Núñez con perfil, intereses, fotos y proyectos de GitHub." />
  <title>${escapeHtml(profile.name || profile.login)} | Portafolio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      color-scheme: light;
      --bg: #f4efe6;
      --panel: rgba(255, 251, 244, 0.88);
      --panel-solid: #fffaf2;
      --text: #1d1813;
      --muted: #6d6258;
      --accent: #a4512a;
      --accent-2: #264653;
      --accent-soft: #f0d9ca;
      --line: rgba(58, 42, 25, 0.12);
      --shadow: 0 28px 90px rgba(42, 27, 11, 0.12);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: "Manrope", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(164, 81, 42, 0.15), transparent 30%),
        radial-gradient(circle at 80% 10%, rgba(38, 70, 83, 0.10), transparent 24%),
        linear-gradient(180deg, #fffdf8 0%, var(--bg) 100%);
    }

    a { color: inherit; }

    .shell {
      width: min(1400px, calc(100% - 28px));
      margin: 18px auto 44px;
    }

    .hero {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .panel, .card, .repo-card, .chapter-card, .source-panel {
      background: var(--panel);
      backdrop-filter: blur(10px);
      border: 1px solid var(--line);
      box-shadow: var(--shadow);
      border-radius: 26px;
    }

    .hero-main {
      padding: 34px;
      position: relative;
      overflow: hidden;
    }

    .hero-main::before {
      content: "";
      position: absolute;
      inset: auto -5% -20% auto;
      width: 340px;
      height: 340px;
      background: radial-gradient(circle, rgba(164, 81, 42, 0.18), transparent 68%);
      pointer-events: none;
    }

    .eyebrow, .section-kicker, .chapter-kicker, .repo-lang, .mini-label {
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 12px;
      font-weight: 800;
      color: var(--accent);
    }

    h1, h2, h3 {
      font-family: "Cormorant Garamond", serif;
      line-height: 0.95;
      letter-spacing: -0.03em;
      margin: 0;
    }

    h1 {
      font-size: clamp(3rem, 6vw, 5.8rem);
      max-width: 11ch;
      margin-top: 10px;
    }

    h2 {
      font-size: clamp(2rem, 3.2vw, 3.2rem);
      margin-bottom: 12px;
    }

    h3 {
      font-size: 1.9rem;
      margin-bottom: 8px;
    }

    .hero-copy {
      margin-top: 20px;
      max-width: 64ch;
      color: #43392f;
      font-size: 1.04rem;
      line-height: 1.8;
    }

    .hero-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }

    .pill {
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.7);
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }

    .hero-photo {
      padding: 18px;
      display: grid;
      grid-template-rows: auto auto 1fr;
      gap: 16px;
      overflow: hidden;
      position: relative;
    }

    .cosmic-stage {
      min-height: 250px;
      border-radius: 22px;
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.18);
      background:
        linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.58)),
        url("assets/galaxy-hero.jpg") center/cover no-repeat;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
    }

    .cosmic-stage::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 20% 20%, rgba(255,255,255,0.28), transparent 18%),
        radial-gradient(circle at 80% 30%, rgba(122, 182, 255, 0.22), transparent 20%),
        radial-gradient(circle at 55% 70%, rgba(255, 182, 122, 0.18), transparent 24%);
      mix-blend-mode: screen;
    }

    .cosmic-copy {
      position: absolute;
      inset: auto 18px 18px 18px;
      z-index: 1;
      color: #fff8ef;
      max-width: 30ch;
    }

    .cosmic-copy strong {
      display: block;
      font-family: "Cormorant Garamond", serif;
      font-size: 2rem;
      line-height: 0.95;
      margin-bottom: 8px;
    }

    .cosmic-copy span {
      font-size: 14px;
      line-height: 1.6;
      color: rgba(255,255,255,0.84);
    }

    .photo-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 14px;
      min-height: 420px;
    }

    .portrait,
    .avatar-card {
      border-radius: 22px;
      overflow: hidden;
      position: relative;
      border: 1px solid var(--line);
      background: var(--panel-solid);
    }

    .portrait img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .avatar-card {
      display: grid;
      align-content: end;
      padding: 18px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.85)),
        url("${escapeHtml(profile.avatar_url)}") center/cover no-repeat;
    }

    .avatar-card::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.92));
    }

    .avatar-card > div {
      position: relative;
      z-index: 1;
    }

    .avatar-card .mini-label {
      margin-bottom: 6px;
    }

    .avatar-card p {
      margin: 0;
      color: #2f271f;
      font-weight: 700;
      line-height: 1.5;
    }

    .stack {
      display: grid;
      gap: 14px;
    }

    .card {
      padding: 28px;
    }

    .topline {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 14px;
    }

    .topline .link {
      text-decoration: none;
      font-weight: 800;
      color: var(--accent-2);
    }

    .profile-summary {
      font-size: 1.02rem;
      line-height: 1.8;
      color: #3d342b;
      margin: 0;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 18px;
    }

    .stat {
      padding: 14px 16px;
      background: rgba(255,255,255,0.72);
      border: 1px solid var(--line);
      border-radius: 18px;
    }

    .stat strong {
      display: block;
      font-size: 1.45rem;
      line-height: 1;
      margin-bottom: 6px;
    }

    .stat span {
      color: var(--muted);
      font-size: 13px;
    }

    .layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 20px;
      align-items: start;
    }

    .toc {
      position: sticky;
      top: 18px;
      padding: 22px;
    }

    .toc nav {
      display: grid;
      gap: 8px;
      margin-top: 10px;
      max-height: 520px;
      overflow: auto;
      padding-right: 4px;
    }

    .toc a {
      padding: 10px 12px;
      border-radius: 14px;
      text-decoration: none;
      background: rgba(255,255,255,0.72);
      border: 1px solid transparent;
      color: var(--text);
      font-size: 14px;
      line-height: 1.35;
      transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
    }

    .toc a:hover {
      transform: translateY(-1px);
      border-color: rgba(164, 81, 42, 0.18);
      background: rgba(255,255,255,0.96);
    }

    .section {
      margin-top: 20px;
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      align-items: end;
      margin-bottom: 14px;
    }

    .section-head p {
      margin: 0;
      color: var(--muted);
      max-width: 70ch;
      line-height: 1.7;
    }

    .interest-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .chip {
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.74);
      border-radius: 999px;
      padding: 10px 14px;
      font-weight: 700;
      color: #43382c;
    }

    .repo-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .repo-card {
      padding: 20px;
    }

    .repo-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .repo-top a {
      color: var(--accent-2);
      font-weight: 800;
      text-decoration: none;
    }

    .repo-card p {
      margin: 0;
      color: #4a4035;
      line-height: 1.7;
    }

    .repo-card h3 {
      font-size: 1.6rem;
      margin-bottom: 10px;
    }

    .chapter-card {
      padding: 28px;
      margin-bottom: 18px;
    }

    .chapter-card p {
      line-height: 1.78;
      font-size: 1.02rem;
      margin: 0 0 14px;
      color: #3f352c;
    }

    .epigraph {
      margin: 14px 0 18px;
      padding: 16px 18px;
      background: rgba(164, 81, 42, 0.07);
      border-left: 3px solid var(--accent);
      border-radius: 14px;
    }

    .epigraph blockquote {
      margin: 0 0 10px;
      font-size: 1.05rem;
      line-height: 1.6;
    }

    .epigraph figcaption {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      font-weight: 800;
    }

    .source-panel {
      padding: 28px;
    }

    .source-panel pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      background: #161310;
      color: #f4eadc;
      padding: 18px;
      border-radius: 18px;
      overflow: auto;
      font: 12px/1.6 "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    }

    details summary {
      cursor: pointer;
      color: var(--muted);
      font-weight: 700;
      margin-bottom: 12px;
    }

    .footer {
      margin-top: 18px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.7;
    }

    @media (max-width: 1100px) {
      .hero, .layout { grid-template-columns: 1fr; }
      .toc { position: static; }
    }

    @media (max-width: 760px) {
      .shell { width: min(100% - 18px, 1400px); }
      .hero-main, .card, .repo-card, .chapter-card, .source-panel, .toc { padding: 20px; border-radius: 20px; }
      .stats, .repo-grid, .photo-grid { grid-template-columns: 1fr; }
      .photo-grid { min-height: auto; }
      h1 { max-width: none; }
    }
  </style>
</head>
<body>
  <main class="shell" id="top">
    <section class="hero">
      <div class="panel hero-main">
        <div class="eyebrow">Portafolio personal</div>
        <h1>${escapeHtml(profile.name || profile.login)}</h1>
        <div class="hero-copy">
          ${escapeHtml(profile.bio || 'Perfil público de GitHub y proyectos destacados.')}
          <br><br>
          La página mezcla tu perfil personal, tus intereses, tus proyectos públicos de GitHub y el documento de Overleaf que ya está en la carpeta.
        </div>
        <div class="hero-meta">
          <span class="pill">${escapeHtml(profile.location || 'Ubicación no indicada')}</span>
          <span class="pill">${escapeHtml(String(profile.public_repos))} repos públicos</span>
          <span class="pill">${escapeHtml(String(profile.followers))} seguidores</span>
          <span class="pill">${escapeHtml(String(profile.following))} siguiendo</span>
        </div>
      </div>

      <div class="panel hero-photo">
        <div class="topline">
          <div>
            <div class="mini-label">Fotos</div>
            <strong>Retrato y avatar</strong>
          </div>
          <a class="link" href="https://github.com/${githubUser}" target="_blank" rel="noreferrer">Ver GitHub</a>
        </div>
        <figure class="cosmic-stage">
          <div class="cosmic-copy">
            <strong>Galaxias, datos y ciencia</strong>
            <span>La portada usa una imagen astronómica de alta resolución para reforzar el tono del sitio y conectar tu perfil con tus intereses científicos.</span>
          </div>
        </figure>
        <div class="photo-grid">
          <figure class="portrait">
            <img src="assets/profile-photo.jpeg" alt="Fotografía de Diego Espinoza" />
          </figure>
          <figure class="avatar-card">
            <div>
              <div class="mini-label">GitHub</div>
              <p>Avatar público de tu perfil para reforzar la identidad visual del sitio.</p>
            </div>
          </figure>
        </div>
      </div>
    </section>

    <section class="layout">
      <div class="stack">
        <section class="card">
          <div class="topline">
            <div>
              <div class="section-kicker">Sobre ti</div>
              <h2>Perfil y contexto</h2>
            </div>
            <a class="link" href="https://github.com/${githubUser}" target="_blank" rel="noreferrer">Perfil público</a>
          </div>
          <p class="profile-summary">${escapeHtml(readmeSummary[0] || profile.bio || '')}</p>
          <p class="profile-summary">${escapeHtml(readmeSummary[1] || '')}</p>
          <p class="profile-summary">${escapeHtml(readmeSummary[2] || '')}</p>
          <div class="stats">
            <div class="stat"><strong>${escapeHtml(String(profile.public_repos))}</strong><span>Repositorios públicos</span></div>
            <div class="stat"><strong>${escapeHtml(String(profile.followers))}</strong><span>Seguidores</span></div>
            <div class="stat"><strong>${escapeHtml(String(profile.following))}</strong><span>Siguiendo</span></div>
            <div class="stat"><strong>${escapeHtml(profile.location || 'N/D')}</strong><span>Ubicación</span></div>
          </div>
        </section>

        <section class="card">
          <div class="section-head">
            <div>
              <div class="section-kicker">Intereses</div>
              <h2>Qué te mueve</h2>
            </div>
            <p>Tomé estos temas del README público de tu perfil, para que la página te represente con datos reales.</p>
          </div>
          <div class="interest-cloud">
            ${interests.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <div>
              <div class="section-kicker">Proyectos</div>
              <h2>Repositorios destacados</h2>
            </div>
            <p>Incluyo tus repositorios públicos destacados y los más recientes que no son forks.</p>
          </div>
          <div class="repo-grid">
            ${repoCards}
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <div>
              <div class="section-kicker">Documento</div>
              <h2>${escapeHtml(texTitle)}</h2>
            </div>
            <p>${escapeHtml(texAuthor)} · ${escapeHtml(texDate)}</p>
          </div>
          <section class="card">
            ${texPreview}
          </section>
          <section class="source-panel" style="margin-top:16px;">
            <details>
              <summary>Ver fuente LaTeX completo</summary>
              <pre>${escapeHtml(rawTex)}</pre>
            </details>
          </section>
        </section>

        <section class="section">
          <div class="section-head">
            <div>
              <div class="section-kicker">Vista completa</div>
              <h2>Capítulos del documento</h2>
            </div>
            <p>La sección siguiente conserva la visualización completa del proyecto original.</p>
          </div>
          ${chapterHtml}
        </section>
      </div>

      <aside class="panel toc">
        <div class="section-kicker">Índice</div>
        <h2>Capítulos</h2>
        <nav>
          ${chapterNav}
        </nav>
        <div class="footer">
          Sitio generado desde datos públicos de GitHub y el archivo local <code>overleaf_project/main.tex</code>.
          Para actualizar la vista, ejecuta <code>node build_site.mjs</code>.
        </div>
      </aside>
    </section>
  </main>
</body>
</html>`;

fs.writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${path.relative(root, outPath)}`);
