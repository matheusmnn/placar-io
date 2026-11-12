import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  temPermissaoCampeonato,
  normalizarPermissoes,
  permissoesTudoMarcado,
  ESCOPOS_COADM,
  podeSerConvidado,
  podeEditarPermissoesDe,
} from './permissoes.js';

const DONO = { id: 1, isSuperAdmin: false };
const OUTRO = { id: 2, isSuperAdmin: false };
const SUPER = { id: 99, isSuperAdmin: true };
const CAMP = { usuarioId: 1 };

test('dono do campeonato tem todos os escopos', () => {
  for (const escopo of ESCOPOS_COADM) {
    assert.equal(temPermissaoCampeonato(CAMP, null, DONO, escopo), true);
  }
});

test('super admin tem todos os escopos mesmo sem adminRow', () => {
  for (const escopo of ESCOPOS_COADM) {
    assert.equal(temPermissaoCampeonato(CAMP, null, SUPER, escopo), true);
  }
});

test('usuário sem adminRow não tem permissão', () => {
  assert.equal(temPermissaoCampeonato(CAMP, null, OUTRO, 'gerenciar'), false);
});

test('co-adm só tem os escopos marcados como true', () => {
  const adminRow = {
    permissoes: {
      gerenciar: true, elenco: false, calendario: true,
      sumula: false, coAdms: false, excluir: false,
    },
  };
  assert.equal(temPermissaoCampeonato(CAMP, adminRow, OUTRO, 'gerenciar'), true);
  assert.equal(temPermissaoCampeonato(CAMP, adminRow, OUTRO, 'calendario'), true);
  assert.equal(temPermissaoCampeonato(CAMP, adminRow, OUTRO, 'elenco'), false);
  assert.equal(temPermissaoCampeonato(CAMP, adminRow, OUTRO, 'excluir'), false);
});

test('normalizarPermissoes zera chaves ausentes, ignora extras e só aceita true literal', () => {
  const p = normalizarPermissoes({ gerenciar: true, elenco: 'sim', extra: true });
  assert.deepEqual(p, {
    gerenciar: true, elenco: false, calendario: false,
    sumula: false, coAdms: false, excluir: false,
  });
});

test('permissoesTudoMarcado liga tudo', () => {
  assert.deepEqual(permissoesTudoMarcado(), {
    gerenciar: true, elenco: true, calendario: true,
    sumula: true, coAdms: true, excluir: true,
  });
});

test('podeSerConvidado rejeita o próprio dono', () => {
  assert.deepEqual(
    podeSerConvidado({ usuarioId: 1 }, { id: 1 }, null),
    { ok: false, motivo: 'eh-o-dono' },
  );
});

test('podeSerConvidado rejeita quem já é co-adm', () => {
  assert.deepEqual(
    podeSerConvidado({ usuarioId: 1 }, { id: 2 }, { usuarioId: 2 }),
    { ok: false, motivo: 'ja-eh-co-adm' },
  );
});

test('podeSerConvidado aceita usuário novo', () => {
  assert.deepEqual(
    podeSerConvidado({ usuarioId: 1 }, { id: 2 }, null),
    { ok: true },
  );
});

test('podeEditarPermissoesDe bloqueia auto-edição', () => {
  assert.equal(podeEditarPermissoesDe({ id: 2 }, 2), false);
});

test('podeEditarPermissoesDe permite editar outros', () => {
  assert.equal(podeEditarPermissoesDe({ id: 2 }, 3), true);
});
