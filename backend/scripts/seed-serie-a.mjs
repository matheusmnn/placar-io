// Seed de exemplo: cria um campeonato "Brasileirão Série A" com 20 clubes
// para o usuário informado em EMAIL (ou --email).
//
// uso: EMAIL=voce@email.com node scripts/seed-serie-a.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const email =
  process.env.EMAIL ??
  (() => {
    const i = process.argv.indexOf('--email');
    return i >= 0 ? process.argv[i + 1] : null;
  })();

if (!email) {
  console.error('Informe o e-mail: EMAIL=voce@email.com node scripts/seed-serie-a.mjs');
  process.exit(1);
}

const CLUBES = [
  { nome: 'Flamengo',      cidade: 'Rio de Janeiro',   abreviacao: 'FLA', cor: '#e30613' },
  { nome: 'Palmeiras',     cidade: 'São Paulo',        abreviacao: 'PAL', cor: '#006437' },
  { nome: 'Fluminense',    cidade: 'Rio de Janeiro',   abreviacao: 'FLU', cor: '#870a28' },
  { nome: 'Atlético-MG',   cidade: 'Belo Horizonte',   abreviacao: 'CAM', cor: '#111111' },
  { nome: 'Botafogo',      cidade: 'Rio de Janeiro',   abreviacao: 'BOT', cor: '#1a1a1a' },
  { nome: 'Corinthians',   cidade: 'São Paulo',        abreviacao: 'COR', cor: '#141414' },
  { nome: 'São Paulo',     cidade: 'São Paulo',        abreviacao: 'SAO', cor: '#c8102e' },
  { nome: 'Internacional', cidade: 'Porto Alegre',     abreviacao: 'INT', cor: '#b81414' },
  { nome: 'Grêmio',        cidade: 'Porto Alegre',     abreviacao: 'GRE', cor: '#0d2b6e' },
  { nome: 'Cruzeiro',      cidade: 'Belo Horizonte',   abreviacao: 'CRU', cor: '#003f87' },
  { nome: 'Bahia',         cidade: 'Salvador',         abreviacao: 'BAH', cor: '#0057a5' },
  { nome: 'Vasco',         cidade: 'Rio de Janeiro',   abreviacao: 'VAS', cor: '#0a0a0a' },
  { nome: 'Fortaleza',     cidade: 'Fortaleza',        abreviacao: 'FOR', cor: '#1b3a8a' },
  { nome: 'Athletico-PR',  cidade: 'Curitiba',         abreviacao: 'CAP', cor: '#c8102e' },
  { nome: 'Juventude',     cidade: 'Caxias do Sul',    abreviacao: 'JUV', cor: '#006437' },
  { nome: 'Vitória',       cidade: 'Salvador',         abreviacao: 'VIT', cor: '#b81414' },
  { nome: 'Cuiabá',        cidade: 'Cuiabá',           abreviacao: 'CUI', cor: '#b8860b' },
  { nome: 'Criciúma',      cidade: 'Criciúma',         abreviacao: 'CRI', cor: '#d4b200' },
  { nome: 'Atlético-GO',   cidade: 'Goiânia',          abreviacao: 'ACG', cor: '#b81414' },
  { nome: 'Bragantino',    cidade: 'Bragança Paulista',abreviacao: 'RBB', cor: '#d82a2a' },
];

const usuario = await prisma.usuario.findUnique({ where: { email } });
if (!usuario) {
  console.error(`Usuário com e-mail ${email} não existe. Cadastre pelo app primeiro.`);
  process.exit(1);
}

const nomeCampeonato = 'Brasileirão Série A 2026';

const existente = await prisma.campeonato.findFirst({
  where: { usuarioId: usuario.id, nome: nomeCampeonato },
});
if (existente) {
  console.error(`Campeonato "${nomeCampeonato}" já existe (id ${existente.id}). Apague pelo app se quiser recriar.`);
  process.exit(1);
}

const faixasTabela = [
  { cor: '#2563eb', posInicio: 1, posFim: 4,  legenda: 'Libertadores (fase de grupos)' },
  { cor: '#059669', posInicio: 5, posFim: 6,  legenda: 'Pré-Libertadores' },
  { cor: '#d97706', posInicio: 7, posFim: 12, legenda: 'Sul-Americana' },
  { cor: '#dc2626', posInicio: 17, posFim: 20, legenda: 'Rebaixamento' },
];

const campeonato = await prisma.campeonato.create({
  data: {
    usuarioId: usuario.id,
    nome: nomeCampeonato,
    formato: 'PONTOS_CORRIDOS',
    idaVolta: true,
    faixasTabela,
  },
});

// Cria os clubes como times globais do usuário (reaproveitáveis entre ligas)
// e inscreve cada um neste campeonato.
for (const clube of CLUBES) {
  const t = await prisma.time.upsert({
    where: { id: -1 }, // força create
    update: {},
    create: { ...clube, usuarioId: usuario.id },
  }).catch(() => prisma.time.create({ data: { ...clube, usuarioId: usuario.id } }));
  await prisma.inscricaoCampeonato.create({
    data: { campeonatoId: campeonato.id, timeId: t.id },
  });
}

console.log(`✓ Campeonato "${campeonato.nome}" criado (id ${campeonato.id}) com ${CLUBES.length} clubes inscritos.`);
console.log('  Abre o app, seleciona esse campeonato no painel e vai em Rodadas → Gerar rodadas para montar a tabela.');

await prisma.$disconnect();
