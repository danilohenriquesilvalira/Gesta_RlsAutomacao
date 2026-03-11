import ExcelJS from 'exceljs';
import type { Apontamento, Despesa, Deposito, Profile } from '@/types';

// ── palette ─────────────────────────────────────────────────────────────────
const C = {
  navyFg:   'FFFFFFFF',
  navyBg:   'FF0F2147',
  emerBg:   'FF065F46',
  amberBg:  'FF92400E',
  blueBg:   'FF1E3A5F',
  purpleBg: 'FF4C1D95',
  headerBg: 'FFE8EDF5',
  headerFg: 'FF0F2147',
  altRow:   'FFF8FAFC',
  white:    'FFFFFFFF',
  border:   'FFD1D9E6',
  green:    'FF065F46',
  amber:    'FF78350F',
  red:      'FF7F1D1D',
  approvedBg: 'FFD1FAE5',
  pendentBg:  'FFFEF3C7',
  rejectedBg: 'FFFEE2E2',
};

function styleHeader(row: ExcelJS.Row, bgHex: string, fgHex = 'FFFFFFFF') {
  row.height = 26;
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: fgHex } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgHex } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.border = {
      bottom: { style: 'thin', color: { argb: C.border } },
    };
  });
}

function styleDataRow(row: ExcelJS.Row, alt: boolean) {
  row.height = 18;
  row.eachCell((cell) => {
    cell.font = { size: 9 };
    if (alt) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.altRow } };
    cell.border = {
      bottom: { style: 'hair', color: { argb: C.border } },
    };
  });
}

function applyStatusFill(cell: ExcelJS.Cell, status: string) {
  const map: Record<string, string> = {
    aprovado: C.approvedBg, aprovada: C.approvedBg,
    pendente: C.pendentBg,
    rejeitado: C.rejectedBg, rejeitada: C.rejectedBg,
  };
  const bg = map[status];
  if (bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
}

function addSummaryTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string, cols: number) {
  // Row 1: big title merged
  sheet.addRow([title]);
  sheet.mergeCells(1, 1, 1, cols);
  const r1 = sheet.getRow(1);
  r1.height = 32;
  r1.getCell(1).font = { bold: true, size: 14, color: { argb: C.navyFg } };
  r1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyBg } };
  r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 2: subtitle + date
  sheet.addRow([subtitle, '', '', '', `Gerado em: ${new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` ]);
  sheet.mergeCells(2, 1, 2, cols - 1);
  sheet.mergeCells(2, cols, 2, cols);
  const r2 = sheet.getRow(2);
  r2.height = 18;
  r2.eachCell((c) => {
    c.font = { size: 9, italic: true, color: { argb: 'FF6B7280' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  });
  r2.getCell(cols).alignment = { horizontal: 'right' };

  // blank spacer
  sheet.addRow([]);
  sheet.getRow(3).height = 6;
}

function fmtH(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}
function eur(n: number) {
  return Number(n).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// ── Main export ──────────────────────────────────────────────────────────────
export async function generateExcel(
  apontamentos: Apontamento[],
  despesas: Despesa[] = [],
  depositos: Deposito[] = [],
  tecnicos: Profile[] = [],
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RLS Automação';
  workbook.created = new Date();

  // ════════════════════════════════════════════════════════════════════════════
  // FOLHA 1 — RESUMO POR TÉCNICO
  // ════════════════════════════════════════════════════════════════════════════
  {
    const sheet = workbook.addWorksheet('Resumo por Técnico', {
      headerFooter: { oddHeader: '&LRela\u00f3rio RLS &R&D' },
    });
    const cols = 10;
    addSummaryTitle(sheet, 'RLS Automação — Resumo por Técnico', 'Consolidado de horas, despesas e saldo financeiro', cols);

    sheet.columns = [
      { key: 'nome',       width: 26 },
      { key: 'apt_total',  width: 12 },
      { key: 'apt_aprov',  width: 12 },
      { key: 'h_normais',  width: 14 },
      { key: 'h_extra50',  width: 14 },
      { key: 'h_extra100', width: 14 },
      { key: 'h_total',    width: 12 },
      { key: 'desp',       width: 15 },
      { key: 'dep',        width: 15 },
      { key: 'saldo',      width: 15 },
    ];

    const hRow = sheet.addRow(['Técnico', 'Registos', 'Aprovados', 'Horas Norm.', 'Horas +50%', 'Horas +100%', 'Total Horas', 'Despesas (€)', 'Depósitos (€)', 'Saldo (€)']);
    styleHeader(hRow, C.navyBg);

    // Collect all known tecnico IDs
    const tecIds = Array.from(new Set([
      ...apontamentos.map((a) => a.tecnico_id),
      ...despesas.map((d) => d.tecnico_id),
      ...depositos.map((d) => d.tecnico_id),
      ...tecnicos.map((t) => t.id),
    ]));

    tecIds.forEach((tid, i) => {
      const tec = tecnicos.find((t) => t.id === tid)
        ?? apontamentos.find((a) => a.tecnico_id === tid)?.tecnico
        ?? despesas.find((d) => d.tecnico_id === tid)?.tecnico;
      const nome = tec?.full_name ?? tid;

      const apts = apontamentos.filter((a) => a.tecnico_id === tid);
      const aprov = apts.filter((a) => a.status === 'aprovado');
      const hNorm   = aprov.filter((a) => a.tipo_hora === 'normal').reduce((s, a) => s + (a.total_horas ?? 0), 0);
      const hE50    = aprov.filter((a) => a.tipo_hora === 'extra_50').reduce((s, a) => s + (a.total_horas ?? 0), 0);
      const hE100   = aprov.filter((a) => a.tipo_hora === 'extra_100').reduce((s, a) => s + (a.total_horas ?? 0), 0);
      const hTotal  = hNorm + hE50 + hE100;

      const despTotal = despesas
        .filter((d) => d.tecnico_id === tid && d.status === 'aprovada')
        .reduce((s, d) => s + Number(d.valor), 0);
      const depTotal = depositos
        .filter((d) => d.tecnico_id === tid)
        .reduce((s, d) => s + Number(d.valor), 0);
      const saldo = depTotal - despTotal;

      const row = sheet.addRow([
        nome,
        apts.length,
        aprov.length,
        fmtH(hNorm),
        fmtH(hE50),
        fmtH(hE100),
        fmtH(hTotal),
        eur(despTotal),
        eur(depTotal),
        eur(saldo),
      ]);
      styleDataRow(row, i % 2 === 1);
      row.getCell(1).font = { bold: true, size: 9 };
      // Color saldo cell
      const saldoCell = row.getCell(10);
      saldoCell.font = { bold: true, size: 9, color: { argb: saldo < 0 ? 'FF991B1B' : saldo < 50 ? 'FF92400E' : 'FF065F46' } };
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FOLHA 2 — APONTAMENTOS DETALHADOS
  // ════════════════════════════════════════════════════════════════════════════
  {
    const sheet = workbook.addWorksheet('Apontamentos');
    const cols = 13;
    addSummaryTitle(sheet, 'Apontamentos — Detalhe Completo', 'Registo de horas por técnico e obra', cols);

    sheet.columns = [
      { key: 'data',       width: 13 },
      { key: 'tecnico',    width: 24 },
      { key: 'cod_obra',   width: 11 },
      { key: 'obra',       width: 28 },
      { key: 'cliente',    width: 20 },
      { key: 'servico',    width: 24 },
      { key: 'tipo_hora',  width: 13 },
      { key: 'entrada',    width: 9 },
      { key: 'saida',      width: 9 },
      { key: 'horas',      width: 10 },
      { key: 'status',     width: 12 },
      { key: 'nota',       width: 22 },
      { key: 'descricao',  width: 38 },
    ];

    const hRow = sheet.addRow(['Data', 'Técnico', 'Cód. Obra', 'Obra', 'Cliente', 'Serviço', 'Tipo Hora', 'Entrada', 'Saída', 'Total Horas', 'Estado', 'Nota Rejeição', 'Descrição']);
    styleHeader(hRow, C.navyBg);

    const sorted = [...apontamentos].sort((a, b) =>
      b.data_apontamento.localeCompare(a.data_apontamento) || (a.tecnico?.full_name ?? '').localeCompare(b.tecnico?.full_name ?? '')
    );

    sorted.forEach((a, i) => {
      const tipoHoraLabel = a.tipo_hora === 'normal' ? 'Normal' : a.tipo_hora === 'extra_50' ? 'Extra +50%' : 'Extra +100%';
      const statusLabel = a.status === 'aprovado' ? 'Aprovado' : a.status === 'pendente' ? 'Pendente' : 'Rejeitado';
      const row = sheet.addRow([
        a.data_apontamento,
        a.tecnico?.full_name ?? '',
        a.obra?.codigo ?? '—',
        a.obra?.nome ?? '(Oficina)',
        a.obra?.cliente ?? '—',
        a.tipo_servico,
        tipoHoraLabel,
        a.hora_entrada?.slice(0, 5) ?? '',
        a.hora_saida?.slice(0, 5) ?? '',
        a.total_horas ?? 0,
        statusLabel,
        a.nota_rejeicao ?? '',
        a.descricao ?? '',
      ]);
      styleDataRow(row, i % 2 === 1);
      applyStatusFill(row.getCell(11), a.status);
      row.getCell(11).font = { bold: true, size: 9 };
      row.getCell(11).alignment = { horizontal: 'center' };

      // Bold horas
      row.getCell(10).font = { bold: true, size: 9 };
      row.getCell(10).alignment = { horizontal: 'right' };
    });

    // Totals row
    const aprov = apontamentos.filter((a) => a.status === 'aprovado');
    const totalH = aprov.reduce((s, a) => s + (a.total_horas ?? 0), 0);
    const totRow = sheet.addRow(['', '', '', '', '', '', '', '', 'TOTAL:', fmtH(totalH), '', '', '']);
    totRow.height = 20;
    totRow.eachCell((c) => { c.font = { bold: true, size: 9, color: { argb: C.navyFg } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyBg } }; });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FOLHA 3 — DESPESAS DETALHADAS
  // ════════════════════════════════════════════════════════════════════════════
  {
    const sheet = workbook.addWorksheet('Despesas');
    const cols = 12;
    addSummaryTitle(sheet, 'Despesas — Detalhe Completo', 'Registo de despesas e reembolsos por técnico', cols);

    sheet.columns = [
      { key: 'data',        width: 13 },
      { key: 'tecnico',     width: 24 },
      { key: 'cod_obra',    width: 11 },
      { key: 'obra',        width: 28 },
      { key: 'cliente',     width: 20 },
      { key: 'tipo',        width: 16 },
      { key: 'valor',       width: 13 },
      { key: 'status',      width: 12 },
      { key: 'participantes', width: 26 },
      { key: 'nota',        width: 22 },
      { key: 'descricao',   width: 38 },
      { key: 'recibos',     width: 10 },
    ];

    const hRow = sheet.addRow(['Data', 'Técnico', 'Cód. Obra', 'Obra', 'Cliente', 'Tipo', 'Valor (€)', 'Estado', 'Outros Beneficiários', 'Nota Rejeição', 'Descrição', 'Recibos']);
    styleHeader(hRow, C.amberBg);

    const sorted = [...despesas].sort((a, b) =>
      b.data_despesa.localeCompare(a.data_despesa) || (a.tecnico?.full_name ?? '').localeCompare(b.tecnico?.full_name ?? '')
    );

    sorted.forEach((d, i) => {
      const statusLabel = d.status === 'aprovada' ? 'Aprovada' : d.status === 'pendente' ? 'Pendente' : 'Rejeitada';
      const participantes = d.despesa_participantes?.map((p) => p.tecnico.full_name).join(', ') ?? '';
      const row = sheet.addRow([
        d.data_despesa,
        d.tecnico?.full_name ?? '',
        d.obra?.codigo ?? '—',
        d.obra?.nome ?? '(Oficina / Geral)',
        d.obra?.cliente ?? '—',
        d.tipo_despesa.charAt(0).toUpperCase() + d.tipo_despesa.slice(1),
        Number(d.valor),
        statusLabel,
        participantes,
        d.nota_rejeicao ?? '',
        d.descricao ?? '',
        d.recibos?.length ?? 0,
      ]);
      styleDataRow(row, i % 2 === 1);
      applyStatusFill(row.getCell(8), d.status);
      row.getCell(8).font = { bold: true, size: 9 };
      row.getCell(8).alignment = { horizontal: 'center' };

      // Format currency
      const valCell = row.getCell(7);
      valCell.numFmt = '#,##0.00 €';
      valCell.font = { bold: true, size: 9 };
      valCell.alignment = { horizontal: 'right' };
    });

    // Totals
    const totalAprov = despesas.filter((d) => d.status === 'aprovada').reduce((s, d) => s + Number(d.valor), 0);
    const totalPend  = despesas.filter((d) => d.status === 'pendente').reduce((s, d) => s + Number(d.valor), 0);
    sheet.addRow([]);
    const t1 = sheet.addRow(['', '', '', '', '', 'Total Aprovado:', totalAprov, '', '', '', '', '']);
    const t2 = sheet.addRow(['', '', '', '', '', 'Total Pendente:', totalPend, '', '', '', '', '']);
    [t1, t2].forEach((r) => {
      r.getCell(6).font = { bold: true, size: 9 };
      r.getCell(7).numFmt = '#,##0.00 €';
      r.getCell(7).font = { bold: true, size: 9, color: { argb: C.navyFg } };
      r.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyBg } };
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FOLHA 4 — DEPÓSITOS / SALDO FINANCEIRO
  // ════════════════════════════════════════════════════════════════════════════
  {
    const sheet = workbook.addWorksheet('Depósitos');
    const cols = 7;
    addSummaryTitle(sheet, 'Depósitos & Saldo Financeiro', 'Adiantamentos e saldo por técnico', cols);

    sheet.columns = [
      { key: 'data',     width: 13 },
      { key: 'tecnico',  width: 24 },
      { key: 'valor',    width: 14 },
      { key: 'descricao', width: 40 },
      { key: 'desp_acum', width: 16 },
      { key: 'dep_acum',  width: 16 },
      { key: 'saldo',     width: 15 },
    ];

    const hRow = sheet.addRow(['Data', 'Técnico', 'Valor (€)', 'Descrição', 'Despesas Acum. (€)', 'Depósitos Acum. (€)', 'Saldo (€)']);
    styleHeader(hRow, C.emerBg);

    const sorted = [...depositos].sort((a, b) =>
      b.data_deposito.localeCompare(a.data_deposito)
    );

    sorted.forEach((d, i) => {
      const tec = tecnicos.find((t) => t.id === d.tecnico_id) ?? d.tecnico;
      const despTec = despesas.filter((x) => x.tecnico_id === d.tecnico_id && x.status === 'aprovada').reduce((s, x) => s + Number(x.valor), 0);
      const depTec  = depositos.filter((x) => x.tecnico_id === d.tecnico_id).reduce((s, x) => s + Number(x.valor), 0);
      const saldo   = depTec - despTec;

      const row = sheet.addRow([
        d.data_deposito,
        tec?.full_name ?? d.tecnico_id,
        Number(d.valor),
        d.descricao ?? '',
        despTec,
        depTec,
        saldo,
      ]);
      styleDataRow(row, i % 2 === 1);

      row.getCell(3).numFmt = '#,##0.00 €';
      row.getCell(3).font = { bold: true, size: 9, color: { argb: '00065F46' } };
      row.getCell(5).numFmt = '#,##0.00 €';
      row.getCell(6).numFmt = '#,##0.00 €';
      const saldoCell = row.getCell(7);
      saldoCell.numFmt = '#,##0.00 €';
      saldoCell.font = { bold: true, size: 9, color: { argb: saldo < 0 ? 'FF991B1B' : saldo < 50 ? 'FF92400E' : 'FF065F46' } };
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FOLHA 5 — RESUMO POR OBRA
  // ════════════════════════════════════════════════════════════════════════════
  {
    const sheet = workbook.addWorksheet('Resumo por Obra');
    const cols = 9;
    addSummaryTitle(sheet, 'Resumo por Obra', 'Horas, despesas e técnicos envolvidos por obra', cols);

    sheet.columns = [
      { key: 'codigo',    width: 12 },
      { key: 'nome',      width: 30 },
      { key: 'cliente',   width: 20 },
      { key: 'status',    width: 12 },
      { key: 'tecnicos',  width: 28 },
      { key: 'apt_count', width: 12 },
      { key: 'h_total',   width: 12 },
      { key: 'desp_aprov', width: 16 },
      { key: 'desp_pend',  width: 16 },
    ];

    const hRow = sheet.addRow(['Cód.', 'Obra', 'Cliente', 'Estado', 'Técnicos Envolvidos', 'Apontamentos', 'Total Horas', 'Despesas Aprov. (€)', 'Despesas Pend. (€)']);
    styleHeader(hRow, C.blueBg);

    // Group by obra
    const obraIds = Array.from(new Set([
      ...apontamentos.filter((a) => a.obra_id).map((a) => a.obra_id!),
      ...despesas.filter((d) => d.obra_id).map((d) => d.obra_id!),
    ]));
    // Add "Sem obra" group
    const allGroups = [...obraIds, '__sem_obra__'];

    allGroups.forEach((oid, i) => {
      const isSemObra = oid === '__sem_obra__';
      const obraRef = isSemObra ? null
        : (apontamentos.find((a) => a.obra_id === oid)?.obra
          ?? despesas.find((d) => d.obra_id === oid)?.obra);

      const apts = isSemObra
        ? apontamentos.filter((a) => !a.obra_id)
        : apontamentos.filter((a) => a.obra_id === oid);
      const desps = isSemObra
        ? despesas.filter((d) => !d.obra_id)
        : despesas.filter((d) => d.obra_id === oid);

      if (apts.length === 0 && desps.length === 0) return;

      const aprov = apts.filter((a) => a.status === 'aprovado');
      const hTotal = aprov.reduce((s, a) => s + (a.total_horas ?? 0), 0);
      const despAprov = desps.filter((d) => d.status === 'aprovada').reduce((s, d) => s + Number(d.valor), 0);
      const despPend  = desps.filter((d) => d.status === 'pendente').reduce((s, d) => s + Number(d.valor), 0);

      // Unique technicians (by name)
      const tecSet = new Set([
        ...apts.map((a) => a.tecnico?.full_name ?? ''),
        ...desps.map((d) => d.tecnico?.full_name ?? ''),
      ]);
      tecSet.delete('');
      const tecnicos = Array.from(tecSet).join(', ');

      const row = sheet.addRow([
        obraRef?.codigo ?? '—',
        isSemObra ? '(Oficina / Sem Obra)' : (obraRef?.nome ?? '—'),
        obraRef?.cliente ?? '—',
        obraRef?.status ? obraRef.status.charAt(0).toUpperCase() + obraRef.status.slice(1) : '—',
        tecnicos,
        apts.length,
        fmtH(hTotal),
        despAprov,
        despPend,
      ]);
      styleDataRow(row, i % 2 === 1);
      row.getCell(1).font = { bold: true, size: 9 };
      row.getCell(8).numFmt = '#,##0.00 €';
      row.getCell(9).numFmt = '#,##0.00 €';
      if (despPend > 0) {
        row.getCell(9).font = { bold: true, size: 9, color: { argb: 'FF92400E' } };
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

