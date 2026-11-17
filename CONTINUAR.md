# Voz Clara · Documento de traspaso

Léelo completo antes de cambiar nada. Resume qué es la app, cómo está hecha, qué se aprendió en pruebas con un iPhone real y qué falta. Sirve para continuar con cualquier asistente de IA o con una persona programadora.

## 1. Qué es

App web instalable (PWA) para entrenar dicción, voz y oratoria en español de México, con práctica jurídica (audiencias y argumentación). Sin servidor, sin cuentas, sin dependencias externas. Se publica con GitHub Pages desde la rama `main`: https://odam-git.github.io/vozclara/

El dueño del proyecto **no es programador**: explícale todo en lenguaje sencillo, paso a paso, y no supongas conocimientos técnicos.

## 2. Reglas del proyecto

- Todo en español de México. Móvil primero, modo claro y oscuro.
- Datos solo en el dispositivo (`localStorage`, clave `vozclara.v1`), con exportar e importar respaldo.
- Sin dependencias externas ni servidores. Única excepción, autorizada por el dueño: el reconocedor de voz Vosk en `vendor/` (sección 7.1).
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
| `vendor/` | Reconocedor de voz propio opcional (Vosk) y su compartimento |
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
- La medición con micrófono en iPhone (versión 16 en adelante; solo se probó en simulación).
- El reconocedor propio (versión 17).
- Toda la app en Android con Chrome (ahí debería funcionar la medición completa; nadie lo ha probado).

## 7. Pendientes

1. **Confirmar la versión 16 en el iPhone** (Lectura › «Escucharme y medir mi ritmo» debe dar palabras por minuto y pausas).
2. **Probar en Android o computadora con Chrome** la medición automática completa. Nadie lo ha comprobado todavía.
3. **Reconocedor de voz propio para iPhone** (el siguiente paso importante; ver sección 7.1).
4. **Revisión del contenido jurídico por el dueño (es abogado):** las etapas y artículos de `data/audiencias.json` (CNPP 307 a 333 y 391 a 399; lo civil es genérico) y los resúmenes de autores de `data/argumentos.json` se escribieron de memoria y están marcados como guiones didácticos.
5. **Cotejar las citas históricas** de `data/lecturas.json`; la de Zarco es una paráfrasis señalada como tal.
6. **Borrar el repositorio anterior** `odam-git/voz-clara`, que conserva datos personales en su historial. Lo hace el dueño: Settings › Danger Zone › Delete this repository.
7. Ideas sin empezar: materias mercantil y familiar en modo audiencia (se pidieron al inicio y quedaron fuera); hacer más exigentes las pausas y el énfasis.

### 7.1 Reconocedor de voz propio (Vosk): estado

**El dueño lo autorizó expresamente** como excepción a la regla de «sin dependencias». Está incorporado desde la versión 17 como opción **experimental**, apagada de fábrica.

Qué hay:
- `vendor/vosk.js` (motor Vosk en WebAssembly, paquete npm `vosk-browser` 0.0.8) y `vendor/modelo-es.tar.gz` (modelo `vosk-model-small-es-0.3`, 34 MB). Licencias Apache 2.0; ver `vendor/LICENCIAS.md`.
- `vendor/motor.html` + `vendor/motor.js`: un **compartimento aparte** (iframe del mismo origen) con su propia política de seguridad. El motor necesita `'unsafe-eval'` y WebAssembly; así la app principal conserva su política estricta sin cambios. La app y el compartimento se hablan con `postMessage`.
- En `js/voz.js`: `MotorLocal` (carga el compartimento y el modelo), `ReconocedorLocal` (misma interfaz que `Reconocedor`; captura con `getUserMedia` + `ScriptProcessor` y envía el audio al motor) y `crearReconocedor()`, que decide cuál usar. `usarMotorLocal()` lee `ENV.motorLocal`.
- En Ajustes: tarjeta «Reconocedor de voz propio (experimental)» con una prueba (acumula intentos para ver si funciona varias veces seguidas) y el interruptor para usarlo al medir.
- `sw.js` guarda `vendor/` una sola vez (primero la copia guardada), para no volver a bajar 40 MB.

Qué se comprobó: en Chromium simulado el motor carga en unos 2 segundos, no viola la política de seguridad, admite varias sesiones seguidas y libera el micrófono.

**Qué NO se ha comprobado (lo más importante):**
- Que **entienda una voz real en español**. En el entorno de desarrollo no había forma de hablarle; con el tono de prueba devuelve texto vacío, como es de esperar.
- Que funcione en **iPhone instalado**: tiempo de carga, memoria, y si `ScriptProcessor` entrega audio ahí.
- Su precisión con trabalenguas. El modelo es pequeño; es probable que reconozca peor que Apple o Google, y entonces la «precisión» mediría en parte errores del motor.

Siguiente paso: que el dueño toque tres veces «Probar» en Ajustes desde su iPhone y mande la captura. Según el resultado:
- Si oye bien y repetidamente: encender el interruptor y probar Articulación, Lectura y el diagnóstico.
- Si carga pero no entiende: revisar la frecuencia de muestreo que se envía (`ctx.sampleRate`) y si conviene remuestrear a 16 kHz antes de mandar el audio; probar un modelo más reciente (0.42, hay que convertirlo de `.zip` a `.tar.gz`).
- Si no carga o agota la memoria: descartarlo y dejar el iPhone como en la versión 16.

## 8. Cómo publicar un cambio

1. Hacer el cambio y correr `node --test tests/pruebas.test.js`.
2. Subir `VERSION_APP` (`js/vistas.js`) y `VERSION` (`sw.js`) al mismo número.
3. Confirmar (commit) con un mensaje claro en español y subir a `main`.
4. En el teléfono: Ajustes › «Buscar actualización», y verificar el número de versión al final de Ajustes.
