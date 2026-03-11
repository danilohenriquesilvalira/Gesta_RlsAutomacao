#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub backend_url: String,
    pub uploads_dir: String,
}

impl Config {
    pub fn from_env() -> Self {
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://rls:Rls%402024@postgres/gestao_rls".to_string());
        let jwt_secret = std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| "Rls@2024_jwt_secret_key_gestao_rls".to_string());
        let backend_url = std::env::var("BACKEND_URL")
            .unwrap_or_else(|_| "http://localhost:8080".to_string());
        let uploads_dir = std::env::var("UPLOADS_DIR")
            .unwrap_or_else(|_| "/app/uploads".to_string());
        Config { database_url, jwt_secret, backend_url, uploads_dir }
    }
}
