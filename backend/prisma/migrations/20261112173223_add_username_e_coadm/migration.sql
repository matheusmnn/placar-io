-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "CampeonatoAdmin" (
    "id" SERIAL NOT NULL,
    "campeonatoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "permissoes" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampeonatoAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- CreateIndex
CREATE INDEX "CampeonatoAdmin_usuarioId_idx" ON "CampeonatoAdmin"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "CampeonatoAdmin_campeonatoId_usuarioId_key" ON "CampeonatoAdmin"("campeonatoId", "usuarioId");

-- AddForeignKey
ALTER TABLE "CampeonatoAdmin" ADD CONSTRAINT "CampeonatoAdmin_campeonatoId_fkey" FOREIGN KEY ("campeonatoId") REFERENCES "Campeonato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampeonatoAdmin" ADD CONSTRAINT "CampeonatoAdmin_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
