use actix_web::{web, HttpResponse};
use sqlx::postgres::PgArguments;
use sqlx::Arguments;
use sqlx::Row;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::obra::{
    CreateObraRequest, ExecutanteInfo, Obra, ObraTecnico, ObraQuery, TecnicoInfo, UpdateObraRequest,
};
use crate::AppState;

async fn fetch_obra_by_id(
    pool: &sqlx::PgPool,
    obra_id: Uuid,
    _backend_url: &str,
) -> Result<Obra, AppError> {
    let row = sqlx::query(
        "SELECT id, codigo, nome, cliente, status, progresso, prazo, orcamento, \
         localizacao, lat, lng, created_by, created_at \
         FROM obras WHERE id = $1",
    )
    .bind(obra_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?
    .ok_or(AppError::NotFound)?;

    let created_by: Option<Uuid> = row.try_get("created_by").ok().flatten();

    let executante = if let Some(cb) = created_by {
        let exec_row = sqlx::query(
            "SELECT full_name FROM profiles WHERE id = $1",
        )
        .bind(cb)
        .fetch_optional(pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;
        exec_row.map(|r| ExecutanteInfo {
            full_name: r.get::<String, _>("full_name"),
        })
    } else {
        None
    };

    let tecnico_rows = sqlx::query(
        "SELECT p.id, p.full_name, p.avatar_url \
         FROM obra_tecnicos ot \
         JOIN profiles p ON p.id = ot.tecnico_id \
         WHERE ot.obra_id = $1",
    )
    .bind(obra_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    let obra_tecnicos: Vec<ObraTecnico> = tecnico_rows
        .iter()
        .map(|r| ObraTecnico {
            tecnico: TecnicoInfo {
                id: r.get::<Uuid, _>("id"),
                full_name: r.get::<String, _>("full_name"),
                avatar_url: r.try_get("avatar_url").ok().flatten(),
            },
        })
        .collect();

    Ok(Obra {
        id: row.get::<Uuid, _>("id"),
        codigo: row.get::<String, _>("codigo"),
        nome: row.get::<String, _>("nome"),
        cliente: row.get::<String, _>("cliente"),
        status: row.get::<String, _>("status"),
        progresso: row.get::<i32, _>("progresso"),
        prazo: row.try_get("prazo").ok().flatten(),
        orcamento: row.try_get("orcamento").ok().flatten(),
        localizacao: row.try_get("localizacao").ok().flatten(),
        lat: row.try_get("lat").ok().flatten(),
        lng: row.try_get("lng").ok().flatten(),
        created_by,
        created_at: row.try_get("created_at").ok().flatten(),
        executante,
        obra_tecnicos,
    })
}

pub async fn list_obras(
    state: web::Data<AppState>,
    query: web::Query<ObraQuery>,
) -> Result<HttpResponse, AppError> {
    let mut conditions: Vec<String> = vec![];
    let mut args = PgArguments::default();
    let mut idx = 1usize;

    if let Some(ref status) = query.status {
        conditions.push(format!("status = ${idx}"));
        args.add(status.clone()).ok();
        idx += 1;
    }
    if let Some(ref created_by) = query.created_by {
        conditions.push(format!("created_by = ${idx}"));
        args.add(*created_by).ok();
        idx += 1;
    }
    let _ = idx;

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id FROM obras {} ORDER BY created_at DESC",
        where_clause
    );

    let id_rows = sqlx::query_with(&sql, args)
        .fetch_all(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let mut obras = Vec::new();
    for id_row in &id_rows {
        let obra_id: Uuid = id_row.get::<Uuid, _>("id");
        let obra = fetch_obra_by_id(&state.pool, obra_id, &state.backend_url).await?;
        obras.push(obra);
    }

    Ok(HttpResponse::Ok().json(obras))
}

pub async fn minhas_obras(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let tecnico_id = path.into_inner();

    let id_rows = sqlx::query(
        "SELECT DISTINCT o.id FROM obras o \
         LEFT JOIN obra_tecnicos ot ON ot.obra_id = o.id \
         WHERE o.created_by = $1 OR ot.tecnico_id = $1 \
         ORDER BY o.id",
    )
    .bind(tecnico_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    let mut obras = Vec::new();
    for id_row in &id_rows {
        let obra_id: Uuid = id_row.get::<Uuid, _>("id");
        let obra = fetch_obra_by_id(&state.pool, obra_id, &state.backend_url).await?;
        obras.push(obra);
    }

    Ok(HttpResponse::Ok().json(obras))
}

pub async fn get_obra(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let obra_id = path.into_inner();
    let obra = fetch_obra_by_id(&state.pool, obra_id, &state.backend_url).await?;
    Ok(HttpResponse::Ok().json(obra))
}

pub async fn create_obra(
    state: web::Data<AppState>,
    body: web::Json<CreateObraRequest>,
) -> Result<HttpResponse, AppError> {
    let new_id = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO obras (id, codigo, nome, cliente, prazo, orcamento, created_by, \
         localizacao, lat, lng, status, progresso) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'em_andamento', 0)",
    )
    .bind(new_id)
    .bind(&body.codigo)
    .bind(&body.nome)
    .bind(&body.cliente)
    .bind(body.prazo)
    .bind(body.orcamento)
    .bind(body.created_by)
    .bind(&body.localizacao)
    .bind(body.lat)
    .bind(body.lng)
    .execute(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    if let Some(ref tecnico_ids) = body.tecnico_ids {
        for tid in tecnico_ids {
            sqlx::query(
                "INSERT INTO obra_tecnicos (obra_id, tecnico_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(new_id)
            .bind(tid)
            .execute(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;
        }
    }

    let obra = fetch_obra_by_id(&state.pool, new_id, &state.backend_url).await?;
    Ok(HttpResponse::Created().json(obra))
}

pub async fn update_obra(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateObraRequest>,
) -> Result<HttpResponse, AppError> {
    let obra_id = path.into_inner();

    let mut sets: Vec<String> = vec![];
    let mut args = PgArguments::default();
    let mut idx = 1usize;

    if let Some(ref v) = body.codigo {
        sets.push(format!("codigo = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(ref v) = body.nome {
        sets.push(format!("nome = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(ref v) = body.cliente {
        sets.push(format!("cliente = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(ref v) = body.status {
        sets.push(format!("status = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(v) = body.progresso {
        sets.push(format!("progresso = ${idx}"));
        args.add(v).ok();
        idx += 1;
    }
    if let Some(v) = body.prazo {
        sets.push(format!("prazo = ${idx}"));
        args.add(v).ok();
        idx += 1;
    }
    if let Some(v) = body.orcamento {
        sets.push(format!("orcamento = ${idx}"));
        args.add(v).ok();
        idx += 1;
    }
    if let Some(ref v) = body.localizacao {
        sets.push(format!("localizacao = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(v) = body.lat {
        sets.push(format!("lat = ${idx}"));
        args.add(v).ok();
        idx += 1;
    }
    if let Some(v) = body.lng {
        sets.push(format!("lng = ${idx}"));
        args.add(v).ok();
        idx += 1;
    }

    if !sets.is_empty() {
        args.add(obra_id).ok();
        let sql = format!(
            "UPDATE obras SET {} WHERE id = ${}",
            sets.join(", "),
            idx
        );
        sqlx::query_with(&sql, args)
            .execute(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;
    }

    if let Some(ref tecnico_ids) = body.tecnico_ids {
        sqlx::query("DELETE FROM obra_tecnicos WHERE obra_id = $1")
            .bind(obra_id)
            .execute(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;

        for tid in tecnico_ids {
            sqlx::query(
                "INSERT INTO obra_tecnicos (obra_id, tecnico_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(obra_id)
            .bind(tid)
            .execute(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;
        }
    }

    let obra = fetch_obra_by_id(&state.pool, obra_id, &state.backend_url).await?;
    Ok(HttpResponse::Ok().json(obra))
}

pub async fn delete_obra(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let obra_id = path.into_inner();

    sqlx::query("DELETE FROM obras WHERE id = $1")
        .bind(obra_id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(HttpResponse::NoContent().finish())
}
