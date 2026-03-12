#!/bin/bash
# ============================================================
# SCRIPT DE TESTES COMPLETO - Gestão RLS
# Testa todos os 33 endpoints da API
# ============================================================

BASE="http://localhost:8080"
PASS=0
FAIL=0
ERROS=()

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}❌ $1${NC}"; FAIL=$((FAIL+1)); ERROS+=("$1"); }
info() { echo -e "${BLUE}──── $1 ────${NC}"; }

check() {
  local desc="$1"; local expected="$2"; local actual="$3"
  if echo "$actual" | grep -q "$expected" 2>/dev/null; then
    ok "$desc"
  else
    fail "$desc | esperado: '$expected' | recebido: $(echo $actual | head -c 200)"
  fi
}

# ── LIMPEZA INICIAL ─────────────────────────────────────────
docker exec gestao_postgres psql -U rls -d gestao_rls -q -c "
DELETE FROM recibos_pagamento WHERE tecnico_id IN (SELECT id FROM profiles WHERE email LIKE '%@rls.pt');
DELETE FROM depositos WHERE tecnico_id IN (SELECT id FROM profiles WHERE email LIKE '%@rls.pt');
DELETE FROM fotos WHERE apontamento_id IN (SELECT id FROM apontamentos WHERE tecnico_id IN (SELECT id FROM profiles WHERE email LIKE '%@rls.pt'));
DELETE FROM apontamentos WHERE tecnico_id IN (SELECT id FROM profiles WHERE email LIKE '%@rls.pt');
DELETE FROM despesa_participantes WHERE tecnico_id IN (SELECT id FROM profiles WHERE email LIKE '%@rls.pt');
DELETE FROM recibos_despesas WHERE despesa_id IN (SELECT id FROM despesas WHERE tecnico_id IN (SELECT id FROM profiles WHERE email LIKE '%@rls.pt'));
DELETE FROM despesas WHERE tecnico_id IN (SELECT id FROM profiles WHERE email LIKE '%@rls.pt');
DELETE FROM obra_tecnicos WHERE tecnico_id IN (SELECT id FROM profiles WHERE email LIKE '%@rls.pt');
DELETE FROM obras WHERE created_by IN (SELECT id FROM profiles WHERE email LIKE '%@rls.pt');
DELETE FROM profiles WHERE email LIKE '%@rls.pt';
" 2>/dev/null

# ============================================================
echo ""
echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}  GESTÃO RLS - TESTES COMPLETOS DA API      ${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

# ============================================================
info "0. HEALTH CHECK"
R=$(curl -s "$BASE/health")
check "GET /health" "ok" "$R"

# ============================================================
info "1. CRIAR UTILIZADORES"

criar_user() {
  local email="$1"; local nome="$2"; local role="$3"
  curl -s -X POST "$BASE/api/profiles" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"Rls@2024\",\"full_name\":\"$nome\",\"role\":\"$role\"}"
}

# Admin - Carla
R=$(criar_user "carla@rls.pt" "Carla Administradora" "admin")
check "Criar admin carla@rls.pt" "carla@rls.pt" "$R"
CARLA_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Técnicos
R=$(criar_user "ramiro@rls.pt" "Ramiro Silva" "tecnico")
check "Criar técnico ramiro@rls.pt" "ramiro@rls.pt" "$R"
RAMIRO_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

R=$(criar_user "luis@rls.pt" "Luís Costa" "tecnico")
check "Criar técnico luis@rls.pt" "luis@rls.pt" "$R"
LUIS_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

R=$(criar_user "fernando@rls.pt" "Fernando Mendes" "tecnico")
check "Criar técnico fernando@rls.pt" "fernando@rls.pt" "$R"
FERNANDO_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

R=$(criar_user "antonio@rls.pt" "António Pereira" "tecnico")
check "Criar técnico antonio@rls.pt" "antonio@rls.pt" "$R"
ANTONIO_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

R=$(criar_user "leonard@rls.pt" "Leonard Rodrigues" "tecnico")
check "Criar técnico leonard@rls.pt" "leonard@rls.pt" "$R"
LEONARD_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

R=$(criar_user "paulo@rls.pt" "Paulo Ferreira" "tecnico")
check "Criar técnico paulo@rls.pt" "paulo@rls.pt" "$R"
PAULO_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

echo ""
echo "IDs criados:"
echo "  Carla (admin): $CARLA_ID"
echo "  Ramiro:        $RAMIRO_ID"
echo "  Luís:          $LUIS_ID"
echo "  Fernando:      $FERNANDO_ID"
echo "  António:       $ANTONIO_ID"
echo "  Leonard:       $LEONARD_ID"
echo "  Paulo:         $PAULO_ID"

# ============================================================
info "2. AUTENTICAÇÃO - LOGIN"

login() {
  local email="$1"
  curl -s -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"Rls@2024\"}" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token','ERRO: '+str(d)))" 2>/dev/null
}

TOKEN_CARLA=$(login "carla@rls.pt")
check "Login carla@rls.pt" "eyJ" "$TOKEN_CARLA"

TOKEN_RAMIRO=$(login "ramiro@rls.pt")
check "Login ramiro@rls.pt" "eyJ" "$TOKEN_RAMIRO"

TOKEN_LUIS=$(login "luis@rls.pt")
check "Login luis@rls.pt" "eyJ" "$TOKEN_LUIS"

TOKEN_FERNANDO=$(login "fernando@rls.pt")
check "Login fernando@rls.pt" "eyJ" "$TOKEN_FERNANDO"

TOKEN_ANTONIO=$(login "antonio@rls.pt")
check "Login antonio@rls.pt" "eyJ" "$TOKEN_ANTONIO"

TOKEN_LEONARD=$(login "leonard@rls.pt")
check "Login leonard@rls.pt" "eyJ" "$TOKEN_LEONARD"

TOKEN_PAULO=$(login "paulo@rls.pt")
check "Login paulo@rls.pt" "eyJ" "$TOKEN_PAULO"

# Login inválido
R=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"nao@existe.pt","password":"errada"}')
check "Login inválido retorna erro" "error\|Unauthorized\|401" "$R"

# ============================================================
info "3. AUTH/ME"
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/auth/me")
check "GET /api/auth/me (carla)" "carla@rls.pt" "$R"

R=$(curl -s -H "Authorization: Bearer $TOKEN_RAMIRO" "$BASE/api/auth/me")
check "GET /api/auth/me (ramiro)" "ramiro@rls.pt" "$R"

R=$(curl -s "$BASE/api/auth/me")
check "GET /api/auth/me sem token retorna 401" "error\|Unauthorized" "$R"

# ============================================================
info "4. PROFILES - CRUD"

# Listar todos
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/profiles")
check "GET /api/profiles (listar todos)" "carla@rls.pt" "$R"

# Filtrar por role
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/profiles?role=tecnico")
check "GET /api/profiles?role=tecnico" "ramiro@rls.pt" "$R"

R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/profiles?role=admin")
check "GET /api/profiles?role=admin" "carla@rls.pt" "$R"

# Buscar por ID
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/profiles/$RAMIRO_ID")
check "GET /api/profiles/:id (ramiro)" "ramiro@rls.pt" "$R"

# Update perfil
R=$(curl -s -X PATCH "$BASE/api/profiles/$PAULO_ID" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Paulo Ferreira Actualizado"}')
check "PATCH /api/profiles/:id (atualizar nome)" "Actualizado" "$R"

# Toggle active
R=$(curl -s -X PATCH "$BASE/api/profiles/$PAULO_ID/toggle-active" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d '{"is_active":false}')
check "PATCH toggle-active (desativar paulo)" "false" "$R"

# Reativar
R=$(curl -s -X PATCH "$BASE/api/profiles/$PAULO_ID/toggle-active" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d '{"is_active":true}')
check "PATCH toggle-active (reativar paulo)" "true" "$R"

# Tecnicos-horas
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/profiles/tecnicos-horas")
check "GET /api/profiles/tecnicos-horas" "\[\|horasNormais\|totalHoras\|\]" "$R"

# ============================================================
info "5. OBRAS - CRUD"

# Criar obra 1 (com ramiro e luis)
R=$(curl -s -X POST "$BASE/api/obras" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d "{
    \"codigo\":\"RLS-001\",
    \"nome\":\"Instalação Elétrica - Lisboa\",
    \"cliente\":\"Cliente Alpha Lda\",
    \"prazo\":\"2026-06-30\",
    \"localizacao\":\"Rua das Flores 10, Lisboa\",
    \"created_by\":\"$CARLA_ID\",
    \"tecnico_ids\":[\"$RAMIRO_ID\",\"$LUIS_ID\"]
  }")
check "POST /api/obras (RLS-001 com 2 técnicos)" "RLS-001" "$R"
OBRA1_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Criar obra 2
R=$(curl -s -X POST "$BASE/api/obras" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d "{
    \"codigo\":\"RLS-002\",
    \"nome\":\"Redes e Cablagem - Porto\",
    \"cliente\":\"Beta Construções SA\",
    \"prazo\":\"2026-09-15\",
    \"localizacao\":\"Av. da Boavista 500, Porto\",
    \"created_by\":\"$CARLA_ID\",
    \"tecnico_ids\":[\"$FERNANDO_ID\",\"$ANTONIO_ID\",\"$LEONARD_ID\"]
  }")
check "POST /api/obras (RLS-002 com 3 técnicos)" "RLS-002" "$R"
OBRA2_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Criar obra 3 (só para teste de delete)
R=$(curl -s -X POST "$BASE/api/obras" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d "{
    \"codigo\":\"RLS-999\",
    \"nome\":\"Obra para Apagar\",
    \"cliente\":\"Teste Delete\",
    \"created_by\":\"$CARLA_ID\",
    \"tecnico_ids\":[]
  }")
check "POST /api/obras (RLS-999 para delete)" "RLS-999" "$R"
OBRA_DEL_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Listar obras
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/obras")
check "GET /api/obras (listar todas)" "RLS-001" "$R"

# Buscar por ID
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/obras/$OBRA1_ID")
check "GET /api/obras/:id (RLS-001)" "Lisboa" "$R"

# Obras do técnico
R=$(curl -s -H "Authorization: Bearer $TOKEN_RAMIRO" "$BASE/api/obras/minhas/$RAMIRO_ID")
check "GET /api/obras/minhas/:id (ramiro)" "RLS-001" "$R"

# Atualizar obra
R=$(curl -s -X PATCH "$BASE/api/obras/$OBRA1_ID" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d '{"progresso":25,"status":"ativa"}')
check "PATCH /api/obras/:id (progresso 25%)" "25" "$R"

# Apagar obra de teste
R=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  "$BASE/api/obras/$OBRA_DEL_ID")
check "DELETE /api/obras/:id (RLS-999)" "204" "$R"

# ============================================================
info "6. APONTAMENTOS - CRUD"

# Criar apontamentos para vários técnicos
criar_apontamento() {
  local token="$1"; local tec_id="$2"; local obra_id="$3"
  local tipo_hora="$4"; local entrada="$5"; local saida="$6"; local horas="$7"
  local data="$8"; local servico="$9"
  local obra_field=""
  if [ -n "$obra_id" ]; then obra_field="\"obra_id\":\"$obra_id\","; fi
  curl -s -X POST "$BASE/api/apontamentos" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "{\"tecnico_id\":\"$tec_id\",$obra_field\"tipo_servico\":\"$servico\",\"tipo_hora\":\"$tipo_hora\",\"hora_entrada\":\"$entrada\",\"hora_saida\":\"$saida\",\"total_horas\":$horas,\"data_apontamento\":\"$data\",\"descricao\":\"Trabalho realizado em $servico\"}"
}

# Ramiro - obra 1
R=$(criar_apontamento "$TOKEN_RAMIRO" "$RAMIRO_ID" "$OBRA1_ID" "normal" "08:00" "17:00" 8 "2026-03-01" "Instalação quadro elétrico")
check "POST apontamento Ramiro normal" "pendente" "$R"
APT1_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

R=$(criar_apontamento "$TOKEN_RAMIRO" "$RAMIRO_ID" "$OBRA1_ID" "extra_50" "17:00" "20:00" 3 "2026-03-01" "Horas extra instalação")
check "POST apontamento Ramiro extra_50" "extra_50" "$R"
APT2_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Luis - obra 1
R=$(criar_apontamento "$TOKEN_LUIS" "$LUIS_ID" "$OBRA1_ID" "normal" "09:00" "18:00" 8 "2026-03-02" "Cablagem estruturada")
check "POST apontamento Luís normal" "pendente" "$R"
APT3_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Fernando - obra 2
R=$(criar_apontamento "$TOKEN_FERNANDO" "$FERNANDO_ID" "$OBRA2_ID" "normal" "08:30" "17:30" 8 "2026-03-03" "Instalação rede dados")
check "POST apontamento Fernando normal" "pendente" "$R"
APT4_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# António - obra 2 - extra_100
R=$(criar_apontamento "$TOKEN_ANTONIO" "$ANTONIO_ID" "$OBRA2_ID" "extra_100" "00:00" "06:00" 6 "2026-03-04" "Trabalho noturno urgente")
check "POST apontamento António extra_100" "extra_100" "$R"
APT5_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Leonard - sem obra
R=$(criar_apontamento "$TOKEN_LEONARD" "$LEONARD_ID" "" "normal" "07:00" "15:00" 8 "2026-03-05" "Manutenção preventiva")
check "POST apontamento Leonard sem obra" "pendente" "$R"
APT6_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Listar apontamentos
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/apontamentos")
check "GET /api/apontamentos (todos)" "pendente" "$R"

# Filtrar por técnico
R=$(curl -s -H "Authorization: Bearer $TOKEN_RAMIRO" "$BASE/api/apontamentos?tecnico_id=$RAMIRO_ID")
check "GET /api/apontamentos?tecnico_id=ramiro" "Ramiro\|ramiro@rls.pt" "$R"

# Filtrar por obra
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/apontamentos?obra_id=$OBRA1_ID")
check "GET /api/apontamentos?obra_id=obra1" "RLS-001" "$R"

# Filtrar por status
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/apontamentos?status=pendente")
check "GET /api/apontamentos?status=pendente" "pendente" "$R"

# Filtrar por data
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/apontamentos?data_inicio=2026-03-01&data_fim=2026-03-02")
check "GET /api/apontamentos por intervalo de datas" "2026-03-0" "$R"

# Atualizar apontamento
R=$(curl -s -X PATCH "$BASE/api/apontamentos/$APT3_ID" \
  -H "Authorization: Bearer $TOKEN_LUIS" \
  -H "Content-Type: application/json" \
  -d '{"descricao":"Cablagem estruturada - actualizada","total_horas":9}')
check "PATCH /api/apontamentos/:id (atualizar luis)" "actualizada\|9" "$R"

# Admin aprova apontamento Ramiro
R=$(curl -s -X PATCH "$BASE/api/apontamentos/$APT1_ID/status" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d '{"status":"aprovado"}')
check "PATCH /api/apontamentos/:id/status (aprovar ramiro)" "aprovado" "$R"

# Admin rejeita apontamento António
R=$(curl -s -X PATCH "$BASE/api/apontamentos/$APT5_ID/status" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d '{"status":"rejeitado","nota_rejeicao":"Falta documentação de autorização para trabalho noturno"}')
check "PATCH /api/apontamentos/:id/status (rejeitar com nota)" "rejeitado" "$R"

# Aprovar mais alguns
curl -s -X PATCH "$BASE/api/apontamentos/$APT2_ID/status" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d '{"status":"aprovado"}' > /dev/null

curl -s -X PATCH "$BASE/api/apontamentos/$APT4_ID/status" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d '{"status":"aprovado"}' > /dev/null

# Criar apontamento para apagar
R=$(criar_apontamento "$TOKEN_PAULO" "$PAULO_ID" "$OBRA1_ID" "normal" "10:00" "12:00" 2 "2026-03-10" "Para apagar")
APT_DEL_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

R=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  "$BASE/api/apontamentos/$APT_DEL_ID")
check "DELETE /api/apontamentos/:id" "204" "$R"

# ============================================================
info "7. DESPESAS - CRUD"

criar_despesa() {
  local token="$1"; local tec_id="$2"; local obra_id="$3"
  local tipo="$4"; local valor="$5"; local data="$6"; local desc="$7"
  local participantes="$8"
  local obra_field=""
  if [ -n "$obra_id" ]; then obra_field="\"obra_id\":\"$obra_id\","; fi
  curl -s -X POST "$BASE/api/despesas" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "{\"tecnico_id\":\"$tec_id\",$obra_field\"tipo_despesa\":\"$tipo\",\"descricao\":\"$desc\",\"valor\":$valor,\"data_despesa\":\"$data\",\"participante_ids\":$participantes}"
}

# Combustível Ramiro
R=$(criar_despesa "$TOKEN_RAMIRO" "$RAMIRO_ID" "$OBRA1_ID" "combustível" 45.50 "2026-03-01" "Gasolina deslocação Lisboa" "[]")
check "POST despesa combustível Ramiro" "combustível\|45.5" "$R"
DESP1_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Alimentação com participantes (Luis e Fernando)
R=$(criar_despesa "$TOKEN_LUIS" "$LUIS_ID" "$OBRA1_ID" "alimentação" 32.80 "2026-03-02" "Almoço equipa obra Lisboa" "[\"$LUIS_ID\",\"$FERNANDO_ID\"]")
check "POST despesa alimentação Luís com participantes" "alimentação\|32.8" "$R"
DESP2_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Material Fernando - obra 2
R=$(criar_despesa "$TOKEN_FERNANDO" "$FERNANDO_ID" "$OBRA2_ID" "material" 189.99 "2026-03-03" "Cabo UTP Cat6 - 100m" "[]")
check "POST despesa material Fernando" "material\|189" "$R"
DESP3_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Alojamento António
R=$(criar_despesa "$TOKEN_ANTONIO" "$ANTONIO_ID" "$OBRA2_ID" "alojamento" 65.00 "2026-03-04" "Hotel Porto - 1 noite" "[]")
check "POST despesa alojamento António" "alojamento\|65" "$R"
DESP4_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Outro Leonard
R=$(criar_despesa "$TOKEN_LEONARD" "$LEONARD_ID" "" "outro" 25.00 "2026-03-05" "Estacionamento parque" "[]")
check "POST despesa outro Leonard (sem obra)" "outro\|25" "$R"
DESP5_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Listar despesas
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/despesas")
check "GET /api/despesas (todas)" "pendente" "$R"

# Filtrar por técnico
R=$(curl -s -H "Authorization: Bearer $TOKEN_RAMIRO" "$BASE/api/despesas?tecnico_id=$RAMIRO_ID")
check "GET /api/despesas?tecnico_id=ramiro" "combustível" "$R"

# Atualizar despesa
R=$(curl -s -X PATCH "$BASE/api/despesas/$DESP1_ID" \
  -H "Authorization: Bearer $TOKEN_RAMIRO" \
  -H "Content-Type: application/json" \
  -d '{"valor":48.00,"descricao":"Gasolina deslocação Lisboa - actualizado"}')
check "PATCH /api/despesas/:id (atualizar valor)" "48\|actualizado" "$R"

# Admin aprova despesas
R=$(curl -s -X PATCH "$BASE/api/despesas/$DESP1_ID/status" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d '{"status":"aprovada"}')
check "PATCH /api/despesas/:id/status (aprovar combustível)" "aprovad" "$R"

R=$(curl -s -X PATCH "$BASE/api/despesas/$DESP3_ID/status" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d '{"status":"aprovada"}')
check "PATCH /api/despesas/:id/status (aprovar material)" "aprovad" "$R"

# Rejeitar despesa
R=$(curl -s -X PATCH "$BASE/api/despesas/$DESP5_ID/status" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -H "Content-Type: application/json" \
  -d '{"status":"rejeitada","nota_rejeicao":"Estacionamento não é despesa elegível"}')
check "PATCH /api/despesas/:id/status (rejeitar leonard)" "rejeitad" "$R"

# Criar despesa para apagar
R=$(criar_despesa "$TOKEN_PAULO" "$PAULO_ID" "" "combustível" 10.00 "2026-03-10" "Para apagar" "[]")
DESP_DEL_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
R=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  "$BASE/api/despesas/$DESP_DEL_ID")
check "DELETE /api/despesas/:id" "204" "$R"

# ============================================================
info "8. DEPÓSITOS - CRUD"

criar_deposito() {
  local token="$1"; local admin_id="$2"; local tec_id="$3"
  local valor="$4"; local data="$5"; local desc="$6"
  curl -s -X POST "$BASE/api/depositos" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "{
      \"tecnico_id\":\"$tec_id\",
      \"admin_id\":\"$admin_id\",
      \"valor\":$valor,
      \"data_deposito\":\"$data\",
      \"descricao\":\"$desc\"
    }"
}

R=$(criar_deposito "$TOKEN_CARLA" "$CARLA_ID" "$RAMIRO_ID" 500.00 "2026-03-05" "Adiantamento março - Ramiro")
check "POST depósito para Ramiro (500€)" "500\|Ramiro" "$R"
DEP1_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

R=$(criar_deposito "$TOKEN_CARLA" "$CARLA_ID" "$LUIS_ID" 350.00 "2026-03-05" "Adiantamento março - Luís")
check "POST depósito para Luís (350€)" "350\|Lu" "$R"

R=$(criar_deposito "$TOKEN_CARLA" "$CARLA_ID" "$FERNANDO_ID" 600.00 "2026-03-06" "Adiantamento março - Fernando")
check "POST depósito para Fernando (600€)" "600" "$R"

R=$(criar_deposito "$TOKEN_CARLA" "$CARLA_ID" "$ANTONIO_ID" 450.00 "2026-03-07" "Adiantamento março - António")
check "POST depósito para António (450€)" "450" "$R"

R=$(criar_deposito "$TOKEN_CARLA" "$CARLA_ID" "$LEONARD_ID" 400.00 "2026-03-07" "Adiantamento março - Leonard")
check "POST depósito para Leonard (400€)" "400" "$R"

# Listar depósitos
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/depositos")
check "GET /api/depositos (todos)" "500\|350" "$R"

# Filtrar por técnico
R=$(curl -s -H "Authorization: Bearer $TOKEN_RAMIRO" "$BASE/api/depositos?tecnico_id=$RAMIRO_ID")
check "GET /api/depositos?tecnico_id=ramiro" "500" "$R"

# ============================================================
info "9. RECIBOS PAGAMENTO - CRUD"

# Criar recibo de pagamento (multipart com ficheiro fake)
RECIBO_TMP=$(mktemp /tmp/recibo_XXXXXX.pdf)
echo "%PDF-1.4 fake pdf content for testing" > "$RECIBO_TMP"

R=$(curl -s -X POST "$BASE/api/recibos-pagamento" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -F "tecnico_id=$RAMIRO_ID" \
  -F "admin_id=$CARLA_ID" \
  -F "periodo=2026-02" \
  -F "valor_bruto=2800" \
  -F "valor_liquido=2520" \
  -F "descricao=Salário Fevereiro 2026 - Ramiro" \
  -F "file=@$RECIBO_TMP;type=application/pdf")
check "POST /api/recibos-pagamento (Ramiro fev)" "2026-02\|2800\|Ramiro" "$R"
RECIBO1_ID=$(echo $R | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

R=$(curl -s -X POST "$BASE/api/recibos-pagamento" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -F "tecnico_id=$LUIS_ID" \
  -F "admin_id=$CARLA_ID" \
  -F "periodo=2026-02" \
  -F "valor_bruto=2600" \
  -F "valor_liquido=2340" \
  -F "descricao=Salário Fevereiro 2026 - Luís" \
  -F "file=@$RECIBO_TMP;type=application/pdf")
check "POST /api/recibos-pagamento (Luís fev)" "2026-02\|2600" "$R"

# Listar recibos
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/recibos-pagamento")
check "GET /api/recibos-pagamento (todos)" "2026-02" "$R"

# Filtrar por técnico
R=$(curl -s -H "Authorization: Bearer $TOKEN_RAMIRO" "$BASE/api/recibos-pagamento?tecnico_id=$RAMIRO_ID")
check "GET /api/recibos-pagamento?tecnico_id=ramiro" "Ramiro" "$R"

# Apagar recibo
RECIBO_TMP2=$(mktemp /tmp/recibo_XXXXXX.pdf)
echo "%PDF-1.4 fake pdf" > "$RECIBO_TMP2"
R_DEL=$(curl -s -X POST "$BASE/api/recibos-pagamento" \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  -F "tecnico_id=$PAULO_ID" \
  -F "admin_id=$CARLA_ID" \
  -F "periodo=2026-01" \
  -F "valor_bruto=1000" \
  -F "file=@$RECIBO_TMP2;type=application/pdf")
RECIBO_DEL_ID=$(echo $R_DEL | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
R=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  -H "Authorization: Bearer $TOKEN_CARLA" \
  "$BASE/api/recibos-pagamento/$RECIBO_DEL_ID")
check "DELETE /api/recibos-pagamento/:id" "204" "$R"

rm -f "$RECIBO_TMP" "$RECIBO_TMP2"

# ============================================================
info "10. TECNICOS-HORAS (com dados)"
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/profiles/tecnicos-horas")
check "GET /api/profiles/tecnicos-horas (com dados)" "horasNormais\|totalHoras" "$R"

R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/profiles/tecnicos-horas?mes=2026-03")
check "GET /api/profiles/tecnicos-horas?mes=2026-03" "horasNormais\|totalHoras" "$R"

# ============================================================
info "11. TESTES DE ERRO / VALIDAÇÃO"

# Criar utilizador com email duplicado
R=$(curl -s -X POST "$BASE/api/profiles" \
  -H "Content-Type: application/json" \
  -d '{"email":"ramiro@rls.pt","password":"Rls@2024","full_name":"Duplicado","role":"tecnico"}')
check "Criar utilizador duplicado retorna erro" "error\|already\|duplicate\|conflict\|409\|500" "$R"

# Apontamento com tipo_hora inválido
R=$(curl -s -X POST "$BASE/api/apontamentos" \
  -H "Authorization: Bearer $TOKEN_RAMIRO" \
  -H "Content-Type: application/json" \
  -d "{\"tecnico_id\":\"$RAMIRO_ID\",\"tipo_servico\":\"Teste\",\"tipo_hora\":\"invalido\",\"hora_entrada\":\"08:00\",\"data_apontamento\":\"2026-03-10\"}")
check "Apontamento tipo_hora inválido retorna erro" "error\|invalid\|check\|400\|500" "$R"

# Obra com ID inexistente
R=$(curl -s -H "Authorization: Bearer $TOKEN_CARLA" "$BASE/api/obras/00000000-0000-0000-0000-000000000000")
check "GET obra inexistente retorna 404/erro" "error\|not found\|404" "$R"

# Acesso sem token a endpoint protegido
R=$(curl -s "$BASE/api/obras")
check "GET /api/obras sem token retorna 401" "error\|Unauthorized\|401" "$R"

# ============================================================
info "RESUMO FINAL"
echo ""
echo -e "${GREEN}✅ PASSOU: $PASS testes${NC}"
echo -e "${RED}❌ FALHOU: $FAIL testes${NC}"
echo ""

if [ ${#ERROS[@]} -gt 0 ]; then
  echo -e "${RED}Erros encontrados:${NC}"
  for e in "${ERROS[@]}"; do
    echo -e "  ${RED}• $e${NC}"
  done
fi

echo ""
echo -e "${BLUE}IDs criados (para referência):${NC}"
echo "  Carla (admin):  $CARLA_ID"
echo "  Ramiro:         $RAMIRO_ID"
echo "  Luís:           $LUIS_ID"
echo "  Fernando:       $FERNANDO_ID"
echo "  António:        $ANTONIO_ID"
echo "  Leonard:        $LEONARD_ID"
echo "  Paulo:          $PAULO_ID"
echo "  Obra RLS-001:   $OBRA1_ID"
echo "  Obra RLS-002:   $OBRA2_ID"
echo ""
