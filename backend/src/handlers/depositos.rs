use actix_web::{web, HttpResponse};
use sqlx::postgres::PgArguments;
use sqlx::Arguments;
use sqlx::Row;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::deposito::{CreateDepositoRequest, Deposito, DepositoQuery};
use crate::AppState;

pub async fn list_depositos(
    state: web::Data<AppState>,
    query: web::Query<DepositoQuery>,
) -> Result<HttpResponse, AppError> {
    let rows = if let Some(ref tecnico_id) = query.tecnico_id {
        let mut args = PgArguments::default();
        args.add(*tecnico_id).ok();
        sqlx::query_with(
            "SELECT id, tecnico_id, admin_id, valor, descricao, data_deposito, created_at \
             FROM depositos WHERE tecnico_id = $1 ORDER BY data_deposito DESC",
            args,
        )
        .fetch_all(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
    } else {
        sqlx::query(
            "SELECT id, tecnico_id, admin_id, valor, descricao, data_deposito, created_at \
             FROM depositos ORDER BY data_deposito DESC",
        )
        .fetch_all(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
    };

    let depositos: Vec<Deposito> = rows
        .iter()
        .map(|row| Deposito {
            id: row.get::<Uuid, _>("id"),
            tecnico_id: row.get::<Uuid, _>("tecnico_id"),
            admin_id: row.get::<Uuid, _>("admin_id"),
            valor: row.get("valor"),
            descricao: row.try_get("descricao").ok().flatten(),
            data_deposito: row.get("data_deposito"),
            created_at: row.try_get("created_at").ok().flatten(),
        })
        .collect();

    Ok(HttpResponse::Ok().json(depositos))
}

pub async fn create_deposito(
    state: web::Data<AppState>,
    body: web::Json<CreateDepositoRequest>,
) -> Result<HttpResponse, AppError> {
    let new_id = Uuid::new_v4();

    let row = sqlx::query(
        "INSERT INTO depositos (id, tecnico_id, admin_id, valor, descricao, data_deposito) \
         VALUES ($1, $2, $3, $4, $5, $6) \
         RETURNING id, tecnico_id, admin_id, valor, descricao, data_deposito, created_at",
    )
    .bind(new_id)
    .bind(body.tecnico_id)
    .bind(body.admin_id)
    .bind(body.valor)
    .bind(&body.descricao)
    .bind(body.data_deposito)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    let deposito = Deposito {
        id: row.get::<Uuid, _>("id"),
        tecnico_id: row.get::<Uuid, _>("tecnico_id"),
        admin_id: row.get::<Uuid, _>("admin_id"),
        valor: row.get("valor"),
        descricao: row.try_get("descricao").ok().flatten(),
        data_deposito: row.get("data_deposito"),
        created_at: row.try_get("created_at").ok().flatten(),
    };

    Ok(HttpResponse::Created().json(deposito))
}
