# 106.19 FM — SEÑAL NO IDENTIFICADA

Teaser críptico para el maratón de GTA VI del **19 de noviembre de 2026**.

Un receptor de radio falso: cuenta regresiva en hora local, un dial que hay que
sintonizar a oído, una consola con comandos, y un expediente de **8 fragmentos
cifrados** que se abren solos a lo largo de los meses.

---

## Lo que lo hace distinto

Los fragmentos no están «ocultos con JavaScript». Están cifrados de verdad con
**AES-256-GCM**, y **sus llaves no existen en ningún sitio público** hasta el día
que les toca:

- El criptograma vive en `data/fragments.json`, a la vista de todo el mundo.
- La llave maestra vive **solo** en un GitHub Secret, nunca en el repositorio.
- Un workflow deriva y publica la llave de cada fragmento el día señalado.

Consecuencia: nadie puede spoilear el expediente. Ni abriendo devtools, ni leyendo
el código fuente, ni clonando el repo. No hay nada que romper — solo que esperar.
La consola tiene un comando `SPOILER` que se lo explica a quien lo intente.

---

## Puesta en marcha (5 minutos)

### 1. Pon tus enlaces

Abre `assets/app.js` y edita **solo** el bloque `CONFIG` de arriba:

```js
channels: [
  { name: 'TWITCH',  handle: '@tu_usuario', url: 'https://twitch.tv/tu_usuario' },
  ...
]
```

> Configurados como `@kazoogod02`.

### 2. Sube el repositorio

```bash
gh repo create leonida --public --source=. --push
```

### 3. Activa GitHub Pages

En el repo: **Settings → Pages → Source: Deploy from a branch → `main` / `root`**.

En un minuto tendrás el sitio en `https://TU_USUARIO.github.io/leonida/`.

### 4. Guarda la llave maestra como secreto

Esto es lo que hace que los fragmentos se abran solos:

```bash
gh secret set LEONIDA_MASTER --body "$(cat tools/master.key)"
```

Luego ve a **Actions → Liberar descifrado → Run workflow** una vez, para
comprobar que funciona.

> Sin este paso el sitio funciona igual, pero los 8 fragmentos se quedan
> cifrados para siempre.

---

## ⚠️ Los dos archivos que no debes perder ni subir

`.gitignore` ya los excluye. Guárdalos en un sitio seguro (gestor de
contraseñas, USB, lo que sea):

| Archivo | Qué es |
|---|---|
| `tools/master.key` | La llave maestra. Si la pierdes, **los fragmentos quedan cifrados para siempre**. |
| `tools/plaintexts.json` | Los textos sin cifrar. Si esto se sube, se acaba el misterio. |

---

## Cambiar los textos

1. Edita `tools/plaintexts.json` (textos, fechas, palabras clave).
2. Vuelve a cifrar y publica lo que ya venció:

```bash
node tools/forge.mjs && node tools/release.mjs
```

3. Haz commit de `data/fragments.json` y `data/keys.json`.

> Si cambias un fragmento **ya publicado**, su llave vieja sigue en `keys.json`
> y no descifrará el texto nuevo. Borra esa entrada de `data/keys.json` y vuelve
> a ejecutar `node tools/release.mjs`.

Ver qué se publicaría hoy, sin tocar nada:

```bash
node tools/release.mjs --dry
```

---

## La clave maestra

Cada fragmento entrega una palabra. Las ocho, en orden, forman una frase.
Quien la reúna puede escribirla en la consola con `CLAVE <frase>` y recibe el
final.

La frase **no está en este repositorio**: `app.js` solo guarda su huella
SHA-256 (`CONFIG.masterHash`) y la longitud de cada palabra. Tú la tienes en
tu copia local de `tools/plaintexts.json`.

Para cambiarla: edita las palabras `clave` en `plaintexts.json` y recalcula:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('TU FRASE EN MAYÚSCULAS SIN ACENTOS').digest('hex'))"
```

Pega el resultado en `CONFIG.masterHash` y ajusta `CONFIG.claveLengths`.

---

## Comandos de la consola

`AYUDA` · `ESTADO` · `ARCHIVO <n>` · `SINTONIZAR <f>` · `CANALES` ·
`CLAVE <frase>` · `OPERATIVO` · `AUDIO` · `LIMPIAR`

Y unos cuantos que no están en la lista: `LEONIDA`, `VICE`, `KAZOO`,
`ROCKSTAR`, `SPOILER`, `19-11`. Que los encuentren ellos.

---

## Secretos de la interfaz

- El dial se bloquea en **106.19**. Al acertar, el ruido se convierte en una
  portadora limpia, suena el identificador en morse (`LEONIDA`) y se abren los
  canales. Si nadie juega con el dial, se abren solos al minuto.
- Cada visitante recibe un **identificador de operativo** persistente.
- Todo el audio está sintetizado con la Web Audio API: cero archivos de sonido.
- `/` enfoca la consola. `Esc` cierra un fragmento.

---

## Probar en local

```bash
python -m http.server 8719
```

Y abre `http://127.0.0.1:8719`. **No** funciona abriendo `index.html` con doble
clic: el navegador bloquea la lectura del expediente en `file://`.

---

## Mantenimiento

GitHub desactiva los workflows programados en repos sin actividad durante 60
días. Entre descifrados hay como mucho 13 días de hueco, así que el propio
workflow mantiene el repo vivo — pero si ves que un fragmento no se abre a
tiempo, entra en **Actions → Liberar descifrado → Run workflow**.

Fallback manual, desde tu equipo:

```bash
node tools/release.mjs && git add data/keys.json && git commit -m "descifrado" && git push
```

---

Proyecto de fan, sin ánimo de lucro. No afiliado ni respaldado por Rockstar
Games ni Take-Two Interactive.
