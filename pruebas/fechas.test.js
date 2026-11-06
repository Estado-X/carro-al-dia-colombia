// Pruebas sin dependencias: node --test pruebas/
const test = require('node:test');
const assert = require('node:assert');
const F = require('../assets/fechas.js');

const f = (d, m, a) => new Date(a, m - 1, d);
const c = (x) => F.corta(x);

test('sumar años: fecha normal y fin de mes', () => {
  assert.strictEqual(c(F.sumarAnios(f(15, 3, 2021), 5)), '15/03/2026');
  assert.strictEqual(c(F.sumarAnios(f(31, 1, 2024), 2)), '31/01/2026');
  assert.strictEqual(c(F.sumarAnios(f(31, 12, 2025), 1)), '31/12/2026');
  assert.strictEqual(c(F.sumarAnios(f(30, 4, 2024), 2)), '30/04/2026');
});

test('29 de febrero: cae en 28 de febrero si el año de llegada no es bisiesto', () => {
  assert.strictEqual(c(F.sumarAnios(f(29, 2, 2024), 1)), '28/02/2025');
  assert.strictEqual(c(F.sumarAnios(f(29, 2, 2024), 2)), '28/02/2026');
  assert.strictEqual(c(F.sumarAnios(f(29, 2, 2024), 4)), '29/02/2028');
  assert.strictEqual(c(F.sumarAnios(f(29, 2, 2024), 5)), '28/02/2029');
});

test('días entre fechas (incluye años bisiestos)', () => {
  assert.strictEqual(F.diasEntre(f(6, 11, 2026), f(6, 12, 2026)), 30);
  assert.strictEqual(F.diasEntre(f(6, 11, 2026), f(5, 11, 2026)), -1);
  assert.strictEqual(F.diasEntre(f(1, 1, 2028), f(1, 1, 2029)), 366);
  assert.strictEqual(F.diasEntre(f(28, 2, 2027), f(1, 3, 2027)), 1);
});

test('primera revisión: carro particular a los 5 años', () => {
  const p = F.primeraRevision('particular', f(14, 8, 2022));
  assert.strictEqual(p.anios, 5);
  assert.strictEqual(c(p.fecha), '14/08/2027');
  assert.strictEqual(p.excepcion, false);
});

test('primera revisión: moto y servicio público a los 2 años', () => {
  assert.strictEqual(c(F.primeraRevision('moto', f(10, 1, 2025)).fecha), '10/01/2027');
  assert.strictEqual(c(F.primeraRevision('publico', f(3, 6, 2025)).fecha), '03/06/2027');
});

test('excepción: particular matriculado entre el 20/05/2017 y el 19/05/2018 va a los 6 años', () => {
  assert.strictEqual(F.aniosPrimera('particular', f(19, 5, 2017)), 5);
  assert.strictEqual(F.aniosPrimera('particular', f(20, 5, 2017)), 6);
  assert.strictEqual(F.aniosPrimera('particular', f(19, 5, 2018)), 6);
  assert.strictEqual(F.aniosPrimera('particular', f(20, 5, 2018)), 5);
  assert.strictEqual(c(F.primeraRevision('particular', f(1, 1, 2018)).fecha), '01/01/2024');
  // La excepción es solo para carros particulares
  assert.strictEqual(F.aniosPrimera('moto', f(1, 1, 2018)), 2);
});

test('revisión: aún no toca la primera', () => {
  const r = F.revision('particular', f(14, 8, 2022), null, f(6, 11, 2026));
  assert.strictEqual(r.estado, 'primera');
  assert.strictEqual(c(r.fecha), '14/08/2027');
  assert.strictEqual(r.dias, 281);
});

test('revisión: moto matriculada el 29/02/2024 → primera el 28/02/2026, ya pasó', () => {
  const sin = F.revision('moto', f(29, 2, 2024), null, f(6, 11, 2026));
  assert.strictEqual(sin.estado, 'falta-ultima');
  assert.strictEqual(c(sin.primera), '28/02/2026');
  assert.strictEqual(c(sin.fecha), '28/02/2026');
  assert.ok(sin.dias < 0);
  const con = F.revision('moto', f(29, 2, 2024), f(27, 2, 2026), f(6, 11, 2026));
  assert.strictEqual(con.estado, 'anual');
  assert.strictEqual(c(con.fecha), '27/02/2027');
  assert.strictEqual(con.dias, 113);
});

test('revisión anual: última el 29/02/2024 → siguiente el 28/02/2025', () => {
  const r = F.revision('particular', f(10, 1, 2010), f(29, 2, 2024), f(1, 6, 2024));
  assert.strictEqual(r.estado, 'anual');
  assert.strictEqual(c(r.fecha), '28/02/2025');
});

test('revisión hecha antes de tiempo no adelanta la primera obligatoria', () => {
  // Particular matriculado el 14/08/2022 (primera el 14/08/2027); hizo una revisión el 01/03/2026
  const r = F.revision('particular', f(14, 8, 2022), f(1, 3, 2026), f(6, 11, 2026));
  assert.strictEqual(r.estado, 'primera');
  assert.strictEqual(c(r.fecha), '14/08/2027');
});

test('revisión: el día de la primera cuenta como "es hoy"', () => {
  const r = F.revision('publico', f(6, 11, 2024), null, f(6, 11, 2026));
  assert.strictEqual(r.estado, 'primera');
  assert.strictEqual(r.dias, 0);
  assert.strictEqual(F.enDias(0), 'es hoy');
});

test('revisión: fechas imposibles', () => {
  assert.strictEqual(F.revision('moto', f(1, 1, 2025), f(1, 1, 2024), f(6, 11, 2026)).estado, 'error');
  assert.strictEqual(F.revision('moto', f(1, 1, 2025), f(1, 1, 2027), f(6, 11, 2026)).estado, 'error');
  assert.strictEqual(F.revision('bus', f(1, 1, 2025), null, f(6, 11, 2026)), null);
});

test('SOAT: días y semáforo', () => {
  assert.deepStrictEqual([F.soat(f(6, 12, 2026), f(6, 11, 2026)).dias, F.soat(f(6, 12, 2026), f(6, 11, 2026)).estado], [30, 'pronto']);
  assert.strictEqual(F.soat(f(7, 12, 2026), f(6, 11, 2026)).estado, 'bien');
  assert.strictEqual(F.soat(f(5, 11, 2026), f(6, 11, 2026)).estado, 'vencido');
  assert.strictEqual(F.enDias(-1), 'se venció hace 1 día');
  assert.strictEqual(F.enDias(1200), 'faltan 1.200 días');
});

test('leer fechas del formulario', () => {
  assert.strictEqual(c(F.leerISO('2024-02-29')), '29/02/2024');
  assert.strictEqual(F.leerISO('2025-02-29'), null);
  assert.strictEqual(F.leerISO(''), null);
});

test('calendario .ics: eventos, avisos y formato', () => {
  const hoy = f(6, 11, 2026);
  const r = F.ics([
    { fecha: f(15, 1, 2027), titulo: 'Vence el SOAT · ABC123', descripcion: 'Renuévalo antes, por ejemplo; en línea.' },
    { fecha: f(1, 11, 2026), titulo: 'Ya pasó', descripcion: '' }
  ], [30, 7], hoy, new Date(Date.UTC(2026, 10, 6, 12, 0, 0)));
  const t = r.texto;
  assert.strictEqual(r.eventos, 3);
  assert.match(t, /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\n/);
  assert.match(t, /END:VCALENDAR\r\n$/);
  assert.match(t, /DTSTART;VALUE=DATE:20270115\r\nDTEND;VALUE=DATE:20270116/);
  assert.match(t, /DTSTART;VALUE=DATE:20261216/); // 30 días antes
  assert.match(t, /DTSTART;VALUE=DATE:20270108/); // 7 días antes
  assert.match(t, /SUMMARY:Faltan 30 días: Vence el SOAT · ABC123/);
  assert.match(t, /DESCRIPTION:Renuévalo antes\\, por ejemplo\\; en línea\./);
  assert.match(t, /DTSTAMP:20261106T120000Z/);
  assert.doesNotMatch(t, /Ya pasó/);
  // Ninguna línea pasa de 75 bytes
  t.split('\r\n').forEach((l) => assert.ok(Buffer.byteLength(l, 'utf8') <= 75, l));
});

test('calendario .ics: no incluye avisos que ya pasaron', () => {
  const r = F.ics([{ fecha: f(10, 11, 2026), titulo: 'Revisión técnico-mecánica' }], [30, 7], f(6, 11, 2026));
  assert.strictEqual(r.eventos, 1);
});

test('calendario .ics: dobla líneas largas con tildes sin partir caracteres', () => {
  const largo = 'Revisión técnico-mecánica y de emisiones contaminantes del vehículo de placa ÑÁÉ123 en Bogotá';
  const r = F.ics([{ fecha: f(1, 2, 2027), titulo: largo }], [], f(6, 11, 2026));
  const unido = r.texto.replace(/\r\n /g, '');
  assert.ok(unido.includes('SUMMARY:' + largo));
  r.texto.split('\r\n').forEach((l) => assert.ok(Buffer.byteLength(l, 'utf8') <= 75));
});

test('sin última revisión y la primera ya pasó: queda vencida desde la primera', () => {
  // Particular matriculado el 01/03/2021 → primera el 01/03/2026; hoy 06/11/2026
  const r = F.revision('particular', f(1, 3, 2021), null, f(6, 11, 2026));
  assert.strictEqual(r.estado, 'falta-ultima');
  assert.strictEqual(c(r.fecha), '01/03/2026');
  assert.strictEqual(r.dias, -250);
  assert.strictEqual(F.semaforo(r.dias), 'vencido');
});
