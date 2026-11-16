// ====== Capa de audio ======
// Regla de la app: reconocimiento de voz y micrófono NUNCA al mismo tiempo.
//  - Reconocedor: solo reconocimiento (Medir). No abre el micrófono por su cuenta.
//  - Medidor: solo micrófono (nivel, dB, tono) y, si se pide, grabación (Escucharme).

const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const UA = navigator.userAgent;
const IS_IOS = /iP(hone|ad|od)/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_STANDALONE = navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
const IS_BRAVE = !!navigator.brave;
const IOS_OTRO_NAV = IS_IOS && /CriOS|FxiOS|EdgiOS|OPiOS/.test(UA);

// Estado del reconocimiento en este dispositivo (no se incluye en respaldos).
const ENV_KEY = "vozclara.dispositivo";
const ENV = (() => { try { return JSON.parse(localStorage.getItem(ENV_KEY)) || {}; } catch (_) { return {}; } })();
const saveEnv = () => { try { localStorage.setItem(ENV_KEY, JSON.stringify(ENV)); } catch (_) {} };
const modoApp = () => (IS_STANDALONE ? "instalada" : "navegador");

// Errores que no se arreglan reintentando en el momento.
const SR_FATAL = ["not-allowed", "service-not-allowed", "language-not-supported", "audio-capture"];

// "ok" | "sin" (el navegador no lo trae) | "falla" (lo trae pero aquí no funciona)
function srEstado() {
  if (!SR) return "sin";
  if (IS_BRAVE) return "falla";
  const f = ENV.srFalla && ENV.srFalla[modoApp()];
  return f ? "falla" : "ok";
}
function marcarFallaSR(error) {
  ENV.srFalla = ENV.srFalla || {};
  ENV.srFalla[modoApp()] = { error, fecha: today() };
  saveEnv();
}
function reintentarSR() { if (ENV.srFalla) delete ENV.srFalla[modoApp()]; saveEnv(); }
function marcarSRok() { if (ENV.srFalla && ENV.srFalla[modoApp()]) { delete ENV.srFalla[modoApp()]; saveEnv(); } }

// Explicación clara de por qué no mide y cómo lograr que sí mida.
function srAyuda() {
  const err = ENV.srFalla && ENV.srFalla[modoApp()] && ENV.srFalla[modoApp()].error;
  if (IS_BRAVE) return "Brave bloquea el reconocimiento de voz. Para medir, abre esta misma dirección en <b>Safari</b> (iPhone) o <b>Chrome</b> (Android/PC).";
  if (IOS_OTRO_NAV) return "En iPhone, este navegador no ofrece reconocimiento de voz. Abre esta dirección en <b>Safari</b> para medir.";
  if (!SR) return "Tu navegador no tiene reconocimiento de voz. Usa <b>Safari</b> (iPhone) o <b>Chrome</b> (Android/PC) para medir.";
  if (IS_IOS && IS_STANDALONE) return `En la app instalada en la pantalla de inicio, iOS no permitió el reconocimiento${err ? ` (<i>${esc(err)}</i>)` : ""}. Para que mida:
    <ol><li>Activa el dictado: <b>Ajustes › General › Teclado › Dictado</b> (y Siri, si lo pide).</li>
    <li>Vuelve aquí y toca <b>Reintentar medir</b>.</li>
    <li>Si sigue sin medir, abre la dirección de la app en <b>Safari</b>: ahí sí mide. Safari y la app instalada guardan historiales separados; júntalos con <b>Ajustes › Exportar</b> e <b>Importar › Combinar</b>.</li></ol>
    Mientras tanto, aquí puedes usar <b>Escucharme</b> y calificarte.`;
  if (err === "not-allowed") return "El permiso de micrófono o de reconocimiento de voz está bloqueado. Actívalo en los ajustes del sitio y toca <b>Reintentar medir</b>.";
  if (err === "service-not-allowed") return IS_IOS
    ? "iOS no permitió el reconocimiento. Activa <b>Ajustes › General › Teclado › Dictado</b> y toca <b>Reintentar medir</b>."
    : "El navegador no permitió el servicio de reconocimiento de voz. Revisa los permisos del sitio y toca <b>Reintentar medir</b>.";
  if (err === "audio-capture") return "Otra app está usando el micrófono. Ciérrala y toca <b>Reintentar medir</b>.";
  return "El reconocimiento de voz no funcionó en este dispositivo. Toca <b>Reintentar medir</b> o usa <b>Escucharme</b>.";
}

// ===== Registro central de audio =====
// Todo lo que usa micrófono o reconocimiento se anota aquí. Sirve para tres cosas:
//  1) garantizar que nunca haya dos a la vez, 2) apagar todo al cambiar de pantalla o al
//  mandar la app a segundo plano, y 3) mantener la pantalla encendida mientras se practica.
const AUDIO_ACTIVO = new Set();
const NUNCA = () => new Promise(() => {}); // promesa que no termina: el flujo que la espera queda abandonado sin errores
function apagarAudio() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (_) {} for (const x of [...AUDIO_ACTIVO]) { try { x.cancelar(); } catch (_) {} } AUDIO_ACTIVO.clear(); pantallaActiva(false, true); }
let candado = null, quieren = 0;
async function pantallaActiva(on, forzar) {
  quieren = forzar ? 0 : Math.max(0, quieren + (on ? 1 : -1));
  try {
    if (quieren > 0 && !candado && navigator.wakeLock) { candado = await navigator.wakeLock.request("screen"); candado.addEventListener("release", () => { candado = null; }); }
    else if (quieren === 0 && candado) { const c = candado; candado = null; await c.release(); }
  } catch (_) { candado = null; }
}
// Al salir de la app o bloquear el teléfono se apaga el micrófono.
document.addEventListener("visibilitychange", () => { if (document.hidden && AUDIO_ACTIVO.size) { apagarAudio(); if (typeof alVolver === "function") alVolver(true); } });
window.addEventListener("pagehide", apagarAudio);

let ULTIMA_TRAZA = [];
const nota2 = (rec, e) => { try { rec.traza && rec.traza.length < 60 && rec.traza.push(((performance.now() - rec.tIni) / 1000).toFixed(1) + "s " + e); } catch (_) {} };
let SR_VIVO = null;
// Descanso entre sesiones: en iPhone, una escucha que empieza enseguida de otra abre el micrófono
// pero no recibe sonido. Se mide desde que la sesión anterior quedó cerrada.
let SR_FIN = -1e9;
const SR_PAUSA = IS_IOS ? 4000 : 400;
const srFaltan = () => Math.max(0, Math.ceil(SR_PAUSA - (performance.now() - SR_FIN)));
// Deja el botón en espera hasta que el reconocimiento pueda usarse otra vez.
function cuandoSRListo(boton) {
  const ms = srFaltan(); if (!boton || !ms) return;
  const texto = boton.textContent; boton.disabled = true; boton.textContent = "Preparando el micrófono…";
  setTimeout(() => { if (boton.isConnected && boton.textContent === "Preparando el micrófono…") { boton.disabled = false; boton.textContent = texto; } }, ms);
} // la única sesión de reconocimiento que puede existir a la vez
const MENSAJE_SR = {
  "ocupado": "Espera a que termine la grabación.",
  "no-speech": "No te escuché. Acércate al micrófono e intenta de nuevo.",
  "network": "El reconocimiento de voz necesita internet. Revisa tu conexión.",
  "aborted": "Se interrumpió la medición.",
};

class Reconocedor {
  constructor(onText) { this.onText = onText || (() => {}); }
  // Debe llamarse directo desde el toque del botón (iOS exige el gesto).
  start() {
    return new Promise((resolve, reject) => {
      if (AUDIO_ACTIVO.size) return reject("ocupado"); // nunca junto con el micrófono
      AUDIO_ACTIVO.add(this); pantallaActiva(true);
      // En iPhone, una sesión anterior mal cerrada deja "sorda" a la siguiente: se elimina antes de empezar.
      if (SR_VIVO) { const v = SR_VIVO; SR_VIVO = null; try { v.onend = v.onresult = v.onerror = null; v.abort(); } catch (_) {} }
      const r = new SR(); SR_VIVO = r;
      r.lang = "es-MX"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
      this.rec = r; this.segs = []; this.ses = []; this.interim = ""; this.err = null;
      this.tIni = performance.now(); this.tPrimero = null; this.tUltimo = null;
      this.activo = true; this.reinicios = 0; let iniciado = false;
      // Bitácora técnica de la sesión (para la prueba de voz en Ajustes).
      const t0 = performance.now(), traza = this.traza = []; ULTIMA_TRAZA = traza; let nRes = 0;
      const nota = e => traza.length < 60 && traza.push(((performance.now() - t0) / 1000).toFixed(1) + "s " + e);
      let oyo = false;
      for (const ev of ["audiostart", "soundstart", "speechstart", "speechend", "soundend", "audioend", "nomatch"]) r["on" + ev] = () => { nota(ev); if (ev === "soundstart" || ev === "speechstart") oyo = true; };
      if (srFaltan()) nota("inicio sin descanso (" + srFaltan() + " ms)");
      // Si a los 4 s no ha llegado sonido ni texto, se avisa a la pantalla (micrófono abierto pero mudo).
      setTimeout(() => { if (this.activo && !oyo && this.tPrimero == null) { nota("sin sonido a los 4 s"); this.alSordo && this.alSordo(); } }, 4000);
      r.onstart = () => { nota("start"); if (!iniciado) { iniciado = true; resolve(); } };
      r.onresult = e => {
        const ahora = performance.now();
        const ult = e.results && e.results.length ? e.results[e.results.length - 1] : null;
        if (!ult) { nota("result vacío"); return; }
        this.ultimoFinal = !!ult.isFinal; // ¿el teléfono ya dio por terminada la frase?
        if (++nRes <= 3 || ult.isFinal) nota("result #" + nRes + " (" + e.results.length + (ult.isFinal ? ", final)" : ", parcial)"));
        if (this.tPrimero == null) this.tPrimero = ahora;
        this.tUltimo = ahora;
        // Se reconstruye todo en cada evento (evita duplicados de Safari).
        const fin = []; let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const x = e.results[i];
          if (x.isFinal) fin.push(x[0].transcript.trim()); else interim += x[0].transcript;
        }
        this.ses = fin; this.interim = interim.trim();
        const todo = [...fin, this.interim].join(" ").trim(); if (todo) this.respaldo = todo; // último texto no vacío de esta sesión
        this.onText(this.texto(true));
      };
      r.onerror = e => {
        nota("error: " + e.error);
        this.err = e.error;
        if (!iniciado && SR_FATAL.includes(e.error)) { iniciado = true; reject(e.error); }
      };
      r.onend = () => {
        nota("end"); this._consolidar();
        const fatal = SR_FATAL.includes(this.err) || this.err === "network";
        const solo = this.activo; // el navegador terminó la sesión sin que se le pidiera
        // Reanudar solo funciona fuera de iPhone: iOS exige un toque para cada sesión y, sin él,
        // deja una sesión "zombi" que no oye nada y bloquea a las siguientes.
        if (solo && !fatal && !IS_IOS && this.reinicios < 30) {
          this.reinicios++; nota("reinicio");
          try { r.start(); return; } catch (_) {}
        }
        this.activo = false; this._cerrar(); this._soltar();
        if (!iniciado) { iniciado = true; reject(this.err || "sin-inicio"); }
        if (this._fin) this._fin();
        else if (solo && this.alCerrar) setTimeout(() => this.alCerrar && this.alCerrar(), 0); // la pantalla da por terminada la medición
      };
      try { r.start(); } catch (e) { iniciado = true; this.activo = false; this._soltar(); reject("sin-inicio"); return; }
      // Algunos navegadores no disparan onstart: si no hubo error en 4 s, se da por iniciado.
      setTimeout(() => { if (!iniciado && this.activo) { iniciado = true; resolve(); } }, 4000);
    });
  }
  _soltar() { if (AUDIO_ACTIVO.delete(this)) pantallaActiva(false); }
  // Cierre definitivo: sin manejadores y abortada, para que no quede nada vivo en el sistema.
  _cerrar() {
    const r = this.rec; if (!r || this._cerrado) return; this._cerrado = true;
    try { r.onstart = r.onresult = r.onerror = r.onend = null; r.abort(); } catch (_) {}
    if (SR_VIVO === r) SR_VIVO = null;
    SR_FIN = performance.now();
  }
  cancelar() { this.abort(); }
  _consolidar() {
    // Algunos navegadores cierran con un resultado final vacío: en ese caso se conserva lo último que sí se oyó.
    let nuevos = this.ses.filter(Boolean);
    if (!nuevos.length && this.interim) nuevos = [this.interim];
    if (!nuevos.length && this.respaldo) nuevos = [this.respaldo];
    this.respaldo = "";
    for (const s of nuevos) {
      if (!s) continue;
      const prev = this.segs[this.segs.length - 1];
      if (prev && s.startsWith(prev)) this.segs[this.segs.length - 1] = s; // Safari a veces repite el segmento creciendo
      else if (s !== prev) this.segs.push(s);
    }
    this.ses = []; this.interim = "";
  }
  texto(conInterim) {
    const partes = [...this.segs, ...this.ses];
    if (conInterim && this.interim) partes.push(this.interim);
    return partes.join(" ").trim();
  }
  resultado() {
    const habla = this.tPrimero != null && this.tUltimo > this.tPrimero ? (this.tUltimo - this.tPrimero) / 1000 + 0.4 : null;
    return { traza: (this.traza || []).slice(), text: this.texto(false), segs: this.segs.slice(), secs: (performance.now() - this.tIni) / 1000, hablaSecs: habla, error: this.err };
  }
  stop() {
    return new Promise(res => {
      let listo = false;
      const fin = () => { if (!listo) { listo = true; this._cerrar(); this._soltar(); res(this.resultado()); } };
      if (!this.activo) { this._consolidar(); return fin(); }
      this._fin = fin; this.activo = false;
      const parar = () => {
        if (listo) return;
        try { this.rec.stop(); } catch (_) { this._consolidar(); fin(); }
        setTimeout(() => { this._consolidar(); fin(); }, 2500); // por si el navegador nunca avisa el final
      };
      // Margen antes de cortar: el reconocimiento del iPhone entrega el texto con uno o dos segundos de
      // retraso. Si se corta en cuanto la persona termina una frase corta, se pierde todo.
      // Además, se espera a que el teléfono cierre la frase (resultado "final"): cortar a media
      // transcripción puede dejar al reconocimiento del iPhone sin oír en la siguiente sesión.
      const t0 = performance.now(), tope = this.tUltimo == null ? 1800 : 3000;
      const esperar = () => {
        if (listo) return;
        const ahora = performance.now(), desde = ahora - (this.tUltimo ?? t0);
        const lista = this.tUltimo != null && this.ultimoFinal && desde >= 400;
        if (lista || ahora - t0 >= tope || (this.tUltimo != null && !IS_IOS && desde >= 900)) { nota2(this, "stop"); return parar(); }
        setTimeout(esperar, 100);
      };
      esperar();
    });
  }
  abort() { this.activo = false; this.alCerrar = null; this._cerrar(); this._soltar(); }
}

// Detección de tono (YIN simplificado). Devuelve Hz o null si no hay voz.
function detectarTono(buf, sr) {
  const n = buf.length; let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  if (Math.sqrt(rms / n) < 0.01) return null;
  const minLag = Math.floor(sr / 1000), maxLag = Math.min(Math.floor(sr / 65), Math.floor(n / 2) - 1);
  const W = n - maxLag; const d = new Float32Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) { const x = buf[i] - buf[i + tau]; s += x * x; }
    d[tau] = s;
  }
  let acc = 0, tau = -1; const cm = new Float32Array(maxLag + 1); cm[0] = 1;
  for (let t = 1; t <= maxLag; t++) { acc += d[t]; cm[t] = acc ? d[t] * t / acc : 1; }
  for (let t = minLag; t <= maxLag; t++) {
    if (cm[t] < 0.15) { while (t + 1 <= maxLag && cm[t + 1] < cm[t]) t++; tau = t; break; }
  }
  if (tau < 0) return null;
  const a = cm[tau - 1] ?? cm[tau], b = cm[tau], c = cm[tau + 1] ?? cm[tau];
  const den = a - 2 * b + c; const shift = den ? (a - c) / (2 * den) : 0;
  return sr / (tau + shift);
}

const getUM = () => navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  ? navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      .catch(() => navigator.mediaDevices.getUserMedia({ audio: true }))
  : Promise.reject(new Error("sin-mic"));

let urlsAudio = [];
class Medidor {
  // opciones: { grabar: bool }
  async start(op = {}) {
    // Si ya hay audio en uso (doble toque, o reconocimiento activo), este intento se abandona sin efecto.
    if (AUDIO_ACTIVO.size) return NUNCA();
    AUDIO_ACTIVO.add(this); pantallaActiva(true);
    // El contexto de audio se crea durante el toque (iOS lo deja pausado si se crea después).
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = AC ? new AC() : null;
    try { this.ctx && this.ctx.resume && this.ctx.resume(); } catch (_) {}
    let stream;
    try { stream = await getUM(); }
    catch (e) { this._cerrarCtx(); this._soltar(); if (this.cancelado) return NUNCA(); toast("No pude usar el micrófono. Revisa los permisos del sitio."); throw e; }
    // Si el usuario salió de la pantalla mientras se abría el micrófono, se apaga de inmediato.
    if (this.cancelado) { stream.getTracks().forEach(t => t.stop()); this._cerrarCtx(); return NUNCA(); }
    this.stream = stream;
    if (this.ctx) {
      try { await this.ctx.resume(); } catch (_) {}
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.an = this.ctx.createAnalyser(); this.an.fftSize = 2048; this.an.smoothingTimeConstant = 0;
      src.connect(this.an);
      this.buf = new Float32Array(this.an.fftSize);
      this.sr = this.ctx.sampleRate;
    }
    this.t0 = performance.now();
    if (op.grabar && window.MediaRecorder) {
      const tipos = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
      const tipo = tipos.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
      this.mr = new MediaRecorder(this.stream, tipo ? { mimeType: tipo } : undefined);
      this.chunks = []; this.mr.ondataavailable = e => { if (this.chunks && e.data && e.data.size) this.chunks.push(e.data); };
      this.mr.start(250);
    }
  }
  _leer() {
    if (!this.an) return null;
    if (this.an.getFloatTimeDomainData) this.an.getFloatTimeDomainData(this.buf);
    else { const b = new Uint8Array(this.an.fftSize); this.an.getByteTimeDomainData(b); for (let i = 0; i < b.length; i++) this.buf[i] = (b[i] - 128) / 128; }
    return this.buf;
  }
  // Nivel en dBFS (0 = máximo digital; la voz normal suele estar entre −40 y −20).
  db() {
    const b = this._leer(); if (!b) return -100;
    let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i];
    const rms = Math.sqrt(s / b.length);
    return rms > 0 ? Math.max(-100, 20 * Math.log10(rms)) : -100;
  }
  nivel() { return Math.max(0, Math.min(1, (this.db() + 60) / 55)); }
  tono() { const b = this._leer(); return b ? detectarTono(b, this.sr) : null; }
  segundos() { return (performance.now() - this.t0) / 1000; }
  _cerrarCtx() { try { this.ctx && this.ctx.state !== "closed" && this.ctx.close(); } catch (_) {} }
  _soltar() { if (AUDIO_ACTIVO.delete(this)) pantallaActiva(false); }
  // Corte inmediato (cambio de pantalla, app en segundo plano).
  cancelar() { this.cancelado = true; if (this.alCancelar) { try { this.alCancelar(); } catch (_) {} } this.stop(); }
  stop() {
    if (this._parada) return this._parada; // detener dos veces devuelve el mismo resultado
    const secs = this.t0 ? this.segundos() : 0;
    return this._parada = new Promise(res => {
      const fin = () => {
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        this._cerrarCtx(); this._soltar();
        let audio = null;
        if (this.chunks && this.chunks.length) {
          const blob = new Blob(this.chunks, { type: this.chunks[0].type || "audio/mp4" });
          urlsAudio.forEach(u => URL.revokeObjectURL(u)); urlsAudio = [];
          audio = URL.createObjectURL(blob); urlsAudio.push(audio);
        }
        this.stream = null; this.mr = null; this.chunks = null;
        res({ secs, audio });
      };
      if (this.mr && this.mr.state !== "inactive") { this.mr.onstop = fin; try { this.mr.stop(); } catch (_) { fin(); } }
      else fin();
    });
  }
}

// Bucle de animación con cancelación sencilla.
function bucle(fn) {
  let id = 0, vivo = true;
  // Si la función falla (por ejemplo, la pantalla ya no existe), el bucle se detiene solo.
  const paso = () => { if (!vivo) return; try { fn(); } catch (_) { vivo = false; return; } id = requestAnimationFrame(paso); };
  id = requestAnimationFrame(paso);
  return () => { vivo = false; cancelAnimationFrame(id); };
}
