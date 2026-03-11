use actix_web::{web, HttpResponse};
use sqlx::postgres::PgArguments;
use sqlx::Arguments;
use sqlx::Row;
use uuid::Uuid;
use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;

use crate::errors::AppError;
use crate::models::despesa::{
    CreateDespesaRequest, Despesa, DespesaParticipante, DespesaQuery, ParticipanteTecnico,
    ReciboDespesa, UpdateDespesaRequest, UpdateDespesaStatusRequest,
};
use crate::AppState;

async fn fetch_full_despesa(state: &AppState, despesa_id: Uuid) -> Result<Despesa, AppError> {
    let row = sqlx::query(
        "SELECT id, tecnico_id, obra_id, tipo_despesa, descricao, valor, \
         data_despesa, status, nota_rejeicao, created_at \
         FROM despesas WHERE id = $1",
    )
    .bind(despesa_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?
    .ok_or(AppError::NotFound)?;

    let tecnico_id: Uuid = row.get::<Uuid, _>("tecnico_id");
    let obra_id: Option<Uuid> = row.try_get("obra_id").ok().flatten();

    let tecnico_row = sqlx::query(
        "SELECT id, full_name, role, avatar_url, is_active FROM profiles WHERE id = $1",
    )
    .bind(tecnico_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    let tecnico_json = tecnico_row.map(|r| {
        serde_json::json!({
            "id": r.get::<Uuid, _>("id"),
            "full_name": r.get::<String, _>("full_name"),
            "role": r.get::<String, _>("role"),
            "avatar_url": r.try_get::<Option<String>, _>("avatar_url").ok().flatten(),
            "is_active": r.get::<bool, _>("is_active"),
        })
    });

    let obra_json = if let Some(oid) = obra_id {
        let obra_row = sqlx::query(
            "SELECT id, codigo, nome, cliente, status, progresso FROM obras WHERE id = $1",
        )
        .bind(oid)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;
        obra_row.map(|r| {
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "codigo": r.get::<String, _>("codigo"),
                "nome": r.get::<String, _>("nome"),
                "cliente": r.get::<String, _>("cliente"),
                "status": r.get::<String, _>("status"),
                "progresso": r.get::<i32, _>("progresso"),
            })
        })
    } else {
        None
    };

    let recibo_rows = sqlx::query(
        "SELECT id, despesa_id, storage_path, url, tipo_ficheiro, created_at \
         FROM recibos_despesas WHERE despesa_id = $1 ORDER BY created_at",
    )
    .bind(despesa_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    let recibos: Vec<ReciboDespesa> = recibo_rows
        .iter()
        .map(|r| ReciboDespesa {
            id: r.get::<Uuid, _>("id"),
            despesa_id: r.get::<Uuid, _>("despesa_id"),
            storage_path: r.get::<String, _>("storage_path"),
            url: r.get::<String, _>("url"),
            tipo_ficheiro: r.get::<String, _>("tipo_ficheiro"),
            created_at: r.try_get("created_at").ok().flatten(),
        })
        .collect();

    let participante_rows = sqlx::query(
        "SELECT p.id, p.full_name, p.avatar_url \
         FROM despesa_participantes dp \
         JOIN profiles p ON p.id = dp.tecnico_id \
         WHERE dp.despesa_id = $1",
    )
    .bind(despesa_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    let despesa_participantes: Vec<DespesaParticipante> = participante_rows
        .iter()
        .map(|r| DespesaParticipante {
            tecnico: ParticipanteTecnico {
                id: r.get::<Uuid, _>("id"),
                full_name: r.get::<String, _>("full_name"),
                avatar_url: r.try_get("avatar_url").ok().flatten(),
            },
        })
        .collect();

    Ok(Despesa {
        id: row.get::<Uuid, _>("id"),
        tecnico_id,
        obra_id,
        tipo_despesa: row.get::<String, _>("tipo_despesa"),
        descricao: row.try_get("descricao").ok().flatten(),
        valor: row.get("valor"),
        data_despesa: row.get("data_despesa"),
        status: row.get::<String, _>("status"),
        nota_rejeicao: row.try_get("nota_rejeicao").ok().flatten(),
        created_at: row.try_get("created_at").ok().flatten(),
        tecnico: tecnico_json,
        obra: obra_json,
        recibos,
        despesa_participantes,
    })
}

pub async fn list_despesas(
    state: web::Data<AppState>,
    query: web::Query<DespesaQuery>,
) -> Result<HttpResponse, AppError> {
    let mut conditions: Vec<String> = vec![];
    let mut args = PgArguments::default();
    let mut idx = 1usize;

    if let Some(ref v) = query.tecnico_id {
        conditions.push(format!("tecnico_id = ${idx}"));
        args.add(*v).ok();
        idx += 1;
    }
    if let Some(ref v) = query.obra_id {
        conditions.push(format!("obra_id = ${idx}"));
        args.add(*v).ok();
        idx += 1;
    }
    if let Some(ref v) = query.status {
        conditions.push(format!("status = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    let _ = idx;

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id FROM despesas {} ORDER BY data_despesa DESC, created_at DESC",
        where_clause
    );

    let id_rows = sqlx::query_with(&sql, args)
        .fetch_all(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let mut despesas = Vec::new();
    for id_row in &id_rows {
        let despesa_id: Uuid = id_row.get::<Uuid, _>("id");
        let d = fetch_full_despesa(&state, despesa_id).await?;
        despesas.push(d);
    }

    Ok(HttpResponse::Ok().json(despesas))
}

pub async fn create_despesa(
    state: web::Data<AppState>,
    body: web::Json<CreateDespesaRequest>,
) -> Result<HttpResponse, AppError> {
    let new_id = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO despesas \
         (id, tecnico_id, obra_id, tipo_despesa, descricao, valor, data_despesa, status) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendente')",
    )
    .bind(new_id)
    .bind(body.tecnico_id)
    .bind(body.obra_id)
    .bind(&body.tipo_despesa)
    .bind(&body.descricao)
    .bind(body.valor)
    .bind(body.data_despesa)
    .execute(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    if let Some(ref participante_ids) = body.participante_ids {
        for pid in participante_ids {
            sqlx::query(
                "INSERT INTO despesa_participantes (despesa_id, tecnico_id) VALUES ($1, $2) \
                 ON CONFLICT DO NOTHING",
            )
            .bind(new_id)
            .bind(pid)
            .execute(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;
        }
    }

    if let Some(ref ficheiros) = body.ficheiros {
        let date_str = body.data_despesa.format("%Y-%m-%d").to_string();
        for (i, ficheiro) in ficheiros.iter().enumerate() {
            let ext = if let Some(ref e) = ficheiro.ext {
                e.clone()
            } else if ficheiro.tipo_ficheiro.contains("pdf") {
                "pdf".to_string()
            } else {
                "jpg".to_string()
            };

            let dir = format!(
                "{}/recibos/{}/{}",
                state.uploads_dir, body.tecnico_id, date_str
            );
            tokio::fs::create_dir_all(&dir).await.ok();

            let file_name = format!("{}_{}.{}", new_id, i, ext);
            let file_path = format!("{}/{}", dir, file_name);

            let bytes = BASE64_STANDARD
                .decode(&ficheiro.base64)
                .map_err(|e| AppError::BadRequest(e.to_string()))?;

            tokio::fs::write(&file_path, &bytes)
                .await
                .map_err(|e| AppError::InternalError(e.to_string()))?;

            let url = crate::utils::make_file_url(
                &state.backend_url,
                &format!("uploads/recibos/{}/{}/{}", body.tecnico_id, date_str, file_name),
            );

            let recibo_id = Uuid::new_v4();
            sqlx::query(
                "INSERT INTO recibos_despesas (id, despesa_id, storage_path, url, tipo_ficheiro) \
                 VALUES ($1, $2, $3, $4, $5)",
            )
            .bind(recibo_id)
            .bind(new_id)
            .bind(&file_path)
            .bind(&url)
            .bind(&ficheiro.tipo_ficheiro)
            .execute(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;
        }
    }

    let despesa = fetch_full_despesa(&state, new_id).await?;
    Ok(HttpResponse::Created().json(despesa))
}

pub async fn update_despesa(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateDespesaRequest>,
) -> Result<HttpResponse, AppError> {
    let despesa_id = path.into_inner();

    let mut sets: Vec<String> = vec![];
    let mut args = PgArguments::default();
    let mut idx = 1usize;

    if let Some(ref v) = body.tipo_despesa {
        sets.push(format!("tipo_despesa = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(ref v) = body.descricao {
        sets.push(format!("descricao = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(v) = body.valor {
        sets.push(format!("valor = ${idx}"));
        args.add(v).ok();
        idx += 1;
    }
    if let Some(v) = body.data_despesa {
        sets.push(format!("data_despesa = ${idx}"));
        args.add(v).ok();
        idx += 1;
    }
    if let Some(ref v) = body.obra_id {
        sets.push(format!("obra_id = ${idx}"));
        args.add(*v).ok();
        idx += 1;
    }

    if !sets.is_empty() {
        args.add(despesa_id).ok();
        let sql = format!(
            "UPDATE despesas SET {} WHERE id = ${}",
            sets.join(", "),
            idx
        );
        sqlx::query_with(&sql, args)
            .execute(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;
    }

    if let Some(ref participante_ids) = body.participante_ids {
        sqlx::query("DELETE FROM despesa_participantes WHERE despesa_id = $1")
            .bind(despesa_id)
            .execute(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;

        for pid in participante_ids {
            sqlx::query(
                "INSERT INTO despesa_participantes (despesa_id, tecnico_id) VALUES ($1, $2) \
                 ON CONFLICT DO NOTHING",
            )
            .bind(despesa_id)
            .bind(pid)
            .execute(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;
        }
    }

    let despesa = fetch_full_despesa(&state, despesa_id).await?;
    Ok(HttpResponse::Ok().json(despesa))
}

pub async fn update_status(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateDespesaStatusRequest>,
) -> Result<HttpResponse, AppError> {
    let despesa_id = path.into_inner();

    sqlx::query("UPDATE despesas SET status = $1, nota_rejeicao = $2 WHERE id = $3")
        .bind(&body.status)
        .bind(&body.nota_rejeicao)
        .bind(despesa_id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let despesa = fetch_full_despesa(&state, despesa_id).await?;
    Ok(HttpResponse::Ok().json(despesa))
}

pub async fn delete_despesa(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let despesa_id = path.into_inner();

    sqlx::query("DELETE FROM despesas WHERE id = $1")
        .bind(despesa_id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(HttpResponse::NoContent().finish())
}

pub async fn delete_recibo_despesa(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let recibo_id = path.into_inner();

    sqlx::query("DELETE FROM recibos_despesas WHERE id = $1")
        .bind(recibo_id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(HttpResponse::NoContent().finish())
}
