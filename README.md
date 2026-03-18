# Guía de Despliegue — Geo KayPacha | Visor Catastral

---

## Requisitos previos

| Herramienta | Versión mínima  |
| ----------- | --------------- |
| Node.js     | 18.x o superior |
| npm         | 9.x o superior  |
| Git         | 2.x o superior  |

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/luisamos/visor-kaypacha.git
cd visor-kaypacha
```

---

## 2. Instalar dependencias

```bash
npm install
```

---

## 3. Configurar para producción

Abrir el archivo `assets/js/configuracion.js` y localizar la variable `IS_DEV` al inicio del archivo:

```js
// assets/js/configuracion.js  — línea 7
const IS_DEV = false, // <-- debe quedar en false para producción
  HOST = IS_DEV ? "http://127.0.0.3" : "http://10.0.10.66";
```

| Valor de `IS_DEV` | Entorno    | HOST apuntado       |
| ----------------- | ---------- | ------------------- |
| `true`            | Desarrollo | `http://127.0.0.3`  |
| `false`           | Producción | `http://10.0.10.66` |

> **Importante:** Para el despliegue en producción, `IS_DEV` debe ser `false`.
> Verificar que el servidor de producción (`10.0.10.66`) tenga activos:
>
> - API GIS en el puerto `5000`
> - Servicio WMS/WFS en el puerto `8081`
> - MapCache en el puerto `8081`

---

## 4. Compilar el proyecto

```bash
npm run build
```

Este comando ejecuta `vite build` y genera los archivos compilados en la carpeta `dist/` del proyecto.

La salida esperada es similar a:

```
vite build
✓ built in X.XXs
dist/index.html
dist/assets/...
```

---

## 5. Desplegar en el servidor

Copiar el contenido de la carpeta `dist/` al directorio público del sistema Catastro:

```bash
# Desde la raíz del proyecto
cp -r dist/* /Apache2/Catastro/public/visor/
```

> La estructura de destino debe quedar así:
>
> ```
> Catastro/
> └── public/
>     └── visor/
>         ├── index.html
>         └── assets/
>             ├── *.js
>             └── *.css
> ```

> **Nota:** El archivo `vite.config.js` ya tiene configurada la ruta base como `/visor/`, por lo que todos los recursos se resolverán correctamente bajo esa ruta.

---

## 6. Verificar el despliegue

Desde un navegador web, acceder a la dirección del servidor con la ruta `/visor`:

```
http://<IP-del-servidor>/visor
```

**Ejemplo con el servidor de producción:**

```
http://10.0.10.66/visor
```

### Lista de verificación

- [ ] La página carga sin errores en la consola del navegador
- [ ] El mapa se renderiza correctamente
- [ ] Las capas geográficas (WMS/WFS) se visualizan
- [ ] El formulario de acceso (login) responde al servidor de autenticación
- [ ] La herramienta de identificación de predios funciona al hacer clic en el mapa
- [ ] El control de escala y coordenadas del puntero se actualiza

---

## 7. Entorno de desarrollo local (opcional)

Para trabajar en modo desarrollo, configurar `IS_DEV = true` en `assets/js/configuracion.js` y ejecutar el servidor de desarrollo:

```bash
npm run start
```

El servidor quedará disponible en:

```
http://127.0.0.3:5173
```

Para previsualizar la versión compilada localmente:

```bash
npm run serve
```

Se levantará en el puerto `81`:

```
http://localhost:81/visor
```

---

## 8. Resumen de scripts npm

| Comando         | Descripción                                              |
| --------------- | -------------------------------------------------------- |
| `npm install`   | Instala todas las dependencias del proyecto              |
| `npm run start` | Inicia el servidor de desarrollo Vite (`127.0.0.3:5173`) |
| `npm run build` | Compila el proyecto para producción → carpeta `dist/`    |
| `npm run serve` | Previsualiza la build localmente en el puerto `81`       |

---

## Estructura del proyecto

```
visor-kaypacha/
├── index.html                  # Punto de entrada HTML
├── main.js                     # Punto de entrada JavaScript
├── style.css                   # Estilos globales
├── vite.config.js              # Configuración de Vite (base: /visor/)
├── package.json                # Dependencias y scripts
└── assets/
    └── js/
        ├── configuracion.js    # ← Configuración principal (IS_DEV, HOST, URLs)
        ├── capasGeograficas.js # Definición de capas del mapa
        ├── acceso.js           # Módulo de autenticación
        ├── controlCapas.js     # Control de capas e identificación
        └── ...
```

---

## Dependencias principales

| Librería          | Uso                                          |
| ----------------- | -------------------------------------------- |
| OpenLayers (`ol`) | Motor de mapas geográficos                   |
| Bootstrap 5       | Interfaz de usuario                          |
| Proj4             | Transformación de proyecciones cartográficas |
| ShpJS             | Carga de archivos Shapefile                  |
| JSZip             | Compresión/descompresión de archivos         |
| Vite              | Empaquetador y servidor de desarrollo        |

---

_Repositorio oficial: [https://github.com/luisamos/visor-kaypacha](https://github.com/luisamos/visor-kaypacha)_
