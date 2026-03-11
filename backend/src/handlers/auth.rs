use actix_web::{web, HttpRequest, HttpResponse};
use std::future::{ready, Ready};
use actix_web::FromRequest;
use actix_web::dev::Payload;
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde_json::json;
use uuid::Uuid;
use chrono::Utc;

use crate::errors::AppError;
use crate::models::auth::{Claims, LoginRequest};
use crate::AppState;

pub struct AuthUser(pub Claims);

impl FromRequest for AuthUser {
    type Error = AppError;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        let state = match req.app_data::<web::Data<AppState>>() {
            Some(s) => s.clone(),
            None => return ready(Err(AppError::Unauthorized)),
        };

        let auth_header = match req.headers().get("Authorization") {
            Some(h) => h,
            None => return ready(Err(AppError::Unauthorized)),
        };

        let auth_str = match auth_header.to_str() {
            Ok(s) => s,
            Err(_) => return ready(Err(AppError::Unauthorized)),
        };

        if !auth_str.starts_with("Bearer ") {
            return ready(Err(AppError::Unauthorized));
        }

        let token = &auth_str[7..];
        let key = DecodingKey::from_secret(state.jwt_secret.as_bytes());
        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = true;

        match decode::<Claims>(token, &key, &validation) {
            Ok(data) => ready(Ok(AuthUser(data.claims))),
            Err(_) => ready(Err(AppError::Unauthorized)),
        }
    }
}

pub async fn login(
    state: web::Data<AppState>,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse, AppError> {
    let row = sqlx::query(
        "SELECT id, full_name, role, avatar_url, is_active, created_at, email, password_hash \
         FROM profiles \
         WHERE email = $1",
    )
    .bind(&body.email)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    let row = row.ok_or(AppError::Unauthorized)?;

    use sqlx::Row;
    let id: Uuid = row.get::<Uuid, _>("id");
    let full_name: String = row.get::<String, _>("full_name");
    let role: String = row.get::<String, _>("role");
    let avatar_url: Option<String> = row.try_get("avatar_url").ok().flatten();
    let is_active: bool = row.get::<bool, _>("is_active");
    let created_at: Option<chrono::DateTime<Utc>> = row.try_get("created_at").ok().flatten();
    let email: String = row.get::<String, _>("email");
    let password_hash: String = row.get::<String, _>("password_hash");

    if !bcrypt::verify(&body.password, &password_hash).unwrap_or(false) {
        return Err(AppError::Unauthorized);
    }

    if !is_active {
        return Err(AppError::Forbidden);
    }

    let exp = (Utc::now() + chrono::Duration::days(7)).timestamp() as usize;
    let claims = Claims {
        sub: id,
        role: role.clone(),
        exp,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(HttpResponse::Ok().json(json!({
        "token": token,
        "profile": {
            "id": id,
            "full_name": full_name,
            "role": role,
            "avatar_url": avatar_url,
            "is_active": is_active,
            "email": email,
            "created_at": created_at,
        }
    })))
}

pub async fn me(
    state: web::Data<AppState>,
    auth: AuthUser,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let row = sqlx::query(
        "SELECT id, full_name, role, avatar_url, is_active, created_at, email \
         FROM profiles \
         WHERE id = $1",
    )
    .bind(auth.0.sub)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    let row = row.ok_or(AppError::NotFound)?;

    let id: Uuid = row.get::<Uuid, _>("id");
    let full_name: String = row.get::<String, _>("full_name");
    let role: String = row.get::<String, _>("role");
    let avatar_url: Option<String> = row.try_get("avatar_url").ok().flatten();
    let is_active: bool = row.get::<bool, _>("is_active");
    let created_at: Option<chrono::DateTime<Utc>> = row.try_get("created_at").ok().flatten();
    let email: String = row.get::<String, _>("email");

    Ok(HttpResponse::Ok().json(json!({
        "id": id,
        "full_name": full_name,
        "role": role,
        "avatar_url": avatar_url,
        "is_active": is_active,
        "email": email,
        "created_at": created_at,
    })))
}
