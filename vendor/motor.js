// Puente entre la app y el reconocedor Vosk. Recibe audio de la app (mismo origen) y devuelve texto.
// El audio nunca sale del dispositivo.
(function () {
  "use strict";
  var modelo = null, cargando = null, rec = null;
  var avisar = function (m) { parent.postMessage(m, location.origin); };
  function cargar() {
    if (modelo) return Promise.resolve(modelo);
    if (!cargando) cargando = Vosk.createModel(new URL("modelo-es.tar.gz", location.href).href).then(function (m) { modelo = m; return m; });
    return cargando;
  }
  function soltar() { if (rec) { try { rec.remove(); } catch (_) {} rec = null; } }
  window.addEventListener("message", function (e) {
    if (e.origin !== location.origin || e.source !== parent) return; // solo la app que lo contiene
    var d = e.data || {};
    if (d.t === "cargar") {
      cargar().then(function () { avisar({ t: "listo" }); }).catch(function (err) { cargando = null; avisar({ t: "error", msg: String(err && err.message || err) }); });
    } else if (d.t === "iniciar") {
      cargar().then(function (m) {
        soltar();
        rec = new m.KaldiRecognizer(d.frecuencia);
        rec.on("partialresult", function (x) { avisar({ t: "parcial", texto: x.result.partial || "" }); });
        rec.on("result", function (x) { avisar({ t: "final", texto: x.result.text || "" }); });
        avisar({ t: "iniciado" });
      }).catch(function (err) { cargando = null; avisar({ t: "error", msg: String(err && err.message || err) }); });
    } else if (d.t === "audio") {
      if (rec) { try { rec.acceptWaveformFloat(d.muestras, d.frecuencia); } catch (err) { avisar({ t: "error", msg: String(err && err.message || err) }); } }
    } else if (d.t === "fin") {
      if (rec) { try { rec.retrieveFinalResult(); } catch (_) {} }
      setTimeout(function () { soltar(); avisar({ t: "terminado" }); }, d.espera || 1200);
    } else if (d.t === "cancelar") { soltar(); }
  });
  avisar({ t: "puente" });
})();
