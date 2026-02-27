#!/usr/bin/env tsx
/**
 * GESTÃO RLS — Script de Limpeza de Dados de Teste
 * =================================================
 * Remove TODOS os dados criados pelo seed-test.ts:
 *   • Apaga apontamentos dos técnicos de teste
 *   • Apaga despesas e recibos
 *   • Apaga depósitos
 *   • Apaga obras
 *   • Apaga técnicos via RPC delete_user_complete
 *
 * ⚠️  CUIDADO: Este script elimina dados permanentemente!
 *
 * Uso: npx tsx scripts/cleanup-test.ts
 *      bun scripts/cleanup-test.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vchcensugkmzwdvdrohq.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjaGNlbnN1Z2ttendkdmRyb2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzUzNTYsImV4cCI6MjA4NzQxMTM1Nn0.UQmx9Z0MkhycR1UNh1e7TjNWRVE9pRZb41QXYbiCJOY';

// ⚠️ Preenche com as credenciais do admin
const ADMIN_EMAIL = 'rlssuporte02@gmail.com';
const ADMIN_PASSWORD = 'Rls@2024';

// Emails dos técnicos de teste a remover
const EMAILS_TESTE = [
  'ramiro@rls.pt',
  'luiz@rls.pt',
  'antonio@rls.pt',
  'fernando@rls.pt',
];

// Prefixos dos códigos de obra de teste a remover
const PREFIXOS_OBRAS = ['RAM-', 'LUI-', 'ANT-', 'FER-'];

const RESET  = '\x1b[0m';
const VERDE  = '\x1b[32m';
const VERM   = '\x1b[31m';
const NEGR   = '\x1b[1m';
const AZUL   = '\x1b[36m';

function ok(msg: string)   { console.log(`  ${VERDE}✅ ${msg}${RESET}`); }
function err(msg: string, e?: unknown) {
  const d = e instanceof Error ? e.message : String(e ?? '');
  console.log(`  ${VERM}❌ ${msg}${d ? ': ' + d : ''}${RESET}`);
}
function sec(t: string) {
  console.log(`\n${AZUL}${NEGR}${'═'.repeat(60)}\n  ${t}\n${'═'.repeat(60)}${RESET}`);
}

async function main() {
  console.log(`\n${VERM}${NEGR}`);
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   GESTÃO RLS — CLEANUP DE DADOS DE TESTE    ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log(`${RESET}`);

  if (ADMIN_EMAIL.includes('COLOCA_') || ADMIN_PASSWORD.includes('COLOCA_')) {
    console.error(`\n${VERM}${NEGR}⛔  Preenche ADMIN_EMAIL e ADMIN_PASSWORD no topo!${RESET}\n`);
    process.exit(1);
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: loginData, error: loginErr } = await client.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (loginErr || !loginData.user) {
    console.error(`\n${VERM}⛔  Login falhou: ${loginErr?.message}${RESET}\n`);
    process.exit(1);
  }
  ok(`Admin autenticado: ${loginData.user.email}`);

  // 1. Obter IDs dos técnicos de teste
  sec('A obter técnicos de teste…');
  const { data: tecnicos, error: tecErr } = await client
    .from('profiles')
    .select('id, full_name, email:id')
    .in('id', (
      await Promise.all(
        EMAILS_TESTE.map(async (email) => {
          const { data } = await client.auth.admin?.listUsers?.() ?? { data: null };
          return data;
        })
      )
    ).flat().filter(Boolean) as string[]);

  // Abordagem alternativa: buscar técnicos pelo nome conhecido
  const { data: perfilTecnicos } = await client
    .from('profiles')
    .select('id, full_name')
    .in('full_name', ['Ramiro Silva', 'Luiz Costa', 'António Ferreira', 'Fernando Santos']);

  const tecnicoIds = (perfilTecnicos ?? []).map(t => t.id);
  console.log(`  Técnicos encontrados: ${tecnicoIds.length}`);
  perfilTecnicos?.forEach(t => console.log(`    • ${t.full_name} (${t.id})`));

  if (tecnicoIds.length === 0) {
    console.log('\n  Nenhum técnico de teste encontrado. Nada a limpar.\n');
    return;
  }

  // 2. Apagar fotos dos apontamentos
  sec('A apagar fotos…');
  {
    const { data: apts } = await client
      .from('apontamentos')
      .select('id')
      .in('tecnico_id', tecnicoIds);

    const aptIds = (apts ?? []).map(a => a.id);
    if (aptIds.length > 0) {
      const { data: fotos } = await client.from('fotos').select('storage_path').in('apontamento_id', aptIds);
      if (fotos?.length) {
        const paths = fotos.map(f => f.storage_path);
        await client.storage.from('fotos').remove(paths);
        ok(`${paths.length} ficheiro(s) removido(s) do bucket fotos`);
      }
      const { error } = await client.from('fotos').delete().in('apontamento_id', aptIds);
      error ? err('Apagar registos de fotos', error) : ok(`Registos de fotos apagados`);
    }
  }

  // 3. Apagar apontamentos
  sec('A apagar apontamentos…');
  {
    const { data, error } = await client
      .from('apontamentos')
      .delete()
      .in('tecnico_id', tecnicoIds)
      .select();
    error ? err('Apagar apontamentos', error) : ok(`${data?.length ?? 0} apontamento(s) apagado(s)`);
  }

  // 4. Apagar recibos de despesas (ficheiros + registos)
  sec('A apagar recibos de despesas…');
  {
    const { data: desps } = await client
      .from('despesas')
      .select('id')
      .in('tecnico_id', tecnicoIds);

    const despIds = (desps ?? []).map(d => d.id);
    if (despIds.length > 0) {
      const { data: recibos } = await client.from('recibos_despesas').select('storage_path').in('despesa_id', despIds);
      if (recibos?.length) {
        const paths = recibos.map(r => r.storage_path);
        await client.storage.from('recibos').remove(paths);
        ok(`${paths.length} recibo(s) removido(s) do bucket recibos`);
      }
      const { error } = await client.from('recibos_despesas').delete().in('despesa_id', despIds);
      error ? err('Apagar recibos_despesas', error) : ok(`Registos de recibos_despesas apagados`);
    }
  }

  // 5. Apagar despesas
  sec('A apagar despesas…');
  {
    const { data, error } = await client
      .from('despesas')
      .delete()
      .in('tecnico_id', tecnicoIds)
      .select();
    error ? err('Apagar despesas', error) : ok(`${data?.length ?? 0} despesa(s) apagada(s)`);
  }

  // 6. Apagar depósitos
  sec('A apagar depósitos…');
  {
    const { data, error } = await client
      .from('depositos')
      .delete()
      .in('tecnico_id', tecnicoIds)
      .select();
    error ? err('Apagar depósitos', error) : ok(`${data?.length ?? 0} depósito(s) apagado(s)`);
  }

  // 7. Apagar obras dos técnicos de teste
  sec('A apagar obras…');
  for (const prefixo of PREFIXOS_OBRAS) {
    const { data, error } = await client
      .from('obras')
      .delete()
      .like('codigo', `${prefixo}%`)
      .select();
    error ? err(`Apagar obras ${prefixo}*`, error) : ok(`${data?.length ?? 0} obra(s) com prefixo ${prefixo} apagada(s)`);
  }

  // 8. Apagar técnicos via RPC
  sec('A apagar técnicos de teste…');
  for (const tec of (perfilTecnicos ?? [])) {
    const { error } = await client.rpc('delete_user_complete', { user_id: tec.id });
    error ? err(`Apagar ${tec.full_name}`, error) : ok(`Técnico "${tec.full_name}" apagado completamente`);
  }

  console.log(`\n${VERDE}${NEGR}  ✅ Limpeza concluída!${RESET}\n`);
}

main().catch(e => {
  console.error('\n💥 Erro fatal:', e);
  process.exit(1);
});
