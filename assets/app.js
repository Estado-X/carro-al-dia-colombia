/* Interfaz: lee las fechas, muestra lo que se vence y arma el calendario .ics.
   No guarda nada: al cerrar la página, se borra. */
(function () {
  'use strict';

  var F = window.Fechas;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  function tipo() { var r = document.querySelector('input[name="tipo"]:checked'); return r ? r.value : 'particular'; }
  function fecha(id) { return F.leerISO(document.getElementById(id).value); }
  function placa() { return document.getElementById('placa').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7); }
  function avisos() { return $$('input[name="aviso"]:checked').map(function (c) { return +c.value; }); }
  function hoy() { var h = new Date(); return new Date(h.getFullYear(), h.getMonth(), h.getDate()); }

  var eventos = [];

  function pintar(card, estado, fechaTxt, diasTxt, notaTxt) {
    var c = document.getElementById(card);
    c.setAttribute('data-estado', estado);
    var p = card === 'c-soat' ? 'soat' : 'rtm';
    document.getElementById(p + '-fecha').textContent = fechaTxt;
    document.getElementById(p + '-dias').textContent = diasTxt;
    document.getElementById(p + '-nota').textContent = notaTxt;
  }

  function sufijo() { var p = placa(); return p ? ' · ' + p : ''; }

  function actualizar() {
    $$('.opcion').forEach(function (o) { o.classList.toggle('activa', o.querySelector('input').checked); });
    $$('.chip').forEach(function (o) { o.classList.toggle('activa', o.querySelector('input').checked); });

    var h = hoy(), t = tipo(), mat = fecha('matricula'), venceSoat = fecha('soat'), ult = fecha('ultima');
    eventos = [];

    // SOAT
    if (venceSoat) {
      var s = F.soat(venceSoat, h);
      var notaS = s.estado === 'vencido'
        ? 'Sin SOAT vigente no puedes circular: renuévalo antes de mover el vehículo.'
        : 'Renuévalo antes de esa fecha. La póliza nueva dura como mínimo un año.';
      pintar('c-soat', s.estado, 'Vence el ' + F.conDia(s.fecha), cap(F.enDias(s.dias)), notaS);
      eventos.push({ fecha: s.fecha, titulo: 'Vence el SOAT' + sufijo(), descripcion: 'Renueva el SOAT antes de esta fecha. Confírmalo en el RUNT: https://portalpublico.runt.gov.co/' });
    } else {
      pintar('c-soat', 'vacio', 'Escribe la fecha de vencimiento', '', 'El SOAT dura como mínimo un año. Sin él no puedes circular.');
    }

    // Revisión técnico-mecánica
    $('#ultima').classList.remove('mal');
    if (!mat) {
      pintar('c-rtm', 'vacio', 'Escribe la fecha de matrícula', '', F.TIPOS[t].regla);
    } else if (F.diasEntre(mat, h) < 0) {
      pintar('c-rtm', 'vacio', 'Revisa la fecha de matrícula', '', 'La fecha de matrícula no puede ser posterior a hoy.');
    } else {
      var r = F.revision(t, mat, ult, h);
      var base = r.excepcion
        ? 'Tu carro se matriculó entre el 20/05/2017 y el 19/05/2018: la primera revisión era a los 6 años (' + F.corta(r.primera) + ').'
        : 'La primera revisión era a los ' + r.anios + ' años de la matrícula: ' + F.corta(r.primera) + '.';
      if (r.estado === 'error') {
        $('#ultima').classList.add('mal');
        pintar('c-rtm', 'vacio', 'Revisa la fecha de tu última revisión', '', 'No puede ser anterior a la matrícula ni posterior a hoy.');
      } else if (r.estado === 'falta-ultima') {
        pintar('c-rtm', 'vencido', 'Venció el ' + F.conDia(r.fecha), cap(F.enDias(r.dias)),
          base + ' Desde entonces es cada año. Si ya la hiciste, escribe la fecha de tu última revisión.');
      } else {
        var titulo = r.estado === 'primera' ? 'Primera revisión técnico-mecánica' : 'Revisión técnico-mecánica';
        var nota = r.estado === 'primera'
          ? (r.excepcion ? base : 'Es la primera: ' + r.anios + ' años después de la matrícula. Después, cada año.')
          : 'Un año después de tu última revisión (' + F.corta(ult) + '). ' + (r.dias < 0 ? 'Hazla antes de volver a circular.' : 'Después, cada año.');
        pintar('c-rtm', F.semaforo(r.dias), (r.dias < 0 ? 'Venció el ' : 'Hazla a más tardar el ') + F.conDia(r.fecha), cap(F.enDias(r.dias)), nota);
        eventos.push({ fecha: r.fecha, titulo: titulo + sufijo(), descripcion: 'Revisión técnico-mecánica y de emisiones contaminantes en un centro de diagnóstico automotor. Confírmalo en el RUNT: https://portalpublico.runt.gov.co/' });
      }
    }

    calendario(h);
  }

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function calendario(h) {
    var futuros = eventos.filter(function (e) { return F.diasEntre(h, e.fecha) >= 0; });
    var ol = $('#linea');
    ol.textContent = '';
    var items = [];
    futuros.forEach(function (e) {
      avisos().sort(function (a, b) { return b - a; }).forEach(function (d) {
        var f = F.masDias(e.fecha, -d);
        if (F.diasEntre(h, f) >= 0) items.push([f, 'Aviso: faltan ' + d + (d === 1 ? ' día' : ' días'), e.titulo]);
      });
      items.push([e.fecha, e.titulo, 'el día del vencimiento']);
    });
    items.sort(function (a, b) { return a[0] - b[0]; });
    items.forEach(function (it) {
      var li = document.createElement('li');
      var b = document.createElement('strong'); b.textContent = F.corta(it[0]) + ' · ' + it[1];
      var s = document.createElement('span'); s.textContent = it[2];
      li.appendChild(b); li.appendChild(s); ol.appendChild(li);
    });
    ol.hidden = items.length === 0;
    var boton = $('#descargar');
    boton.disabled = futuros.length === 0;
    boton.textContent = futuros.length ? 'Descargar el calendario (.ics)' : 'Escribe una fecha por venir para descargar';
  }

  function descargar() {
    var r = F.ics(eventos, avisos(), hoy());
    if (!r.eventos) return;
    var blob = new Blob([r.texto], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var p = placa();
    a.href = url; a.download = 'carro-al-dia' + (p ? '-' + p.toLowerCase() : '') + '.ics';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    var boton = $('#descargar'), antes = boton.textContent;
    boton.textContent = 'Listo: ' + r.eventos + (r.eventos === 1 ? ' evento' : ' eventos'); boton.classList.add('ok');
    setTimeout(function () { boton.textContent = antes; boton.classList.remove('ok'); }, 1800);
  }

  function iniciar() {
    document.addEventListener('input', actualizar);
    document.addEventListener('change', actualizar);
    $('#descargar').addEventListener('click', descargar);
    actualizar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
