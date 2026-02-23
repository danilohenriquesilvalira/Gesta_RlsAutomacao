import ExcelJS from 'exceljs';
import type { Apontamento } from '@/types';

export async function generateExcel(apontamentos: Apontamento[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Apontamentos');

  sheet.columns = [
    { header: 'Técnico', key: 'tecnico', width: 25 },
    { header: 'Obra', key: 'obra', width: 25 },
    { header: 'Código Obra', key: 'codigo_obra', width: 12 },
    { header: 'Serviço', key: 'servico', width: 25 },
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Entrada', key: 'entrada', width: 10 },
    { header: 'Saída', key: 'saida', width: 10 },
    { header: 'Total Horas', key: 'total', width: 12 },
    { header: 'Tipo Hora', key: 'tipo_hora', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Descrição', key: 'descricao', width: 40 },
  ];

  // Header style
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F2147' },
    };
  });

  for (const a of apontamentos) {
    sheet.addRow({
      tecnico: a.tecnico?.full_name ?? '',
      obra: a.obra?.nome ?? '',
      codigo_obra: a.obra?.codigo ?? '',
      servico: a.tipo_servico,
      data: a.data_apontamento,
      entrada: a.hora_entrada?.slice(0, 5),
      saida: a.hora_saida?.slice(0, 5) ?? '',
      total: a.total_horas ?? 0,
      tipo_hora: a.tipo_hora === 'normal' ? 'Normal' : a.tipo_hora === 'extra_50' ? 'Extra 50%' : 'Extra 100%',
      status: a.status.charAt(0).toUpperCase() + a.status.slice(1),
      descricao: a.descricao ?? '',
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
