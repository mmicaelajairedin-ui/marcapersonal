#!/usr/bin/env node
/**
 * build-en.js — genera en.html (la versión inglesa) a partir de index.html.
 *
 * POR QUÉ EXISTE
 * El inglés vivía dentro de index.html, escondido con CSS (.es-only/.en-only).
 * Funciona para quien visita, pero Google indexa UNA sola URL y en español:
 * el contenido inglés no podía posicionar en inglés por mucho que existiera.
 *
 * POR QUÉ SE GENERA Y NO SE ESCRIBE A MANO
 * Porque la alternativa ya falló. En el repo de Pathway, registro-en.html era
 * una copia hecha a mano de registro.html: se quedó vieja y durante meses
 * sirvió el formulario ENTERO en español a quien llegaba en inglés. Dos
 * ficheros escritos a mano se separan solos.
 *
 * Aquí index.html es la única fuente. en.html es un derivado, y
 * `node scripts/check-en.js` falla si alguien lo edita a mano o si cambia el
 * español sin regenerar.
 *
 *   node scripts/build-en.js     → escribe en.html
 *   node scripts/check-en.js     → comprueba que en.html está al día
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SITE = 'https://micaelajairedin.com';

function generar(html) {
  let s = html;

  // 1) El documento pasa a declararse en inglés.
  s = s.replace(/<html lang="es">/, '<html lang="en">');

  // 2) Fuera los bloques en español. No basta con ocultarlos: si el texto
  //    español sigue en el HTML, Google ve una página mezclada y la trata
  //    como duplicado del original.
  s = quitarPorClase(s, 'es-only');

  // 3) Metadatos propios. El <title> y la descripción en español no sirven
  //    para una página que quiere aparecer en búsquedas en inglés.
  s = s.replace(
    /<title>[\s\S]*?<\/title>/,
    '<title>Micaela Jairedin · 1:1 job search mentoring</title>'
  );
  s = s.replace(
    /(<meta\s+name="description"\s+content=")[^"]*(")/,
    '$1Career mentoring 1:1 from a recruiter’s eye. Reposition your CV, LinkedIn and interviews with 17+ years in HR and 800+ selection processes. Ex Amazon. First call free.$2'
  );

  // 4) URLs canónicas y de compartir, apuntando a /en y no a la home.
  s = s.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${SITE}/en$2`);
  s = s.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${SITE}/en$2`);
  s = s.replace(/(<meta property="og:locale" content=")[^"]*(")/, '$1en_US$2');
  s = s.replace(
    /(<meta property="og:title" content=")[^"]*(")/,
    '$1If you have experience and nobody calls back, you’re not the problem$2'
  );
  s = s.replace(
    /(<meta property="og:description" content=")[^"]*(")/,
    '$117+ years in HR and 800+ selection processes across Europe and LATAM, ex Amazon. 1:1 mentoring to reposition your CV, LinkedIn and interviews. First call free.$2'
  );
  s = s.replace(
    /(<meta name="twitter:title" content=")[^"]*(")/,
    '$1If you have experience and nobody calls back, you’re not the problem$2'
  );
  s = s.replace(
    /(<meta name="twitter:description" content=")[^"]*(")/,
    '$1Career mentoring 1:1 from a recruiter’s eye. 17+ years in HR, ex Amazon. First call free.$2'
  );

  // 5) El selector de idioma deja de ser un truco de CSS y pasa a ser un
  //    enlace de verdad entre dos URLs, que es lo que Google entiende.
  s = s.replace(
    /<button class="lang-toggle"[\s\S]*?<\/button>/,
    '<a class="lang-toggle" href="/" hreflang="es" aria-label="Ver en español">EN <span class="dim">/ ES</span></a>'
  );

  // 6) El idioma ya lo fija la URL: el script que lo recordaba sobra y, si se
  //    quedara, podría reescribir el idioma por debajo.
  s = s.replace(/<script>\s*\(function\(\) \{\s*var saved = localStorage[\s\S]*?<\/script>/, '');

  // 7) Los enlaces internos van a su equivalente inglés. Sin esto, la home
  //    inglesa mandaba a /mentoria, /cv-ats… en español.
  s = s.replace(/href="\/(mentoria|cv-ats|entrevistas|sobre-mi)"/g, 'href="/en/$1"');

  s = avisoDeGenerado(s);
  return s;
}

// Quita los elementos que llevan una clase, contando la anidación para no
// cortar por el </div> equivocado.
function quitarPorClase(html, clase) {
  const re = new RegExp(`<([a-z0-9]+)([^>]*\\bclass="[^"]*\\b${clase}\\b[^"]*")[^>]*>`, 'i');
  let s = html;
  for (;;) {
    const m = re.exec(s);
    if (!m) break;
    const etiqueta = m[1].toLowerCase();
    const ini = m.index;
    if (/^(img|br|hr|input|meta|link)$/.test(etiqueta)) {
      s = s.slice(0, ini) + s.slice(ini + m[0].length);
      continue;
    }
    let i = ini + m[0].length, prof = 1;
    const abre = new RegExp(`<${etiqueta}[\\s>]`, 'ig');
    const cierra = new RegExp(`</${etiqueta}>`, 'ig');
    while (prof > 0 && i < s.length) {
      abre.lastIndex = i; cierra.lastIndex = i;
      const a = abre.exec(s), c = cierra.exec(s);
      if (!c) { i = s.length; break; }
      if (a && a.index < c.index) { prof++; i = a.index + 1; }
      else { prof--; i = c.index + c[0].length; }
    }
    s = s.slice(0, ini) + s.slice(i);
  }
  return s;
}

function avisoDeGenerado(s) {
  const aviso = `<!--
  ⚠️  FICHERO GENERADO — NO EDITAR A MANO.
  Sale de index.html con: node scripts/build-en.js
  Si tocas el inglés aquí, el próximo build lo borra. Edita index.html.
-->
`;
  return s.replace(/^<!doctype html>/i, m => m + '\n' + aviso);
}

/* Las páginas de servicio comparten el mismo mecanismo (.es-only/.en-only),
   así que se generan igual. Cambia el destino: la home inglesa vive en /en y
   las demás en /en/<slug>. */
function generarPagina(html, slug) {
  let s = html;
  s = s.replace(/<html lang="es">/, '<html lang="en">');
  s = quitarPorClase(s, 'es-only');
  // El selector de idioma apunta a la versión española, no a la inglesa.
  s = s.replace(
    new RegExp(`<a class="lang-toggle" href="/en/${slug}"[^>]*>[\\s\\S]*?</a>`),
    `<a class="lang-toggle" href="/${slug}" hreflang="es" aria-label="Ver en español">EN <span class="dim">/ ES</span></a>`
  );
  s = s.replace(/(<meta property="og:locale" content=")[^"]*(")/, '$1en_US$2');
  s = s.replace(/(<link rel="canonical" href="https:\/\/micaelajairedin\.com)\/([^"]*)(")/, `$1/en/${slug}$3`);
  s = s.replace(/(<meta property="og:url" content="https:\/\/micaelajairedin\.com)\/([^"]*)(")/, `$1/en/${slug}$3`);
  // Los enlaces internos y el logo apuntan al árbol inglés.
  s = s.replace(/href="\/(mentoria|cv-ats|entrevistas|sobre-mi)"/g, 'href="/en/$1"');
  s = s.replace(/<a href="\/">Micaela/g, '<a href="/en">Micaela');
  s = s.replace(/href="\/#agenda"/g, 'href="/en#agenda"');
  s = s.replace(/<a href="\/">Inicio<\/a>/g, '<a href="/en">Home</a>');
  return avisoDeGenerado(s);
}

// index.html → en.html (servida en /en). Las de servicio → en/<slug>.html.
const PAGINAS = ['mentoria', 'cv-ats', 'entrevistas', 'sobre-mi'];

function construirTodo() {
  const salidas = {};
  salidas['en.html'] = generar(fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8'));
  for (const slug of PAGINAS) {
    const src = fs.readFileSync(path.join(RAIZ, slug + '.html'), 'utf8');
    salidas[path.join('en', slug + '.html')] = generarPagina(src, slug);
  }
  return salidas;
}

if (require.main === module) {
  const salidas = construirTodo();
  fs.mkdirSync(path.join(RAIZ, 'en'), { recursive: true });
  for (const [rel, contenido] of Object.entries(salidas)) {
    fs.writeFileSync(path.join(RAIZ, rel), contenido);
    console.log('generado', rel);
  }
}
module.exports = { generar, generarPagina, construirTodo };
