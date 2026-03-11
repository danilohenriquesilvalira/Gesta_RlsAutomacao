use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc, NaiveDate};


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReciboDespesa {
    pub id: Uuid,
    pub despesa_id: Uuid,
    pub storage_path: String,
    pub url: String,
    pub tipo_ficheiro: String,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DespesaParticipante {
    pub tecnico: ParticipanteTecnico,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParticipanteTecnico {
    pub id: Uuid,
    pub full_name: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Despesa {
    pub id: Uuid,
    pub tecnico_id: Uuid,
    pub obra_id: Option<Uuid>,
    pub tipo_despesa: String,
    pub descricao: Option<String>,
    pub valor: f64,
    pub data_despesa: NaiveDate,
    pub status: String,
    pub nota_rejeicao: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub tecnico: Option<serde_json::Value>,
    pub obra: Option<serde_json::Value>,
    pub recibos: Vec<ReciboDespesa>,
    pub despesa_participantes: Vec<DespesaParticipante>,
}

#[derive(Debug, Deserialize)]
pub struct FicheiroDespesa {
    pub base64: String,
    pub tipo_ficheiro: String,
    pub ext: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDespesaRequest {
    pub tecnico_id: Uuid,
    pub obra_id: Option<Uuid>,
    pub tipo_despesa: String,
    pub descricao: Option<String>,
    pub valor: f64,
    pub data_despesa: NaiveDate,
    pub participante_ids: Option<Vec<Uuid>>,
    pub ficheiros: Option<Vec<FicheiroDespesa>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDespesaRequest {
    pub tipo_despesa: Option<String>,
    pub descricao: Option<String>,
    pub valor: Option<f64>,
    pub data_despesa: Option<NaiveDate>,
    pub obra_id: Option<Uuid>,
    pub participante_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDespesaStatusRequest {
    pub status: String,
    pub nota_rejeicao: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DespesaQuery {
    pub tecnico_id: Option<Uuid>,
    pub obra_id: Option<Uuid>,
    pub status: Option<String>,
}
