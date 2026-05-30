use tracing::{error, info};

use crate::db;
use crate::db::DbPool;
use crate::switchbot::SwitchBotClient;

pub async fn ensure_webhook(pool: DbPool, client: SwitchBotClient) {
    let webhook_url = std::env::var("WEBHOOK_URL")
        .unwrap_or_else(|_| "https://webhooks.timx.co/webhook/switchbot".to_string());

    match client.get_registered_webhooks().await {
        Ok(webhooks) => {
            if webhooks.iter().any(|u| u == &webhook_url) {
                info!("{webhook_url} already registered, skipping");
                return;
            }

            for old_url in &webhooks {
                info!("Deleting stale webhook: {old_url}");
                if let Err(e) = client.delete_webhook(old_url).await {
                    error!("Failed to delete webhook {old_url}: {e}");
                }
            }

            match client.setup_webhook(&webhook_url).await {
                Ok(response) => {
                    let payload = serde_json::json!({
                        "request": { "url": webhook_url, "deviceList": "ALL" },
                        "response": { "statusCode": response.0, "message": response.1 }
                    });
                    let pool = pool.clone();
                    tokio::task::spawn_blocking(move || {
                        let _ = db::webhooks::insert_webhook_event(
                            &pool,
                            "webhookRegistered",
                            None,
                            None,
                            None,
                            &payload.to_string(),
                        );
                    })
                    .await
                    .ok();
                    info!("Registered {webhook_url} for all devices");
                }
                Err(e) => error!("Failed to setup webhook: {e}"),
            }
        }
        Err(e) => error!("Failed to ensure webhook: {e}"),
    }
}
