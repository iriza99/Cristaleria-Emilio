/* =========================================================================
   Presupuestos Cristalería Emilio
   App web sin servidor: los datos se guardan en el propio dispositivo.
   ========================================================================= */
'use strict';

/* ---------- Utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = (o) => JSON.parse(JSON.stringify(o));
const r2 = (n) => Math.round((+n || 0) * 100) / 100;
const num = (v) => { const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function eur(n) {
  const v = r2(n);
  const [ent, dec] = Math.abs(v).toFixed(2).split('.');
  return (v < 0 ? '-' : '') + ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec + ' €';
}
const numES = (n, d = 2) => (+n || 0).toFixed(d).replace('.', ',');
const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function fechaES(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
function sumarDias(iso, dias) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + (+dias || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function getPath(o, p) { return p.split('.').reduce((a, k) => (a == null ? a : a[k]), o); }
function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => (a[k] ??= {}), o); t[last] = v; }

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2200);
}

const ICON = {
  mas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  editar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg>',
  copiar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  borrar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 3H6v18h12V7l-4-4z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
  enviar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/></svg>',
  bajar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></svg>',
  atras: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>'
};

/* ---------- Datos por defecto ---------- */
const APERTURAS = {
  'fija': { nombre: 'Fija', corto: 'Fija', grupo: 'fija' },
  'abat-izq': { nombre: 'Abatible · bisagras izquierda', corto: 'Abatible izq.', grupo: 'abatible' },
  'abat-dch': { nombre: 'Abatible · bisagras derecha', corto: 'Abatible dcha.', grupo: 'abatible' },
  'oscilo-izq': { nombre: 'Oscilobatiente · bisagras izquierda', corto: 'Oscilobatiente izq.', grupo: 'oscilobatiente' },
  'oscilo-dch': { nombre: 'Oscilobatiente · bisagras derecha', corto: 'Oscilobatiente dcha.', grupo: 'oscilobatiente' },
  'proyectante': { nombre: 'Proyectante · bisagras arriba', corto: 'Proyectante', grupo: 'proyectante' },
  'basculante': { nombre: 'Abatible abajo (basculante)', corto: 'Basculante', grupo: 'basculante' }
};
const GRUPOS_APERTURA = { fija: 'Fija', abatible: 'Abatible', oscilobatiente: 'Oscilobatiente', proyectante: 'Proyectante', basculante: 'Basculante / abatible abajo', corredera: 'Corredera' };
const SISTEMAS = { practicable: 'Practicable', corredera: 'Corredera', fijo: 'Fijo' };
const ELEMENTOS = ['Ventana', 'Balconera', 'Puerta', 'Cerramiento', 'Escaparate'];
const ESTADOS = { borrador: 'Borrador', enviado: 'Enviado', aceptado: 'Aceptado', rechazado: 'Rechazado' };

const DEF_AJUSTES = {
  empresa: {
    nombre: 'Cristalería Emilio',
    titular: 'Emilio José Zazo Yuste',
    nif: '06.579.386-Y',
    direccion: 'C/ La Fuente, 19 - 2',
    cp: '05192',
    poblacion: 'La Colilla (Ávila)',
    telefono: '637 522 262',
    email: 'emiliozyuste@gmail.com'
  },
  iva: 21,
  validez: 30,
  unidad: 'mm',
  minM2: 1,
  preciosRevisados: false,
  condiciones: 'Forma de pago: 50 % a la aceptación del presupuesto y el resto a la finalización de la obra.\nPlazo de entrega aproximado: 3-4 semanas desde la aceptación.\nMedidas a confirmar en obra antes de fabricar. No incluye trabajos de albañilería salvo que se indique.',
  materiales: [
    { id: 'alu', nombre: 'Aluminio', m2: 150 },
    { id: 'alurpt', nombre: 'Aluminio RPT', m2: 230 },
    { id: 'pvc', nombre: 'PVC', m2: 210 }
  ],
  vidrios: [
    { id: 'sencillo', nombre: 'Sencillo 4 mm', m2: 25 },
    { id: 'doble', nombre: 'Doble acristalamiento 4/16/4', m2: 45 },
    { id: 'bajoe', nombre: 'Doble bajo emisivo 4/16/4 BE', m2: 65 },
    { id: 'seguridad', nombre: 'Doble de seguridad 3+3/16/4', m2: 80 },
    { id: 'mate', nombre: 'Doble mate / impreso 4/16/4', m2: 55 }
  ],
  colores: [
    { id: 'blanco', nombre: 'Blanco', hex: '#f4f4f2', recargo: 0 },
    { id: 'plata', nombre: 'Anodizado plata', hex: '#c7ccd1', recargo: 5 },
    { id: 'antracita', nombre: 'Gris antracita', hex: '#4a4f54', recargo: 10 },
    { id: 'bronce', nombre: 'Bronce', hex: '#7b5a3a', recargo: 10 },
    { id: 'madera', nombre: 'Imitación madera', hex: '#a06d42', recargo: 15 }
  ],
  aperturas: { fija: 0, abatible: 35, oscilobatiente: 60, proyectante: 45, basculante: 45, corredera: 15 },
  extras: { persianaM2: 55, cajon: 180, mosquiteraM2: 30, colocacion: 40, retirada: 20 }
};

/* ---------- Almacenamiento ---------- */
const KEY = 'cristaleria-emilio-v1';
let DB = cargar();

function cargar() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* sin almacenamiento */ }
  if (!d || typeof d !== 'object') d = {};
  d.ajustes = completar(d.ajustes || {}, DEF_AJUSTES);
  d.presupuestos = Array.isArray(d.presupuestos) ? d.presupuestos : [];
  return d;
}
function completar(obj, def) {
  for (const k in def) {
    if (obj[k] === undefined) obj[k] = clone(def[k]);
    else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) completar(obj[k], def[k]);
  }
  return obj;
}
let _saveT;
function guardar(inmediato) {
  clearTimeout(_saveT);
  const f = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast('No se ha podido guardar en este dispositivo'); } };
  if (inmediato) f(); else _saveT = setTimeout(f, 250);
}
window.addEventListener('pagehide', () => guardar(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) guardar(true); });

const AJ = () => DB.ajustes;
const buscar = (lista, id) => lista.find((x) => x.id === id) || lista[0] || { id: '', nombre: '—', m2: 0, recargo: 0, hex: '#eeeeee' };
const getP = (id) => DB.presupuestos.find((p) => p.id === id);

/* ---------- Unidades ---------- */
const fU = () => (AJ().unidad === 'cm' ? 10 : 1);
const uTxt = () => (AJ().unidad === 'cm' ? 'cm' : 'mm');
function fmtLen(mm) { const v = (+mm || 0) / fU(); return Number.isInteger(v) ? String(v) : numES(v, 1); }

/* ---------- Modelo ---------- */
function nuevoNumero() {
  const y = new Date().getFullYear();
  let max = 0;
  for (const p of DB.presupuestos) {
    const m = /^(\d{4})\/(\d+)$/.exec(p.numero || '');
    if (m && +m[1] === y) max = Math.max(max, +m[2]);
  }
  return `${y}/${String(max + 1).padStart(3, '0')}`;
}
function nuevoPresupuesto() {
  return {
    id: uid(), numero: nuevoNumero(), fecha: hoy(), estado: 'borrador',
    cliente: { nombre: '', nif: '', telefono: '', email: '', direccion: '', poblacion: '' },
    obra: '', ventanas: [], conceptos: [], descuento: 0, notas: '',
    creado: Date.now(), modificado: Date.now()
  };
}
function aperturasPorDefecto(n) {
  return ({ 1: ['oscilo-dch'], 2: ['abat-izq', 'oscilo-dch'], 3: ['abat-izq', 'fija', 'oscilo-dch'], 4: ['fija', 'abat-izq', 'oscilo-dch', 'fija'] })[n] || ['oscilo-dch'];
}
function nuevaVentana() {
  const a = AJ();
  return {
    id: uid(), nombre: '', elemento: 'Ventana', sistema: 'practicable',
    ancho: 1200, alto: 1000, cantidad: 1, hojas: 2, aperturas: aperturasPorDefecto(2),
    montante: false, montanteAlto: 350, montanteTipo: 'fijo',
    zocalo: false, zocaloAlto: 400,
    material: a.materiales[0]?.id || '', color: a.colores[0]?.id || '', vidrio: (a.vidrios[1] || a.vidrios[0])?.id || '',
    persiana: false, cajon: a.extras.cajon || 180, mosquitera: false, colocacion: true, retirada: false,
    precioManual: '', notas: ''
  };
}

/* ---------- Cálculo de precios ---------- */
function calcularVentana(v) {
  const a = AJ();
  const W = +v.ancho || 0, H = +v.alto || 0;
  const area = (W * H) / 1e6;
  const areaCalc = Math.max(area, +a.minM2 || 0);
  const mat = buscar(a.materiales, v.material), col = buscar(a.colores, v.color), vid = buscar(a.vidrios, v.vidrio);
  const partes = [];
  const perfil = areaCalc * (+mat.m2 || 0) * (1 + (+col.recargo || 0) / 100);
  partes.push({ c: `${mat.nombre} (${numES(areaCalc)} m² × ${eur(mat.m2)}${+col.recargo ? ` + ${col.recargo} % ${col.nombre.toLowerCase()}` : ''})`, i: perfil });
  const Z = v.zocalo ? Math.min(+v.zocaloAlto || 0, H) : 0;
  const areaVidrio = Math.max((W * (H - Z)) / 1e6, 0);
  partes.push({ c: `Vidrio ${vid.nombre} (${numES(areaVidrio)} m²)`, i: areaVidrio * (+vid.m2 || 0) });
  // herrajes por hoja
  const cuenta = {};
  if (v.sistema === 'practicable') for (let i = 0; i < v.hojas; i++) { const g = APERTURAS[v.aperturas[i]]?.grupo || 'fija'; cuenta[g] = (cuenta[g] || 0) + 1; }
  if (v.sistema === 'corredera') cuenta.corredera = +v.hojas || 0;
  if (v.montante && v.montanteTipo === 'basculante') cuenta.basculante = (cuenta.basculante || 0) + 1;
  for (const g in cuenta) {
    const pr = +a.aperturas[g] || 0;
    if (pr && cuenta[g]) partes.push({ c: `Herrajes ${GRUPOS_APERTURA[g].toLowerCase()} (${cuenta[g]} × ${eur(pr)})`, i: pr * cuenta[g] });
  }
  if (v.persiana) { const ap = (W * (H + (+v.cajon || 0))) / 1e6; partes.push({ c: `Persiana con cajón (${numES(ap)} m²)`, i: ap * (+a.extras.persianaM2 || 0) }); }
  if (v.mosquitera) partes.push({ c: `Mosquitera (${numES(area)} m²)`, i: area * (+a.extras.mosquiteraM2 || 0) });
  if (v.retirada) partes.push({ c: 'Retirada de ventana antigua', i: +a.extras.retirada || 0 });
  if (v.colocacion) partes.push({ c: 'Colocación', i: +a.extras.colocacion || 0 });
  const calculado = r2(partes.reduce((s, p) => s + p.i, 0));
  const manual = String(v.precioManual ?? '').trim() !== '' ? r2(num(v.precioManual)) : null;
  const unidad = manual ?? calculado;
  const cant = Math.max(1, Math.round(+v.cantidad || 1));
  return { partes, calculado, manual, unidad, cant, total: r2(unidad * cant), area };
}
function calcularPresupuesto(p) {
  const lineas = p.ventanas.map((v) => calcularVentana(v).total);
  const otros = p.conceptos.map((c) => r2(num(c.cantidad) * num(c.precio)));
  const suma = r2([...lineas, ...otros].reduce((s, x) => s + x, 0));
  const dto = r2(suma * (num(p.descuento) / 100));
  const base = r2(suma - dto);
  const iva = r2(base * (+AJ().iva || 0) / 100);
  return { suma, dto, base, iva, total: r2(base + iva) };
}

/* ---------- Textos descriptivos ---------- */
function tituloVentana(v) {
  const sis = v.sistema === 'fijo' ? 'fija' : v.sistema;
  const h = v.sistema === 'fijo' ? (v.hojas > 1 ? `${v.hojas} paños` : '') : `${v.hojas} hoja${v.hojas > 1 ? 's' : ''}`;
  return `${v.elemento} ${sis}${h ? ' ' + h : ''}`;
}
function medidasTxt(v) { return `${fmtLen(v.ancho)} × ${fmtLen(v.alto)} ${uTxt()}`; }
function lineasDescripcion(v) {
  const a = AJ();
  const L = [];
  L.push(`Medidas: ${medidasTxt(v)} (ancho × alto)`);
  if (v.sistema === 'practicable') L.push('Apertura: ' + v.aperturas.slice(0, v.hojas).map((k) => APERTURAS[k]?.corto || k).join(' + '));
  if (v.sistema === 'corredera') L.push(`Apertura: corredera de ${v.hojas} hojas`);
  L.push(`${buscar(a.materiales, v.material).nombre} · color ${buscar(a.colores, v.color).nombre.toLowerCase()}`);
  L.push(`Vidrio: ${buscar(a.vidrios, v.vidrio).nombre}`);
  if (v.montante) L.push(`Montante superior ${v.montanteTipo === 'fijo' ? 'fijo' : 'basculante'} de ${fmtLen(v.montanteAlto)} ${uTxt()}`);
  if (v.zocalo) L.push(`Zócalo inferior ciego de ${fmtLen(v.zocaloAlto)} ${uTxt()}`);
  const inc = [];
  if (v.persiana) inc.push(`persiana con cajón (${fmtLen(v.cajon)} ${uTxt()})`);
  if (v.mosquitera) inc.push('mosquitera');
  if (v.retirada) inc.push('retirada de ventana antigua');
  if (v.colocacion) inc.push('colocación');
  if (inc.length) L.push('Incluye: ' + inc.join(', '));
  if (v.notas && v.notas.trim()) L.push(v.notas.trim());
  return L;
}

/* =========================================================================
   DIBUJO DE LA VENTANA
   Genera una lista de formas (rectángulos, líneas, textos) ya escaladas
   a una caja de tamaño BW × BH. Se usa igual para la pantalla (SVG) y el PDF.
   ========================================================================= */
const TINTA = '#23272b', VIDRIO = '#cfe7f5', COTA = '#2f6886';

function aclarar(hex, t) {
  const n = parseInt((hex || '#eeeeee').slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => Math.round(x + (255 - x) * t));
  return '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
}

function esOscuro(hex) {
  const n = parseInt((hex || '#ffffff').slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 128;
}

function dibujoVentana(v, BW, BH, fs, opts = {}) {
  const out = [];
  const W = Math.max(+v.ancho || 0, 100), H = Math.max(+v.alto || 0, 100);
  const C = v.persiana ? Math.max(+v.cajon || 0, 0) : 0;
  const M = v.montante && H >= 700 ? clamp(+v.montanteAlto || 0, 150, H - 450) : 0;
  const zMax = H - (M || 0) - 400;
  const Z = v.zocalo && zMax >= 100 ? clamp(+v.zocaloAlto || 0, 100, zMax) : 0;
  const cotas = opts.cotas !== false;
  const hayIzq = cotas && (M || Z);
  const ml = hayIzq ? fs * 2.7 : fs * 0.3, mr = cotas ? fs * 2.7 : fs * 0.3, mt = fs * 0.3, mb = cotas ? fs * 2.7 : fs * 0.3;
  const s = Math.max(Math.min((BW - ml - mr) / W, (BH - mt - mb) / (H + C)), 0.0001);
  const ox = ml + (BW - ml - mr - W * s) / 2, oy = mt + (BH - mt - mb - (H + C) * s) / 2;
  const X = (x) => ox + x * s, Y = (y) => oy + (y + C) * s;
  const fino = fs * 0.055, medio = fs * 0.09;

  const R = (x, y, w, h, fill, lw = fino, stroke = TINTA) => { if (w > 0 && h > 0) out.push({ t: 'rect', x: X(x), y: Y(y), w: w * s, h: h * s, fill, stroke, lw }); };
  const Lm = (x1, y1, x2, y2, o = {}) => out.push({ t: 'line', x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2), stroke: o.stroke || TINTA, lw: o.lw || fino, dash: o.dash });
  const Lo = (x1, y1, x2, y2, o = {}) => out.push({ t: 'line', x1, y1, x2, y2, stroke: o.stroke || TINTA, lw: o.lw || fino, dash: o.dash });
  const T = (x, y, txt, size, o = {}) => out.push({ t: 'text', x, y, txt, size, rot: o.rot || 0, fill: o.fill || TINTA, bold: !!o.bold });
  const Tri = (pts, fill) => out.push({ t: 'tri', pts, fill });

  const col = buscar(AJ().colores, v.color);
  const marco = col.hex || '#f4f4f2';
  const panel = aclarar(marco, 0.35);
  const F = Math.max(22, Math.min(60, Math.min(W, H) * 0.07));
  const S = F * 0.85, TR = F * 0.9;
  const dash = [fs * 0.35, fs * 0.25];

  // Símbolos de apertura (el vértice del triángulo indica el lado de las bisagras)
  function simbolo(tipo, gx, gy, gw, gh) {
    const o = { lw: fino * 1.1 };
    const lateral = (lado) => { // vértice en el lado de bisagras
      const ax = lado === 'izq' ? gx : gx + gw, bx = lado === 'izq' ? gx + gw : gx;
      Lm(bx, gy, ax, gy + gh / 2, o); Lm(ax, gy + gh / 2, bx, gy + gh, o);
    };
    const abajo = (d) => { Lm(gx, gy, gx + gw / 2, gy + gh, { ...o, dash: d }); Lm(gx + gw / 2, gy + gh, gx + gw, gy, { ...o, dash: d }); };
    if (tipo === 'abat-izq') lateral('izq');
    if (tipo === 'abat-dch') lateral('dch');
    if (tipo === 'oscilo-izq') { lateral('izq'); abajo(dash); }
    if (tipo === 'oscilo-dch') { lateral('dch'); abajo(dash); }
    if (tipo === 'basculante') abajo();
    if (tipo === 'proyectante') { Lm(gx, gy + gh, gx + gw / 2, gy, o); Lm(gx + gw / 2, gy, gx + gw, gy + gh, o); }
  }
  function manilla(tipo, hx, hy, hw, hh) {
    const mw = S * 0.34, ml2 = Math.min(130, hh * 0.28);
    let x, y, w = mw, h = ml2;
    if (/izq$/.test(tipo)) { x = hx + hw - S / 2 - mw / 2; y = hy + hh / 2 - ml2 / 2; }
    else if (/dch$/.test(tipo)) { x = hx + S / 2 - mw / 2; y = hy + hh / 2 - ml2 / 2; }
    else if (tipo === 'proyectante') { w = Math.min(130, hw * 0.28); h = mw; x = hx + hw / 2 - w / 2; y = hy + hh - S / 2 - h / 2; }
    else if (tipo === 'basculante') { w = Math.min(130, hw * 0.28); h = mw; x = hx + hw / 2 - w / 2; y = hy + S / 2 - h / 2; }
    else return;
    R(x, y, w, h, '#8a9096', fino * 0.8);
  }
  function hoja(tipo, hx, hy, hw, hh) {
    if (tipo === 'fija') {
      const g = S * 0.25;
      R(hx + g, hy + g, hw - 2 * g, hh - 2 * g, VIDRIO);
      if (Math.min(hw, hh) * s > fs * 2) T(X(hx + hw / 2), Y(hy + hh / 2), 'F', fs * 0.85, { fill: '#5d7f97', bold: true });
      return;
    }
    R(hx, hy, hw, hh, marco);
    const s2 = Math.min(S, hw / 4, hh / 4);
    const gx = hx + s2, gy = hy + s2, gw = hw - 2 * s2, gh = hh - 2 * s2;
    R(gx, gy, gw, gh, VIDRIO);
    simbolo(tipo, gx, gy, gw, gh);
    manilla(tipo, hx, hy, hw, hh);
  }
  function flecha(cx, cy, len, dir) { // dir: 1 derecha, -1 izquierda, 0 doble
    const x1 = X(cx - len / 2), x2 = X(cx + len / 2), y = Y(cy);
    const hd = Math.min(fs * 0.55, (x2 - x1) * 0.35);
    Lo(x1, y, x2, y, { lw: fino * 1.4 });
    if (dir >= 0) Tri([[x2, y], [x2 - hd, y - hd * 0.55], [x2 - hd, y + hd * 0.55]], TINTA);
    if (dir <= 0) Tri([[x1, y], [x1 + hd, y - hd * 0.55], [x1 + hd, y + hd * 0.55]], TINTA);
  }

  // Cajón de persiana
  if (C) {
    R(0, -C, W, C, marco, medio);
    if (C * s > fs * 1.3) T(X(W / 2), Y(-C / 2), 'Persiana', fs * 0.75, { fill: esOscuro(marco) ? '#ffffff' : '#4a5560' });
  }
  // Marco
  R(0, 0, W, H, marco, medio);
  R(F, F, W - 2 * F, H - 2 * F, marco);

  // Montante superior
  if (M) {
    R(F, M - TR / 2, W - 2 * F, TR, marco);
    const gx = F, gy = F, gw = W - 2 * F, gh = M - TR / 2 - F;
    if (v.montanteTipo === 'basculante') hoja('basculante', gx, gy, gw, gh);
    else R(gx, gy, gw, gh, VIDRIO);
  }
  // Zócalo inferior
  if (Z) {
    R(F, H - Z - TR / 2, W - 2 * F, TR, marco);
    const py = H - Z + TR / 2, ph = Z - TR / 2 - F;
    R(F, py, W - 2 * F, ph, panel);
    const ins = Math.min(S * 0.8, ph / 4);
    R(F + ins, py + ins, W - 2 * F - 2 * ins, ph - 2 * ins, 'none');
  }

  // Zona principal
  const x0 = F, x1 = W - F, y0 = M ? M + TR / 2 : F, y1 = Z ? H - Z - TR / 2 : H - F;
  const n = Math.max(1, Math.min(6, Math.round(+v.hojas || 1)));
  if (v.sistema === 'corredera') {
    const nn = Math.max(2, n);
    const o = S * 0.6;
    const hw = (x1 - x0 + (nn - 1) * o) / nn;
    const orden = [...Array(nn).keys()];
    for (const i of orden) {
      const hx = x0 + i * (hw - o);
      R(hx, y0, hw, y1 - y0, marco);
      const s2 = Math.min(S, hw / 4);
      const gx = hx + s2, gy = y0 + s2, gw = hw - 2 * s2, gh = y1 - y0 - 2 * s2;
      R(gx, gy, gw, gh, VIDRIO);
      const dir = nn % 2 === 1 && i === (nn - 1) / 2 ? 0 : (i < nn / 2 ? 1 : -1);
      flecha(gx + gw / 2, gy + gh / 2, Math.min(gw * 0.55, 450), dir);
      // tirador en el lado de cierre
      const mw = S * 0.34, mh = Math.min(140, gh * 0.25);
      const tx = dir === 1 ? hx + S / 2 - mw / 2 : dir === -1 ? hx + hw - S / 2 - mw / 2 : null;
      if (tx != null) R(tx, y0 + (y1 - y0) / 2 - mh / 2, mw, mh, '#8a9096', fino * 0.8);
    }
  } else if (v.sistema === 'fijo') {
    const pw = (x1 - x0 - (n - 1) * TR) / n;
    for (let i = 0; i < n; i++) {
      const px = x0 + i * (pw + TR);
      if (i > 0) R(px - TR, y0, TR, y1 - y0, marco);
      R(px, y0, pw, y1 - y0, VIDRIO);
    }
  } else {
    const hw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) hoja(v.aperturas[i] || 'fija', x0 + i * hw, y0, hw, y1 - y0);
  }

  // Cotas
  if (cotas) {
    const cs = fs, lwc = fino * 1.1, tk = fs * 0.28;
    const tick = (x, y) => Lo(x - tk, y + tk, x + tk, y - tk, { stroke: COTA, lw: lwc * 1.6 });
    // ancho (abajo)
    const yb = Y(H) + fs * 0.9;
    Lo(X(0), Y(H) + fs * 0.2, X(0), yb + fs * 0.3, { stroke: COTA, lw: lwc });
    Lo(X(W), Y(H) + fs * 0.2, X(W), yb + fs * 0.3, { stroke: COTA, lw: lwc });
    Lo(X(0), yb, X(W), yb, { stroke: COTA, lw: lwc }); tick(X(0), yb); tick(X(W), yb);
    T(X(W / 2), yb + fs * 0.95, fmtLen(W), cs, { fill: COTA, bold: true });
    // alto (derecha)
    const xr = X(W) + fs * 0.9;
    const puntos = C ? [-C, 0, H] : [0, H];
    for (const p of puntos) Lo(X(W) + fs * 0.2, Y(p), xr + fs * 0.3, Y(p), { stroke: COTA, lw: lwc });
    Lo(xr, Y(puntos[0]), xr, Y(H), { stroke: COTA, lw: lwc });
    for (const p of puntos) tick(xr, Y(p));
    T(xr + fs * 0.95, Y(H / 2), fmtLen(H), cs, { fill: COTA, bold: true, rot: 90 });
    if (C) T(xr + fs * 0.95, Y(-C / 2), fmtLen(C), cs * 0.8, { fill: COTA, rot: 90 });
    // montante y zócalo (izquierda)
    if (hayIzq) {
      const xl = X(0) - fs * 0.9;
      const tramo = (a, b, big) => {
        Lo(X(0) - fs * 0.2, Y(a), xl - fs * 0.3, Y(a), { stroke: COTA, lw: lwc });
        Lo(X(0) - fs * 0.2, Y(b), xl - fs * 0.3, Y(b), { stroke: COTA, lw: lwc });
        Lo(xl, Y(a), xl, Y(b), { stroke: COTA, lw: lwc }); tick(xl, Y(a)); tick(xl, Y(b));
        T(xl - fs * 0.95, Y((a + b) / 2), fmtLen(b - a), cs * 0.8, { fill: COTA, rot: 90 });
      };
      if (M) tramo(0, M);
      if (Z) tramo(H - Z, H);
    }
  }
  return out;
}

/* ---------- Dibujo → SVG (pantalla) ---------- */
function svgVentana(v, BW = 420, BH = 340, fs = 14, opts = {}) {
  const sh = dibujoVentana(v, BW, BH, fs, opts);
  const f = (n) => Math.round(n * 100) / 100;
  const parts = sh.map((o) => {
    if (o.t === 'rect') return `<rect x="${f(o.x)}" y="${f(o.y)}" width="${f(o.w)}" height="${f(o.h)}" fill="${o.fill}" stroke="${o.stroke}" stroke-width="${f(o.lw)}"/>`;
    if (o.t === 'line') return `<line x1="${f(o.x1)}" y1="${f(o.y1)}" x2="${f(o.x2)}" y2="${f(o.y2)}" stroke="${o.stroke}" stroke-width="${f(o.lw)}"${o.dash ? ` stroke-dasharray="${o.dash.map(f).join(' ')}"` : ''} stroke-linecap="round"/>`;
    if (o.t === 'tri') return `<polygon points="${o.pts.map((p) => f(p[0]) + ',' + f(p[1])).join(' ')}" fill="${o.fill}"/>`;
    if (o.t === 'text') return `<text x="${f(o.x)}" y="${f(o.y)}" font-size="${f(o.size)}" fill="${o.fill}" text-anchor="middle" dominant-baseline="central"${o.bold ? ' font-weight="700"' : ''}${o.rot ? ` transform="rotate(-90 ${f(o.x)} ${f(o.y)})"` : ''}>${esc(o.txt)}</text>`;
    return '';
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BW} ${BH}" font-family="Helvetica, Arial, sans-serif" role="img" aria-label="${esc(tituloVentana(v) + ' ' + medidasTxt(v))}">${parts.join('')}</svg>`;
}

/* ---------- Dibujo → PDF ---------- */
function pdfVentana(doc, v, px, py, BW, BH, fs) {
  const sh = dibujoVentana(v, BW, BH, fs);
  for (const o of sh) {
    if (o.t === 'rect') {
      doc.setLineWidth(o.lw); doc.setDrawColor(o.stroke);
      if (o.fill && o.fill !== 'none') { doc.setFillColor(o.fill); doc.rect(px + o.x, py + o.y, o.w, o.h, 'FD'); }
      else doc.rect(px + o.x, py + o.y, o.w, o.h, 'S');
    } else if (o.t === 'line') {
      doc.setLineWidth(o.lw); doc.setDrawColor(o.stroke);
      if (o.dash) doc.setLineDashPattern(o.dash, 0);
      doc.line(px + o.x1, py + o.y1, px + o.x2, py + o.y2);
      if (o.dash) doc.setLineDashPattern([], 0);
    } else if (o.t === 'tri') {
      doc.setFillColor(o.fill);
      const [a, b, c] = o.pts;
      doc.triangle(px + a[0], py + a[1], px + b[0], py + b[1], px + c[0], py + c[1], 'F');
    } else if (o.t === 'text') {
      doc.setFont('helvetica', o.bold ? 'bold' : 'normal');
      doc.setFontSize(o.size / 0.3528);
      doc.setTextColor(o.fill);
      const tw = doc.getTextWidth(o.txt);
      if (o.rot) doc.text(o.txt, px + o.x + o.size * 0.35, py + o.y + tw / 2, { angle: 90 });
      else doc.text(o.txt, px + o.x - tw / 2, py + o.y + o.size * 0.35);
    }
  }
}

/* =========================================================================
   GENERACIÓN DEL PDF
   ========================================================================= */
let _logo = null;
async function logoDataURL() {
  if (_logo) return _logo;
  const res = await fetch('img/logo.png');
  const blob = await res.blob();
  _logo = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });
  return _logo;
}

async function generarPDF(p) {
  if (!window.jspdf) throw new Error('No se ha cargado el generador de PDF');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const a = AJ(), e = a.empresa;
  const AZUL = '#2f6886', GRIS = '#5d6770', LINEA = '#cfd6dc';
  const PW = 210, PH = 297, MX = 14, XR = PW - MX;
  const logo = await logoDataURL().catch(() => null);
  const tot = calcularPresupuesto(p);

  const font = (size, estilo = 'normal', color = '#1b1f23') => { doc.setFont('helvetica', estilo); doc.setFontSize(size); doc.setTextColor(color); };
  const txtR = (t, x, y) => doc.text(String(t), x - doc.getTextWidth(String(t)), y);
  const txtC = (t, x, y) => doc.text(String(t), x - doc.getTextWidth(String(t)) / 2, y);

  function cabeceraCompleta() {
    if (logo) doc.addImage(logo, 'PNG', MX, 11, 60, 23.24);
    else { font(18, 'bold', AZUL); doc.text(e.nombre, MX, 22); }
    font(7.8, 'normal', GRIS);
    doc.text(`${e.titular.toUpperCase()}  ·  N.I.F. ${e.nif}`, MX, 38.5);
    font(9, 'normal', '#1b1f23');
    const lineas = [e.direccion, `${e.cp} ${e.poblacion}`.trim(), e.telefono ? `Telf.: ${e.telefono}` : '', e.email ? `E-mail: ${e.email}` : ''].filter(Boolean);
    lineas.forEach((l, i) => txtR(l, XR, 16 + i * 4.6));
    doc.setDrawColor(AZUL); doc.setLineWidth(0.6); doc.line(MX, 42, XR, 42);
    return 42;
  }
  function cabeceraCorta() {
    if (logo) doc.addImage(logo, 'PNG', MX, 9, 34, 13.17);
    font(9, 'bold', AZUL); txtR(`Presupuesto Nº ${p.numero} (continuación)`, XR, 17);
    doc.setDrawColor(AZUL); doc.setLineWidth(0.4); doc.line(MX, 24, XR, 24);
    return 24;
  }
  // Columnas de la tabla
  const COL = { dib: MX, dibW: 50, desc: MX + 54, descW: 74, cant: 150, precio: 174, imp: XR };
  function cabeceraTabla(y) {
    doc.setFillColor(AZUL); doc.rect(MX, y, XR - MX, 7.5, 'F');
    font(8.5, 'bold', '#ffffff');
    doc.text('Dibujo', COL.dib + 2, y + 5);
    doc.text('Descripción', COL.desc, y + 5);
    txtC('Cant.', COL.cant, y + 5);
    txtR('Precio ud.', COL.precio, y + 5);
    txtR('Importe', COL.imp - 1.5, y + 5);
    return y + 7.5;
  }
  const LIMITE = PH - 18;
  let y = cabeceraCompleta();

  // Título y datos del presupuesto
  y += 9;
  font(17, 'bold', AZUL); doc.text('PRESUPUESTO', MX, y);
  font(9.5, 'normal');
  txtR(`Nº ${p.numero}`, XR, y - 5);
  txtR(`Fecha: ${fechaES(p.fecha)}`, XR, y - 0.4);
  txtR(`Válido hasta: ${fechaES(sumarDias(p.fecha, a.validez))}`, XR, y + 4.2);
  y += 8;

  // Cliente
  const c = p.cliente;
  const filasCli = [
    ['Cliente', c.nombre],
    ['NIF/DNI', c.nif],
    ['Dirección', [c.direccion, c.poblacion].filter(Boolean).join(', ')],
    ['Teléfono', [c.telefono, c.email].filter(Boolean).join('   ·   ')],
    ['Obra', p.obra]
  ].filter((f) => f[1] && String(f[1]).trim());
  if (!filasCli.length) filasCli.push(['Cliente', '']);
  const hCli = 6 + filasCli.length * 5;
  doc.setFillColor('#f1f4f7'); doc.setDrawColor(LINEA); doc.setLineWidth(0.2);
  doc.roundedRect(MX, y, XR - MX, hCli, 2, 2, 'FD');
  filasCli.forEach((f, i) => {
    const yy = y + 6.8 + i * 5;
    font(8, 'bold', GRIS); doc.text(f[0].toUpperCase(), MX + 4, yy);
    font(9.5, i === 0 ? 'bold' : 'normal'); doc.text(doc.splitTextToSize(String(f[1]), XR - MX - 34)[0] || '', MX + 28, yy);
  });
  y += hCli + 6;

  y = cabeceraTabla(y);

  const nuevaPagina = () => { doc.addPage(); let yy = cabeceraCorta() + 5; return cabeceraTabla(yy); };

  // Ventanas
  p.ventanas.forEach((v, idx) => {
    const cv = calcularVentana(v);
    font(8.6, 'normal');
    const desc = lineasDescripcion(v).flatMap((l) => doc.splitTextToSize(l, COL.descW));
    font(9.6, 'bold');
    const titL = doc.splitTextToSize(`${idx + 1}. ${tituloVentana(v)}${v.nombre ? ' — ' + v.nombre : ''}`, COL.cant - 7 - COL.desc);
    const altoTexto = 7 + titL.length * 4.3 + desc.length * 3.9;
    const rowH = Math.max(42, altoTexto + 3);
    if (y + rowH > LIMITE) y = nuevaPagina();
    // dibujo
    pdfVentana(doc, v, COL.dib + 1, y + 2, COL.dibW - 2, rowH - 4, 2.5);
    // textos
    font(9.6, 'bold', AZUL);
    titL.forEach((l, i) => doc.text(l, COL.desc, y + 6.5 + i * 4.3));
    const yd = y + 11.5 + (titL.length - 1) * 4.3;
    font(8.6, 'normal', '#30363c');
    desc.forEach((l, i) => doc.text(l, COL.desc, yd + i * 3.9));
    font(9.5, 'normal');
    txtC(String(cv.cant), COL.cant, y + 6.5);
    txtR(eur(cv.unidad), COL.precio, y + 6.5);
    font(9.5, 'bold'); txtR(eur(cv.total), COL.imp - 1.5, y + 6.5);
    y += rowH;
    doc.setDrawColor(LINEA); doc.setLineWidth(0.25); doc.line(MX, y, XR, y);
  });

  // Otros conceptos
  p.conceptos.filter((k) => (k.desc || '').trim() || num(k.precio)).forEach((k) => {
    font(9, 'normal');
    const lines = doc.splitTextToSize(k.desc || '', COL.cant - COL.dib - 12);
    const rowH = Math.max(9, 4 + lines.length * 4.2);
    if (y + rowH > LIMITE) y = nuevaPagina();
    font(9, 'normal', '#30363c');
    lines.forEach((l, i) => doc.text(l, COL.dib + 2, y + 6 + i * 4.2));
    font(9.5, 'normal');
    txtC(String(num(k.cantidad) || 0).replace('.', ','), COL.cant, y + 6);
    txtR(eur(num(k.precio)), COL.precio, y + 6);
    font(9.5, 'bold'); txtR(eur(num(k.cantidad) * num(k.precio)), COL.imp - 1.5, y + 6);
    y += rowH;
    doc.setDrawColor(LINEA); doc.setLineWidth(0.25); doc.line(MX, y, XR, y);
  });

  if (!p.ventanas.length && !p.conceptos.length) {
    font(9, 'italic', GRIS); doc.text('Sin conceptos.', COL.dib + 2, y + 6); y += 10;
  }

  // Totales
  const filasTot = [['Suma', eur(tot.suma)]];
  if (tot.dto) filasTot.push([`Descuento ${numES(num(p.descuento), 2).replace(/,00$/, '')} %`, '-' + eur(tot.dto)]);
  filasTot.push(['Base imponible', eur(tot.base)], [`IVA ${a.iva} %`, eur(tot.iva)]);
  const hTot = filasTot.length * 5.6 + 12;
  if (y + 6 + hTot > LIMITE) { doc.addPage(); y = cabeceraCorta() + 4; }
  y += 6;
  const tx = 120;
  filasTot.forEach((f, i) => {
    font(9.5, 'normal', '#30363c'); doc.text(f[0], tx, y + 4 + i * 5.6);
    font(9.5, 'normal'); txtR(f[1], XR - 1.5, y + 4 + i * 5.6);
  });
  let yT = y + filasTot.length * 5.6 + 0.5;
  doc.setFillColor(AZUL); doc.roundedRect(tx - 3, yT, XR - tx + 3, 9, 1.5, 1.5, 'F');
  font(11.5, 'bold', '#ffffff'); doc.text('TOTAL', tx, yT + 6.2); txtR(eur(tot.total), XR - 1.5, yT + 6.2);
  const yFinTot = yT + 9;

  // Notas y condiciones (a la izquierda de los totales y debajo)
  const bloques = [];
  if ((p.notas || '').trim()) bloques.push(['Observaciones', p.notas.trim()]);
  if ((a.condiciones || '').trim()) bloques.push(['Condiciones', a.condiciones.trim()]);
  let yN = y + 1;
  const anchoNotas = tx - MX - 8;
  for (const [tit, txt] of bloques) {
    font(8.5, 'normal');
    const ls = txt.split('\n').flatMap((l) => doc.splitTextToSize(l, anchoNotas));
    if (yN + 6 + ls.length * 3.7 > LIMITE) { doc.addPage(); yN = cabeceraCorta() + 8; }
    font(8.5, 'bold', AZUL); doc.text(tit.toUpperCase(), MX, yN + 3);
    font(8.3, 'normal', '#30363c');
    ls.forEach((l, i) => doc.text(l, MX, yN + 7.5 + i * 3.7));
    yN += 9 + ls.length * 3.7;
  }

  // Firma de conformidad
  let yF = Math.max(yN, yFinTot) + 6;
  if (doc.getNumberOfPages() > 1 && doc.getCurrentPageInfo().pageNumber !== doc.getNumberOfPages()) doc.setPage(doc.getNumberOfPages());
  if (yF + 26 > LIMITE) { doc.addPage(); yF = cabeceraCorta() + 8; }
  doc.setDrawColor(LINEA); doc.setLineWidth(0.3);
  doc.roundedRect(tx - 3, yF, XR - tx + 3, 24, 1.5, 1.5, 'S');
  font(8, 'bold', GRIS); doc.text('CONFORME CLIENTE', tx, yF + 5);
  font(7.5, 'normal', GRIS); doc.text('Fecha y firma:', tx, yF + 9.5);

  // Pies de página
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(LINEA); doc.setLineWidth(0.2); doc.line(MX, PH - 13, XR, PH - 13);
    font(7.5, 'normal', GRIS);
    doc.text(`${e.nombre} · ${e.titular} · N.I.F. ${e.nif} · Tel. ${e.telefono}`, MX, PH - 8.5);
    txtR(`Página ${i} de ${n}`, XR, PH - 8.5);
  }
  doc.setProperties({ title: `Presupuesto ${p.numero}`, author: e.nombre, subject: 'Presupuesto', creator: 'Presupuestos Cristalería Emilio' });
  return doc;
}

function nombreArchivo(p) {
  const cli = (p.cliente.nombre || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  return `Presupuesto_${p.numero.replace(/\//g, '-')}_${cli}.pdf`;
}
function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function accionPDF(p, modo) {
  try {
    toast('Generando PDF…');
    const doc = await generarPDF(p);
    const blob = doc.output('blob');
    const nombre = nombreArchivo(p);
    if (modo === 'compartir') {
      const file = new File([blob], nombre, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: `Presupuesto ${p.numero}`, text: `Presupuesto ${p.numero} de ${AJ().empresa.nombre}` }); }
        catch (err) { if (err && err.name !== 'AbortError') throw err; }
        if (p.estado === 'borrador') { p.estado = 'enviado'; guardar(); }
        return;
      }
      toast('Este dispositivo no permite compartir: se descarga el PDF');
      descargarBlob(blob, nombre);
      return;
    }
    if (modo === 'ver') {
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) descargarBlob(blob, nombre);
      setTimeout(() => URL.revokeObjectURL(url), 120000);
      return;
    }
    descargarBlob(blob, nombre);
  } catch (err) {
    console.error(err);
    alert('No se ha podido generar el PDF: ' + err.message);
  }
}

/* ---------- Copiar datos para la factura ---------- */
function textoFactura(p) {
  const a = AJ(), c = p.cliente, t = calcularPresupuesto(p);
  const L = [];
  L.push(`Presupuesto ${p.numero} (${fechaES(p.fecha)})`);
  L.push(`Cliente: ${c.nombre || ''}`);
  if (c.nif) L.push(`NIF/DNI: ${c.nif}`);
  const dir = [c.direccion, c.poblacion].filter(Boolean).join(', ');
  if (dir) L.push(`Dirección: ${dir}`);
  L.push('');
  L.push('Conceptos:');
  p.ventanas.forEach((v) => { const cv = calcularVentana(v); L.push(`- ${cv.cant} × ${tituloVentana(v)} ${medidasTxt(v)}${v.nombre ? ' (' + v.nombre + ')' : ''} — ${eur(cv.unidad)}/ud = ${eur(cv.total)}`); });
  p.conceptos.forEach((k) => { if ((k.desc || '').trim()) L.push(`- ${num(k.cantidad)} × ${k.desc} — ${eur(num(k.precio))}/ud = ${eur(num(k.cantidad) * num(k.precio))}`); });
  L.push('');
  if (t.dto) L.push(`Descuento: -${eur(t.dto)}`);
  L.push(`Base imponible: ${eur(t.base)}`);
  L.push(`IVA ${a.iva} %: ${eur(t.iva)}`);
  L.push(`TOTAL: ${eur(t.total)}`);
  return L.join('\n');
}
async function copiarTexto(txt) {
  try { await navigator.clipboard.writeText(txt); return true; }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* nada */ }
    ta.remove(); return ok;
  }
}

/* =========================================================================
   VISTAS
   ========================================================================= */
const app = $('#app');
let vista = {};

function router() {
  const h = location.hash.replace(/^#\/?/, '');
  const partes = h.split('/').filter(Boolean);
  $$('.topbar nav a').forEach((a) => a.classList.toggle('activo', (a.dataset.nav === 'ajustes') === (partes[0] === 'ajustes')));
  if (partes[0] === 'ajustes') return vistaAjustes();
  if (partes[0] === 'p' && partes[1]) {
    const p = getP(partes[1]);
    if (!p) { location.hash = '#/'; return; }
    if (partes[2] === 'v' && partes[3]) {
      const v = p.ventanas.find((x) => x.id === partes[3]);
      if (!v) { location.hash = `#/p/${p.id}`; return; }
      return vistaVentana(p, v);
    }
    return vistaPresupuesto(p);
  }
  return vistaLista();
}
window.addEventListener('hashchange', () => { guardar(true); if (!desbloqueado()) return pantallaBloqueo(); router(); window.scrollTo(0, 0); });

/* ----- Lista de presupuestos ----- */
function vistaLista(filtro = '') {
  vista = { tipo: 'lista' };
  const a = AJ();
  const q = filtro.trim().toLowerCase();
  const lista = DB.presupuestos
    .slice()
    .sort((x, y) => (y.fecha || '').localeCompare(x.fecha || '') || (y.numero || '').localeCompare(x.numero || ''))
    .filter((p) => !q || [p.numero, p.cliente.nombre, p.obra, p.cliente.telefono, p.cliente.poblacion].join(' ').toLowerCase().includes(q));
  app.innerHTML = `
    ${!a.preciosRevisados ? `<div class="aviso"><span><strong>Antes de empezar:</strong> los precios que trae la app son de ejemplo. Pon los tuyos en Ajustes.</span>
      <span class="fila"><a class="btn peq pri" href="#/ajustes">Ir a Ajustes</a><button class="btn peq" data-act="ocultar-aviso">Entendido</button></span></div>` : ''}
    <div class="cabecera">
      <input type="search" id="buscar" placeholder="Buscar por cliente, número, obra…" value="${esc(filtro)}" aria-label="Buscar">
      <button class="btn pri" data-act="nuevo">${ICON.mas} Nuevo presupuesto</button>
    </div>
    ${lista.length ? lista.map((p) => {
      const t = calcularPresupuesto(p);
      const nv = p.ventanas.reduce((s, v) => s + (Math.round(+v.cantidad) || 1), 0);
      return `<a class="item" href="#/p/${p.id}">
        <div>
          <div><span class="num">${esc(p.numero)}</span> <span class="badge ${p.estado}">${ESTADOS[p.estado] || ''}</span></div>
          <div class="cli">${esc(p.cliente.nombre || 'Sin nombre')}</div>
          <div class="meta">${fechaES(p.fecha)} · ${nv} ${nv === 1 ? 'elemento' : 'elementos'}${p.obra ? ' · ' + esc(p.obra) : ''}</div>
        </div>
        <div class="tot">${eur(t.total)}</div>
      </a>`;
    }).join('') : `<div class="vacio card">${q ? 'No hay presupuestos que coincidan.' : 'Aún no hay presupuestos.<br>Pulsa <strong>Nuevo presupuesto</strong> para empezar.'}</div>`}
  `;
  const b = $('#buscar');
  b.addEventListener('input', () => { const pos = b.selectionStart; vistaLista(b.value); const nb = $('#buscar'); nb.focus(); try { nb.setSelectionRange(pos, pos); } catch (e) { /* */ } });
}

/* ----- Presupuesto ----- */
function vistaPresupuesto(p) {
  vista = { tipo: 'presupuesto', p };
  const c = p.cliente;
  app.innerHTML = `
    <a class="volver" href="#/">${ICON.atras} Presupuestos</a>
    <div class="card">
      <div class="grid g3">
        <label class="f">Nº presupuesto<input data-p="numero" value="${esc(p.numero)}"></label>
        <label class="f">Fecha<input type="date" data-p="fecha" value="${esc(p.fecha)}"></label>
        <label class="f span-m">Estado<select data-p="estado">${Object.entries(ESTADOS).map(([k, n]) => `<option value="${k}"${p.estado === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
    </div>
    <div class="card">
      <h2>Cliente</h2>
      <div class="grid g2">
        <label class="f full">Nombre<input data-p="cliente.nombre" value="${esc(c.nombre)}" autocomplete="off" placeholder="Nombre y apellidos o empresa"></label>
        <label class="f">Teléfono<input type="tel" data-p="cliente.telefono" value="${esc(c.telefono)}" inputmode="tel"></label>
        <label class="f">NIF / DNI<input data-p="cliente.nif" value="${esc(c.nif)}" autocapitalize="characters"></label>
        <label class="f">Dirección<input data-p="cliente.direccion" value="${esc(c.direccion)}"></label>
        <label class="f">Población<input data-p="cliente.poblacion" value="${esc(c.poblacion)}"></label>
        <label class="f">Email<input type="email" data-p="cliente.email" value="${esc(c.email)}" inputmode="email"></label>
        <label class="f">Obra / lugar<input data-p="obra" value="${esc(p.obra)}" placeholder="Ej.: Casa del pueblo, cocina"></label>
      </div>
    </div>
    <div class="card">
      <h2>Ventanas y cerramientos <button class="btn peq pri" data-act="add-ventana">${ICON.mas} Añadir</button></h2>
      <div id="lista-ventanas">${htmlVentanas(p)}</div>
    </div>
    <div class="card">
      <h2>Otros conceptos <button class="btn peq" data-act="add-concepto">${ICON.mas} Añadir</button></h2>
      <p class="hint" style="margin-top:-6px;margin-bottom:10px">Mamparas, espejos, cristales sueltos, desplazamiento…</p>
      <div id="lista-conceptos">${htmlConceptos(p)}</div>
    </div>
    <div class="card">
      <h2>Totales</h2>
      <div class="grid g2" style="margin-bottom:10px">
        <label class="f">Descuento (%)<input data-p="descuento" data-type="num" inputmode="decimal" value="${esc(p.descuento || '')}" placeholder="0"></label>
      </div>
      <div id="totales">${htmlTotales(p)}</div>
    </div>
    <div class="card">
      <h2>Observaciones</h2>
      <textarea data-p="notas" placeholder="Aparecen en el PDF (opcional)">${esc(p.notas)}</textarea>
    </div>
    <div class="card">
      <h2>Más acciones</h2>
      <div class="fila">
        <button class="btn" data-act="copiar-factura">${ICON.copiar} Copiar datos para la factura</button>
        <button class="btn" data-act="duplicar-p">${ICON.copiar} Duplicar presupuesto</button>
        <button class="btn peligro" data-act="borrar-p">${ICON.borrar} Eliminar</button>
      </div>
      <p class="hint">«Copiar datos para la factura» copia cliente, conceptos e importes para pegarlos en la aplicación de facturación.</p>
    </div>
    <div class="barra-acciones">
      <button class="btn" data-act="pdf-descargar">${ICON.bajar} Descargar</button>
      <button class="btn" data-act="pdf-ver">${ICON.pdf} Ver PDF</button>
      <button class="btn pri" data-act="pdf-compartir">${ICON.enviar} Enviar</button>
    </div>
  `;
}
function htmlVentanas(p) {
  if (!p.ventanas.length) return '<p class="hint">Todavía no hay ventanas. Pulsa <strong>Añadir</strong>.</p>';
  return p.ventanas.map((v, i) => {
    const cv = calcularVentana(v);
    return `<div class="ventana">
      <a class="mini" href="#/p/${p.id}/v/${v.id}" aria-label="Editar">${svgVentana(v, 220, 190, 15, { cotas: false })}</a>
      <div>
        <div class="tit">${i + 1}. ${esc(tituloVentana(v))}${v.nombre ? ' · ' + esc(v.nombre) : ''}</div>
        <div class="det">${esc(medidasTxt(v))} · ${esc(buscar(AJ().materiales, v.material).nombre)}${cv.cant > 1 ? ` · <strong>${cv.cant} uds.</strong>` : ''}</div>
      </div>
      <div class="pr">
        <div>${eur(cv.total)}${cv.manual != null ? ' <span class="badge">manual</span>' : ''}</div>
        <div class="acc">
          <a class="btn icono" href="#/p/${p.id}/v/${v.id}" title="Editar" aria-label="Editar">${ICON.editar}</a>
          <button class="btn icono" data-act="dup-ventana" data-id="${v.id}" title="Duplicar" aria-label="Duplicar">${ICON.copiar}</button>
          <button class="btn icono peligro" data-act="del-ventana" data-id="${v.id}" title="Eliminar" aria-label="Eliminar">${ICON.borrar}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
function htmlConceptos(p) {
  if (!p.conceptos.length) return '';
  return p.conceptos.map((k, i) => `<div class="concepto">
      <label class="f">Descripción<input data-c="${i}.desc" value="${esc(k.desc)}" placeholder="Concepto"></label>
      <label class="f">Cant.<input data-c="${i}.cantidad" inputmode="decimal" value="${esc(k.cantidad)}"></label>
      <label class="f">Precio (€)<input data-c="${i}.precio" inputmode="decimal" value="${esc(k.precio)}"></label>
      <button class="btn icono peligro" data-act="del-concepto" data-i="${i}" aria-label="Eliminar concepto">${ICON.borrar}</button>
    </div>`).join('');
}
function htmlTotales(p) {
  const t = calcularPresupuesto(p);
  return `<table class="totales">
    <tr><td>Suma</td><td>${eur(t.suma)}</td></tr>
    ${t.dto ? `<tr><td>Descuento</td><td>-${eur(t.dto)}</td></tr>` : ''}
    <tr><td>Base imponible</td><td>${eur(t.base)}</td></tr>
    <tr><td>IVA ${AJ().iva} %</td><td>${eur(t.iva)}</td></tr>
    <tr class="total"><td>TOTAL</td><td>${eur(t.total)}</td></tr>
  </table>`;
}

/* ----- Editor de ventana ----- */
function vistaVentana(p, v) {
  vista = { tipo: 'ventana', p, v };
  const a = AJ(), u = uTxt();
  const opt = (lista, sel) => lista.map((x) => `<option value="${esc(x.id)}"${x.id === sel ? ' selected' : ''}>${esc(x.nombre)}</option>`).join('');
  const len = (k, lab, extra = '') => `<label class="f">${lab} (${u})<input data-v="${k}" data-type="len" inputmode="decimal" value="${esc(fmtLen(v[k]))}" ${extra}></label>`;
  const chk = (k, lab) => `<label class="chk"><input type="checkbox" data-v="${k}" data-type="bool" data-re="1"${v[k] ? ' checked' : ''}> ${lab}</label>`;
  const idx = p.ventanas.indexOf(v) + 1;
  const maxH = v.sistema === 'corredera' ? 4 : 4, minH = v.sistema === 'corredera' ? 2 : 1;
  app.innerHTML = `
    <a class="volver" href="#/p/${p.id}">${ICON.atras} Presupuesto ${esc(p.numero)}</a>
    <div class="editor">
      <div class="lienzo">
        <div class="dibujo" id="dibujo">${svgVentana(v)}</div>
        <div class="unidad">Medidas en ${u}</div>
        <div class="card precio-box" id="precio">${htmlPrecio(v)}</div>
      </div>
      <div>
        <div class="card">
          <h2>Elemento ${idx}</h2>
          <div class="grid g2">
            <label class="f">Tipo<select data-v="elemento">${ELEMENTOS.map((e) => `<option${e === v.elemento ? ' selected' : ''}>${e}</option>`).join('')}</select></label>
            <label class="f">Ubicación / nombre<input data-v="nombre" value="${esc(v.nombre)}" placeholder="Ej.: Cocina"></label>
          </div>
          <div style="margin-top:12px">
            <div class="hint" style="margin:0 0 6px;font-weight:600">Sistema</div>
            <div class="seg" role="group" aria-label="Sistema">${Object.entries(SISTEMAS).map(([k, n]) => `<button type="button" data-act="sistema" data-val="${k}" class="${v.sistema === k ? 'on' : ''}">${n}</button>`).join('')}</div>
          </div>
        </div>
        <div class="card">
          <h2>Medidas</h2>
          <div class="grid g3">
            ${len('ancho', 'Ancho')}
            ${len('alto', 'Alto')}
            <label class="f span-m">Cantidad<input data-v="cantidad" data-type="int" inputmode="numeric" value="${esc(v.cantidad)}"></label>
          </div>
        </div>
        <div class="card">
          <h2>${v.sistema === 'fijo' ? 'Paños' : 'Hojas'}</h2>
          <div class="seg" role="group" aria-label="Número de hojas">${[1, 2, 3, 4].filter((n) => n >= minH && n <= maxH).map((n) => `<button type="button" data-act="hojas" data-val="${n}" class="${+v.hojas === n ? 'on' : ''}">${n}</button>`).join('')}</div>
          ${v.sistema === 'practicable' ? `<div class="hojas">${Array.from({ length: v.hojas }, (_, i) => `
            <label class="f">Hoja ${i + 1}${v.hojas > 1 ? (i === 0 ? ' (izq.)' : i === v.hojas - 1 ? ' (dcha.)' : '') : ''}
              <select data-ap="${i}">${Object.entries(APERTURAS).map(([k, x]) => `<option value="${k}"${v.aperturas[i] === k ? ' selected' : ''}>${x.corto}</option>`).join('')}</select>
            </label>`).join('')}</div>
            <p class="hint">Vista desde el interior. «izq.» / «dcha.» es el lado de las bisagras (donde apunta el vértice del triángulo).</p>` : ''}
          ${v.sistema === 'corredera' ? '<p class="hint">Las flechas indican el sentido de apertura de cada hoja.</p>' : ''}
          <div style="margin-top:10px">
            ${chk('montante', 'Montante superior')}
            ${v.montante ? `<div class="sub grid g2">${len('montanteAlto', 'Alto montante')}
              <label class="f">Montante<select data-v="montanteTipo"><option value="fijo"${v.montanteTipo === 'fijo' ? ' selected' : ''}>Fijo</option><option value="basculante"${v.montanteTipo === 'basculante' ? ' selected' : ''}>Basculante</option></select></label></div>` : ''}
            ${chk('zocalo', 'Zócalo inferior (panel ciego)')}
            ${v.zocalo ? `<div class="sub grid g2">${len('zocaloAlto', 'Alto zócalo')}</div>` : ''}
          </div>
        </div>
        <div class="card">
          <h2>Material y vidrio</h2>
          <div class="grid g2">
            <label class="f full">Material<select data-v="material">${opt(a.materiales, v.material)}</select></label>
            <label class="f full">Color<select data-v="color">${opt(a.colores, v.color)}</select></label>
            <label class="f full">Vidrio<select data-v="vidrio">${opt(a.vidrios, v.vidrio)}</select></label>
          </div>
        </div>
        <div class="card">
          <h2>Extras</h2>
          ${chk('persiana', 'Persiana con cajón')}
          ${v.persiana ? `<div class="sub grid g2">${len('cajon', 'Alto cajón')}</div>` : ''}
          ${chk('mosquitera', 'Mosquitera')}
          ${chk('retirada', 'Retirada de ventana antigua')}
          ${chk('colocacion', 'Colocación')}
        </div>
        <div class="card precio-movil" id="precio-movil">${htmlPrecio(v)}</div>
        <div class="card">
          <h2>Precio manual y notas</h2>
          <div class="grid g2">
            <label class="f">Precio por unidad (€)<input data-v="precioManual" data-type="str" inputmode="decimal" value="${esc(v.precioManual)}" placeholder="Automático"></label>
          </div>
          <p class="hint">Déjalo vacío para usar el precio calculado. Si escribes un precio, se usa ese.</p>
          <label class="f" style="margin-top:10px">Notas (salen en el PDF)<textarea data-v="notas" placeholder="Ej.: Con cierre de seguridad, manilla con llave…">${esc(v.notas)}</textarea></label>
        </div>
        <div class="barra-acciones">
          <button class="btn peligro" data-act="del-ventana" data-id="${v.id}" data-volver="1">${ICON.borrar} Eliminar</button>
          <button class="btn" data-act="dup-ventana" data-id="${v.id}" data-abrir="1">${ICON.copiar} Duplicar</button>
          <a class="btn pri" href="#/p/${p.id}">Hecho</a>
        </div>
      </div>
    </div>
  `;
}
function htmlPrecio(v) {
  const cv = calcularVentana(v);
  return `<h2 style="margin-bottom:8px">Precio</h2>
    <table class="desglose">
      ${cv.partes.map((x) => `<tr><td>${esc(x.c)}</td><td>${eur(x.i)}</td></tr>`).join('')}
      ${cv.manual != null ? `<tr><td>Calculado</td><td><s>${eur(cv.calculado)}</s></td></tr><tr><td><strong>Precio manual</strong></td><td>${eur(cv.manual)}</td></tr>` : ''}
      <tr class="tot"><td>Precio por unidad</td><td>${eur(cv.unidad)}</td></tr>
      ${cv.cant > 1 ? `<tr class="tot"><td>Total ${cv.cant} uds.</td><td>${eur(cv.total)}</td></tr>` : ''}
    </table>`;
}
function refrescarVentana() {
  const { v } = vista;
  $('#dibujo').innerHTML = svgVentana(v);
  $('#precio').innerHTML = htmlPrecio(v);
  $('#precio-movil').innerHTML = htmlPrecio(v);
}

/* ----- Ajustes ----- */
function vistaAjustes() {
  vista = { tipo: 'ajustes' };
  const a = AJ(), e = a.empresa;
  const inp = (path, lab, extra = '') => `<label class="f">${lab}<input data-a="${path}" value="${esc(getPath(a, path))}" ${extra}></label>`;
  const tablaLista = (clave, conHex) => `
    <table class="tabla-aj">
      <tr><th>Nombre</th>${conHex ? '<th>Color</th><th>Recargo %</th>' : '<th>€/m²</th>'}<th></th></tr>
      ${a[clave].map((x, i) => `<tr>
        <td><input data-a="${clave}.${i}.nombre" value="${esc(x.nombre)}" aria-label="Nombre"></td>
        ${conHex ? `<td class="c"><input type="color" data-a="${clave}.${i}.hex" value="${esc(x.hex)}" aria-label="Color"></td>
          <td class="n"><input data-a="${clave}.${i}.recargo" data-type="num" inputmode="decimal" value="${esc(x.recargo)}" aria-label="Recargo"></td>`
    : `<td class="n"><input data-a="${clave}.${i}.m2" data-type="num" inputmode="decimal" value="${esc(x.m2)}" aria-label="Precio por m²"></td>`}
        <td class="x"><button class="btn icono peligro" data-act="del-lista" data-k="${clave}" data-i="${i}" aria-label="Eliminar">${ICON.borrar}</button></td>
      </tr>`).join('')}
    </table>
    <button class="btn peq" style="margin-top:8px" data-act="add-lista" data-k="${clave}">${ICON.mas} Añadir</button>`;
  app.innerHTML = `
    <h1 style="margin:4px 0 14px">Ajustes</h1>
    <div class="card">
      <h2>Precios</h2>
      <p class="hint" style="margin-top:-6px">Así se calcula cada ventana: <strong>m² × precio del material</strong> (+ recargo del color) + <strong>m² de vidrio × precio del vidrio</strong> + herrajes por hoja + extras. Mínimo facturable por ventana: <strong>${numES(a.minM2)} m²</strong>. Siempre puedes poner un precio manual en cada ventana.</p>
      <h3 style="margin:14px 0 6px;font-size:.95rem">Materiales / perfilería</h3>${tablaLista('materiales')}
      <h3 style="margin:18px 0 6px;font-size:.95rem">Vidrios</h3>${tablaLista('vidrios')}
      <h3 style="margin:18px 0 6px;font-size:.95rem">Colores</h3>${tablaLista('colores', true)}
      <h3 style="margin:18px 0 6px;font-size:.95rem">Herrajes por hoja (€)</h3>
      <div class="grid">${Object.keys(GRUPOS_APERTURA).map((g) => `<label class="f">${GRUPOS_APERTURA[g]}<input data-a="aperturas.${g}" data-type="num" inputmode="decimal" value="${esc(a.aperturas[g])}"></label>`).join('')}</div>
      <h3 style="margin:18px 0 6px;font-size:.95rem">Extras</h3>
      <div class="grid">
        <label class="f">Persiana (€/m²)<input data-a="extras.persianaM2" data-type="num" inputmode="decimal" value="${esc(a.extras.persianaM2)}"></label>
        <label class="f">Cajón por defecto (mm)<input data-a="extras.cajon" data-type="num" inputmode="numeric" value="${esc(a.extras.cajon)}"></label>
        <label class="f">Mosquitera (€/m²)<input data-a="extras.mosquiteraM2" data-type="num" inputmode="decimal" value="${esc(a.extras.mosquiteraM2)}"></label>
        <label class="f">Colocación (€/ud)<input data-a="extras.colocacion" data-type="num" inputmode="decimal" value="${esc(a.extras.colocacion)}"></label>
        <label class="f">Retirada ventana (€/ud)<input data-a="extras.retirada" data-type="num" inputmode="decimal" value="${esc(a.extras.retirada)}"></label>
        <label class="f">Mínimo por ventana (m²)<input data-a="minM2" data-type="num" inputmode="decimal" value="${esc(a.minM2)}"></label>
      </div>
    </div>
    <div class="card">
      <h2>General</h2>
      <div class="grid">
        <label class="f">IVA (%)<input data-a="iva" data-type="num" inputmode="decimal" value="${esc(a.iva)}"></label>
        <label class="f">Validez del presupuesto (días)<input data-a="validez" data-type="num" inputmode="numeric" value="${esc(a.validez)}"></label>
        <label class="f">Medir en<select data-a="unidad"><option value="mm"${a.unidad === 'mm' ? ' selected' : ''}>Milímetros (mm)</option><option value="cm"${a.unidad === 'cm' ? ' selected' : ''}>Centímetros (cm)</option></select></label>
      </div>
      <label class="f" style="margin-top:12px">Condiciones (salen al final del PDF)<textarea data-a="condiciones" rows="4">${esc(a.condiciones)}</textarea></label>
    </div>
    <div class="card">
      <h2>Datos de la empresa</h2>
      <div class="grid g2">
        ${inp('empresa.nombre', 'Nombre comercial')}
        ${inp('empresa.titular', 'Titular')}
        ${inp('empresa.nif', 'N.I.F.')}
        ${inp('empresa.telefono', 'Teléfono', 'inputmode="tel"')}
        ${inp('empresa.direccion', 'Dirección')}
        ${inp('empresa.cp', 'Código postal', 'inputmode="numeric"')}
        ${inp('empresa.poblacion', 'Población')}
        ${inp('empresa.email', 'Email', 'inputmode="email"')}
      </div>
    </div>
    ${ESCRITORIO ? '' : `<div class="card">
      <h2>Acceso</h2>
      <p class="hint" style="margin-top:-6px">La app pide contraseña al abrirla. En los dispositivos donde marcaste «Recordar» ya no la vuelve a pedir, salvo que la bloquees aquí.</p>
      <div class="fila" style="margin-top:10px"><button class="btn" data-act="bloquear">Bloquear ahora</button></div>
    </div>`}
    <div class="card">
      <h2>Copia de seguridad</h2>
      <p class="hint" style="margin-top:-6px">Los presupuestos se guardan <strong>en este dispositivo</strong>. Haz una copia de vez en cuando y guárdala (por ejemplo, envíatela por email o a Google Drive). Con ella también puedes pasar los datos del móvil al ordenador.</p>
      <div class="fila" style="margin-top:10px">
        <button class="btn" data-act="exportar">${ICON.bajar} Guardar copia</button>
        <label class="btn">${ICON.enviar} Cargar copia<input type="file" id="importar" accept="application/json,.json" hidden></label>
        <button class="btn peligro" data-act="reset-precios">Restablecer precios de ejemplo</button>
      </div>
    </div>
  `;
  $('#importar').addEventListener('change', importar);
}

function exportar() {
  const blob = new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' });
  descargarBlob(blob, `copia-presupuestos-${hoy()}.json`);
}
function importar(ev) {
  const f = ev.target.files[0];
  if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result);
      if (!d || !Array.isArray(d.presupuestos) || !d.ajustes) throw new Error('formato');
      const n = d.presupuestos.length;
      const modo = confirm(`La copia tiene ${n} presupuestos.\n\nAceptar: juntar con los que ya hay en este dispositivo.\nCancelar: no hacer nada.`);
      if (!modo) return;
      const ids = new Set(DB.presupuestos.map((p) => p.id));
      let nuevos = 0, actualizados = 0;
      for (const p of d.presupuestos) {
        if (ids.has(p.id)) {
          const i = DB.presupuestos.findIndex((x) => x.id === p.id);
          if ((p.modificado || 0) > (DB.presupuestos[i].modificado || 0)) { DB.presupuestos[i] = p; actualizados++; }
        } else { DB.presupuestos.push(p); nuevos++; }
      }
      if (confirm('¿Usar también los precios y ajustes de la copia?')) DB.ajustes = completar(d.ajustes, DEF_AJUSTES);
      guardar(true);
      toast(`Copia cargada: ${nuevos} nuevos, ${actualizados} actualizados`);
      router();
    } catch (e) { alert('Ese archivo no es una copia válida.'); }
  };
  fr.readAsText(f);
}

/* =========================================================================
   EVENTOS
   ========================================================================= */
function tocar(p) { if (p) p.modificado = Date.now(); guardar(); }

function leerValor(el) {
  const t = el.dataset.type;
  if (t === 'bool') return el.checked;
  if (t === 'num') return num(el.value);
  if (t === 'int') return Math.max(1, Math.round(num(el.value)) || 1);
  if (t === 'len') return Math.round(num(el.value) * fU() * 10) / 10;
  return el.value;
}

app.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.type === 'checkbox' || el.tagName === 'SELECT') return; // se manejan en 'change'
  manejarCampo(el, false);
});
app.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'color' || el.type === 'date') manejarCampo(el, true);
});

function manejarCampo(el, esChange) {
  // Presupuesto
  if (el.dataset.p && vista.tipo === 'presupuesto') {
    const p = vista.p;
    setPath(p, el.dataset.p, leerValor(el));
    tocar(p);
    if (el.dataset.p === 'descuento') $('#totales').innerHTML = htmlTotales(p);
    return;
  }
  if (el.dataset.c && vista.tipo === 'presupuesto') {
    const p = vista.p; const [i, k] = el.dataset.c.split('.');
    p.conceptos[+i][k] = el.value;
    tocar(p);
    $('#totales').innerHTML = htmlTotales(p);
    return;
  }
  // Ventana
  if (vista.tipo === 'ventana' && (el.dataset.v || el.dataset.ap)) {
    const { p, v } = vista;
    if (el.dataset.ap) v.aperturas[+el.dataset.ap] = el.value;
    else v[el.dataset.v] = leerValor(el);
    tocar(p);
    if (el.dataset.re && esChange) { const y = window.scrollY; vistaVentana(p, v); window.scrollTo(0, y); }
    else refrescarVentana();
    return;
  }
  // Ajustes
  if (vista.tipo === 'ajustes' && el.dataset.a) {
    const val = leerValor(el);
    setPath(AJ(), el.dataset.a, val);
    if (/^(materiales|vidrios|colores|aperturas|extras|minM2)/.test(el.dataset.a)) AJ().preciosRevisados = true;
    guardar();
  }
}

app.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  const { p, v } = vista;
  switch (act) {
    case 'ocultar-aviso': AJ().preciosRevisados = true; guardar(true); vistaLista(); break;
    case 'nuevo': {
      const np = nuevoPresupuesto(); DB.presupuestos.push(np); guardar(true);
      location.hash = `#/p/${np.id}`; break;
    }
    case 'add-ventana': {
      const nv = p.ventanas.length ? { ...clone(p.ventanas[p.ventanas.length - 1]), id: uid(), nombre: '', notas: '', precioManual: '' } : nuevaVentana();
      p.ventanas.push(nv); tocar(p); guardar(true);
      location.hash = `#/p/${p.id}/v/${nv.id}`; break;
    }
    case 'dup-ventana': {
      const i = p.ventanas.findIndex((x) => x.id === b.dataset.id);
      const cp = { ...clone(p.ventanas[i]), id: uid() };
      p.ventanas.splice(i + 1, 0, cp); tocar(p); guardar(true);
      if (b.dataset.abrir) { location.hash = `#/p/${p.id}/v/${cp.id}`; toast('Ventana duplicada'); }
      else $('#lista-ventanas').innerHTML = htmlVentanas(p), $('#totales').innerHTML = htmlTotales(p);
      break;
    }
    case 'del-ventana': {
      if (!confirm('¿Eliminar esta ventana del presupuesto?')) break;
      p.ventanas = p.ventanas.filter((x) => x.id !== b.dataset.id); tocar(p); guardar(true);
      if (b.dataset.volver) location.hash = `#/p/${p.id}`;
      else { $('#lista-ventanas').innerHTML = htmlVentanas(p); $('#totales').innerHTML = htmlTotales(p); }
      break;
    }
    case 'add-concepto':
      p.conceptos.push({ desc: '', cantidad: '1', precio: '' }); tocar(p);
      $('#lista-conceptos').innerHTML = htmlConceptos(p);
      $(`[data-c="${p.conceptos.length - 1}.desc"]`).focus();
      break;
    case 'del-concepto':
      p.conceptos.splice(+b.dataset.i, 1); tocar(p);
      $('#lista-conceptos').innerHTML = htmlConceptos(p); $('#totales').innerHTML = htmlTotales(p);
      break;
    case 'duplicar-p': {
      const cp = { ...clone(p), id: uid(), numero: nuevoNumero(), fecha: hoy(), estado: 'borrador', creado: Date.now(), modificado: Date.now() };
      cp.ventanas.forEach((x) => (x.id = uid()));
      DB.presupuestos.push(cp); guardar(true);
      location.hash = `#/p/${cp.id}`; toast('Presupuesto duplicado');
      break;
    }
    case 'borrar-p':
      if (!confirm(`¿Eliminar el presupuesto ${p.numero}? No se puede deshacer.`)) break;
      DB.presupuestos = DB.presupuestos.filter((x) => x.id !== p.id); guardar(true);
      location.hash = '#/'; break;
    case 'copiar-factura':
      toast((await copiarTexto(textoFactura(p))) ? 'Datos copiados' : 'No se ha podido copiar');
      break;
    case 'pdf-ver': guardar(true); accionPDF(p, 'ver'); break;
    case 'pdf-descargar': guardar(true); accionPDF(p, 'descargar'); break;
    case 'pdf-compartir': guardar(true); accionPDF(p, 'compartir'); break;
    case 'sistema': {
      v.sistema = b.dataset.val;
      if (v.sistema === 'corredera' && v.hojas < 2) v.hojas = 2;
      tocar(p); vistaVentana(p, v); break;
    }
    case 'hojas': {
      const n = +b.dataset.val;
      if (n !== +v.hojas) { v.hojas = n; v.aperturas = aperturasPorDefecto(n); }
      tocar(p); const y = window.scrollY; vistaVentana(p, v); window.scrollTo(0, y); break;
    }
    case 'add-lista': {
      const k = b.dataset.k;
      const item = k === 'colores' ? { id: uid(), nombre: 'Nuevo color', hex: '#cccccc', recargo: 0 } : { id: uid(), nombre: 'Nuevo', m2: 0 };
      AJ()[k].push(item); guardar(true); vistaAjustes(); break;
    }
    case 'del-lista': {
      const k = b.dataset.k;
      if (AJ()[k].length <= 1) { toast('Tiene que quedar al menos uno'); break; }
      if (!confirm('¿Eliminar esta opción?')) break;
      AJ()[k].splice(+b.dataset.i, 1); guardar(true); vistaAjustes(); break;
    }
    case 'exportar': exportar(); break;
    case 'bloquear': bloquear(); break;
    case 'reset-precios':
      if (!confirm('¿Volver a los precios de ejemplo? Se perderán tus precios.')) break;
      for (const k of ['materiales', 'vidrios', 'colores', 'aperturas', 'extras', 'minM2']) AJ()[k] = clone(DEF_AJUSTES[k]);
      guardar(true); vistaAjustes(); break;
  }
});

/* =========================================================================
   CONTRASEÑA DE ACCESO
   Evita que alguien que abra el enlace pueda usar la app.
   (Los presupuestos nunca salen del dispositivo: esto solo protege la pantalla.)
   ========================================================================= */
// En la versión de escritorio (un solo PC, uso personal) no se pide contraseña.
const ESCRITORIO = !!(window.escritorio && window.escritorio.activo);
const CLAVE_HASH = '1x5h9dab93j';
const ACCESO_KEY = 'cristaleria-emilio-acceso';
let _abierto = false;
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
function desbloqueado() {
  if (_abierto || ESCRITORIO) return true;
  try { if (localStorage.getItem(ACCESO_KEY) === CLAVE_HASH) return (_abierto = true); } catch (e) { /* */ }
  try { if (sessionStorage.getItem(ACCESO_KEY) === CLAVE_HASH) return (_abierto = true); } catch (e) { /* */ }
  return false;
}
function pantallaBloqueo() {
  document.body.classList.add('bloqueado');
  vista = { tipo: 'bloqueo' };
  app.innerHTML = `
    <form class="bloqueo card" id="form-bloqueo" autocomplete="off">
      <img src="img/logo.png" alt="Cristalería Emilio">
      <label class="f">Contraseña<input type="password" id="clave" inputmode="numeric" autocomplete="current-password"></label>
      <label class="chk"><input type="checkbox" id="recordar" checked> Recordar en este dispositivo</label>
      <p class="error" id="error-clave" hidden>Contraseña incorrecta</p>
      <button class="btn pri" type="submit">Entrar</button>
    </form>`;
  const campo = $('#clave');
  setTimeout(() => campo.focus(), 50);
  $('#form-bloqueo').addEventListener('submit', (e) => {
    e.preventDefault();
    if (cyrb53('cristaleria-emilio:' + campo.value.trim()) === CLAVE_HASH) {
      _abierto = true;
      try { ($('#recordar').checked ? localStorage : sessionStorage).setItem(ACCESO_KEY, CLAVE_HASH); } catch (err) { /* */ }
      document.body.classList.remove('bloqueado');
      router();
    } else {
      $('#error-clave').hidden = false;
      campo.value = ''; campo.focus();
    }
  });
}
function bloquear() {
  _abierto = false;
  try { localStorage.removeItem(ACCESO_KEY); } catch (e) { /* */ }
  try { sessionStorage.removeItem(ACCESO_KEY); } catch (e) { /* */ }
  guardar(true);
  if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/');
  pantallaBloqueo();
}

if (desbloqueado()) router(); else pantallaBloqueo();
