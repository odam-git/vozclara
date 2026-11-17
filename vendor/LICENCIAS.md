# Componentes de terceros

Esta carpeta contiene el reconocedor de voz opcional de Voz Clara. Solo se descarga si el usuario lo prueba o lo enciende en Ajustes. Corre por completo en el dispositivo: no envía audio ni datos a ningún servidor.

| Archivo | Qué es | Origen | Licencia |
|---|---|---|---|
| `vosk.js` | Motor de reconocimiento de voz Vosk (Kaldi) compilado a WebAssembly, paquete `vosk-browser` 0.0.8 | https://github.com/ccoreilly/vosk-browser (npm: `vosk-browser`) | Apache 2.0 |
| `modelo-es.tar.gz` | Modelo acústico y de lenguaje en español `vosk-model-small-es-0.3` | https://alphacephei.com/vosk/models (copia publicada por el proyecto vosk-browser) | Apache 2.0 |
| `motor.html`, `motor.js` | Compartimento y puente propios de Voz Clara | Este proyecto | La del proyecto |

Vosk es un proyecto de Alpha Cephei Inc.; vosk-browser es de Ciaran O'Reilly. Kaldi, en el que se basa Vosk, también se distribuye con licencia Apache 2.0. Texto de la licencia: https://www.apache.org/licenses/LICENSE-2.0

Huellas SHA-256 de los archivos tal como se incorporaron:
- `vosk.js`: 29504515526e974f4cb053cf08811c4de5fb2a74007c0a5a957db50eaa8d5d0c
- `modelo-es.tar.gz`: d566afa64774e0f736c805556ad12f8b7c44e7b7ea4c0ed120014bb7cac7a6b9
