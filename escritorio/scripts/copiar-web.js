// Copia la app web (carpeta de arriba) a escritorio/web para empaquetarla.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const DESTINO = path.join(__dirname, '..', 'web');
const ARCHIVOS = ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'lib', 'img'];

fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(DESTINO, { recursive: true });
for (const a of ARCHIVOS) fs.cpSync(path.join(RAIZ, a), path.join(DESTINO, a), { recursive: true });
console.log('App web copiada en', DESTINO);
