use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error(transparent)]
    SwitchBot(#[from] SwitchBotError),
    #[error("Database error: {0}")]
    Database(String),
}

#[derive(Debug, thiserror::Error)]
pub enum SwitchBotError {
    #[error("API error (code {code}): {message}")]
    Api { code: i64, message: String },
    #[error("HTTP request failed: {0}")]
    Http(String),
    #[error("Response decode failed: {0}")]
    Decode(String),
}

impl SwitchBotError {
    pub fn api(code: i64, message: impl Into<String>) -> Self {
        Self::Api {
            code,
            message: message.into(),
        }
    }
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
