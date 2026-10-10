// Cálculos compartilhados das cobranças de locação de AASI.
// Usado por salvarLocacao e gerarCobrancasLocacao.

export function periodFromDate(dateStr) {
  return (dateStr || '').slice(0, 7);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Vencimento da parcela de um período (YYYY-MM) respeitando o dia escolhido
// e sem antecipar o início da locação.
export function dueDateForPeriod(period, dueDay, startDate) {
  const [yearStr, monthStr] = (period || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return startDate || todayISO();

  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(Number(dueDay) || 1, 1), lastDay);
  const due = `${yearStr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  if (startDate && due < startDate) return startDate;
  return due;
}

// Períodos mensais do início até o mês atual (ou até o fim do prazo definido).
export function periodsFromStartToNow(startDate, endDate, referenceDate, termType) {
  if (!startDate) return [];

  const [startYear, startMonth] = startDate.split('-').map(Number);
  if (!startYear || !startMonth) return [];

  const limitPeriod = periodFromDate(referenceDate || todayISO());
  const endPeriod = termType === 'indeterminado' ? null : periodFromDate(endDate);

  const periods = [];
  let year = startYear;
  let month = startMonth;
  let guard = 0;

  while (guard < 600) {
    guard++;
    const period = `${year}-${String(month).padStart(2, '0')}`;
    if (period > limitPeriod) break;
    if (endPeriod && period > endPeriod) break;
    periods.push(period);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return periods;
}