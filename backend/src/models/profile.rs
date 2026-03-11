use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Profile {
    pub id: Uuid,
    pub full_name: String,
    pub role: String,
    pub avatar_url: Option<String>,
    pub is_active: bool,
    pub email: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProfileRequest {
    pub email: String,
    pub password: String,
    pub full_name: String,
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub full_name: Option<String>,
    pub role: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ToggleActiveRequest {
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TecnicoHoras {
    pub id: Uuid,
    pub full_name: String,
    pub avatar_url: Option<String>,
    pub role: String,
    pub is_active: bool,
    #[serde(rename = "horasNormais")]
    pub horas_normais: f64,
    #[serde(rename = "horasExtras")]
    pub horas_extras: f64,
    #[serde(rename = "totalHoras")]
    pub total_horas: f64,
    #[serde(rename = "obraAtual")]
    pub obra_atual: Option<String>,
    #[serde(rename = "obrasAtivas")]
    pub obras_ativas: i64,
}
