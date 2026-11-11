// Central 216 r3 (Q-2) — Monaco servido LOCALMENTE, sem CDN externa.
//
// O `@monaco-editor/react` busca o loader em
// `https://cdn.jsdelivr.net/npm/monaco-editor@.../min/vs/loader.js` por
// padrão, e o CSP do app (`script-src 'self'`) bloqueia esse script —
// o editor ficava em "Loading..." para sempre. Em vez de afrouxar o
// CSP para o CDN, copiamos `monaco-editor/min/vs` (o pacote já
// instalado, versão travada no lockfile) para `public/monaco/vs` e o
// loader é apontado para lá em `IdeEditorPane` (`loader.config`).
//
// Por que cópia em vez de bundle via webpack: o Monaco 0.56 usa AMD
// com chunks de nome hash (`editor-KLE6jdfb.js` etc.) e workers
// (`editor.worker.js`, `ts.worker.js`); copiar `min/vs` inteiro é o
// caminho documentado e não exige plugin de webpack.
//
// Idempotente e barato: um marcador `.monaco-version` com a versão do
// pacote evita recopiar (24 MB) a cada build. É invocado a partir de
// `next.config.js` (carregado em todo `next build/dev/start`, qualquer
// que seja o comando usado no deploy) e pode rodar sozinho:
// `node scripts/copy-monaco-vs.cjs`.
// Saída em `public/monaco/` — gerada, NÃO commitar (ver .gitignore).
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const WEB_ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(WEB_ROOT, 'public', 'monaco');
const TARGET_VS = path.join(TARGET_DIR, 'vs');
const MARKER = path.join(TARGET_DIR, '.monaco-version');

function resolveMonacoDir() {
  const requireFromWeb = createRequire(path.join(WEB_ROOT, 'package.json'));
  // Resolve através do @monaco-editor/react: no layout pnpm o
  // monaco-editor vive como vizinho dele (peer dep), e não como dep
  // direta do web — `require.resolve('monaco-editor')` a partir da
  // raiz do web não o encontra.
  const reactPkg = requireFromWeb.resolve('@monaco-editor/react/package.json');
  // O `exports` do monaco-editor não expõe `./package.json`, então
  // resolve-se o entry point (`<pkg>/min/vs/index.js`) e sobe 3 níveis.
  const entry = requireFromWeb.resolve('monaco-editor', {
    paths: [path.dirname(reactPkg)],
  });
  const dir = path.resolve(entry, '..', '..', '..');
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    throw new Error(`copy-monaco-vs: package.json não encontrado em ${dir}`);
  }
  return dir;
}

function copyMonacoVs() {
  const monacoDir = resolveMonacoDir();
  const pkg = JSON.parse(fs.readFileSync(path.join(monacoDir, 'package.json'), 'utf8'));
  const version = pkg.version;
  const srcVs = path.join(monacoDir, 'min', 'vs');
  if (!fs.existsSync(path.join(srcVs, 'loader.js'))) {
    throw new Error(`copy-monaco-vs: loader.js não encontrado em ${srcVs}`);
  }
  if (
    fs.existsSync(MARKER) &&
    fs.readFileSync(MARKER, 'utf8').trim() === version &&
    fs.existsSync(path.join(TARGET_VS, 'loader.js'))
  ) {
    return { copied: false, version };
  }
  fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  fs.cpSync(srcVs, TARGET_VS, { recursive: true });
  fs.writeFileSync(MARKER, `${version}\n`);
  return { copied: true, version };
}

if (require.main === module) {
  const { copied, version } = copyMonacoVs();
  // eslint-disable-next-line no-console
  console.log(`[copy-monaco-vs] monaco-editor@${version} ${copied ? 'copiado para public/monaco/vs' : 'já presente em public/monaco/vs'}`);
}

module.exports = copyMonacoVs;
