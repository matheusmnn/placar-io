import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusAoFechar } from './partida.js';

test('statusAoFechar: tudo concluído encerra', () => {
  assert.equal(statusAoFechar('EM_ANDAMENTO', true), 'ENCERRADO');
  assert.equal(statusAoFechar('NAO_INICIADO', true), 'ENCERRADO');
});
test('statusAoFechar: rascunho não vira em andamento sozinho', () => {
  assert.equal(statusAoFechar('NAO_INICIADO', false), 'NAO_INICIADO');
});
test('statusAoFechar: desfazer resultado reabre de encerrado', () => {
  assert.equal(statusAoFechar('ENCERRADO', false), 'EM_ANDAMENTO');
});
test('statusAoFechar: em andamento segue em andamento', () => {
  assert.equal(statusAoFechar('EM_ANDAMENTO', false), 'EM_ANDAMENTO');
});
