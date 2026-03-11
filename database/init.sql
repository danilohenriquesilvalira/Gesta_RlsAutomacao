-- ============================================================
-- Gestão RLS Automação - PostgreSQL Schema
-- Credentials: user=rls, password=Rls@2024, db=gestao_rls
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── profiles (users) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    full_name     TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'tecnico' CHECK (role IN ('admin','tecnico')),
    avatar_url    TEXT,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── obras (projects / construction sites) ───────────────────
CREATE TABLE IF NOT EXISTS obras (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo      TEXT        NOT NULL,
    nome        TEXT        NOT NULL,
    cliente     TEXT        NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','pausada','concluida')),
    progresso   INTEGER     NOT NULL DEFAULT 0,
    prazo       DATE,
    orcamento   DECIMAL(12,2),
    localizacao TEXT,
    lat         DECIMAL(10,7),
    lng         DECIMAL(10,7),
    created_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── obra_tecnicos (junction: obra ↔ tecnico) ────────────────
CREATE TABLE IF NOT EXISTS obra_tecnicos (
    obra_id    UUID REFERENCES obras(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (obra_id, tecnico_id)
);

-- ── apontamentos (time entries) ─────────────────────────────
CREATE TABLE IF NOT EXISTS apontamentos (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tecnico_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    obra_id           UUID        REFERENCES obras(id) ON DELETE SET NULL,
    tipo_servico      TEXT        NOT NULL,
    tipo_hora         TEXT        NOT NULL DEFAULT 'normal' CHECK (tipo_hora IN ('normal','extra_50','extra_100')),
    hora_entrada      TEXT        NOT NULL,
    hora_saida        TEXT,
    total_horas       DECIMAL(6,2),
    descricao         TEXT,
    status            TEXT        NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
    nota_rejeicao     TEXT,
    data_apontamento  DATE        NOT NULL,
    synced_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── fotos (photos for apontamentos) ─────────────────────────
CREATE TABLE IF NOT EXISTS fotos (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    apontamento_id  UUID        NOT NULL REFERENCES apontamentos(id) ON DELETE CASCADE,
    storage_path    TEXT        NOT NULL,
    url             TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── despesas (expenses) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS despesas (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tecnico_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    obra_id       UUID        REFERENCES obras(id) ON DELETE SET NULL,
    tipo_despesa  TEXT        NOT NULL,
    descricao     TEXT,
    valor         DECIMAL(12,2) NOT NULL,
    data_despesa  DATE        NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','rejeitada')),
    nota_rejeicao TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── despesa_participantes (junction: despesa ↔ tecnico) ─────
CREATE TABLE IF NOT EXISTS despesa_participantes (
    despesa_id UUID REFERENCES despesas(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (despesa_id, tecnico_id)
);

-- ── recibos_despesas (files attached to despesas) ───────────
CREATE TABLE IF NOT EXISTS recibos_despesas (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    despesa_id    UUID        NOT NULL REFERENCES despesas(id) ON DELETE CASCADE,
    storage_path  TEXT        NOT NULL,
    url           TEXT        NOT NULL,
    tipo_ficheiro TEXT        NOT NULL CHECK (tipo_ficheiro IN ('imagem','pdf')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── depositos (money deposits to tecnicos) ──────────────────
CREATE TABLE IF NOT EXISTS depositos (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tecnico_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    admin_id      UUID        NOT NULL REFERENCES profiles(id),
    valor         DECIMAL(12,2) NOT NULL,
    descricao     TEXT,
    data_deposito DATE        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── recibos_pagamento (payment slips) ───────────────────────
CREATE TABLE IF NOT EXISTS recibos_pagamento (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tecnico_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    admin_id      UUID        NOT NULL REFERENCES profiles(id),
    periodo       TEXT        NOT NULL,
    valor_bruto   DECIMAL(12,2) NOT NULL,
    valor_liquido DECIMAL(12,2),
    descricao     TEXT,
    storage_path  TEXT        NOT NULL,
    url           TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_apontamentos_tecnico_id  ON apontamentos(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_apontamentos_obra_id     ON apontamentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_apontamentos_status      ON apontamentos(status);
CREATE INDEX IF NOT EXISTS idx_apontamentos_data        ON apontamentos(data_apontamento);
CREATE INDEX IF NOT EXISTS idx_despesas_tecnico_id      ON despesas(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_despesas_status          ON despesas(status);
CREATE INDEX IF NOT EXISTS idx_obras_status             ON obras(status);
CREATE INDEX IF NOT EXISTS idx_obras_created_by         ON obras(created_by);

-- ── Seed: default admin user ─────────────────────────────────
-- password: Rls@2024 (bcrypt hash)
INSERT INTO profiles (id, email, password_hash, full_name, role, is_active)
VALUES (
    gen_random_uuid(),
    'admin@rls.com',
    '$2b$12$Sw8evc0lpfUQclTzjohtqOuC/idOd1GRs0m/W2uKaI6IWWuoJwBWy',
    'Administrador RLS',
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;
