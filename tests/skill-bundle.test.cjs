const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skill = path.join(root, '.agents', 'skills', 'construir-loja-completa');

test('skill completa incluída no repositório e referências locais resolvidas', () => {
  const manifest = fs.readFileSync(path.join(skill, 'SKILL.md'), 'utf8');
  assert.match(manifest, /^---\r?\nname: construir-loja-completa\r?\ndescription: .+\r?\n---/);
  for (const file of ['references/briefing.md', 'references/fluxos.md', 'references/implementacao.md',
    'references/integracoes.md', 'references/memoria-decisoes.md', 'references/prompt-inicial.md',
    'references/testes-publicacao.md', 'scripts/loja.py', 'scripts/test_loja.py', 'assets/estado-inicial.json']) {
    assert.ok(fs.statSync(path.join(skill, file)).isFile(), `skill file missing: ${file}`);
  }
  const localLinks = [...manifest.matchAll(/\]\((references\/[^)#]+\.md)\)/g)].map(match => match[1]);
  assert.ok(localLinks.length > 0, 'SKILL.md must reference bundled guidance');
  for (const file of localLinks) assert.ok(fs.existsSync(path.join(skill, file)), `broken skill reference: ${file}`);
});

test('configuração embutida preserva produto e taxa-base autorizados', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'loja.config.json'), 'utf8'));
  assert.equal(config.produto.nome, 'Escova Modeladora GOKOCO');
  assert.equal(config.produto.precoCentavos, 3790);
  assert.equal(config.oferta.taxaReentregaCentavos, 1000);
  assert.equal(config.identidade.logo, '/assets/logo-tiktok-shop.png');
  assert.equal(config.conteudo.usarFeedbacksDaMatriz, true);
  assert.equal(config.conteudo.usarVideosDaMatriz, true);
  for (const variant of config.produto.variantes) {
    const asset = path.join(root, 'dist', variant.imagem.replace(/^\//, ''));
    assert.ok(fs.existsSync(asset), `missing variant image ${variant.imagem}`);
  }
});
