use actix_web::{web, HttpResponse};
use actix_multipart::Multipart;
use futures::StreamExt;
use bytes::BytesMut;
use sqlx::postgres::PgArguments;
use sqlx::Arguments;
use sqlx::Row;
use uuid::Uuid;
use std::collections::HashMap;
use chrono::{Utc, Datelike};

use crate::errors::AppError;
use crate::models::profile::{
    CreateProfileRequest, Profile, TecnicoHoras, ToggleActiveRequest, UpdateProfileRequest,
};
use crate::AppState;

fn normalize_avatar_url(avatar_url: &Option<String>, backend_url: &str) -> Option<String> {
    avatar_url.as_ref().map(|url| {
        if url.starts_with("http://") || url.starts_with("https://") {
            url.clone()
        } else {
            crate::utils::make_file_url(backend_url, url)
        }
    })
}

fn row_to_profile(row: &sqlx::postgres::PgRow, backend_url: &str) -> Profile {
    let avatar_raw: Option<String> = row.try_get("avatar_url").ok().flatten();
    let avatar_url = normalize_avatar_url(&avatar_raw, backend_url);
    Profile {
        id: row.get::<Uuid, _>("id"),
        full_name: row.get::<String, _>("full_name"),
        role: row.get::<String, _>("role"),
        avatar_url,
        is_active: row.get::<bool, _>("is_active"),
        email: row.try_get("email").ok(),
        created_at: row.try_get("created_at").ok().flatten(),
    }
}

pub async fn list_profiles(
    state: web::Data<AppState>,
    query: web::Query<HashMap<String, String>>,
) -> Result<HttpResponse, AppError> {
    let role_filter = query.get("role").cloned();

    let rows = if let Some(ref role) = role_filter {
        let mut args = PgArguments::default();
        args.add(role.clone()).ok();
        sqlx::query_with(
            "SELECT id, full_name, role, avatar_url, is_active, created_at, email \
             FROM profiles WHERE role = $1 ORDER BY full_name",
            args,
        )
        .fetch_all(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
    } else {
        sqlx::query(
            "SELECT id, full_name, role, avatar_url, is_active, created_at, email \
             FROM profiles ORDER BY full_name",
        )
        .fetch_all(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
    };

    let profiles: Vec<Profile> = rows.iter().map(|r| row_to_profile(r, &state.backend_url)).collect();
    Ok(HttpResponse::Ok().json(profiles))
}

pub async fn tecnicos_horas(
    state: web::Data<AppState>,
    query: web::Query<HashMap<String, String>>,
) -> Result<HttpResponse, AppError> {
    let mes_str = query.get("mes").cloned();

    let reference_date = if let Some(mes) = mes_str {
        let parts: Vec<&str> = mes.split('-').collect();
        if parts.len() == 2 {
            let year: i32 = parts[0].parse().unwrap_or_else(|_| Utc::now().date_naive().year());
            let month: u32 = parts[1].parse().unwrap_or_else(|_| Utc::now().date_naive().month());
            chrono::NaiveDate::from_ymd_opt(year, month, 1)
                .unwrap_or_else(|| Utc::now().date_naive())
        } else {
            Utc::now().date_naive()
        }
    } else {
        Utc::now().date_naive()
    };

    let first_of_month = chrono::NaiveDate::from_ymd_opt(
        reference_date.year(),
        reference_date.month(),
        1,
    )
    .unwrap_or(reference_date);

    let tecnico_rows = sqlx::query(
        "SELECT id, full_name, avatar_url, role, is_active FROM profiles WHERE role = 'tecnico' ORDER BY full_name",
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    let mut result: Vec<TecnicoHoras> = Vec::new();

    for row in &tecnico_rows {
        let tecnico_id: Uuid = row.get::<Uuid, _>("id");
        let full_name: String = row.get::<String, _>("full_name");
        let avatar_raw: Option<String> = row.try_get("avatar_url").ok().flatten();
        let avatar_url = normalize_avatar_url(&avatar_raw, &state.backend_url);
        let role: String = row.get::<String, _>("role");
        let is_active: bool = row.get::<bool, _>("is_active");

        let hora_rows = {
            let mut args = PgArguments::default();
            args.add(tecnico_id).ok();
            args.add(first_of_month).ok();
            sqlx::query_with(
                "SELECT tipo_hora, CAST(COALESCE(SUM(total_horas), 0) AS FLOAT8) as total \
                 FROM apontamentos \
                 WHERE tecnico_id = $1 \
                   AND DATE_TRUNC('month', data_apontamento) = DATE_TRUNC('month', $2::date) \
                 GROUP BY tipo_hora",
                args,
            )
            .fetch_all(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?
        };

        let mut horas_normais: f64 = 0.0;
        let mut horas_extras: f64 = 0.0;

        for hr in &hora_rows {
            let tipo: String = hr.get::<String, _>("tipo_hora");
            let total: f64 = hr.try_get::<f64, _>("total").unwrap_or(0.0);
            let total_f64 = total;
            if tipo == "normal" {
                horas_normais = total_f64;
            } else if tipo == "extra_50" || tipo == "extra_100" {
                horas_extras += total_f64;
            }
        }

        let obra_atual: Option<String> = {
            let mut args = PgArguments::default();
            args.add(tecnico_id).ok();
            args.add(first_of_month).ok();
            let r = sqlx::query_with(
                "SELECT o.nome FROM apontamentos a \
                 JOIN obras o ON o.id = a.obra_id \
                 WHERE a.tecnico_id = $1 \
                   AND DATE_TRUNC('month', a.data_apontamento) = DATE_TRUNC('month', $2::date) \
                 ORDER BY a.created_at DESC LIMIT 1",
                args,
            )
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;
            r.map(|row| row.get::<String, _>("nome"))
        };

        let obras_ativas: i64 = {
            let mut args = PgArguments::default();
            args.add(tecnico_id).ok();
            args.add(first_of_month).ok();
            let r = sqlx::query_with(
                "SELECT COUNT(DISTINCT obra_id) as cnt FROM apontamentos \
                 WHERE tecnico_id = $1 AND obra_id IS NOT NULL \
                   AND DATE_TRUNC('month', data_apontamento) = DATE_TRUNC('month', $2::date)",
                args,
            )
            .fetch_one(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;
            r.get::<i64, _>("cnt")
        };

        result.push(TecnicoHoras {
            id: tecnico_id,
            full_name,
            avatar_url,
            role,
            is_active,
            horas_normais,
            horas_extras,
            total_horas: horas_normais + horas_extras,
            obra_atual,
            obras_ativas,
        });
    }

    Ok(HttpResponse::Ok().json(result))
}

pub async fn get_profile(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let profile_id = path.into_inner();

    let row = sqlx::query(
        "SELECT id, full_name, role, avatar_url, is_active, created_at, email \
         FROM profiles WHERE id = $1",
    )
    .bind(profile_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?
    .ok_or(AppError::NotFound)?;

    Ok(HttpResponse::Ok().json(row_to_profile(&row, &state.backend_url)))
}

pub async fn create_profile(
    state: web::Data<AppState>,
    body: web::Json<CreateProfileRequest>,
) -> Result<HttpResponse, AppError> {
    let password_hash = bcrypt::hash(&body.password, 12)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let new_id = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO profiles (id, full_name, role, email, password_hash, is_active) \
         VALUES ($1, $2, $3, $4, $5, true)",
    )
    .bind(new_id)
    .bind(&body.full_name)
    .bind(&body.role)
    .bind(&body.email)
    .bind(&password_hash)
    .execute(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    let profile = Profile {
        id: new_id,
        full_name: body.full_name.clone(),
        role: body.role.clone(),
        avatar_url: None,
        is_active: true,
        email: Some(body.email.clone()),
        created_at: Some(Utc::now()),
    };

    Ok(HttpResponse::Created().json(profile))
}

pub async fn update_profile(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, AppError> {
    let profile_id = path.into_inner();

    let mut sets: Vec<String> = vec![];
    let mut args = PgArguments::default();
    let mut idx = 1usize;

    if let Some(ref v) = body.full_name {
        sets.push(format!("full_name = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(ref v) = body.role {
        sets.push(format!("role = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }
    if let Some(ref v) = body.avatar_url {
        sets.push(format!("avatar_url = ${idx}"));
        args.add(v.clone()).ok();
        idx += 1;
    }

    if sets.is_empty() {
        return Err(AppError::BadRequest("No fields to update".to_string()));
    }

    args.add(profile_id).ok();
    let sql = format!(
        "UPDATE profiles SET {} WHERE id = ${}",
        sets.join(", "),
        idx
    );

    sqlx::query_with(&sql, args)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let row = sqlx::query(
        "SELECT id, full_name, role, avatar_url, is_active, created_at, email \
         FROM profiles WHERE id = $1",
    )
    .bind(profile_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?
    .ok_or(AppError::NotFound)?;

    Ok(HttpResponse::Ok().json(row_to_profile(&row, &state.backend_url)))
}

pub async fn toggle_active(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<ToggleActiveRequest>,
) -> Result<HttpResponse, AppError> {
    let profile_id = path.into_inner();

    sqlx::query("UPDATE profiles SET is_active = $1 WHERE id = $2")
        .bind(body.is_active)
        .bind(profile_id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let row = sqlx::query(
        "SELECT id, full_name, role, avatar_url, is_active, created_at, email \
         FROM profiles WHERE id = $1",
    )
    .bind(profile_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?
    .ok_or(AppError::NotFound)?;

    Ok(HttpResponse::Ok().json(row_to_profile(&row, &state.backend_url)))
}

pub async fn delete_profile(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let profile_id = path.into_inner();

    sqlx::query("DELETE FROM profiles WHERE id = $1")
        .bind(profile_id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(HttpResponse::NoContent().finish())
}

pub async fn upload_avatar(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    mut payload: Multipart,
) -> Result<HttpResponse, AppError> {
    let profile_id = path.into_inner();
    let mut file_bytes: Option<(Vec<u8>, String)> = None;

    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|e| AppError::BadRequest(e.to_string()))?;

        let field_name = field
            .content_disposition()
            .and_then(|cd| cd.get_name())
            .unwrap_or("")
            .to_string();

        if field_name == "avatar" {
            let content_type = field
                .content_type()
                .map(|ct| ct.to_string())
                .unwrap_or_default();

            let ext = if content_type.contains("png") {
                "png"
            } else if content_type.contains("gif") {
                "gif"
            } else if content_type.contains("webp") {
                "webp"
            } else {
                "jpg"
            };

            let mut buf = BytesMut::new();
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(|e| AppError::BadRequest(e.to_string()))?;
                buf.extend_from_slice(&data);
            }
            file_bytes = Some((buf.to_vec(), ext.to_string()));
        }
    }

    let (bytes, ext) =
        file_bytes.ok_or_else(|| AppError::BadRequest("No avatar file".to_string()))?;

    let avatars_dir = format!("{}/avatars", state.uploads_dir);
    tokio::fs::create_dir_all(&avatars_dir)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let file_path = format!("{}/{}.{}", avatars_dir, profile_id, ext);
    tokio::fs::write(&file_path, &bytes)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let avatar_url = crate::utils::make_file_url(
        &state.backend_url,
        &format!("uploads/avatars/{}.{}", profile_id, ext),
    );

    sqlx::query("UPDATE profiles SET avatar_url = $1 WHERE id = $2")
        .bind(&avatar_url)
        .bind(profile_id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let row = sqlx::query(
        "SELECT id, full_name, role, avatar_url, is_active, created_at, email \
         FROM profiles WHERE id = $1",
    )
    .bind(profile_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?
    .ok_or(AppError::NotFound)?;

    Ok(HttpResponse::Ok().json(row_to_profile(&row, &state.backend_url)))
}
