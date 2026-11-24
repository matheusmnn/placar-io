import { useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { Campeonato } from '../lib/api';

interface Props {
  camp: Campeonato;
  passo: 'times' | 'rodadas';
  onIniciar: () => void;
}

// Trilha guiada de montagem. Aparece só enquanto o campeonato é rascunho;
// some assim que "Iniciar" muda o status pra EM_ANDAMENTO.
export function SetupTrilha({ camp, passo, onIniciar }: Props) {
  const navigate = useNavigate();
  if (camp.status !== 'NAO_INICIADO') return null;

  const timesDone = camp.qtdTimes >= 2;
  const rodadasDone = camp.temPartidas === true;

  return (
    <div className="border border-foreground mb-8 px-4 py-3.5">
      <div className="font-scoreboard text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
        Montagem do campeonato
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Passo
          n={1}
          label="Times"
          hint={timesDone ? `${camp.qtdTimes} inscritos` : 'inscreva ≥ 2'}
          aqui={passo === 'times'}
          feito={timesDone}
          onClick={() => navigate('/dashboard/times')}
        />
        <span className="h-px w-6 bg-border hidden sm:block" />
        <Passo
          n={2}
          label="Rodadas"
          hint={rodadasDone ? 'geradas' : 'gere os jogos'}
          aqui={passo === 'rodadas'}
          feito={rodadasDone}
          onClick={() => navigate('/dashboard/rodadas')}
        />
        <span className="h-px w-6 bg-border hidden sm:block" />
        <div className="flex items-center gap-2.5">
          <span className="font-scoreboard text-[11px] text-muted-foreground">3</span>
          <button
            type="button"
            onClick={onIniciar}
            disabled={!rodadasDone}
            title={rodadasDone ? undefined : 'Gere as rodadas primeiro'}
            className="font-scoreboard text-[11px] uppercase tracking-[0.14em] px-4 py-2.5 bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Iniciar campeonato
          </button>
        </div>
      </div>
    </div>
  );
}

function Passo({ n, label, hint, aqui, feito, onClick }: {
  n: number; label: string; hint: string; aqui: boolean; feito: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2.5 text-left">
      <span
        className={`h-6 w-6 shrink-0 flex items-center justify-center font-scoreboard text-[11px] border ${
          feito
            ? 'bg-brand text-brand-foreground border-brand'
            : aqui
              ? 'border-brand text-brand'
              : 'border-border text-muted-foreground'
        }`}
      >
        {feito ? <Check className="h-3.5 w-3.5" /> : n}
      </span>
      <span>
        <span className={`block font-display text-sm leading-none ${aqui ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
        <span className="block font-scoreboard text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground mt-1">{hint}</span>
      </span>
    </button>
  );
}
