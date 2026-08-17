#!/usr/bin/env node
// Spusť lokálně: node scripts/hash-password.js
// Vypsaný řetězec vlož do Vercel env var ADMIN_PASSWORD_HASH.
// Heslo se nikam neposílá, počítá se jen na tvém počítači.

const readline = require('readline');
const { hashPassword } = require('../api/_lib/auth');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Zvol admin heslo: ', (password) => {
  rl.close();
  if (!password || password.length < 8) {
    console.error('Heslo musí mít alespoň 8 znaků.');
    process.exit(1);
  }
  console.log('\nADMIN_PASSWORD_HASH=' + hashPassword(password));
  console.log('\nToto vlož jako hodnotu env var ADMIN_PASSWORD_HASH ve Vercel nastavení projektu.');
});
