/**
 * Utilitário de feriados portugueses.
 * Inclui feriados nacionais fixos + feriados móveis (Páscoa, Sexta-feira Santa, Corpo de Deus).
 */

/**
 * Calcula a data da Páscoa para um dado ano usando o algoritmo de Meeus/Jones/Butcher.
 */
export function calcularPascoa(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Devolve um Set com as datas de todos os feriados nacionais portugueses num dado ano,
 * no formato 'YYYY-MM-DD'.
 *
 * Feriados fixos (10):
 *   01-01 Ano Novo, 25-04 Dia da Liberdade, 01-05 Dia do Trabalhador,
 *   10-06 Dia de Portugal, 15-08 Assunção, 05-10 Implantação da República,
 *   01-11 Todos os Santos, 01-12 Restauração, 08-12 Imaculada Conceição, 25-12 Natal
 *
 * Feriados móveis (3):
 *   Sexta-feira Santa (Páscoa − 2), Domingo de Páscoa, Corpo de Deus (Páscoa + 60)
 */
export function getFeriadosPortugal(year: number): Set<string> {
  const pascoa = calcularPascoa(year);

  const fixos = [
    `${year}-01-01`,
    `${year}-04-25`,
    `${year}-05-01`,
    `${year}-06-10`,
    `${year}-08-15`,
    `${year}-10-05`,
    `${year}-11-01`,
    `${year}-12-01`,
    `${year}-12-08`,
    `${year}-12-25`,
  ];

  const moveis = [
    toKey(addDays(pascoa, -2)), // Sexta-feira Santa
    toKey(pascoa),              // Domingo de Páscoa
    toKey(addDays(pascoa, 60)), // Corpo de Deus
  ];

  return new Set([...fixos, ...moveis]);
}

/**
 * Verifica se uma data é dia útil (não é fim-de-semana nem feriado).
 */
export function isDiaUtil(d: Date, feriados: Set<string>): boolean {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  return !feriados.has(toKey(d));
}

export interface DiasUteisInfo {
  /** Total de dias úteis no mês */
  total: number;
  /** Dias úteis já passados (incluindo hoje) */
  passados: number;
  /** Dias úteis restantes (excluindo hoje) */
  restantes: number;
}

/**
 * Conta os dias úteis de um mês, separando passados e restantes.
 * @param year  Ano completo (ex. 2025)
 * @param month Mês de 0 a 11 (igual a Date.getMonth())
 */
export function diasUteisMes(year: number, month: number): DiasUteisInfo {
  const feriados = getFeriadosPortugal(year);
  const today = new Date();
  const todayDay = (today.getFullYear() === year && today.getMonth() === month)
    ? today.getDate()
    : null;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let total = 0;
  let passados = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    if (isDiaUtil(d, feriados)) {
      total++;
      // "passados" inclui o próprio dia de hoje
      if (todayDay !== null && day <= todayDay) passados++;
    }
  }

  return { total, passados, restantes: total - passados };
}
