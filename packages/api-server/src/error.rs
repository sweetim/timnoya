use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("SwitchBot API error: {0}")]
    SwitchBot(String),
    #[error("Database error: {0}")]
    Database(String),
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match &self {
            AppError::SwitchBot(_) => StatusCode::BAD_GATEWAY,
            AppError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };
        (status, Json(ErrorBody { error: self.to_string() })).into_response()
    }
}
