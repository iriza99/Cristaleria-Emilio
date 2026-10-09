// Versión de escritorio: abre la misma app web en una ventana propia.
// Los archivos se sirven desde app://presupuestos/ para que el almacenamiento
// (presupuestos, ajustes) tenga siempre el mismo origen y no se pierda.
const { app, BrowserWindow, protocol, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const WEB = path.join(__dirname, 'web');
const INICIO = 'app://presupuestos/index.html';
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml'
};

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

// El nombre lleva tilde y Electron lo mete en el User-Agent, que solo admite ASCII.
app.userAgentFallback = app.userAgentFallback.replace(/[^\x20-\x7E]/g, '');

if (!app.requestSingleInstanceLock()) app.quit();

let ventana = null;

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 360,
    minHeight: 500,
    title: 'Presupuestos · Cristalería Emilio',
    icon: path.join(WEB, 'img', 'icon-512.png'),
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.js') }
  });

  // «Ver PDF» abre una ventana con el visor; los enlaces web, en el navegador.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('blob:app://presupuestos/')) {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 900, height: 1000, autoHideMenuBar: true, icon: path.join(WEB, 'img', 'icon-512.png') } };
    }
    if (/^(https?|mailto|tel):/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  ventana.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://presupuestos/')) {
      e.preventDefault();
      if (/^(https?|mailto|tel):/.test(url)) shell.openExternal(url);
    }
  });

  ventana.loadURL(INICIO);
}

app.on('second-instance', () => {
  if (!ventana) return;
  if (ventana.isMinimized()) ventana.restore();
  ventana.focus();
});

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const archivo = path.normalize(path.join(WEB, decodeURIComponent(pathname)));
    if (!archivo.startsWith(WEB + path.sep)) return new Response('No encontrado', { status: 404 });
    try {
      const tipo = TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream';
      return new Response(fs.readFileSync(archivo), { headers: { 'content-type': tipo } });
    } catch (e) {
      return new Response('No encontrado', { status: 404 });
    }
  });
  Menu.setApplicationMenu(null);
  crearVentana();
});

app.on('window-all-closed', () => app.quit());
