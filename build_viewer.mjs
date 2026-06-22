import fs from 'fs';
import path from 'path';

const root = process.cwd();
const texPath = path.join(root, 'overleaf_project', 'main.tex');
const outPath = path.join(root, 'index.html');

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractFirst(regex, text, fallback = '') {
  const match = text.match(regex);
  return match ? match[1].trim() : fallback;
}

function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripKnownCommands(text) {
  let out = text;
  out = out.replace(/\\justifying\{([\s\S]*?)\}/g, '$1');
  out = out.replace(/\\justify\{([\s\S]*?)\}/g, '$1');
  out = out.replace(/\\textit\{([\s\S]*?)\}/g, '$1');
  out = out.replace(/\\emph\{([\s\S]*?)\}/g, '$1');
  out = out.replace(/\\underline\{([\s\S]*?)\}/g, '$1');
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
      <h2>${escapeHtml(title)}</h2>
      ${epigraphHtml}
      <div class="chapter-body">
        ${bodyHtml}
      </div>
    </article>`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'capitulo';
}

const raw = fs.readFileSync(texPath, 'utf8');
const title = extractFirst(/\\title\{([\s\S]*?)\}/, raw, 'Proyecto Overleaf');
const author = extractFirst(/\\author\{([\s\S]*?)\}/, raw, 'Autor no indicado');
const date = extractFirst(/\\date\{([\s\S]*?)\}/, raw, 'Sin fecha');
const body = raw.slice(raw.indexOf('\\begin{document}') + '\\begin{document}'.length, raw.lastIndexOf('\\end{document}'));
const chapters = splitChapters(body).map((chapter) => ({
  title: chapter.title,
  epigraphs: extractEpigraphs(chapter.chunk),
  body: chapter.chunk,
}));

const toc = chapters
  .map(
    (chapter) => `<a href="#${slugify(chapter.title)}">${escapeHtml(chapter.title)}</a>`
  )
  .join('');

const chapterHtml = chapters
  .map((chapter) => buildChapterHtml(chapter.title, chapter.epigraphs, chapter.body))
  .join('\n');

const rawSource = escapeHtml(raw);

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} | Visor Web</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4efe7;
      --panel: rgba(255, 250, 242, 0.86);
      --panel-solid: #fffaf2;
      --text: #1d1a15;
      --muted: #6b6258;
      --accent: #b14d28;
      --accent-soft: #f2ddcf;
      --line: rgba(64, 48, 33, 0.12);
      --shadow: 0 24px 80px rgba(40, 25, 12, 0.14);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(177, 77, 40, 0.15), transparent 34%),
        radial-gradient(circle at top right, rgba(54, 96, 84, 0.10), transparent 28%),
        linear-gradient(180deg, #fffdf8 0%, var(--bg) 100%);
    }

    .shell {
      width: min(1400px, calc(100% - 32px));
      margin: 24px auto 48px;
    }

    .hero {
      display: grid;
      grid-template-columns: 1.35fr 0.65fr;
      gap: 20px;
      align-items: stretch;
      margin-bottom: 20px;
    }

    .hero-main,
    .hero-side,
    .chapter-card,
    .source-panel {
      background: var(--panel);
      backdrop-filter: blur(10px);
      border: 1px solid var(--line);
      box-shadow: var(--shadow);
      border-radius: 24px;
    }

    .hero-main {
      padding: 32px;
      position: relative;
      overflow: hidden;
    }

    .hero-main::after {
      content: "";
      position: absolute;
      inset: auto -10% -40% auto;
      width: 320px;
      height: 320px;
      background: radial-gradient(circle, rgba(177, 77, 40, 0.18), transparent 65%);
      pointer-events: none;
    }

    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font: 700 12px/1.4 Arial, sans-serif;
      color: var(--accent);
      margin-bottom: 14px;
    }

    h1 {
      margin: 0 0 16px;
      font-size: clamp(2.4rem, 5vw, 4.8rem);
      line-height: 0.95;
      letter-spacing: -0.04em;
      max-width: 12ch;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }

    .pill {
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.7);
      color: var(--muted);
      padding: 10px 14px;
      border-radius: 999px;
      font: 600 14px/1.2 Arial, sans-serif;
    }

    .hero-copy {
      margin-top: 24px;
      max-width: 72ch;
      color: #3f362c;
      font-size: 1.08rem;
      line-height: 1.7;
    }

    .hero-side {
      padding: 22px;
      display: grid;
      gap: 16px;
      align-content: start;
    }

    .toc-title,
    .panel-title {
      margin: 0 0 8px;
      font: 700 13px/1.4 Arial, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
    }

    .toc {
      display: grid;
      gap: 8px;
      max-height: 360px;
      overflow: auto;
      padding-right: 4px;
    }

    .toc a {
      display: block;
      padding: 10px 12px;
      border-radius: 14px;
      text-decoration: none;
      color: var(--text);
      background: rgba(255, 255, 255, 0.62);
      border: 1px solid transparent;
      transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
      font: 500 15px/1.35 Arial, sans-serif;
    }

    .toc a:hover {
      transform: translateY(-1px);
      border-color: rgba(177, 77, 40, 0.18);
      background: rgba(255, 255, 255, 0.95);
    }

    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 20px;
    }

    .chapter-card,
    .source-panel {
      padding: 28px;
    }

    .chapter-card h2 {
      margin: 0 0 10px;
      font-size: clamp(1.6rem, 2.6vw, 2.6rem);
      line-height: 1.05;
      letter-spacing: -0.03em;
    }

    .chapter-kicker {
      font: 700 12px/1.4 Arial, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--accent);
      margin-bottom: 8px;
    }

    .epigraph {
      margin: 16px 0 18px;
      padding: 16px 18px;
      background: rgba(177, 77, 40, 0.07);
      border-left: 3px solid var(--accent);
      border-radius: 14px;
    }

    .epigraph blockquote {
      margin: 0 0 10px;
      font-size: 1.05rem;
      line-height: 1.6;
    }

    .epigraph figcaption {
      color: var(--muted);
      font: 600 13px/1.4 Arial, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .chapter-body p {
      margin: 0 0 14px;
      font-size: 1.04rem;
      line-height: 1.75;
    }

    .source-toggle {
      display: inline-block;
      margin-bottom: 14px;
      color: var(--accent);
      font: 700 14px/1.3 Arial, sans-serif;
      text-decoration: none;
    }

    pre {
      margin: 0;
      padding: 18px;
      overflow: auto;
      border-radius: 18px;
      background: #171411;
      color: #f4ebdf;
      font: 12px/1.6 "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .footer-note {
      margin-top: 18px;
      color: var(--muted);
      font: 14px/1.6 Arial, sans-serif;
    }

    @media (max-width: 980px) {
      .hero { grid-template-columns: 1fr; }
      .shell { width: min(100% - 20px, 1400px); margin-top: 10px; }
      .hero-main, .hero-side, .chapter-card, .source-panel { border-radius: 18px; }
    }
  </style>
</head>
<body>
  <main class="shell" id="top">
    <section class="hero">
      <div class="hero-main">
        <div class="eyebrow">Visor del proyecto Overleaf</div>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">
          <span class="pill">Autor: ${escapeHtml(author)}</span>
          <span class="pill">Fecha: ${escapeHtml(date)}</span>
          <span class="pill">${chapters.length} capítulos</span>
        </div>
        <div class="hero-copy">
          Esta página transforma el archivo LaTeX del proyecto en una lectura web navegable. La columna derecha permite saltar entre capítulos; más abajo está el texto estructurado y, al final, el fuente original por si quieres comparar la versión renderizada con el archivo del repositorio.
        </div>
      </div>
      <aside class="hero-side">
        <div>
          <div class="toc-title">Capítulos</div>
          <nav class="toc">
            ${toc}
          </nav>
        </div>
        <div class="footer-note">
          Origen local: <code>overleaf_project/main.tex</code>. Si el contenido cambia, vuelve a ejecutar <code>node build_viewer.mjs</code>.
        </div>
      </aside>
    </section>

    <section class="grid">
      ${chapterHtml}
    </section>

    <section class="source-panel" style="margin-top:20px;">
      <div class="panel-title">Fuente original</div>
      <a class="source-toggle" href="#top" onclick="document.getElementById('source').open = !document.getElementById('source').open; return false;">Mostrar u ocultar el archivo .tex completo</a>
      <details id="source">
        <summary style="cursor:pointer; font: 600 14px/1.4 Arial, sans-serif; color: var(--muted);">Abrir fuente</summary>
        <pre>${rawSource}</pre>
      </details>
    </section>
  </main>
</body>
</html>`;

fs.writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${path.relative(root, outPath)}`);
