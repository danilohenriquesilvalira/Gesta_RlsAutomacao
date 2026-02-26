export type Role = 'admin' | 'tecnico';
export type ObraStatus = 'ativa' | 'pausada' | 'concluida';
export type ApontamentoStatus = 'pendente' | 'aprovado' | 'rejeitado';
export type TipoHora = 'normal' | 'extra_50' | 'extra_100';

export type TipoServico =
  | 'Instalação Elétrica'
  | 'Prog. CLP'
  | 'Instrumentação'
  | 'Comissionamento'
  | 'Manutenção Corretiva'
  | 'Manutenção Preventiva';

export const TIPOS_SERVICO: TipoServico[] = [
  'Instalação Elétrica',
  'Prog. CLP',
  'Instrumentação',
  'Comissionamento',
  'Manutenção Corretiva',
  'Manutenção Preventiva',
];

export const TIPOS_HORA: { value: TipoHora; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'extra_50', label: 'Extra 50%' },
  { value: 'extra_100', label: 'Extra 100%' },
];

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Obra {
  id: string;
  codigo: string;
  nome: string;
  cliente: string;
  status: ObraStatus;
  progresso: number;
  prazo: string | null;
  localizacao: string | null;
  lat: number | null;
  lng: number | null;
  created_by: string | null;
  created_at: string;
  // joined
  executante?: { full_name: string } | null;
}

export interface Apontamento {
  id: string;
  tecnico_id: string;
  obra_id: string | null;
  tipo_servico: string;
  tipo_hora: TipoHora;
  hora_entrada: string;
  hora_saida: string | null;
  total_horas: number | null;
  descricao: string | null;
  status: ApontamentoStatus;
  data_apontamento: string;
  synced_at: string | null;
  created_at: string;
  // joined
  tecnico?: Profile;
  obra?: Obra;
  fotos?: Foto[];
}

export interface Foto {
  id: string;
  apontamento_id: string;
  storage_path: string;
  url: string;
  created_at: string;
}

export interface OfflineApontamento {
  local_id: string;
  tecnico_id: string;
  obra_id: string | null;
  tipo_servico: string;
  tipo_hora: TipoHora;
  hora_entrada: string;
  hora_saida: string | null;
  total_horas: number | null;
  descricao?: string | null;
  data_apontamento: string;
  fotos_base64: string[];
  created_at: string;
}

// ── Despesas ──────────────────────────────────────────────────────────────────

export type TipoDespesa =
  | 'alojamento'
  | 'alimentação'
  | 'transporte'
  | 'combustível'
  | 'material'
  | 'outro';

export type DespesaStatus = 'pendente' | 'aprovada' | 'rejeitada';

export const TIPOS_DESPESA: TipoDespesa[] = [
  'alojamento',
  'alimentação',
  'transporte',
  'combustível',
  'material',
  'outro',
];

export interface ReciboDespesa {
  id: string;
  despesa_id: string;
  storage_path: string;
  url: string;
  tipo_ficheiro: 'imagem' | 'pdf';
  created_at: string;
}

export interface Despesa {
  id: string;
  tecnico_id: string;
  obra_id: string | null;
  tipo_despesa: TipoDespesa;
  descricao: string | null;
  valor: number;
  data_despesa: string;
  status: DespesaStatus;
  created_at: string;
  // joined
  tecnico?: Profile;
  obra?: Obra;
  recibos?: ReciboDespesa[];
}

export interface Deposito {
  id: string;
  tecnico_id: string;
  admin_id: string;
  valor: number;
  descricao: string | null;
  data_deposito: string;
  created_at: string;
  // joined
  tecnico?: Profile;
}
