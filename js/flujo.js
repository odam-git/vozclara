// ====== Flujo en dos tiempos: "Medir" (solo reconocimiento) y "Escucharme" (solo grabación) ======
// cfg: { el, tipo, nivel, extra, evaluar(r) -> html, alIniciar(modo), alTerminar(modo), etiquetaMedir }
function medirYEscuchar(cfg) {
  let rec = null, med = null, paraMedidor = null, ocupado = false, vivo = true, vacios = 0, cuadros = [];
  const el = cfg.el;

  function pintar() {
    const sr = srEstado();
    el.innerHTML = `
      <div class="trans" data-id="tr" aria-live="polite"></div>
      ${sr === "ok"
        ? `<button class="btn" data-id="medir">🎯 ${cfg.etiquetaMedir || "Medir"}</button>`
        : `<div class="aviso" role="note"><b>${SR_IOS_INSTALADA && !ENV.forzarSR ? "En este iPhone se mide con el micrófono." : "Sin medición automática aquí."}</b><div>${srAyuda()}</div>${SR && !IS_BRAVE && !(SR_IOS_INSTALADA && !ENV.forzarSR) ? `<button class="btn sec" data-id="re">Reintentar medir</button>` : ""}</div>`}
      <div data-id="res"></div>
      <button class="btn ${sr === "ok" ? "sec" : ""}" data-id="esc">🎧 Escucharme${sr === "ok" ? "" : " y medir mi ritmo"}</button>
      <div class="meter hidden" data-id="mt"><div></div></div>
      <div data-id="aud"></div>`;
    const q = id => el.querySelector(`[data-id="${id}"]`);
    const bMed = q("medir"), bEsc = q("esc"), bRe = q("re");
    cuandoSRListo(bMed);
    if (bRe) bRe.onclick = () => { reintentarSR(); pintar(); toast("Listo, toca Medir para intentarlo."); };

    if (bMed) bMed.onclick = async () => {
      if (ocupado) return;
      if (!rec) {
        rec = new Reconocedor(t => { q("tr").textContent = t; });
        const p = rec.start(); // sin await previo: iOS exige el gesto
        bEsc.disabled = true; bMed.textContent = "⏹️ Detener"; bMed.className = "btn rec";
        q("res").innerHTML = ""; q("aud").innerHTML = ""; q("tr").textContent = "Preparando…";
        try { await p; }
        catch (err) {
          rec = null; if (!vivo) return; bEsc.disabled = false;
          if (SR_FATAL.includes(err)) { marcarFallaSR(err); pintar(); toast("No se pudo usar el reconocimiento de voz."); }
          else { toast(MENSAJE_SR[err] || "No se pudo iniciar la medición. Intenta de nuevo."); pintar(); }
          return;
        }
        q("tr").textContent = "🎙️ Escuchando… habla ahora.";
        rec.alSordo = () => { const t = q("tr"); if (t && vivo) t.textContent = "⚠️ Aún no detecto tu voz. Si ya hablaste, toca Detener y vuelve a intentar."; };
        const actual = rec; rec.alCerrar = () => { if (vivo && rec === actual) bMed.click(); }; // si el teléfono corta solo, se evalúa lo dicho
        cfg.alIniciar && cfg.alIniciar("medir");
      } else {
        ocupado = true; bMed.disabled = true; bMed.textContent = "Procesando…";
        const r = await rec.stop(); rec = null; ocupado = false; if (!vivo) return;
        cfg.alTerminar && cfg.alTerminar("medir");
        bMed.disabled = false; bMed.textContent = "🔁 Medir otra vez"; bMed.className = "btn"; bEsc.disabled = false;
        cuandoSRListo(bMed);
        if (!r.text) {
          q("tr").textContent = ""; vacios++;
          if (SR_FATAL.includes(r.error)) { marcarFallaSR(r.error); pintar(); }
          else if (vacios >= 2) {
            // Falla silenciosa: el reconocimiento arranca pero no entiende. Se ofrece el plan B sin marcarlo como permanente.
            q("res").innerHTML = `<div class="aviso" role="note"><b>El reconocimiento no está entendiendo tu voz.</b>
              <div>Revisa tu conexión a internet y que ninguna otra app use el micrófono.${IS_IOS ? " En iPhone, confirma que el dictado esté activo en <b>Ajustes › General › Teclado › Dictado</b>." : ""}
              Mientras tanto, toca <b>Escucharme</b> y califícate con estrellas: esa práctica sí cuenta.</div></div>`;
          }
          toast(MENSAJE_SR[r.error] || "No te escuché. Acércate al micrófono e intenta de nuevo.");
          // Detalle técnico del intento fallido (sirve para pedir ayuda con una captura).
          const res = q("res"); if (res) res.insertAdjacentHTML("beforeend", `<details class="plegable"><summary>Detalle técnico</summary><pre class="tecnico">${esc(["v" + VERSION_APP + (IS_STANDALONE ? ", instalada" : ", navegador"), "Error: " + (r.error || "ninguno"), ...(r.traza && r.traza.length ? r.traza : ["(sin eventos)"])].join("\n"))}</pre></details>`);
          return;
        }
        vacios = 0; marcarSRok();
        q("res").innerHTML = cfg.evaluar(r) +
          `<p class="sub">¿Quieres oírte? Toca <b>Escucharme</b> y repite el ejercicio: se graba sin reconocimiento.</p>`;
      }
    };

    bEsc.onclick = async () => {
      if (ocupado) return;
      if (!med) {
        const m = new Medidor(); med = m;
        // Se bloquea Medir ANTES de abrir el micrófono: nunca coinciden.
        bEsc.disabled = true; if (bMed) bMed.disabled = true;
        try { await m.start({ grabar: true }); } catch (_) { med = null; if (vivo) { bEsc.disabled = false; if (bMed) bMed.disabled = false; } return; }
        if (!vivo) { m.stop(); med = null; return; }
        bEsc.disabled = false;
        bEsc.textContent = "⏹️ Terminar"; bEsc.className = "btn rec"; q("aud").innerHTML = "";
        const mt = q("mt"); mt.classList.remove("hidden");
        cuadros = [];
        paraMedidor = bucle(() => { const db = m.db(); cuadros.push({ t: m.segundos(), db }); mt.firstElementChild.style.width = Math.max(0, Math.min(1, (db + 60) / 55)) * 100 + "%"; });
        cfg.alIniciar && cfg.alIniciar("escuchar");
      } else {
        ocupado = true; paraMedidor && paraMedidor(); q("mt").classList.add("hidden");
        const r = await med.stop(); med = null; ocupado = false; if (!vivo) return;
        cfg.alTerminar && cfg.alTerminar("escuchar");
        bEsc.textContent = "🎧 Escucharme otra vez"; bEsc.className = "btn sec"; if (bMed) bMed.disabled = false;
        // Medición con el micrófono (funciona en cualquier teléfono, sin reconocimiento de voz).
        const mh = medirHabla(cuadros, cfg.objetivo ? palabras(cfg.objetivo).length : 0);
        cfg.alEscuchar && cfg.alEscuchar(mh);
        const resumen = mh ? `<div class="stats" style="margin-top:12px">${mh.wpm ? `<div class="stat"><b>${mh.wpm}</b><span>palabras/min</span></div>` : ""}<div class="stat"><b>${mh.habla.toFixed(0)}s</b><span>hablando</span></div><div class="stat"><b>${mh.pausas}</b><span>pausas</span></div></div>${mh.wpm ? `<p class="sub">El ritmo supone que leíste el texto completo, una sola vez.</p>` : ""}` : `<p class="sub">No alcancé a detectar tu voz. Acércate un poco al micrófono.</p>`;
        q("aud").innerHTML = resumen + (r.audio ? `<h3>Escúchate</h3><audio controls src="${r.audio}" style="width:100%"></audio>` : `<p class="sub">Este navegador no pudo grabar audio.</p>`) +
          estrellasHTML(srEstado() !== "ok" || vacios >= 2);
        let ses = null;
        conectarEstrellas(q("aud"), n => {
          // La primera vez se registra; si cambias de opinión, se corrige la misma práctica.
          if (ses) { ses.self = n; save(); return; }
          ses = logSession(cfg.tipo, { self: n, modo: "auto", level: cfg.nivel, secs: Math.round(mh ? mh.habla : r.secs), ...(mh && mh.wpm ? { wpm: mh.wpm } : {}), ...(mh ? { pausas: mh.pausas } : {}), ...(cfg.extra || {}) });
          if (["art", "read", "impro"].includes(cfg.tipo) && typeof ajustarNivel === "function") ajustarNivel(cfg.tipo, ses);
        });
      }
    };
  }
  pintar();
  return {
    // Termina lo que esté activo (por ejemplo, al acabarse el tiempo de improvisación).
    terminar() { const b = el.querySelector(rec ? '[data-id="medir"]' : '[data-id="esc"]'); if ((rec || med) && b) b.click(); },
    detener() { vivo = false; if (rec) rec.abort(); rec = null; if (med) med.cancelar(); med = null; paraMedidor && paraMedidor(); }
  };
}

function estrellasHTML(requerida) {
  return `<div class="stars-box"><p><b>${requerida ? "Califícate para registrar tu práctica" : "Califícate (opcional)"}</b><br><small class="sub">1 = poco claro · 5 = muy claro y seguro</small></p>
    <div class="stars" role="radiogroup" aria-label="Autocalificación">${[1, 2, 3, 4, 5].map(n => `<button role="radio" aria-checked="false" aria-label="${n} de 5" data-n="${n}">★</button>`).join("")}</div><div class="sub" data-id="st-msg"></div></div>`;
}
function conectarEstrellas(cont, alGuardar) {
  const bs = [...cont.querySelectorAll(".stars button")];
  bs.forEach(b => b.onclick = () => {
    const n = +b.dataset.n;
    bs.forEach(x => { x.classList.toggle("on", +x.dataset.n <= n); x.setAttribute("aria-checked", x === b); });
    alGuardar(n);
    cont.querySelector('[data-id="st-msg"]').textContent = `Guardado: ${n} de 5. Gracias por calificarte.`;
  });
}

// Cuenta regresiva basada en reloj (no se desfasa si el teléfono se pausa).
function cuentaRegresiva(segs, alTick, alFin) {
  const fin = Date.now() + segs * 1000;
  const iv = setInterval(() => {
    const r = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
    alTick(r); if (r <= 0) { clearInterval(iv); alFin && alFin(); }
  }, 250);
  alTick(segs);
  return () => clearInterval(iv);
}
