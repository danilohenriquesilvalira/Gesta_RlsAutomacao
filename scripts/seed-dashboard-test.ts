#!/usr/bin/env tsx
/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       GESTÃO RLS — SEED DE TESTE DO DASHBOARD (v2)                  ║
 * ║                                                                      ║
 * ║  Valida TODAS as novas funcionalidades do Admin Dashboard:           ║
 * ║                                                                      ║
 * ║  [A] Ciclo Mensal nos KPIs                                           ║
 * ║      → Apontamentos Fev/2026 (contam) + Jan/2026 (não contam)       ║
 * ║                                                                      ║
 * ║  [B] Saldo Crítico (< 50€)                                           ║
 * ║      → Luiz: depósito 200€, despesas aprovadas 177€ = saldo 23€     ║
 * ║      → Banner de Alerta + borda vermelha no card                     ║
 * ║                                                                      ║
 * ║  [C] Sobrecarga Mensal (Performance Grid)                            ║
 * ║      → Ramiro: 180h (102% → barra VERMELHA)                         ║
 * ║      → António: 126h (71% → barra AMARELA)                          ║
 * ║      → Fernando: 72h (41% → barra VERDE)                            ║
 * ║      → Luiz: 64h (36% → barra VERDE)                                ║
 * ║                                                                      ║
 * ║  [D] Orçamento vs Custo Real nas Obras                               ║
 * ║      → BDGT-001: 1500€ orçamento, 1400€ gasto → 93% VERMELHO        ║
 * ║      → BDGT-002: 3000€ orçamento, 2400€ gasto → 80% AMARELO         ║
 * ║      → BDGT-003: 5000€ orçamento, 1000€ gasto → 20% VERDE           ║
 * ║                                                                      ║
 * ║  [E] Pendências Herdadas (badge "Atrasado")                          ║
 * ║      → Apontamentos + despesas de Jan/2026 mantidos PENDENTES        ║
 * ║                                                                      ║
 * ║  [F] Bloqueio de Duplicidade no Modal                                ║
 * ║      → Um apontamento PENDENTE para hoje (2026-02-27) por técnico    ║
 * ║      → Abre modal → escolhe hoje → deve mostrar erro                 ║
 * ║                                                                      ║
 * ║  PRÉ-REQUISITO: Técnicos já criados (não cria novos utilizadores)    ║
 * ║  USO: npx tsx scripts/seed-dashboard-test.ts                         ║
 * ║       bun scripts/seed-dashboard-test.ts                             ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ─── CONFIGURAÇÃO ──────────────────────────────────────────────────────────────

const SUPABASE_URL      = 'https://vchcensugkmzwdvdrohq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjaGNlbnN1Z2ttendkdmRyb2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzUzNTYsImV4cCI6MjA4NzQxMTM1Nn0.UQmx9Z0MkhycR1UNh1e7TjNWRVE9pRZb41QXYbiCJOY';
const ADMIN_EMAIL       = 'rlssuporte02@gmail.com';
const ADMIN_PASSWORD    = 'Rls@2024';

// Credenciais dos técnicos existentes
const TECNICOS_CREDS = [
  { fullName: 'Ramiro Silva',     email: 'ramiro@rls.pt',   password: 'Rls@2024' },
  { fullName: 'Luiz Costa',       email: 'luiz@rls.pt',     password: 'Rls@2024' },
  { fullName: 'António Ferreira', email: 'antonio@rls.pt',  password: 'Rls@2024' },
  { fullName: 'Fernando Santos',  email: 'fernando@rls.pt', password: 'Rls@2024' },
];

// ─── CENÁRIOS DE DADOS ─────────────────────────────────────────────────────────

// [C] Apontamentos Fev/2026 por técnico (APROVADOS → contam no KPI e na barra de carga)
// Ramiro: 18 dias × 10h = 180h → 102% de 176h → barra VERMELHA (clamped a 100%)
const APTS_FEV_RAMIRO = [
  '2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-06',
  '2026-02-09', '2026-02-10', '2026-02-11', '2026-02-12', '2026-02-13',
  '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20',
  '2026-02-23', '2026-02-24', '2026-02-25',
].map(d => ({ data: d, entrada: '07:00', saida: '17:00', horas: 10, tipoHora: 'normal' as const }));

// António: 14 dias × 9h = 126h → 71.5% de 176h → barra AMARELA
const APTS_FEV_ANTONIO = [
  '2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-06',
  '2026-02-09', '2026-02-10', '2026-02-11', '2026-02-12', '2026-02-13',
  '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19',
].map(d => ({ data: d, entrada: '08:00', saida: '17:00', horas: 9, tipoHora: 'normal' as const }));

// Fernando: 9 dias × 8h = 72h → 40.9% de 176h → barra VERDE
const APTS_FEV_FERNANDO = [
  '2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05',
  '2026-02-09', '2026-02-10', '2026-02-11', '2026-02-12',
  '2026-02-16',
].map(d => ({ data: d, entrada: '08:00', saida: '16:00', horas: 8, tipoHora: 'normal' as const }));

// Luiz: 8 dias × 8h = 64h → 36.4% de 176h → barra VERDE + saldo crítico no dinheiro
const APTS_FEV_LUIZ = [
  '2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-06',
  '2026-02-09', '2026-02-10', '2026-02-11',
].map(d => ({ data: d, entrada: '08:00', saida: '16:00', horas: 8, tipoHora: 'normal' as const }));

// [E] Apontamentos Jan/2026 (PENDENTES → "Atrasado" no dashboard)
const APTS_JAN_POR_TECNICO: Record<string, { data: string; entrada: string; saida: string; horas: number }[]> = {
  'Ramiro Silva':     [{ data: '2026-01-15', entrada: '08:00', saida: '17:00', horas: 9 }],
  'Luiz Costa':       [{ data: '2026-01-20', entrada: '08:00', saida: '17:00', horas: 9 }],
  'António Ferreira': [{ data: '2026-01-10', entrada: '08:00', saida: '17:00', horas: 9 }],
  'Fernando Santos':  [{ data: '2026-01-12', entrada: '08:00', saida: '16:00', horas: 8 }],
};

// [F] Apontamento de HOJE por técnico (PENDENTE → testa blockedDates no modal)
const DATA_HOJE = '2026-02-27';

// [D] Obras com orçamento para testar a barra de Budget vs Custo
const OBRAS_BUDGET = [
  {
    codigo: 'BDGT-001', nome: 'Central Pocinho A', cliente: 'EDP Produção',
    localizacao: 'Pocinho, Vila Nova de Foz Côa', orcamento: 1500,
    progresso: 75, status: 'ativa' as const,
    tecnicoNome: 'Ramiro Silva',
    // Despesas aprovadas: 500+600+300 = 1400€ → 93% → VERMELHO
    despesas: [
      { tipo: 'alojamento' as const, valor: 500, desc: 'Hotel Pocinho — 5 noites' },
      { tipo: 'material'   as const, valor: 600, desc: 'Cabo elétrico HXV 95mm² 100m' },
      { tipo: 'outro'      as const, valor: 300, desc: 'Aluguer de andaime' },
    ],
  },
  {
    codigo: 'BDGT-002', nome: 'Régua Turbina 3', cliente: 'EDP Produção',
    localizacao: 'Peso da Régua', orcamento: 3000,
    progresso: 55, status: 'ativa' as const,
    tecnicoNome: 'António Ferreira',
    // Despesas aprovadas: 1000+800+600 = 2400€ → 80% → AMARELO
    despesas: [
      { tipo: 'material'   as const, valor: 1000, desc: 'Quadro elétrico principal BT' },
      { tipo: 'alojamento' as const, valor: 800,  desc: 'Hotel Régua — 8 noites' },
      { tipo: 'transporte' as const, valor: 600,  desc: 'Frete de equipamentos especiais' },
    ],
  },
  {
    codigo: 'BDGT-003', nome: 'Crestuma Reforma', cliente: 'EDP Produção',
    localizacao: 'Crestuma-Lever, V. N. Gaia', orcamento: 5000,
    progresso: 30, status: 'ativa' as const,
    tecnicoNome: 'Fernando Santos',
    // Despesas aprovadas: 500+500 = 1000€ → 20% → VERDE
    despesas: [
      { tipo: 'material' as const, valor: 500, desc: 'Sensores de temperatura PT100 ×20' },
      { tipo: 'outro'    as const, valor: 500, desc: 'Serviço de topografia' },
    ],
  },
];

// [B] Despesas pessoais (Fev/2026) que serão aprovadas
// Luiz: 65+82+30 = 177€ → depósito 200€ → saldo 23€ → CRÍTICO
const DESPS_PESSOAIS_FEV: Record<string, { tipo: any; valor: number; desc: string; data: string }[]> = {
  'Ramiro Silva': [
    { tipo: 'combustível', valor: 82, desc: 'Abastecimento A24 — Pocinho', data: '2026-02-07' },
    { tipo: 'alimentação', valor: 35, desc: 'Refeições em serviço', data: '2026-02-14' },
  ],
  'Luiz Costa': [
    { tipo: 'alojamento',  valor: 65, desc: 'Pousada Vale do Lima — 1 noite', data: '2026-02-05' },
    { tipo: 'combustível', valor: 82, desc: 'Abastecimento — ida/volta obra', data: '2026-02-10' },
    { tipo: 'alimentação', valor: 30, desc: 'Almoço e jantar em campo', data: '2026-02-14' },
  ],
  'António Ferreira': [
    { tipo: 'transporte',  valor: 45, desc: 'Portagens A3 — ida e volta', data: '2026-02-07' },
    { tipo: 'alimentação', valor: 35, desc: 'Refeições em serviço', data: '2026-02-14' },
  ],
  'Fernando Santos': [
    { tipo: 'combustível', valor: 60, desc: 'Gasóleo serviço semanal', data: '2026-02-07' },
    { tipo: 'alimentação', valor: 28, desc: 'Refeições campo Crestuma', data: '2026-02-12' },
  ],
};

// [E] Despesas Jan/2026 (PENDENTES → "Atrasado")
const DESPS_JAN_POR_TECNICO: Record<string, { tipo: any; valor: number; desc: string; data: string }[]> = {
  'Ramiro Silva':     [{ tipo: 'outro',      valor: 25, desc: 'Estacionamento Janeiro', data: '2026-01-16' }],
  'Luiz Costa':       [{ tipo: 'material',   valor: 50, desc: 'Ferramentas Janeiro',    data: '2026-01-21' }],
  'António Ferreira': [{ tipo: 'material',   valor: 75, desc: 'Material Janeiro',       data: '2026-01-11' }],
  'Fernando Santos':  [{ tipo: 'transporte', valor: 30, desc: 'Transporte Janeiro',     data: '2026-01-13' }],
};

// [B] Depósitos por técnico
const DEPOSITOS: Record<string, number> = {
  'Ramiro Silva':     1800,  // 1400(obra)+82+35+buffer → saldo positivo
  'Luiz Costa':       200,   // 177€ gasto → saldo 23€ → CRÍTICO
  'António Ferreira': 2800,  // 2400(obra)+45+35+buffer → saldo positivo
  'Fernando Santos':  1200,  // 1000(obra)+60+28+buffer → saldo positivo
};

// ─── TIPOS ─────────────────────────────────────────────────────────────────────

interface TecnicoInfo {
  id: string;
  fullName: string;
  email: string;
  password: string;
}

interface ObraInfo {
  id: string;
  codigo: string;
  nome: string;
  tecnicoId: string;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  verde: '\x1b[32m', vermelho: '\x1b[31m', amarelo: '\x1b[33m', azul: '\x1b[36m',
};

const erros: string[] = [];

function sec(t: string) {
  console.log(`\n${C.azul}${C.bold}${'═'.repeat(64)}\n  ${t}\n${'═'.repeat(64)}${C.reset}`);
}
function ok(msg: string)  { console.log(`  ${C.verde}✅ ${msg}${C.reset}`); }
function err(msg: string, e?: unknown) {
  const d = e instanceof Error ? e.message : String(e ?? '');
  console.log(`  ${C.vermelho}❌ ${msg}${d ? ': ' + d : ''}${C.reset}`);
  erros.push(`${msg}${d ? ': ' + d : ''}`);
}
function aviso(msg: string) { console.log(`  ${C.amarelo}⚠️  ${msg}${C.reset}`); }
function info(msg: string)  { console.log(`  ${C.bold}ℹ️  ${msg}${C.reset}`); }

function novoCliente(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function calcHoras(entrada: string, saida: string): number {
  const [hE, mE] = entrada.split(':').map(Number);
  const [hS, mS] = saida.split(':').map(Number);
  return Math.round(((hS * 60 + mS) - (hE * 60 + mE)) / 60 * 100) / 100;
}

// ─── FASE 0: LIMPEZA PRÉVIA (segura — mantém utilizadores) ────────────────────

async function limparDadosAnteriores(adminClient: SupabaseClient, tecnicoIds: string[]): Promise<void> {
  sec('FASE 0 — Limpeza de Dados Anteriores de Teste');

  if (tecnicoIds.length === 0) { aviso('Sem técnicos para limpar.'); return; }

  // Apagar fotos de apontamentos destes técnicos
  const { data: apts } = await adminClient.from('apontamentos').select('id').in('tecnico_id', tecnicoIds);
  const aptIds = (apts ?? []).map(a => a.id);
  if (aptIds.length > 0) {
    const { data: fotos } = await adminClient.from('fotos').select('storage_path').in('apontamento_id', aptIds);
    if (fotos?.length) await adminClient.storage.from('fotos').remove(fotos.map(f => f.storage_path));
    const { error } = await adminClient.from('fotos').delete().in('apontamento_id', aptIds);
    error ? err('Limpar fotos', error) : ok(`${aptIds.length} apontamentos → fotos apagadas`);
  }

  // Apagar apontamentos
  const { data: dApts, error: eApts } = await adminClient.from('apontamentos').delete().in('tecnico_id', tecnicoIds).select();
  eApts ? err('Limpar apontamentos', eApts) : ok(`${dApts?.length ?? 0} apontamentos apagados`);

  // Apagar recibos de despesas
  const { data: desps } = await adminClient.from('despesas').select('id').in('tecnico_id', tecnicoIds);
  const despIds = (desps ?? []).map(d => d.id);
  if (despIds.length > 0) {
    const { data: recibos } = await adminClient.from('recibos_despesas').select('storage_path').in('despesa_id', despIds);
    if (recibos?.length) await adminClient.storage.from('recibos').remove(recibos.map(r => r.storage_path));
    await adminClient.from('recibos_despesas').delete().in('despesa_id', despIds);
  }

  // Apagar despesas
  const { data: dDesps, error: eDesps } = await adminClient.from('despesas').delete().in('tecnico_id', tecnicoIds).select();
  eDesps ? err('Limpar despesas', eDesps) : ok(`${dDesps?.length ?? 0} despesas apagadas`);

  // Apagar depósitos
  const { data: dDeps, error: eDeps } = await adminClient.from('depositos').delete().in('tecnico_id', tecnicoIds).select();
  eDeps ? err('Limpar depósitos', eDeps) : ok(`${dDeps?.length ?? 0} depósitos apagados`);

  // Apagar obras de teste (apenas prefixo BDGT)
  const { data: dObras, error: eObras } = await adminClient.from('obras').delete().like('codigo', 'BDGT-%').select();
  eObras ? err('Limpar obras BDGT-*', eObras) : ok(`${dObras?.length ?? 0} obras BDGT apagadas`);

  // Apagar outras obras dos técnicos (com prefixo RAM/LUI/ANT/FER)
  for (const pref of ['RAM-', 'LUI-', 'ANT-', 'FER-']) {
    const { data } = await adminClient.from('obras').delete().like('codigo', `${pref}%`).select();
    if (data?.length) ok(`${data.length} obra(s) com prefixo ${pref} apagada(s)`);
  }
}

// ─── FASE 1: LOGIN DO ADMIN ────────────────────────────────────────────────────

async function loginAdmin(): Promise<{ client: SupabaseClient; adminId: string }> {
  sec('FASE 1 — Login do Admin');
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (error || !data.user) {
    console.error(`\n${C.vermelho}${C.bold}⛔  Falha no login: ${error?.message}${C.reset}\n`);
    process.exit(1);
  }
  ok(`Admin autenticado: ${data.user.email}`);
  return { client, adminId: data.user.id };
}

// ─── FASE 2: OBTER TÉCNICOS ────────────────────────────────────────────────────

async function obterTecnicos(adminClient: SupabaseClient): Promise<TecnicoInfo[]> {
  sec('FASE 2 — Obter Técnicos Existentes');

  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, full_name')
    .in('full_name', TECNICOS_CREDS.map(t => t.fullName))
    .eq('role', 'tecnico');

  if (error) { err('Obter técnicos', error); return []; }

  const tecnicos: TecnicoInfo[] = [];
  for (const cred of TECNICOS_CREDS) {
    const profile = profiles?.find(p => p.full_name === cred.fullName);
    if (!profile) { err(`Técnico não encontrado: ${cred.fullName}. Execute seed-test.ts primeiro.`); continue; }
    ok(`${cred.fullName} → id: ${profile.id}`);
    tecnicos.push({ id: profile.id, ...cred });
  }
  return tecnicos;
}

// ─── FASE 3: CRIAR OBRAS COM ORÇAMENTO ────────────────────────────────────────

async function criarObrasComOrcamento(tecnicos: TecnicoInfo[]): Promise<ObraInfo[]> {
  sec('FASE 3 — Criar Obras com Orçamento [Cenário D]');

  const obras: ObraInfo[] = [];

  for (const obraConfig of OBRAS_BUDGET) {
    const tec = tecnicos.find(t => t.fullName === obraConfig.tecnicoNome);
    if (!tec) { err(`Técnico não encontrado para obra ${obraConfig.codigo}: ${obraConfig.tecnicoNome}`); continue; }

    info(`A criar obra ${obraConfig.codigo} como ${tec.fullName}…`);
    const tecClient = novoCliente();
    const { error: loginErr } = await tecClient.auth.signInWithPassword({ email: tec.email, password: tec.password });
    if (loginErr) { err(`Login como ${tec.fullName}`, loginErr); continue; }

    const { data: obra, error } = await tecClient.from('obras').insert({
      codigo:      obraConfig.codigo,
      nome:        obraConfig.nome,
      cliente:     obraConfig.cliente,
      localizacao: obraConfig.localizacao,
      status:      obraConfig.status,
      progresso:   obraConfig.progresso,
      orcamento:   obraConfig.orcamento,
      prazo:       '2026-06-30',
      created_by:  tec.id,
    }).select().single();

    await tecClient.auth.signOut();

    if (error || !obra) { err(`Criar obra ${obraConfig.codigo}`, error); continue; }
    ok(`[${obraConfig.codigo}] "${obraConfig.nome}" — orçamento: ${obraConfig.orcamento}€ — progresso: ${obraConfig.progresso}%`);
    obras.push({ id: obra.id, codigo: obraConfig.codigo, nome: obraConfig.nome, tecnicoId: tec.id });
  }

  return obras;
}

// ─── FASE 4: CRIAR APONTAMENTOS ────────────────────────────────────────────────

async function criarApontamentos(tecnicos: TecnicoInfo[], obras: ObraInfo[]): Promise<string[]> {
  sec('FASE 4 — Criar Apontamentos [Cenários A, C, E, F]');

  const todosIds: string[] = [];

  // Mapa: fullName → lista de apontamentos Fev/2026
  const aptsFev: Record<string, { data: string; entrada: string; saida: string; horas: number; tipoHora: string }[]> = {
    'Ramiro Silva':     APTS_FEV_RAMIRO,
    'Luiz Costa':       APTS_FEV_LUIZ,
    'António Ferreira': APTS_FEV_ANTONIO,
    'Fernando Santos':  APTS_FEV_FERNANDO,
  };

  const TIPOS_SERVICO = [
    'Instalação Elétrica', 'Prog. CLP', 'Instrumentação',
    'Comissionamento', 'Manutenção Corretiva', 'Manutenção Preventiva',
  ];

  for (const tec of tecnicos) {
    info(`A criar apontamentos para ${tec.fullName}…`);

    const tecClient = novoCliente();
    const { error: loginErr } = await tecClient.auth.signInWithPassword({ email: tec.email, password: tec.password });
    if (loginErr) { err(`Login como ${tec.fullName}`, loginErr); continue; }

    const obraDoTecnico = obras.find(o => o.tecnicoId === tec.id);

    // ── Fev/2026 aprovados ──
    const listaDatas = aptsFev[tec.fullName] ?? [];
    let okFev = 0;
    for (let i = 0; i < listaDatas.length; i++) {
      const a = listaDatas[i];
      const { data: apt, error } = await tecClient.from('apontamentos').insert({
        tecnico_id:       tec.id,
        obra_id:          obraDoTecnico?.id ?? null,
        tipo_servico:     TIPOS_SERVICO[i % TIPOS_SERVICO.length],
        tipo_hora:        a.tipoHora,
        hora_entrada:     a.entrada,
        hora_saida:       a.saida,
        total_horas:      a.horas,
        data_apontamento: a.data,
        descricao:        `Serviço técnico — ${a.data}`,
        synced_at:        new Date().toISOString(),
        status:           'pendente',
      }).select('id').single();
      if (error) { err(`Apt Fev ${a.data} — ${tec.fullName}`, error); continue; }
      todosIds.push(apt.id);
      okFev++;
    }
    ok(`${tec.fullName} — ${okFev} apontamentos Fev/2026 criados (${listaDatas.reduce((s, a) => s + a.horas, 0)}h)`);

    // ── Jan/2026 pendentes (Atrasado) ──
    const jans = APTS_JAN_POR_TECNICO[tec.fullName] ?? [];
    for (const j of jans) {
      const { data: apt, error } = await tecClient.from('apontamentos').insert({
        tecnico_id:       tec.id,
        obra_id:          obraDoTecnico?.id ?? null,
        tipo_servico:     'Manutenção Preventiva',
        tipo_hora:        'normal',
        hora_entrada:     j.entrada,
        hora_saida:       j.saida,
        total_horas:      j.horas,
        data_apontamento: j.data,
        descricao:        'Serviço Janeiro — pendente de aprovação',
        synced_at:        new Date().toISOString(),
        status:           'pendente',
      }).select('id').single();
      if (error) { err(`Apt Jan ${j.data} — ${tec.fullName}`, error); continue; }
      todosIds.push(apt.id);
      ok(`${tec.fullName} — Apontamento JAN/2026 (${j.data}) → PENDENTE ["Atrasado"]`);
    }

    // ── Hoje (blockedDates test) ──
    const { data: aptHoje, error: errHoje } = await tecClient.from('apontamentos').insert({
      tecnico_id:       tec.id,
      obra_id:          obraDoTecnico?.id ?? null,
      tipo_servico:     'Manutenção Corretiva',
      tipo_hora:        'normal',
      hora_entrada:     '08:00',
      hora_saida:       '12:00',
      total_horas:      4,
      data_apontamento: DATA_HOJE,
      descricao:        'Registo de hoje — bloqueia modal para mesma data',
      synced_at:        new Date().toISOString(),
      status:           'pendente',
    }).select('id').single();
    if (errHoje) {
      err(`Apt HOJE (${DATA_HOJE}) — ${tec.fullName}`, errHoje);
    } else {
      todosIds.push(aptHoje.id);
      ok(`${tec.fullName} — Apontamento HOJE (${DATA_HOJE}) → PENDENTE [blockedDates] ✓`);
    }

    await tecClient.auth.signOut();
  }

  return todosIds;
}

// ─── FASE 5: ADMIN APROVA APONTAMENTOS FEV ────────────────────────────────────

async function aprovarApontamentosFev(adminClient: SupabaseClient, tecnicos: TecnicoInfo[]): Promise<void> {
  sec('FASE 5 — Admin Aprova Apontamentos Fev/2026');

  for (const tec of tecnicos) {
    // Busca apontamentos Fev/2026 pendentes deste técnico
    const { data: apts, error } = await adminClient
      .from('apontamentos')
      .select('id, data_apontamento')
      .eq('tecnico_id', tec.id)
      .eq('status', 'pendente')
      .gte('data_apontamento', '2026-02-01')
      .lte('data_apontamento', '2026-02-26'); // Deixa dia 27 como PENDENTE (blockedDates)

    if (error) { err(`Buscar apts Fev — ${tec.fullName}`, error); continue; }
    if (!apts?.length) { aviso(`Sem apontamentos Fev pendentes para ${tec.fullName}`); continue; }

    // Aprova em batch
    const ids = apts.map(a => a.id);
    const { error: updErr } = await adminClient
      .from('apontamentos')
      .update({ status: 'aprovado' })
      .in('id', ids);

    if (updErr) { err(`Aprovar apts Fev — ${tec.fullName}`, updErr); continue; }
    ok(`${tec.fullName} — ${ids.length} apontamentos Fev/2026 APROVADOS`);
  }
  // Jan/2026 e hoje ficam como PENDENTES → aparecerão na lista de aprovações
  info('Apontamentos Jan/2026 e de hoje mantidos PENDENTES (→ "Atrasado" e blockedDates)');
}

// ─── FASE 6: CRIAR DESPESAS ────────────────────────────────────────────────────

async function criarDespesas(tecnicos: TecnicoInfo[], obras: ObraInfo[]): Promise<string[]> {
  sec('FASE 6 — Criar Despesas [Cenários B, D, E]');

  const todosIds: string[] = [];

  for (const tec of tecnicos) {
    info(`A criar despesas para ${tec.fullName}…`);

    const tecClient = novoCliente();
    const { error: loginErr } = await tecClient.auth.signInWithPassword({ email: tec.email, password: tec.password });
    if (loginErr) { err(`Login como ${tec.fullName}`, loginErr); continue; }

    // ── Obra com orçamento (vinculada a obra específica) ──
    const obraConfig = OBRAS_BUDGET.find(o => o.tecnicoNome === tec.fullName);
    const obraObj    = obraConfig ? obras.find(o => o.codigo === obraConfig.codigo) : null;

    if (obraConfig && obraObj) {
      let totalObraDesp = 0;
      for (const d of obraConfig.despesas) {
        const { data: despesa, error } = await tecClient.from('despesas').insert({
          tecnico_id:   tec.id,
          obra_id:      obraObj.id,
          tipo_despesa: d.tipo,
          descricao:    d.desc,
          valor:        d.valor,
          data_despesa: '2026-02-15',
          status:       'pendente',
        }).select('id').single();
        if (error) { err(`Despesa obra ${obraConfig.codigo}`, error); continue; }
        todosIds.push(despesa.id);
        totalObraDesp += d.valor;
      }
      ok(`${tec.fullName} — ${obraConfig.despesas.length} despesas obra ${obraConfig.codigo} (${totalObraDesp}€ → ${Math.round((totalObraDesp/obraConfig.orcamento)*100)}% do orçamento)`);
    }

    // ── Despesas pessoais Fev/2026 ──
    const pessoais = DESPS_PESSOAIS_FEV[tec.fullName] ?? [];
    for (const d of pessoais) {
      const { data: despesa, error } = await tecClient.from('despesas').insert({
        tecnico_id:   tec.id,
        obra_id:      null,
        tipo_despesa: d.tipo,
        descricao:    d.desc,
        valor:        d.valor,
        data_despesa: d.data,
        status:       'pendente',
      }).select('id').single();
      if (error) { err(`Despesa pessoal ${d.tipo} — ${tec.fullName}`, error); continue; }
      todosIds.push(despesa.id);
    }

    const totalPessoal = pessoais.reduce((s, d) => s + d.valor, 0);
    if (pessoais.length > 0) ok(`${tec.fullName} — ${pessoais.length} despesas pessoais Fev (${totalPessoal}€)`);

    // ── Despesas Jan/2026 (PENDENTES → Atrasado) ──
    const janDesps = DESPS_JAN_POR_TECNICO[tec.fullName] ?? [];
    for (const d of janDesps) {
      const { data: despesa, error } = await tecClient.from('despesas').insert({
        tecnico_id:   tec.id,
        obra_id:      null,
        tipo_despesa: d.tipo,
        descricao:    d.desc,
        valor:        d.valor,
        data_despesa: d.data,
        status:       'pendente',
      }).select('id').single();
      if (error) { err(`Despesa Jan ${tec.fullName}`, error); continue; }
      todosIds.push(despesa.id);
      ok(`${tec.fullName} — Despesa JAN/2026 (${d.data}, ${d.valor}€) → PENDENTE ["Atrasado"]`);
    }

    await tecClient.auth.signOut();
  }

  return todosIds;
}

// ─── FASE 7: ADMIN APROVA DESPESAS FEV ────────────────────────────────────────

async function aprovarDespesasFev(adminClient: SupabaseClient, tecnicos: TecnicoInfo[]): Promise<void> {
  sec('FASE 7 — Admin Aprova Despesas Fev/2026');

  for (const tec of tecnicos) {
    // Aprova TODAS as despesas de Fev/2026 (pessoais + obra)
    const { data: desps, error } = await adminClient
      .from('despesas')
      .select('id, valor, tipo_despesa, data_despesa')
      .eq('tecnico_id', tec.id)
      .eq('status', 'pendente')
      .gte('data_despesa', '2026-02-01')
      .lte('data_despesa', '2026-02-28');

    if (error) { err(`Buscar desps Fev — ${tec.fullName}`, error); continue; }
    if (!desps?.length) { aviso(`Sem despesas Fev pendentes para ${tec.fullName}`); continue; }

    const ids  = desps.map(d => d.id);
    const total = desps.reduce((s, d) => s + Number(d.valor), 0);
    const { error: updErr } = await adminClient.from('despesas').update({ status: 'aprovada' }).in('id', ids);

    if (updErr) { err(`Aprovar desps Fev — ${tec.fullName}`, updErr); continue; }
    ok(`${tec.fullName} — ${ids.length} despesas Fev/2026 APROVADAS (${total.toFixed(2)}€)`);
  }
  info('Despesas Jan/2026 mantidas PENDENTES (→ "Atrasado")');
}

// ─── FASE 8: CRIAR DEPÓSITOS ──────────────────────────────────────────────────

async function criarDepositos(adminClient: SupabaseClient, adminId: string, tecnicos: TecnicoInfo[]): Promise<void> {
  sec('FASE 8 — Criar Depósitos [Cenário B — Saldo Crítico do Luiz]');

  for (const tec of tecnicos) {
    const valor = DEPOSITOS[tec.fullName] ?? 500;
    const { error } = await adminClient.from('depositos').insert({
      tecnico_id:    tec.id,
      admin_id:      adminId,
      valor,
      descricao:     `Fundo de maneio — Fevereiro 2026`,
      data_deposito: '2026-02-01',
    });
    if (error) { err(`Depósito para ${tec.fullName}`, error); continue; }
    ok(`${tec.fullName} — Depósito de ${valor}€ criado`);
  }
}

// ─── FASE 9: VERIFICAÇÃO ──────────────────────────────────────────────────────

async function verificar(adminClient: SupabaseClient, tecnicos: TecnicoInfo[], obras: ObraInfo[]): Promise<void> {
  sec('FASE 9 — Verificação dos Cenários');

  const FEV = '2026-02';
  const MONTHLY_TARGET = 176;

  console.log('');

  for (const tec of tecnicos) {
    console.log(`${C.bold}  👤 ${tec.fullName}${C.reset}`);

    // Horas Fev/2026 aprovadas
    const { data: aptsFev } = await adminClient
      .from('apontamentos')
      .select('total_horas, data_apontamento, status')
      .eq('tecnico_id', tec.id)
      .eq('status', 'aprovado')
      .like('data_apontamento', `${FEV}%`);

    const horasFev = (aptsFev ?? []).reduce((s, a) => s + (a.total_horas ?? 0), 0);
    const carga    = Math.min((horasFev / MONTHLY_TARGET) * 100, 100);
    const cor      = carga > 90 ? C.vermelho : carga > 70 ? C.amarelo : C.verde;
    const barLabel = carga > 90 ? 'VERMELHA (>90%)' : carga > 70 ? 'AMARELA (70-90%)' : 'VERDE (<70%)';
    console.log(`     ⏱️  Horas Fev/2026 aprovadas: ${horasFev}h → ${carga.toFixed(1)}% de ${MONTHLY_TARGET}h → barra ${cor}${barLabel}${C.reset}`);

    // Apontamentos pendentes Jan (Atrasado)
    const { data: aptsJanPend } = await adminClient
      .from('apontamentos')
      .select('id, data_apontamento')
      .eq('tecnico_id', tec.id)
      .eq('status', 'pendente')
      .like('data_apontamento', '2026-01%');
    console.log(`     📋 Apontamentos Jan/2026 PENDENTES: ${aptsJanPend?.length ?? 0} → badge "Atrasado"`);

    // Apontamento hoje (blockedDates)
    const { data: aptsHoje } = await adminClient
      .from('apontamentos')
      .select('id')
      .eq('tecnico_id', tec.id)
      .eq('data_apontamento', DATA_HOJE);
    console.log(`     📅 Apontamento em ${DATA_HOJE}: ${aptsHoje?.length ?? 0} registo(s) → blockedDates ativo`);

    // Saldo
    const { data: deps } = await adminClient.from('depositos').select('valor').eq('tecnico_id', tec.id);
    const { data: desps } = await adminClient.from('despesas').select('valor').eq('tecnico_id', tec.id).eq('status', 'aprovada');
    const totalDep  = (deps ?? []).reduce((s, d) => s + Number(d.valor), 0);
    const totalDesp = (desps ?? []).reduce((s, d) => s + Number(d.valor), 0);
    const saldo     = totalDep - totalDesp;
    const saldoCor  = saldo < 50 ? C.vermelho : C.verde;
    const saldoTag  = saldo < 50 ? ' ⚠️  SALDO CRÍTICO!' : '';
    console.log(`     💰 Depósito: ${totalDep}€ | Despesas aprovadas: ${totalDesp.toFixed(2)}€ | Saldo: ${saldoCor}${C.bold}${saldo.toFixed(2)}€${C.reset}${saldoCor}${saldoTag}${C.reset}`);

    // Despesas Jan pendentes
    const { data: despsJanPend } = await adminClient.from('despesas').select('id').eq('tecnico_id', tec.id).eq('status', 'pendente').like('data_despesa', '2026-01%');
    console.log(`     💸 Despesas Jan/2026 PENDENTES: ${despsJanPend?.length ?? 0} → badge "Atrasado"`);
    console.log('');
  }

  // Obras com orçamento
  console.log(`${C.bold}  🏗️  Obras com Orçamento:${C.reset}`);
  for (const obraObj of obras) {
    const cfg    = OBRAS_BUDGET.find(b => b.codigo === obraObj.codigo);
    if (!cfg) continue;
    const { data: desps } = await adminClient.from('despesas').select('valor').eq('obra_id', obraObj.id).eq('status', 'aprovada');
    const custo    = (desps ?? []).reduce((s, d) => s + Number(d.valor), 0);
    const pct      = Math.min((custo / cfg.orcamento) * 100, 100);
    const cor      = pct > 90 ? C.vermelho : pct > 70 ? C.amarelo : C.verde;
    const label    = pct > 90 ? 'VERMELHO' : pct > 70 ? 'AMARELO' : 'VERDE';
    console.log(`     [${cfg.codigo}] ${cfg.nome}: orçamento ${cfg.orcamento}€ | custo ${custo}€ | ${cor}${pct.toFixed(0)}% → ${label}${C.reset}`);
  }
}

// ─── FASE 10: QUERIES DE VALIDAÇÃO ────────────────────────────────────────────

async function testarQueryDashboard(adminClient: SupabaseClient, tecnicos: TecnicoInfo[]): Promise<void> {
  sec('FASE 10 — Queries de Validação do Dashboard');

  // Q1: Apontamentos aprovados Fev/2026 (filtro do KPI)
  {
    const { data, error } = await adminClient
      .from('apontamentos')
      .select('total_horas, tecnico_id, data_apontamento')
      .eq('status', 'aprovado')
      .like('data_apontamento', '2026-02%');
    const totalH = (data ?? []).reduce((s, a) => s + (a.total_horas ?? 0), 0);
    error ? err('Q1 — Apontamentos aprovados Fev/2026', error)
          : ok(`Q1 — KPI Horas Fev/2026: ${totalH}h aprovadas (${data?.length} registos)`);
  }

  // Q2: Pendentes totais (para banner de alerta e floating badge)
  {
    const { data: aptsPend } = await adminClient.from('apontamentos').select('id, data_apontamento').eq('status', 'pendente');
    const { data: despsPend } = await adminClient.from('despesas').select('id, data_despesa').eq('status', 'pendente');
    const antApts  = (aptsPend ?? []).filter(a => !a.data_apontamento.startsWith('2026-02')).length;
    const antDesps = (despsPend ?? []).filter(d => !d.data_despesa.startsWith('2026-02')).length;
    ok(`Q2 — Pendentes: ${aptsPend?.length ?? 0} apt + ${despsPend?.length ?? 0} desp | Atrasados: ${antApts} apt + ${antDesps} desp`);
  }

  // Q3: Técnicos com saldo < 50€
  {
    let criticos = 0;
    for (const tec of tecnicos) {
      const { data: deps }  = await adminClient.from('depositos').select('valor').eq('tecnico_id', tec.id);
      const { data: desps } = await adminClient.from('despesas').select('valor').eq('tecnico_id', tec.id).eq('status', 'aprovada');
      const saldo = (deps ?? []).reduce((s, d) => s + Number(d.valor), 0)
                  - (desps ?? []).reduce((s, d) => s + Number(d.valor), 0);
      if (saldo < 50) criticos++;
    }
    ok(`Q3 — Saldo Crítico (< 50€): ${criticos} técnico(s) → Banner de Alerta ${criticos > 0 ? 'VISÍVEL ✓' : 'oculto'}`);
  }

  // Q4: Obras ativas com orçamento definido
  {
    const { data, error } = await adminClient
      .from('obras')
      .select('id, codigo, nome, orcamento, progresso')
      .eq('status', 'ativa')
      .not('orcamento', 'is', null);
    error ? err('Q4 — Obras com orçamento', error)
          : ok(`Q4 — Obras ativas com orçamento: ${data?.length ?? 0} obra(s) → barra de budget visível`);
  }

  // Q5: Simula obrasInsight — obras acima de 90% do orçamento
  {
    const { data: obrasBudget } = await adminClient
      .from('obras')
      .select('id, codigo, orcamento')
      .eq('status', 'ativa')
      .not('orcamento', 'is', null);

    let acima90 = 0;
    for (const o of obrasBudget ?? []) {
      const { data: desps } = await adminClient.from('despesas').select('valor').eq('obra_id', o.id).eq('status', 'aprovada');
      const custo = (desps ?? []).reduce((s, d) => s + Number(d.valor), 0);
      const pct   = o.orcamento ? (custo / o.orcamento) * 100 : 0;
      if (pct > 90) acima90++;
    }
    ok(`Q5 — Obras acima de 90% do orçamento: ${acima90} → Banner de Alerta ${acima90 > 0 ? 'VISÍVEL ✓' : 'oculto'}`);
  }

  // Q6: Join apontamentos + tecnico + obra (simula useApontamentos do frontend)
  {
    const { data, error } = await adminClient
      .from('apontamentos')
      .select('*, tecnico:profiles!tecnico_id(*), obra:obras!obra_id(*), fotos(*)')
      .eq('status', 'aprovado')
      .like('data_apontamento', '2026-02%')
      .limit(5);
    error ? err('Q6 — Join apontamentos Fev', error)
          : ok(`Q6 — Join apontamentos aprovados Fev (top 5): ${data?.length} — joins OK`);
  }

  // Q7: Join obras com executante (simula useObras do frontend)
  {
    const { data, error } = await adminClient
      .from('obras')
      .select('*, executante:profiles!created_by(full_name)')
      .eq('status', 'ativa')
      .not('created_by', 'is', null);
    error ? err('Q7 — Join obras + executante', error)
          : ok(`Q7 — Obras ativas com executante: ${data?.length} — joins OK`);
  }

  // Q8: Depositos + despesas (simula fluxo de caixa)
  {
    const { data: deps, error: e1 } = await adminClient.from('depositos').select('*, tecnico:profiles!tecnico_id(*)');
    const { data: desps, error: e2 } = await adminClient.from('despesas').select('valor, status, tecnico_id').eq('status', 'aprovada');
    (e1 || e2) ? err('Q8 — Fluxo de caixa', e1 ?? e2)
              : ok(`Q8 — Depósitos: ${deps?.length} | Despesas aprovadas: ${desps?.length} — joins OK`);
  }
}

// ─── RELATÓRIO FINAL ───────────────────────────────────────────────────────────

function relatorio(tecnicos: TecnicoInfo[]): void {
  sec('RELATÓRIO FINAL');

  const totalErros = erros.length;

  console.log(`\n  ${C.bold}📊 O que deverá ver no Dashboard:${C.reset}`);
  console.log(`\n  ${C.bold}[A] KPI "Horas Aprovadas":${C.reset}`);
  console.log(`     • Deve mostrar APENAS horas de Fev/2026`);
  console.log(`     • Label abaixo do valor: "Ciclo: Fevereiro/2026"`);

  console.log(`\n  ${C.bold}[B] Banner de Alerta Crítico:${C.reset}`);
  console.log(`     • Deve aparecer no topo: "1 técnico(s) em saldo crítico"`);
  console.log(`     • Deve incluir: "X obra(s) acima do orçamento"`);
  console.log(`     • Deve incluir: "aprovação(ões) em atraso"`);

  console.log(`\n  ${C.bold}[C] Grid de Performance (Resumo da Equipa):${C.reset}`);
  console.log(`     • Ramiro:  ~100% → barra VERMELHA  (>90%)`);
  console.log(`     • António: ~71%  → barra AMARELA   (70-90%)`);
  console.log(`     • Fernando: ~41% → barra VERDE     (<70%)`);
  console.log(`     • Luiz:    ~36%  → barra VERDE + badge "Saldo Crítico"`);

  console.log(`\n  ${C.bold}[D] Painel "Obras em Curso":${C.reset}`);
  console.log(`     • BDGT-001 Central Pocinho A: barra orçamento VERMELHA  (93%)`);
  console.log(`     • BDGT-002 Régua Turbina 3:  barra orçamento AMARELA   (80%)`);
  console.log(`     • BDGT-003 Crestuma Reforma: barra orçamento VERDE      (20%)`);

  console.log(`\n  ${C.bold}[E] Lista "Aprovações Pendentes":${C.reset}`);
  console.log(`     • Items de Jan/2026 aparecem no TOPO com badge VERMELHO "Atrasado"`);
  console.log(`     • Items de Fev/2026 (hoje) aparecem a seguir, sem badge`);

  console.log(`\n  ${C.bold}[F] Bloqueio de Duplicidade no Modal:${C.reset}`);
  console.log(`     • Login como técnico → clicar "Registar Horas"`);
  console.log(`     • Selecionar a data ${DATA_HOJE} → clicar Guardar`);
  console.log(`     • Deve aparecer: "Já existe um registo para esta data. Escolha outra data."`);

  console.log(`\n  ${C.bold}[G] Floating Badge:${C.reset}`);
  console.log(`     • Canto inferior direito com total de pendentes (apt + desp)`);

  if (totalErros > 0) {
    console.log(`\n  ${C.vermelho}${C.bold}⚠️  ${totalErros} erro(s) durante o seed:${C.reset}`);
    erros.forEach((e, i) => console.log(`  ${C.vermelho}  ${i + 1}. ${e}${C.reset}`));
  } else {
    console.log(`\n  ${C.verde}${C.bold}✅ Seed concluído sem erros!${C.reset}`);
  }

  console.log(`\n  ${C.bold}🔑 Credenciais dos técnicos:${C.reset}`);
  TECNICOS_CREDS.forEach(t =>
    console.log(`     • ${t.fullName.padEnd(22)} ${t.email.padEnd(22)} pw: ${t.password}`)
  );
  console.log(`\n  ${C.bold}🔑 Admin:${C.reset} ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`\n  ${C.bold}🌐 Supabase:${C.reset} https://supabase.com/dashboard/project/vchcensugkmzwdvdrohq\n`);
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${C.azul}${C.bold}`);
  console.log('  ╔══════════════════════════════════════════════════════╗');
  console.log('  ║    GESTÃO RLS — Dashboard Test Seed v2              ║');
  console.log('  ╚══════════════════════════════════════════════════════╝');
  console.log(`${C.reset}`);

  // F1: Admin login
  const { client: adminClient, adminId } = await loginAdmin();

  // F2: Obter técnicos existentes
  const tecnicos = await obterTecnicos(adminClient);
  if (tecnicos.length === 0) {
    console.error(`\n${C.vermelho}${C.bold}⛔  Nenhum técnico encontrado. Execute primeiro: npx tsx scripts/seed-test.ts${C.reset}\n`);
    process.exit(1);
  }

  const tecnicoIds = tecnicos.map(t => t.id);

  // F0: Limpeza (remove dados antigos destes técnicos para evitar duplicados)
  await limparDadosAnteriores(adminClient, tecnicoIds);

  // F3: Criar obras com orçamento
  const obras = await criarObrasComOrcamento(tecnicos);

  // F4: Criar apontamentos (como cada técnico)
  await criarApontamentos(tecnicos, obras);

  // F5: Admin aprova apontamentos Fev (mantém Jan pendentes)
  await aprovarApontamentosFev(adminClient, tecnicos);

  // F6: Criar despesas (como cada técnico)
  await criarDespesas(tecnicos, obras);

  // F7: Admin aprova despesas Fev (mantém Jan pendentes)
  await aprovarDespesasFev(adminClient, tecnicos);

  // F8: Criar depósitos (Luiz com pouco para saldo crítico)
  await criarDepositos(adminClient, adminId, tecnicos);

  // F9: Verificação dos cenários
  await verificar(adminClient, tecnicos, obras);

  // F10: Queries de validação
  await testarQueryDashboard(adminClient, tecnicos);

  // Relatório
  relatorio(tecnicos);
}

main().catch(err => {
  console.error(`\n${'\x1b[31m'}${'\x1b[1m'}💥 Erro fatal:${'\x1b[0m'}`, err);
  process.exit(1);
});
