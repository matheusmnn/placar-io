export const BYE = -1;

export function pontosCorridos(n, idaVolta) {
  const arr = Array.from({ length: n }, (_, i) => i);
  if (arr.length % 2 !== 0) arr.push(BYE);

  const m = arr.length;
  const rodadas = m - 1;
  const metade = m / 2;
  const turno = [];

  for (let r = 0; r < rodadas; r++) {
    for (let i = 0; i < metade; i++) {
      let mandante = arr[i];
      let visitante = arr[m - 1 - i];
      if (mandante === BYE || visitante === BYE) continue;
      if (r % 2 === 1) [mandante, visitante] = [visitante, mandante];
      turno.push({ rodada: r + 1, mandante, visitante });
    }
    const ultimo = arr.pop();
    arr.splice(1, 0, ultimo);
  }

  const resultado = [...turno];
  if (idaVolta) {
    for (const c of turno) {
      resultado.push({ rodada: c.rodada + rodadas, mandante: c.visitante, visitante: c.mandante });
    }
  }
  return resultado;
}

export function proximaPotenciaDeDois(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function mataMataPrimeiraFase(n) {
  const size = proximaPotenciaDeDois(n);
  const seeds = Array.from({ length: size }, (_, i) => (i < n ? i : BYE));
  const pares = [];
  for (let i = 0; i < size / 2; i++) {
    pares.push({ ordem: i, mandante: seeds[i], visitante: seeds[size - 1 - i] });
  }
  return pares;
}

export function faseLabel(timesNaFase) {
  switch (timesNaFase) {
    case 1:
    case 2:
      return 'Final';
    case 4:
      return 'Semifinal';
    case 8:
      return 'Quartas';
    case 16:
      return 'Oitavas';
    default:
      return `${Math.floor(timesNaFase / 2)}-avos`;
  }
}
