# Presupuestos · Cristalería Emilio

Aplicación web para hacer presupuestos de ventanas: se meten las medidas, sale el dibujo de la ventana y se genera un PDF con el logo para enviar al cliente.

Funciona en el ordenador y en el móvil, también sin conexión. No necesita servidor ni base de datos, y es gratis.

## Cómo publicarla en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `presupuestos`). Puede ser público.
2. Sube **todos los archivos de esta carpeta** a la raíz del repositorio. Desde la web: *Add file → Upload files*, arrastra el contenido de la carpeta (no la carpeta en sí) y pulsa *Commit changes*.
3. Ve a *Settings → Pages*. En *Build and deployment*, elige *Source: Deploy from a branch*, rama `main` y carpeta `/ (root)`, y pulsa *Save*.
4. Al cabo de un minuto la app estará en `https://TU-USUARIO.github.io/presupuestos/`.

## Privacidad

- **Contraseña:** la app pide una contraseña al abrirla. Si se marca «Recordar en este dispositivo», no vuelve a pedirla en ese móvil u ordenador. Para volver a bloquearla: *Ajustes → Acceso → Bloquear ahora*.
- **Buscadores:** la app pide a Google y a los demás buscadores que no la muestren (`robots.txt` y etiqueta `noindex`). Solo llega quien tenga el enlace.
- **Código público:** con GitHub gratis, el repositorio tiene que ser público para usar Pages, así que el código se puede ver. La contraseña impide usar la app, pero no es una protección fuerte: alguien que sepa programar podría saltársela.
- **Presupuestos y clientes:** nunca salen del dispositivo, así que nadie más puede verlos.

## Instalarla como app

- **Android (Chrome):** abre el enlace, menú ⋮ → *Añadir a pantalla de inicio* / *Instalar aplicación*.
- **iPhone (Safari):** abre el enlace, botón Compartir → *Añadir a pantalla de inicio*.
- **PC (Chrome/Edge):** icono de instalar en la barra de direcciones, o simplemente guardar el enlace en favoritos.

## Uso

1. **Ajustes → Precios:** pon los precios reales. Los que vienen son de ejemplo.
2. **Nuevo presupuesto:** datos del cliente → *Añadir* ventana → medidas, sistema, hojas, apertura, material, vidrio y extras. El dibujo y el precio se actualizan al momento.
3. En cualquier ventana se puede escribir un **precio manual** en lugar del calculado.
4. **Enviar** comparte el PDF por WhatsApp, email, etc. (en el móvil). **Descargar** lo guarda.
5. **Copiar datos para la factura** copia cliente, conceptos e importes para pegarlos en el programa de facturación.

## Cómo se calcula el precio

Precio por unidad = m² × €/m² del material × (1 + recargo del color)
+ m² de vidrio × €/m² del vidrio
+ herrajes por hoja según el tipo de apertura
+ extras (persiana, mosquitera, colocación, retirada).

Hay un mínimo facturable por ventana (1 m² por defecto). Todo se cambia en *Ajustes*.

## Datos y copias de seguridad

Los presupuestos se guardan **en el navegador de cada dispositivo**. Lo que se hace en el móvil no aparece solo en el PC. Para pasar datos de uno a otro, o para tener una copia, se usa *Ajustes → Guardar copia / Cargar copia*.

Si se borran los datos del navegador, se pierden los presupuestos. Conviene guardar una copia de vez en cuando.

## Programa de escritorio (Windows)

En la carpeta `escritorio/` está la misma app empaquetada como programa de Windows (con Electron). Funciona igual que la web, pero **no pide contraseña** y no necesita internet. Los presupuestos se guardan en el propio PC (`%APPDATA%\Presupuestos Cristalería Emilio`), separados de los de la web.

**Instalarlo:** doble clic en `Instalar-Presupuestos-Cristaleria-Emilio.exe`. Se instala solo, sin pedir permisos de administrador, y deja un acceso directo «Presupuestos» en el escritorio. Como el programa no está firmado, Windows puede mostrar «Windows protegió su PC»: pulsa *Más información → Ejecutar de todas formas*.

**Volver a generar el instalador** (después de cambiar la app):

```
cd escritorio
npm install
npm run build:win
```

El instalador queda en `escritorio/dist/`. Desde Windows funciona tal cual; desde Linux hace falta Wine (`wine64` y `wine32`). Para probarlo sin instalar: `npm start`.

## Facturas

Esta app hace **presupuestos**, no facturas. Desde el 1 de julio de 2027 los autónomos que facturan con programa informático tienen que usar un sistema que cumpla **Verifactu**. La AEAT ofrece una aplicación gratuita para ello. Consúltalo con tu gestor.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Página principal |
| `app.js` | Toda la lógica: datos, dibujo, precios y PDF |
| `styles.css` | Estilos |
| `sw.js` | Permite usarla sin conexión |
| `manifest.webmanifest` | Permite instalarla como app |
| `lib/jspdf.umd.min.js` | Librería para generar el PDF (jsPDF, licencia MIT) |
| `img/` | Logo e iconos |
| `escritorio/` | Versión de escritorio para Windows |

Para cambiar el logo, sustituye `img/logo.png` por otro PNG con la misma proporción (aprox. 2,6 : 1).

Si cambias algún archivo, sube el número de `CACHE` en `sw.js` (por ejemplo `presupuestos-v2`) para que los móviles cojan la versión nueva.
