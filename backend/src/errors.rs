use actix_web::{HttpResponse, ResponseError};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Forbidden")]
    Forbidden,
    #[error("Not Found")]
    NotFound,
    #[error("Bad Request: {0}")]
    BadRequest(String),
    #[error("Internal Server Error: {0}")]
    InternalError(String),
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        match self {
            AppError::Unauthorized => {
                HttpResponse::Unauthorized().json(json!({"error": "Unauthorized"}))
            }
            AppError::Forbidden => {
                HttpResponse::Forbidden().json(json!({"error": "Forbidden"}))
            }
            AppError::NotFound => {
                HttpResponse::NotFound().json(json!({"error": "Not found"}))
            }
            AppError::BadRequest(msg) => {
                HttpResponse::BadRequest().json(json!({"error": msg}))
            }
            AppError::InternalError(msg) => {
                HttpResponse::InternalServerError().json(json!({"error": msg}))
            }
        }
    }
}
