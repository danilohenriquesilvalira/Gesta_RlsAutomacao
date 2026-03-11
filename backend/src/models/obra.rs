use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc, NaiveDate};


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Obra {
    pub id: Uuid,
    pub codigo: String,
    pub nome: String,
    pub cliente: String,
    pub status: String,
    pub progresso: i32,
    pub prazo: Option<NaiveDate>,
    pub orcamento: Option<f64>,
    pub localizacao: Option<String>,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub created_by: Option<Uuid>,
    pub created_at: Option<DateTime<Utc>>,
    pub executante: Option<ExecutanteInfo>,
    pub obra_tecnicos: Vec<ObraTecnico>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExecutanteInfo {
    pub full_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ObraTecnico {
    pub tecnico: TecnicoInfo,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TecnicoInfo {
    pub id: Uuid,
    pub full_name: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateObraRequest {
    pub codigo: String,
    pub nome: String,
    pub cliente: String,
    pub prazo: Option<NaiveDate>,
    pub orcamento: Option<f64>,
    pub created_by: Option<Uuid>,
    pub localizacao: Option<String>,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub tecnico_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateObraRequest {
    pub codigo: Option<String>,
    pub nome: Option<String>,
    pub cliente: Option<String>,
    pub status: Option<String>,
    pub progresso: Option<i32>,
    pub prazo: Option<NaiveDate>,
    pub orcamento: Option<f64>,
    pub localizacao: Option<String>,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub tecnico_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Deserialize)]
pub struct ObraQuery {
    pub status: Option<String>,
    pub created_by: Option<Uuid>,
}
