use actix_cors::Cors;
use actix_files::Files;
use actix_web::{middleware, web, App, HttpResponse, HttpServer};
use sqlx::postgres::PgPoolOptions;

mod config;
mod errors;
mod handlers;
mod models;
pub mod utils;

#[derive(Clone)]
pub struct AppState {
    pub pool: sqlx::PgPool,
    pub jwt_secret: String,
    pub backend_url: String,
    pub uploads_dir: String,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let config = config::Config::from_env();

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

    for subdir in &["fotos", "recibos", "recibos-pagamento", "avatars"] {
        let dir = format!("{}/{}", config.uploads_dir, subdir);
        tokio::fs::create_dir_all(&dir)
            .await
            .expect("Failed to create upload directory");
    }

    let uploads_dir = config.uploads_dir.clone();

    let state = web::Data::new(AppState {
        pool,
        jwt_secret: config.jwt_secret.clone(),
        backend_url: config.backend_url.clone(),
        uploads_dir: config.uploads_dir.clone(),
    });

    log::info!("Starting server at http://0.0.0.0:8080");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(middleware::Logger::default())
            .app_data(state.clone())
            .app_data(web::JsonConfig::default().error_handler(|err, _req| {
                let response = actix_web::HttpResponse::BadRequest()
                    .json(serde_json::json!({"error": err.to_string()}));
                actix_web::error::InternalError::from_response(err, response).into()
            }))
            // Health check
            .route("/health", web::get().to(|| async { HttpResponse::Ok().json(serde_json::json!({"status":"ok"})) }))
            // Auth routes
            .route("/api/auth/login", web::post().to(handlers::auth::login))
            .route("/api/auth/me", web::get().to(handlers::auth::me))
            // Profile routes — specific paths before /{id}
            .route(
                "/api/profiles/tecnicos-horas",
                web::get().to(handlers::profiles::tecnicos_horas),
            )
            .route(
                "/api/profiles",
                web::get().to(handlers::profiles::list_profiles),
            )
            .route(
                "/api/profiles/{id}",
                web::get().to(handlers::profiles::get_profile),
            )
            .route(
                "/api/profiles",
                web::post().to(handlers::profiles::create_profile),
            )
            .route(
                "/api/profiles/{id}",
                web::patch().to(handlers::profiles::update_profile),
            )
            .route(
                "/api/profiles/{id}/toggle-active",
                web::patch().to(handlers::profiles::toggle_active),
            )
            .route(
                "/api/profiles/{id}",
                web::delete().to(handlers::profiles::delete_profile),
            )
            .route(
                "/api/profiles/{id}/avatar",
                web::post().to(handlers::profiles::upload_avatar),
            )
            // Obra routes — specific paths before /{id}
            .route(
                "/api/obras/minhas/{tecnico_id}",
                web::get().to(handlers::obras::minhas_obras),
            )
            .route("/api/obras", web::get().to(handlers::obras::list_obras))
            .route(
                "/api/obras/{id}",
                web::get().to(handlers::obras::get_obra),
            )
            .route("/api/obras", web::post().to(handlers::obras::create_obra))
            .route(
                "/api/obras/{id}",
                web::patch().to(handlers::obras::update_obra),
            )
            .route(
                "/api/obras/{id}",
                web::delete().to(handlers::obras::delete_obra),
            )
            // Apontamento routes
            .route(
                "/api/apontamentos",
                web::get().to(handlers::apontamentos::list_apontamentos),
            )
            .route(
                "/api/apontamentos",
                web::post().to(handlers::apontamentos::create_apontamento),
            )
            .route(
                "/api/apontamentos/{id}",
                web::patch().to(handlers::apontamentos::update_apontamento),
            )
            .route(
                "/api/apontamentos/{id}/status",
                web::patch().to(handlers::apontamentos::update_status),
            )
            .route(
                "/api/apontamentos/{id}",
                web::delete().to(handlers::apontamentos::delete_apontamento),
            )
            // Despesa routes
            .route(
                "/api/despesas",
                web::get().to(handlers::despesas::list_despesas),
            )
            .route(
                "/api/despesas",
                web::post().to(handlers::despesas::create_despesa),
            )
            .route(
                "/api/despesas/{id}",
                web::patch().to(handlers::despesas::update_despesa),
            )
            .route(
                "/api/despesas/{id}/status",
                web::patch().to(handlers::despesas::update_status),
            )
            .route(
                "/api/despesas/{id}",
                web::delete().to(handlers::despesas::delete_despesa),
            )
            .route(
                "/api/recibos-despesas/{id}",
                web::delete().to(handlers::despesas::delete_recibo_despesa),
            )
            // Deposito routes
            .route(
                "/api/depositos",
                web::get().to(handlers::depositos::list_depositos),
            )
            .route(
                "/api/depositos",
                web::post().to(handlers::depositos::create_deposito),
            )
            // Recibos pagamento routes
            .route(
                "/api/recibos-pagamento",
                web::get().to(handlers::recibos_pagamento::list_recibos_pagamento),
            )
            .route(
                "/api/recibos-pagamento",
                web::post().to(handlers::recibos_pagamento::create_recibo_pagamento),
            )
            .route(
                "/api/recibos-pagamento/{id}",
                web::delete().to(handlers::recibos_pagamento::delete_recibo_pagamento),
            )
            // Static files for uploads
            .service(
                Files::new("/uploads", uploads_dir.clone()).show_files_listing(),
            )
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
