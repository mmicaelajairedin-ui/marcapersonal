#!/usr/bin/env node
/**
 * check-en.js — falla si en.html no coincide con lo que produce el generador.
 *
 * Es la guardia que faltaba en Pathway: allí registro-en.html se quedó viejo
 * y nadie se enteró hasta que un visitante inglés vio el formulario entero
 * en español. Aquí no puede pasar en silencio.
 */
const fs = require('fs');
const path = require('path');
const { generar } = require('./build-en.js');

const RAIZ = path.join(__dirname, '..');
const esperado = generar(fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8'));
const actual = fs.existsSync(path.join(RAIZ, 'en.html'))
  ? fs.readFileSync(path.join(RAIZ, 'en.html'), 'utf8') : '';

if (actual !== esperado) {
  console.error('✗ en.html está desincronizado de index.html.');
  console.error('  Cambió el español y no se regeneró el inglés, o se editó en.html a mano.');
  console.error('  Arréglalo con:  node scripts/build-en.js');
  process.exit(1);
}
console.log('✓ en.html está al día con index.html');
