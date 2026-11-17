// Puente entre la app y el reconocedor Vosk. Recibe audio de la app (mismo origen) y devuelve texto.
// El audio nunca sale del dispositivo.
// Se usa UN solo reconocedor, a 16 kHz (la frecuencia del modelo), que se reinicia entre sesiones:
// FinalResult() de Vosk entrega el texto y deja el reconocedor listo para la siguiente frase.
(function () {
  "use strict";
  var FREC = 16000, modelo = null, cargando = null, rec = null, sesion = null;
  var avisar = function (m) { parent.postMessage(m, location.origin); };
  var msg = function (err) { return String((err && (err.message || err.error)) || err); };
  function cargar() {
    if (modelo) return Promise.resolve(modelo);
    if (!cargando) cargando = Vosk.createModel(new URL("modelo-es.tar.gz", location.href).href).then(function (m) { modelo = m; return m; });
    return cargando;
  }
  function reconocedor(m) {
    if (rec) return rec;
    rec = new m.KaldiRecognizer(FREC);
    // Cada mensaje lleva la sesión vigente: la app descarta lo que llegue tarde de una sesión anterior.
    rec.on("partialresult", function (x) { if (sesion) avisar({ t: "parcial", s: sesion, texto: (x && x.result && x.result.partial) || "" }); });
    rec.on("result", function (x) { if (sesion) avisar({ t: "final", s: sesion, texto: (x && x.result && x.result.text) || "" }); });
    rec.on("error", function (x) { avisar({ t: "error", s: sesion, msg: msg(x) }); });
    return rec;
  }
  window.addEventListener("message", function (e) {
    if (e.origin !== location.origin || e.source !== parent) return; // solo la app que lo contiene
    var d = e.data || {};
    if (d.t === "cargar") {
      cargar().then(function () { avisar({ t: "listo" }); }).catch(function (err) { cargando = null; avisar({ t: "error", msg: msg(err) }); });
    } else if (d.t === "iniciar") {
      cargar().then(function (m) { reconocedor(m); sesion = d.s; avisar({ t: "iniciado", s: d.s, frecuencia: FREC }); })
        .catch(function (err) { cargando = null; avisar({ t: "error", s: d.s, msg: msg(err) }); });
    } else if (d.t === "audio") {
      if (rec && sesion === d.s) { try { rec.acceptWaveformFloat(d.muestras, FREC); } catch (err) { avisar({ t: "error", s: d.s, msg: msg(err) }); } }
    } else if (d.t === "fin") {
      if (rec && sesion === d.s) { try { rec.retrieveFinalResult(); } catch (err) { avisar({ t: "error", s: d.s, msg: msg(err) }); } }
      setTimeout(function () { avisar({ t: "terminado", s: d.s }); if (sesion === d.s) sesion = null; }, d.espera || 1200);
    } else if (d.t === "cancelar") {
      if (rec && sesion === d.s) { sesion = null; try { rec.retrieveFinalResult(); } catch (_) {} } // reinicia sin avisar
    }
  });
  avisar({ t: "puente" });
})();
