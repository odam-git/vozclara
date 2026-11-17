# Voz Clara · Documento de traspaso

Léelo completo antes de cambiar nada. Resume qué es la app, cómo está hecha, qué se aprendió en pruebas con un iPhone real y qué falta. Sirve para continuar con cualquier asistente de IA o con una persona programadora.

## 1. Qué es

App web instalable (PWA) para entrenar dicción, voz y oratoria en español de México, con práctica jurídica (audiencias y argumentación). Sin servidor, sin cuentas, sin dependencias externas. Se publica con GitHub Pages desde la rama `main`: https://odam-git.github.io/vozclara/

El dueño del proyecto **no es programador**: explícale todo en lenguaje sencillo, paso a paso, y no supongas conocimientos técnicos.

## 2. Reglas del proyecto

- Todo en español de México. Móvil primero, modo claro y oscuro.
- Datos solo en el dispositivo (`localStorage`, clave `vozclara.v1`), con exportar e importar respaldo.
- Sin dependencias externas ni servidores. (Excepción en discusión, que requiere autorización del dueño: ver sección 7.1.)
- Sin datos personales en el código ni en el historial de cambios.
- Sin mecánicas que castiguen o hagan sentir culpa.
- El reconocimiento de voz y el micrófono **nunca** se usan al mismo tiempo.
- Todo dato que venga del usuario o de un respaldo se valida (`normalizar` en `js/estado.js`) y se escapa al mostrarse (`esc`). Hay una política de seguridad de contenido (CSP) estricta en `index.html`: no se permite código en línea (`onclick=`, `<script>` con contenido) ni conexiones a otros sitios.
- Cambios pequeños, con mensaje claro. Al publicar, sube **las dos** versiones: `VERSION_APP` en `js/vistas.js` y `VERSION` en `sw.js`.

## 3. Estructura

| Archivo | Para qué |
|---|---|
| `index.html` | Estructura, estilos (CSS) y orden de carga de los scripts |
| `js/datos.js` | Carga los JSON de `data/` |
| `js/estado.js` | Datos guardados, validación de respaldos, fechas |
| `js/voz.js` | Audio: `Reconocedor` (reconocimiento de voz), `Medidor` (micrófono, dB, tono, grabación), registro central `AUDIO_ACTIVO`, detección de iPhone |
| `js/analisis.js` | Comparación por palabra, muletillas, palabras por minuto, medición del habla con micrófono |
| `js/flujo.js` | Componente «Medir» / «Escucharme» con estrellas |
| `js/progreso.js` | Rachas, comodines, logros |
| `js/adaptativo.js` | Niveles que suben o bajan según resultados |
| `js/vistas.js` | Pantallas principales, navegación, Ajustes y pruebas técnicas de voz |
| `js/modulos.js` | Proyección, entonación, pausas, canto |
| `js/juridico.js` | Modo audiencia, construcción de argumentos, mis asuntos |
| `js/diagnostico.js` | Diagnóstico inicial |
| `js/reporte.js` | Reporte semanal |
| `js/inicio.js` | Arranque |
| `data/*.json` | Contenido: 400 trabalenguas, 30 lecturas, 30 temas, entonación, audiencias, argumentos, consejos |
| `sw.js` | Funcionamiento sin conexión (primero la red, sin caché del navegador) |
| `tests/` | Pruebas automáticas |

Los scripts son clásicos (no módulos) y comparten variables globales; el orden de carga en `index.html` importa.

## 4. Cómo probar

- `node --test tests/pruebas.test.js` — 31 pruebas de lógica. No requiere instalar nada.
- `node tests/humo.js` — abre todas las pantallas en un navegador (requiere Playwright).
- Para probar el reconocimiento sin hablar se usa una clase `SpeechRecognition` simulada (ver ejemplos al final de `tests/pruebas.test.js`).
- **Ninguna simulación sustituye al iPhone real.** Ver sección 5.

## 5. Lo aprendido con un iPhone real (no repetir estos experimentos)

Equipo de prueba: iPhone con la app instalada en la pantalla de inicio, Dictado encendido.

**Hecho comprobado:** en la app instalada, el reconocimiento de voz web de Apple (`webkitSpeechRecognition`) funciona **solo en la primera escucha después de abrir la app**. Las siguientes arrancan (`start`, `audiostart`, se ve el indicador naranja del micrófono) pero no reciben sonido: no hay `soundstart` ni resultados, y a veces termina con el error `audio-capture`.

Lo que se probó y **no** lo corrige:
- Pausas de 1, 3, 4, 6 y 10 segundos entre escuchas.
- Iniciar cada escucha con un toque del usuario.
- Guardar silencio y esperar el resultado final antes de detener.
- Cerrar con `stop()`, con `abort()` o con ambos.
- Crear un objeto nuevo en cada escucha o reutilizar el mismo.
- Usar `getUserMedia` entre una escucha y otra.
- Recargar la página (`location.reload()`).
- No reanudar automáticamente en `onend`.

Lo único que lo restablece es **cerrar la app por completo y volver a abrirla**.

Otros datos:
- En Safari (pestaña, no instalada) el mismo teléfono devolvió `service-not-allowed` en todas las escuchas, aun con Dictado encendido. No se investigó más (posible permiso de micrófono o de reconocimiento negado para Safari).
- El **micrófono directo** (`getUserMedia` + `AudioContext`) funcionó siempre en ese iPhone, incluso cuando el reconocimiento ya estaba sordo.
- Chrome y Brave en iPhone no ofrecen reconocimiento de voz. Brave tampoco en computadora.
- GitHub Pages solo publica gratis repositorios públicos y puede tardar hasta 10 minutos en entregar archivos nuevos.

**Decisión tomada (versión 16):** en iPhone instalado la app oculta «Medir» y usa «Escucharme y medir mi ritmo», que con el micrófono da palabras por minuto, tiempo hablando y pausas, más grabación y autocalificación. La precisión palabra por palabra y las muletillas quedan para Android y computadora (Chrome). En Ajustes hay un interruptor para encender la medición automática a sabiendas, y seis pruebas técnicas («Prueba técnica de voz») para diagnosticar otro teléfono.

## 6. Estado actual

Funciona y está publicado (versión 16):
- Bienvenida, diagnóstico, rutina diaria, progresión adaptativa, reporte semanal, rachas con comodines, 21 logros, recordatorio de calendario, respaldo.
- Módulos: respiración, canto, articulación, lectura, improvisación, proyección, entonación, pausas.
- Práctica jurídica: modo audiencia (penal y civil), construcción de argumentos (Toulmin, Perelman, MacCormick, Atienza), mis asuntos.

**Sin confirmar en un teléfono real:**
- La versión 16 en iPhone (solo se probó en simulación).
- Toda la app en Android con Chrome (ahí debería funcionar la medición completa; nadie lo ha probado).

## 7. Pendientes

1. **Confirmar la versión 16 en el iPhone** (Lectura › «Escucharme y medir mi ritmo» debe dar palabras por minuto y pausas).
2. **Probar en Android o computadora con Chrome** la medición automática completa. Nadie lo ha comprobado todavía.
3. **Reconocedor de voz propio para iPhone** (el siguiente paso importante; ver sección 7.1).
4. **Revisión del contenido jurídico por el dueño (es abogado):** las etapas y artículos de `data/audiencias.json` (CNPP 307 a 333 y 391 a 399; lo civil es genérico) y los resúmenes de autores de `data/argumentos.json` se escribieron de memoria y están marcados como guiones didácticos.
5. **Cotejar las citas históricas** de `data/lecturas.json`; la de Zarco es una paráfrasis señalada como tal.
6. **Borrar el repositorio anterior** `odam-git/voz-clara`, que conserva datos personales en su historial. Lo hace el dueño: Settings › Danger Zone › Delete this repository.
7. Ideas sin empezar: materias mercantil y familiar en modo audiencia (se pidieron al inicio y quedaron fuera); hacer más exigentes las pausas y el énfasis.

### 7.1 Reconocedor de voz propio: hasta dónde se llegó

**Objetivo:** medir precisión palabra por palabra y muletillas en iPhone instalado, muchas veces seguidas, sin depender del reconocimiento de Apple. La idea es un motor que corra dentro de la app y reciba el audio del micrófono directo (`getUserMedia`), que en ese iPhone nunca falló.

**Estado: NO está hecho ni probado.** Se localizaron las piezas, pero el entorno donde se trabajaba bloqueó su ejecución porque el dueño aún no había autorizado agregar dependencias. **Antes de empezar, pide al dueño su autorización expresa**: cambia la regla de «sin dependencias externas».

Piezas localizadas (ambas con licencia Apache 2.0; verifica las licencias antes de publicar):
- Motor: paquete de npm `vosk-browser` versión 0.0.8. El archivo útil es `dist/vosk.js` (unos 5.8 MB; trae dentro el WebAssembly y su «worker»). No usa `eval` ni `new Function`.
- Modelo de español: `vosk-model-small-es-0.3.tar.gz` (unos 34 MB), que el propio proyecto vosk-browser publica en su rama `gh-pages`, carpeta `models/`. Hay modelos más recientes (0.42) en alphacephei.com/vosk/models, pero vienen en `.zip` y vosk-browser los necesita en `.tar.gz`.

Forma de uso del motor (según su documentación):
```js
const modelo = await Vosk.createModel(urlAbsolutaDelModelo);   // tarda: descarga y prepara 34 MB
const rec = new modelo.KaldiRecognizer(frecuenciaDeMuestreo);
rec.on("partialresult", m => m.result.partial);                // texto provisional
rec.on("result", m => m.result.text);                          // texto final de una frase
rec.acceptWaveform(audioBuffer);                               // o acceptWaveformFloat(float32, frecuencia)
rec.retrieveFinalResult();                                     // al terminar
```

Diseño propuesto (sin implementar):
- Guardar los dos archivos dentro del repositorio (por ejemplo en `vendor/`), con un archivo de licencias. GitHub Pages acepta archivos de hasta 100 MB.
- Cargarlos **solo si el usuario lo enciende** en Ajustes («Reconocedor propio, experimental»), para no obligar a nadie a bajar 40 MB.
- Crear una clase `ReconocedorLocal` con la **misma interfaz** que `Reconocedor` en `js/voz.js` (`start()`, `stop()`, `abort()`, `onText`, y un resultado con `text`, `segs`, `secs`, `hablaSecs`, `error`, `traza`), para que `js/flujo.js`, `js/diagnostico.js` y `js/juridico.js` no cambien. Elegir cuál usar desde una sola función.
- Debe anotarse en `AUDIO_ACTIVO` como cualquier otro uso de audio, y crear el `AudioContext` dentro del toque del usuario (iOS lo exige).
- La política de seguridad (CSP) de `index.html` tendría que permitir WebAssembly y el «worker»: añadir `'wasm-unsafe-eval'` a `script-src` y `blob:` a `worker-src`. Compruébalo en el navegador: es una estimación, no se llegó a probar.
- El modelo debe pedirse con dirección absoluta (el «worker» no resuelve direcciones relativas).
- `sw.js` no debe precargar los 40 MB; basta con que queden guardados tras la primera descarga.

Riesgos que hay que decirle al dueño con claridad:
- No se sabe si funciona en iPhone instalado: puede ser lento, agotar la memoria o tardar mucho en cargar.
- El modelo pequeño reconoce peor que Apple o Google, y los trabalenguas son un caso difícil. La «precisión» mediría en parte los errores del motor.
- No se pudo medir aquí su calidad en español.
- Primer paso sensato: una **prueba aislada** en Ajustes (como las pruebas técnicas existentes) que cargue el motor, escuche 8 segundos y muestre el texto y el tiempo de carga. Solo si el dueño la aprueba en su iPhone conviene conectarlo al resto de la app.

Alternativa si el motor propio no sirve: dejar el iPhone como está (versión 16) y usar Android o computadora para la medición completa.

## 8. Cómo publicar un cambio

1. Hacer el cambio y correr `node --test tests/pruebas.test.js`.
2. Subir `VERSION_APP` (`js/vistas.js`) y `VERSION` (`sw.js`) al mismo número.
3. Confirmar (commit) con un mensaje claro en español y subir a `main`.
4. En el teléfono: Ajustes › «Buscar actualización», y verificar el número de versión al final de Ajustes.
