/* Fechas del SOAT y de la revisión técnico-mecánica y de emisiones contaminantes.
   Reglas: Ley 769 de 2002 (Código Nacional de Tránsito), art. 51 (revisión anual) y
   art. 52 modificado por el art. 179 de la Ley 2294 de 2023 (primera revisión).
   Todo se calcula en el navegador; nada se guarda ni se envía. */
(function (raiz) {
  'use strict';

  var TIPOS = {
    particular: { nombre: 'Carro particular', anios: 5, regla: 'Carros y camionetas de servicio particular: primera revisión a los 5 años de la matrícula.' },
    moto: { nombre: 'Moto', anios: 2, regla: 'Motos y similares: primera revisión a los 2 años de la matrícula.' },
    publico: { nombre: 'Servicio público', anios: 2, regla: 'Vehículos de servicio público: primera revisión a los 2 años de la matrícula.' }
  };

  /* Excepción del Ministerio de Transporte (Circular Externa del 19 de octubre de 2023):
     carros particulares matriculados entre el 20/05/2017 y el 19/05/2018 hacen la primera
     revisión a los 6 años, por la regla anterior (Decreto 19 de 2012). */
  var EXC_DESDE = new Date(2017, 4, 20), EXC_HASTA = new Date(2018, 4, 19);

  function dia(f) { return new Date(f.getFullYear(), f.getMonth(), f.getDate()); }
  function masDias(f, n) { var r = dia(f); r.setDate(r.getDate() + n); return r; }

  /* Suma años de calendario. Si el día no existe en el año de llegada (29 de febrero),
     toma el último día de ese mes (28 de febrero): el aviso llega antes, nunca después. */
  function sumarAnios(f, n) {
    var a = f.getFullYear() + n, m = f.getMonth(), d = f.getDate();
    var ultimo = new Date(a, m + 1, 0).getDate();
    return new Date(a, m, Math.min(d, ultimo));
  }

  /* Días de calendario de a hasta b (negativo si b ya pasó). Sin líos de horario de verano. */
  function diasEntre(a, b) {
    var ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((ub - ua) / 86400000);
  }

  function aniosPrimera(tipo, matricula) {
    var t = TIPOS[tipo];
    if (!t) return null;
    if (tipo === 'particular') {
      var m = dia(matricula);
      if (m >= EXC_DESDE && m <= EXC_HASTA) return 6;
    }
    return t.anios;
  }

  function primeraRevision(tipo, matricula) {
    var n = aniosPrimera(tipo, matricula);
    if (n === null) return null;
    return { fecha: sumarAnios(matricula, n), anios: n, excepcion: tipo === 'particular' && n === 6 };
  }

  /* Próxima revisión.
     estado: 'primera' (aún no le toca la primera), 'anual' (calculada con la última revisión),
     'falta-ultima' (ya pasó la primera y no sabemos cuándo hizo la última: fecha = la primera, días negativos),
     'error' (la última revisión es anterior a la matrícula o posterior a hoy). */
  function revision(tipo, matricula, ultima, hoy) {
    var p = primeraRevision(tipo, matricula);
    if (!p) return null;
    var r = { primera: p.fecha, anios: p.anios, excepcion: p.excepcion };
    if (ultima) {
      if (diasEntre(matricula, ultima) < 0 || diasEntre(ultima, hoy) < 0) { r.estado = 'error'; return r; }
      var siguiente = sumarAnios(ultima, 1);
      r.estado = diasEntre(p.fecha, siguiente) >= 0 ? 'anual' : 'primera';
      r.fecha = r.estado === 'anual' ? siguiente : p.fecha;
    } else if (diasEntre(hoy, p.fecha) >= 0) {
      r.estado = 'primera'; r.fecha = p.fecha;
    } else {
      // Sin la última revisión no sabemos si la hizo: se muestra vencida desde la primera.
      r.estado = 'falta-ultima'; r.fecha = p.fecha;
    }
    if (r.fecha) r.dias = diasEntre(hoy, r.fecha);
    return r;
  }

  function semaforo(dias) {
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'pronto';
    return 'bien';
  }

  function soat(vence, hoy) {
    var d = diasEntre(hoy, vence);
    return { fecha: dia(vence), dias: d, estado: semaforo(d) };
  }

  /* ---------- Formatos ---------- */
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function dos(n) { return (n < 10 ? '0' : '') + n; }
  function corta(f) { return dos(f.getDate()) + '/' + dos(f.getMonth() + 1) + '/' + f.getFullYear(); }
  function larga(f) { return f.getDate() + ' de ' + MESES[f.getMonth()] + ' de ' + f.getFullYear(); }
  function conDia(f) { return DIAS[f.getDay()] + ' ' + larga(f); }
  function enDias(n) {
    if (n === 0) return 'es hoy';
    if (n === 1) return 'falta 1 día';
    if (n > 1) return 'faltan ' + n.toLocaleString('es-CO') + ' días';
    if (n === -1) return 'se venció hace 1 día';
    return 'se venció hace ' + (-n).toLocaleString('es-CO') + ' días';
  }
  function leerISO(t) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || '');
    if (!m) return null;
    var f = new Date(+m[1], +m[2] - 1, +m[3]);
    return f.getMonth() === +m[2] - 1 ? f : null;
  }

  /* ---------- Calendario (.ics, RFC 5545) ---------- */
  function ymd(f) { return f.getFullYear() + dos(f.getMonth() + 1) + dos(f.getDate()); }
  function sello(t) {
    return t.getUTCFullYear() + dos(t.getUTCMonth() + 1) + dos(t.getUTCDate()) + 'T' +
      dos(t.getUTCHours()) + dos(t.getUTCMinutes()) + dos(t.getUTCSeconds()) + 'Z';
  }
  function escapar(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  /* Parte las líneas de más de 75 bytes (UTF-8), como pide el estándar. */
  function doblar(linea) {
    var out = [], actual = '', bytes = 0, limite = 75;
    for (var i = 0; i < linea.length; i++) {
      var c = linea[i], cod = linea.charCodeAt(i), b;
      if (cod >= 0xD800 && cod <= 0xDBFF) { c += linea[++i]; b = 4; }
      else b = cod < 0x80 ? 1 : cod < 0x800 ? 2 : 3;
      if (bytes + b > limite) { out.push(actual); actual = ' '; bytes = 1; limite = 75; }
      actual += c; bytes += b;
    }
    out.push(actual);
    return out.join('\r\n');
  }
  function slug(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /* eventos: [{ fecha, titulo, descripcion }] · avisos: días antes, p. ej. [30, 7]
     Cada vencimiento sale como evento de todo el día y, además, un evento por cada aviso
     (así funciona aunque el calendario no importe alarmas), con alarma a las 9:00 a. m.
     del día anterior a cada uno. Los avisos que ya pasaron no se incluyen. */
  function ics(eventos, avisos, hoy, ahora) {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Estado X//Carro al dia Colombia//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:Carro al día'];
    var stamp = sello(ahora || new Date());
    var n = 0;
    function evento(fecha, titulo, desc, uid) {
      L.push('BEGIN:VEVENT', 'UID:' + uid + '@carro-al-dia-colombia', 'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + ymd(fecha), 'DTEND;VALUE=DATE:' + ymd(masDias(fecha, 1)),
        'SUMMARY:' + escapar(titulo), 'DESCRIPTION:' + escapar(desc), 'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escapar(titulo), 'TRIGGER:-PT15H', 'END:VALARM',
        'END:VEVENT');
      n++;
    }
    (eventos || []).forEach(function (e) {
      if (!e || !e.fecha || diasEntre(hoy, e.fecha) < 0) return;
      var base = ymd(e.fecha) + '-' + slug(e.titulo);
      evento(e.fecha, e.titulo, e.descripcion || '', base);
      (avisos || []).slice().sort(function (a, b) { return b - a; }).forEach(function (d) {
        var f = masDias(e.fecha, -d);
        if (diasEntre(hoy, f) < 0) return;
        evento(f, 'Faltan ' + d + (d === 1 ? ' día' : ' días') + ': ' + e.titulo,
          (e.descripcion ? e.descripcion + '\n' : '') + 'Fecha: ' + corta(e.fecha) + '.', base + '-aviso-' + d);
      });
    });
    L.push('END:VCALENDAR');
    return { texto: L.map(doblar).join('\r\n') + '\r\n', eventos: n };
  }

  var api = {
    TIPOS: TIPOS, sumarAnios: sumarAnios, masDias: masDias, diasEntre: diasEntre, aniosPrimera: aniosPrimera,
    primeraRevision: primeraRevision, revision: revision, soat: soat, semaforo: semaforo,
    corta: corta, larga: larga, conDia: conDia, enDias: enDias, leerISO: leerISO, ics: ics
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Fechas = api;
})(this);
