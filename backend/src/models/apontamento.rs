use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc, NaiveDate};


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Foto {
    pub id: Uuid,
    pub apontamento_id: Uuid,
    pub storage_path: String,
    pub url: String,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Apontamento {
    pub id: Uuid,
    pub tecnico_id: Uuid,
    pub obra_id: Option<Uuid>,
    pub tipo_servico: String,
    pub tipo_hora: String,
    pub hora_entrada: String,
    pub hora_saida: Option<String>,
    pub total_horas: Option<f64>,
    pub descricao: Option<String>,
    pub status: String,
    pub nota_rejeicao: Option<String>,
    pub data_apontamento: NaiveDate,
    pub synced_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub tecnico: Option<serde_json::Value>,
    pub obra: Option<serde_json::Value>,
    pub fotos: Vec<Foto>,
}

#[derive(Debug, Deserialize)]
pub struct CreateApontamentoRequest {
    pub tecnico_id: Uuid,
    pub obra_id: Option<Uuid>,
    pub tipo_servico: String,
    pub tipo_hora: String,
    pub hora_entrada: String,
    pub hora_saida: Option<String>,
    pub total_horas: Option<f64>,
    pub descricao: Option<String>,
    pub data_apontamento: NaiveDate,
    pub fotos_base64: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateApontamentoRequest {
    pub tipo_servico: Option<String>,
    pub tipo_hora: Option<String>,
    pub hora_entrada: Option<String>,
    pub hora_saida: Option<String>,
    pub total_horas: Option<f64>,
    pub descricao: Option<String>,
    pub data_apontamento: Option<NaiveDate>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String,
    pub nota_rejeicao: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApontamentoQuery {
    pub tecnico_id: Option<Uuid>,
    pub obra_id: Option<Uuid>,
    pub status: Option<String>,
    pub data_inicio: Option<NaiveDate>,
    pub data_fim: Option<NaiveDate>,
}
