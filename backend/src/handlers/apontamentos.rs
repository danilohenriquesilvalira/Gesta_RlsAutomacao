use actix_web::{web, HttpResponse};
use sqlx::postgres::PgArguments;
use sqlx::Arguments;
use sqlx::Row;
use uuid::Uuid;
use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;

use crate::errors::AppError;
use crate::models::apontamento::{
    Apontamento, ApontamentoQuery, CreateApontamentoRequest, Foto, UpdateApontamentoRequest,
    UpdateStatusRequest,
};
use crate::AppState;

async fn fetch_fotos(pool: &sqlx::PgPool, apontamento_id: Uuid) -> Result<Vec<Foto>, AppError> {
    let rows = sqlx::query(
        "SELECT id, apontamento_id, storage_path, url, created_at \
         FROM fotos \
         WHERE apontamento_id = $1 \
         ORDER BY created_at",
    )
    .bind(apontamento_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(rows
        .iter()
        .map(|r| Foto {
            id: r.get::<Uuid, _>("id"),
            apontamento_id: r.get::<Uuid, _>("apontamento_id"),
            storage_path: r.get::<String, _>("storage_path"),
            url: r.get::<String, _>("url"),
            created_at: r.try_get("created_at").ok().flatten(),
        })
        .collect())
}

async fn fetch_full_apontamento(
    state: &AppState,
    apontamento_id: Uuid,
) -> Result<Apontamento, AppError> {
    let row = sqlx::query(
        "SELECT id, tecnico_id, obra_id, tipo_servico, tipo_hora, hora_entrada, hora_saida, \
         total_horas, descricao, status, nota_rejeicao, data_apontamento, synced_at, created_at \
         FROM apontamentos WHERE id = $1",
    )
    .bind(apontamento_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?
    .ok_or(AppError::NotFound)?;

    let tecnico_id: Uuid = row.get::<Uuid, _>("tecnico_id");
    let obra_id: Option<Uuid> = row.try_get("obra_id").ok().flatten();

    let tecnico_row = sqlx::query(
        "SELECT id, full_name, role, avatar_url, is_active, created_at FROM profiles WHERE id = $1",
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

    let fotos = fetch_fotos(&state.pool, apontamento_id).await?;

    Ok(Apontamento {
        id: row.get::<Uuid, _>("id"),
        tecnico_id,
        obra_id,
        tipo_servico: row.get::<String, _>("tipo_servico"),
        tipo_hora: row.get::<String, _>("tipo_hora"),
        hora_entrada: row.get::<String, _>("hora_entrada"),
        hora_saida: row.try_get("hora_saida").ok().flatten(),
        total_horas: row.try_get("total_horas").ok().flatten(),
        descricao: row.try_get("descricao").ok().flatten(),
        status: row.get::<String, _>("status"),
        nota_rejeicao: row.try_get("nota_rejeicao").ok().flatten(),
        data_apontamento: row.get("data_apontamento"),
        synced_at: row.try_get("synced_at").ok().flatten(),
        created_at: row.try_get("created_at").ok().flatten(),
        tecnico: tecnico_json,
        obra: obra_json,
        fotos,
    })
}

pub async fn list_apontamentos(
    state: web::Data<AppState>,
    query: web::Query<ApontamentoQuery>,
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
    if let Some(v) = query.data_inicio {
        conditions.push(format!("data_apontamento >= ${idx}"));
        args.add(v).ok();
        idx += 1;
    }
    if let Some(v) = query.data_fim {
        conditions.push(format!("data_apontamento <= ${idx}"));
        args.add(v).ok();
        idx += 1;
    }
    let _ = idx;

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id FROM apontamentos {} ORDER BY data_apontamento DESC, created_at DESC",
        where_clause
    );

    let id_rows = sqlx::query_with(&sql, args)
        .fetch_all(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let mut apontamentos = Vec::new();
    for id_row in &id_rows {
        let apontamento_id: Uuid = id_row.get::<Uuid, _>("id");
        let a = fetch_full_apontamento(&state, apontamento_id).await?;
        apontamentos.push(a);
    }

    Ok(HttpResponse::Ok().json(apontamentos))
}

pub async fn create_apontamento(
    state: web::Data<AppState>,
    body: web::Json<CreateApontamentoRequest>,
) -> Result<HttpResponse, AppError> {
    let new_id = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO apontamentos \
         (id, tecnico_id, obra_id, tipo_servico, tipo_hora, hora_entrada, hora_saida, \
          total_horas, descricao, data_apontamento, status) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendente')",
    )
    .bind(new_id)
    .bind(body.tecnico_id)
    .bind(body.obra_id)
    .bind(&body.tipo_servico)
    .bind(&body.tipo_hora)
    .bind(&body.hora_entrada)
    .bind(&body.hora_saida)
    .bind(body.total_horas)
    .bind(&body.descricao)
    .bind(body.data_apontamento)
    .execute(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    if let Some(ref fotos) = body.fotos_base64 {
        let date_str = body.data_apontamento.format("%Y-%m-%d").to_string();
        let dir = format!(
            "{}/fotos/{}/{}",
            state.uploads_dir, body.tecnico_id, date_str
        );
        tokio::fs::create_dir_all(&dir).await.ok();

        for (i, b64_str) in fotos.iter().enumerate() {
            let bytes = BASE64_STANDARD
                .decode(b64_str)
                .map_err(|e| AppError::BadRequest(e.to_string()))?;

            let file_name = format!("{}_{}.jpg", new_id, i);
            let file_path = format!("{}/{}", dir, file_name);
            tokio::fs::write(&file_path, &bytes)
                .await
                .map_err(|e| AppError::InternalError(e.to_string()))?;

            let url = crate::utils::make_file_url(
                &state.backend_url,
                &format!("uploads/fotos/{}/{}/{}", body.tecnico_id, date_str, file_name),
            );

            let foto_id = Uuid::new_v4();
            sqlx::query(
                "INSERT INTO fotos (id, apontamento_id, storage_path, url) \
                 VALUES ($1, $2, $3, $4)",
            )
            .bind(foto_id)
            .bind(new_id)
            .bind(&file_path)
            .bind(&url)
            .execute(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;
        }
    }

    let apontamento = fetch_full_apontamento(&state, new_id).await?;
    Ok(HttpResponse::Created().json(apontamento))
}

pub async fn update_apontamento(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateApontamentoRequest>,
) -> Result<HttpResponse, AppError> {
    let apontamento_id = path.into_inner();

    let mut sets: Vec<String> = vec![];
    let mut args = PgArguments::default();
    let mut idx = 1usize;

    if let Some(ref v) = body.tipo_servico {
        sets.push(format!("tipo_servico = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(ref v) = body.tipo_hora {
        sets.push(format!("tipo_hora = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(ref v) = body.hora_entrada {
        sets.push(format!("hora_entrada = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(ref v) = body.hora_saida {
        sets.push(format!("hora_saida = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(v) = body.total_horas {
        sets.push(format!("total_horas = ${idx}"));
        args.add(v).ok();
        idx += 1;
    }
    if let Some(ref v) = body.descricao {
        sets.push(format!("descricao = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(v) = body.data_apontamento {
        sets.push(format!("data_apontamento = ${idx}"));
        args.add(v).ok();
        idx += 1;
    }

    if !sets.is_empty() {
        args.add(apontamento_id).ok();
        let sql = format!(
            "UPDATE apontamentos SET {} WHERE id = ${}",
            sets.join(", "),
            idx
        );
        sqlx::query_with(&sql, args)
            .execute(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;
    }

    let apontamento = fetch_full_apontamento(&state, apontamento_id).await?;
    Ok(HttpResponse::Ok().json(apontamento))
}

pub async fn update_status(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateStatusRequest>,
) -> Result<HttpResponse, AppError> {
    let apontamento_id = path.into_inner();

    sqlx::query(
        "UPDATE apontamentos SET status = $1, nota_rejeicao = $2 WHERE id = $3",
    )
    .bind(&body.status)
    .bind(&body.nota_rejeicao)
    .bind(apontamento_id)
    .execute(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    let apontamento = fetch_full_apontamento(&state, apontamento_id).await?;
    Ok(HttpResponse::Ok().json(apontamento))
}

pub async fn delete_apontamento(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let apontamento_id = path.into_inner();

    sqlx::query("DELETE FROM apontamentos WHERE id = $1")
        .bind(apontamento_id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(HttpResponse::NoContent().finish())
}
