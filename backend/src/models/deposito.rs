use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc, NaiveDate};


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Deposito {
    pub id: Uuid,
    pub tecnico_id: Uuid,
    pub admin_id: Uuid,
    pub valor: f64,
    pub descricao: Option<String>,
    pub data_deposito: NaiveDate,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDepositoRequest {
    pub tecnico_id: Uuid,
    pub admin_id: Uuid,
    pub valor: f64,
    pub descricao: Option<String>,
    pub data_deposito: NaiveDate,
}

#[derive(Debug, Deserialize)]
pub struct DepositoQuery {
    pub tecnico_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReciboPagamento {
    pub id: Uuid,
    pub tecnico_id: Uuid,
    pub admin_id: Uuid,
    pub periodo: String,
    pub valor_bruto: f64,
    pub valor_liquido: Option<f64>,
    pub descricao: Option<String>,
    pub storage_path: String,
    pub url: String,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct ReciboPagamentoQuery {
    pub tecnico_id: Option<Uuid>,
}
