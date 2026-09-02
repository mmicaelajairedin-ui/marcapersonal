#!/usr/bin/env node
/**
 * check-en.js — falla si alguna página inglesa no coincide con lo que produce
 * el generador a partir de su original en español.
 *
 * Es la guardia que faltaba en Pathway: allí registro-en.html se quedó viejo
 * y nadie se enteró hasta que un visitante inglés vio el formulario entero
 * en español. Aquí no puede pasar en silencio.
 */
const fs = require('fs');
const path = require('path');
const { construirTodo } = require('./build-en.js');

const RAIZ = path.join(__dirname, '..');
const esperado = construirTodo();
const desincronizadas = [];

for (const [rel, contenido] of Object.entries(esperado)) {
  const abs = path.join(RAIZ, rel);
  const actual = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (actual === null) desincronizadas.push(rel + ' (no existe)');
  else if (actual !== contenido) desincronizadas.push(rel);
}

if (desincronizadas.length) {
  console.error('✗ Estas páginas inglesas están desincronizadas de su original:');
  desincronizadas.forEach(f => console.error('   ·', f));
  console.error('  Cambió el español y no se regeneró el inglés, o se editaron a mano.');
  console.error('  Arréglalo con:  node scripts/build-en.js');
  process.exit(1);
}
console.log('✓ las ' + Object.keys(esperado).length + ' páginas inglesas están al día');
