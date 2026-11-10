// Migração: Time.campeonatoId/grupoId -> InscricaoCampeonato + Time.usuarioId.
// Idempotente: pode rodar várias vezes.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 1) Criar InscricaoCampeonato se não existir.
await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "InscricaoCampeonato" (
    "id" SERIAL PRIMARY KEY,
    "campeonatoId" INTEGER NOT NULL,
    "timeId" INTEGER NOT NULL,
    "grupoId" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InscricaoCampeonato_camp_time_uniq" UNIQUE ("campeonatoId", "timeId")
  );
`);
await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InscricaoCampeonato_campeonatoId_idx" ON "InscricaoCampeonato"("campeonatoId");`);
await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InscricaoCampeonato_timeId_idx" ON "InscricaoCampeonato"("timeId");`);

// 2) Garantir FKs.
await prisma.$executeRawUnsafe(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InscricaoCampeonato_campeonatoId_fkey') THEN
      ALTER TABLE "InscricaoCampeonato"
        ADD CONSTRAINT "InscricaoCampeonato_campeonatoId_fkey"
        FOREIGN KEY ("campeonatoId") REFERENCES "Campeonato"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InscricaoCampeonato_timeId_fkey') THEN
      ALTER TABLE "InscricaoCampeonato"
        ADD CONSTRAINT "InscricaoCampeonato_timeId_fkey"
        FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InscricaoCampeonato_grupoId_fkey') THEN
      ALTER TABLE "InscricaoCampeonato"
        ADD CONSTRAINT "InscricaoCampeonato_grupoId_fkey"
        FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL;
    END IF;
  END $$;
`);

// 3) Adicionar Time.usuarioId (nullable).
await prisma.$executeRawUnsafe(`ALTER TABLE "Time" ADD COLUMN IF NOT EXISTS "usuarioId" INTEGER;`);

// 4) Backfill Time.usuarioId a partir de Campeonato.usuarioId (via Time.campeonatoId antigo).
await prisma.$executeRawUnsafe(`
  UPDATE "Time" t
     SET "usuarioId" = c."usuarioId"
    FROM "Campeonato" c
   WHERE t."usuarioId" IS NULL
     AND t."campeonatoId" IS NOT NULL
     AND c.id = t."campeonatoId";
`);

// 5) Backfill InscricaoCampeonato a partir das colunas antigas.
await prisma.$executeRawUnsafe(`
  INSERT INTO "InscricaoCampeonato" ("campeonatoId", "timeId", "grupoId")
  SELECT t."campeonatoId", t.id, t."grupoId"
    FROM "Time" t
   WHERE t."campeonatoId" IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM "InscricaoCampeonato" i
        WHERE i."campeonatoId" = t."campeonatoId" AND i."timeId" = t.id
     );
`);

// 6) Tornar Time.usuarioId NOT NULL (só se todos estiverem preenchidos).
const semDono = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "Time" WHERE "usuarioId" IS NULL;`);
if (semDono[0].n === 0) {
  await prisma.$executeRawUnsafe(`ALTER TABLE "Time" ALTER COLUMN "usuarioId" SET NOT NULL;`);
} else {
  console.warn(`Ainda há ${semDono[0].n} times sem usuarioId — não aplicando NOT NULL ainda.`);
}

// 7) Adicionar FK Time -> Usuario.
await prisma.$executeRawUnsafe(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Time_usuarioId_fkey') THEN
      ALTER TABLE "Time"
        ADD CONSTRAINT "Time_usuarioId_fkey"
        FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE;
    END IF;
  END $$;
`);
await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Time_usuarioId_idx" ON "Time"("usuarioId");`);

// 8) Dropar colunas antigas de Time.
await prisma.$executeRawUnsafe(`
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Time_campeonatoId_fkey') THEN
      ALTER TABLE "Time" DROP CONSTRAINT "Time_campeonatoId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Time_grupoId_fkey') THEN
      ALTER TABLE "Time" DROP CONSTRAINT "Time_grupoId_fkey";
    END IF;
  END $$;
`);
await prisma.$executeRawUnsafe(`ALTER TABLE "Time" DROP COLUMN IF EXISTS "campeonatoId";`);
await prisma.$executeRawUnsafe(`ALTER TABLE "Time" DROP COLUMN IF EXISTS "grupoId";`);

const r = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "InscricaoCampeonato";`);
console.log(`✓ Migração concluída. Inscrições: ${r[0].n}.`);
await prisma.$disconnect();
