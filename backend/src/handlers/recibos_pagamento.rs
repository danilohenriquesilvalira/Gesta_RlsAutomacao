use actix_web::{web, HttpResponse};
use actix_multipart::Multipart;
use futures::StreamExt;
use bytes::BytesMut;
use sqlx::postgres::PgArguments;
use sqlx::Arguments;
use sqlx::Row;
use uuid::Uuid;
use chrono::Utc;

use crate::errors::AppError;
use crate::models::deposito::{ReciboPagamento, ReciboPagamentoQuery};
use crate::AppState;

pub async fn list_recibos_pagamento(
    state: web::Data<AppState>,
    query: web::Query<ReciboPagamentoQuery>,
) -> Result<HttpResponse, AppError> {
    let rows = if let Some(ref tecnico_id) = query.tecnico_id {
        let mut args = PgArguments::default();
        args.add(*tecnico_id).ok();
        sqlx::query_with(
            "SELECT id, tecnico_id, admin_id, periodo, valor_bruto::float8 AS valor_bruto, valor_liquido::float8 AS valor_liquido, \
             descricao, storage_path, url, created_at \
             FROM recibos_pagamento WHERE tecnico_id = $1 ORDER BY created_at DESC",
            args,
        )
        .fetch_all(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
    } else {
        sqlx::query(
            "SELECT id, tecnico_id, admin_id, periodo, valor_bruto::float8 AS valor_bruto, valor_liquido::float8 AS valor_liquido, \
             descricao, storage_path, url, created_at \
             FROM recibos_pagamento ORDER BY created_at DESC",
        )
        .fetch_all(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
    };

    let recibos: Vec<ReciboPagamento> = rows
        .iter()
        .map(|row| ReciboPagamento {
            id: row.get::<Uuid, _>("id"),
            tecnico_id: row.get::<Uuid, _>("tecnico_id"),
            admin_id: row.get::<Uuid, _>("admin_id"),
            periodo: row.get::<String, _>("periodo"),
            valor_bruto: row.get("valor_bruto"),
            valor_liquido: row.try_get("valor_liquido").ok().flatten(),
            descricao: row.try_get("descricao").ok().flatten(),
            storage_path: row.get::<String, _>("storage_path"),
            url: row.get::<String, _>("url"),
            created_at: row.try_get("created_at").ok().flatten(),
        })
        .collect();

    Ok(HttpResponse::Ok().json(recibos))
}

pub async fn create_recibo_pagamento(
    state: web::Data<AppState>,
    mut payload: Multipart,
) -> Result<HttpResponse, AppError> {
    let mut tecnico_id: Option<Uuid> = None;
    let mut admin_id: Option<Uuid> = None;
    let mut periodo: Option<String> = None;
    let mut valor_bruto: Option<f64> = None;
    let mut valor_liquido: Option<f64> = None;
    let mut descricao: Option<String> = None;
    let mut file_data: Option<(Vec<u8>, String)> = None;

    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|e| AppError::BadRequest(e.to_string()))?;
        let field_name = field
            .content_disposition()
            .and_then(|cd| cd.get_name())
            .unwrap_or("")
            .to_string();

        match field_name.as_str() {
            "tecnico_id" => {
                let mut buf = BytesMut::new();
                while let Some(chunk) = field.next().await {
                    let data = chunk.map_err(|e| AppError::BadRequest(e.to_string()))?;
                    buf.extend_from_slice(&data);
                }
                let s = String::from_utf8(buf.to_vec())
                    .map_err(|e| AppError::BadRequest(e.to_string()))?;
                tecnico_id = Some(
                    Uuid::parse_str(s.trim())
                        .map_err(|e| AppError::BadRequest(e.to_string()))?,
                );
            }
            "admin_id" => {
                let mut buf = BytesMut::new();
                while let Some(chunk) = field.next().await {
                    let data = chunk.map_err(|e| AppError::BadRequest(e.to_string()))?;
                    buf.extend_from_slice(&data);
                }
                let s = String::from_utf8(buf.to_vec())
                    .map_err(|e| AppError::BadRequest(e.to_string()))?;
                admin_id = Some(
                    Uuid::parse_str(s.trim())
                        .map_err(|e| AppError::BadRequest(e.to_string()))?,
                );
            }
            "periodo" => {
                let mut buf = BytesMut::new();
                while let Some(chunk) = field.next().await {
                    let data = chunk.map_err(|e| AppError::BadRequest(e.to_string()))?;
                    buf.extend_from_slice(&data);
                }
                periodo = Some(
                    String::from_utf8(buf.to_vec())
                        .map_err(|e| AppError::BadRequest(e.to_string()))?,
                );
            }
            "valor_bruto" => {
                let mut buf = BytesMut::new();
                while let Some(chunk) = field.next().await {
                    let data = chunk.map_err(|e| AppError::BadRequest(e.to_string()))?;
                    buf.extend_from_slice(&data);
                }
                let s = String::from_utf8(buf.to_vec())
                    .map_err(|e| AppError::BadRequest(e.to_string()))?;
                valor_bruto = Some(
                    s.trim().parse::<f64>()
                        .map_err(|e| AppError::BadRequest(e.to_string()))?,
                );
            }
            "valor_liquido" => {
                let mut buf = BytesMut::new();
                while let Some(chunk) = field.next().await {
                    let data = chunk.map_err(|e| AppError::BadRequest(e.to_string()))?;
                    buf.extend_from_slice(&data);
                }
                let s = String::from_utf8(buf.to_vec())
                    .map_err(|e| AppError::BadRequest(e.to_string()))?;
                let trimmed = s.trim();
                if !trimmed.is_empty() {
                    valor_liquido = trimmed.parse::<f64>().ok();
                }
            }
            "descricao" => {
                let mut buf = BytesMut::new();
                while let Some(chunk) = field.next().await {
                    let data = chunk.map_err(|e| AppError::BadRequest(e.to_string()))?;
                    buf.extend_from_slice(&data);
                }
                let s = String::from_utf8(buf.to_vec())
                    .map_err(|e| AppError::BadRequest(e.to_string()))?;
                let trimmed = s.trim().to_string();
                if !trimmed.is_empty() {
                    descricao = Some(trimmed);
                }
            }
            "file" | "recibo" => {
                let content_type = field
                    .content_type()
                    .map(|ct| ct.to_string())
                    .unwrap_or_default();

                let ext = if content_type.contains("pdf") {
                    "pdf"
                } else if content_type.contains("png") {
                    "png"
                } else if content_type.contains("gif") {
                    "gif"
                } else if content_type.contains("jpeg") || content_type.contains("jpg") {
                    "jpg"
                } else {
                    "pdf"
                };

                let mut buf = BytesMut::new();
                while let Some(chunk) = field.next().await {
                    let data = chunk.map_err(|e| AppError::BadRequest(e.to_string()))?;
                    buf.extend_from_slice(&data);
                }
                file_data = Some((buf.to_vec(), ext.to_string()));
            }
            _ => {
                while let Some(_chunk) = field.next().await {}
            }
        }
    }

    let tecnico_id =
        tecnico_id.ok_or_else(|| AppError::BadRequest("tecnico_id required".to_string()))?;
    let admin_id =
        admin_id.ok_or_else(|| AppError::BadRequest("admin_id required".to_string()))?;
    let periodo =
        periodo.ok_or_else(|| AppError::BadRequest("periodo required".to_string()))?;
    let valor_bruto =
        valor_bruto.ok_or_else(|| AppError::BadRequest("valor_bruto required".to_string()))?;
    let (file_bytes, ext) =
        file_data.ok_or_else(|| AppError::BadRequest("file required".to_string()))?;

    let timestamp = Utc::now().timestamp();
    let dir = format!(
        "{}/recibos-pagamento/{}",
        state.uploads_dir, tecnico_id
    );
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let file_name = format!("{}.{}", timestamp, ext);
    let file_path = format!("{}/{}", dir, file_name);
    tokio::fs::write(&file_path, &file_bytes)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let url = crate::utils::make_file_url(
        &state.backend_url,
        &format!("uploads/recibos-pagamento/{}/{}", tecnico_id, file_name),
    );

    let new_id = Uuid::new_v4();
    let row = sqlx::query(
        "INSERT INTO recibos_pagamento \
         (id, tecnico_id, admin_id, periodo, valor_bruto, valor_liquido, descricao, storage_path, url) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) \
         RETURNING id, tecnico_id, admin_id, periodo, valor_bruto::float8 AS valor_bruto, valor_liquido::float8 AS valor_liquido, \
         descricao, storage_path, url, created_at",
    )
    .bind(new_id)
    .bind(tecnico_id)
    .bind(admin_id)
    .bind(&periodo)
    .bind(valor_bruto)
    .bind(valor_liquido)
    .bind(&descricao)
    .bind(&file_path)
    .bind(&url)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    let recibo = ReciboPagamento {
        id: row.get::<Uuid, _>("id"),
        tecnico_id: row.get::<Uuid, _>("tecnico_id"),
        admin_id: row.get::<Uuid, _>("admin_id"),
        periodo: row.get::<String, _>("periodo"),
        valor_bruto: row.get("valor_bruto"),
        valor_liquido: row.try_get("valor_liquido").ok().flatten(),
        descricao: row.try_get("descricao").ok().flatten(),
        storage_path: row.get::<String, _>("storage_path"),
        url: row.get::<String, _>("url"),
        created_at: row.try_get("created_at").ok().flatten(),
    };

    Ok(HttpResponse::Created().json(recibo))
}

pub async fn delete_recibo_pagamento(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let recibo_id = path.into_inner();

    sqlx::query("DELETE FROM recibos_pagamento WHERE id = $1")
        .bind(recibo_id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(HttpResponse::NoContent().finish())
}
