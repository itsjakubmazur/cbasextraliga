#!/usr/bin/env node
// Spusť: node scripts/hash-password.js TVOJE_HESLO
// Vypsaný řetězec vlož do Vercel env var ADMIN_PASSWORD_HASH.
// Heslo se nikam neposílá, počítá se jen lokálně.

const { hashPassword } = require('../api/_lib/auth');

const password = process.argv[2];

if (!password || password.length < 8) {
  console.error('Použití: node scripts/hash-password.js TVOJE_HESLO   (aspoň 8 znaků)');
  process.exit(1);
}

console.log('\nADMIN_PASSWORD_HASH=' + hashPassword(password));
console.log('\nToto vlož jako hodnotu env var ADMIN_PASSWORD_HASH ve Vercel nastavení projektu.');
