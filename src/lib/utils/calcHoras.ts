export function calcTotalHoras(entrada: string, saida: string): number {
  const [eh, em] = entrada.split(':').map(Number);
  const [sh, sm] = saida.split(':').map(Number);

  const entradaMin = eh * 60 + em;
  const saidaMin = sh * 60 + sm;

  const diffMin = saidaMin >= entradaMin
    ? saidaMin - entradaMin
    : (24 * 60 - entradaMin) + saidaMin;

  return Math.round((diffMin / 60) * 100) / 100;
}

export function formatHoras(horas: number): string {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}
