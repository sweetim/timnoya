use crate::database::{insert_webhook_event, DbPool};
use crate::switchbot::SwitchBotClient;
use tracing::{error, info};

const WEBHOOK_URL: &str = "https://webhooks.timx.co/webhook/switchbot";

pub async fn ensure_webhook(pool: DbPool, client: SwitchBotClient) {
    match client.get_registered_webhooks().await {
        Ok(webhooks) => {
            let already_registered = webhooks.iter().any(|u| u == WEBHOOK_URL);
            if already_registered {
                info!("{} already registered, skipping", WEBHOOK_URL);
                return;
            }

            match client.setup_webhook(WEBHOOK_URL).await {
                Ok(response) => {
                    let payload = serde_json::json!({
                        "request": { "url": WEBHOOK_URL, "deviceList": "ALL" },
                        "response": { "statusCode": response.0, "message": response.1 }
                    });
                    insert_webhook_event(
                        &pool,
                        "webhookRegistered",
                        None,
                        None,
                        None,
                        &payload.to_string(),
                    );
                    info!("Registered {} for all devices", WEBHOOK_URL);
                }
                Err(e) => error!("Failed to setup webhook: {}", e),
            }
        }
        Err(e) => error!("Failed to ensure webhook: {}", e),
    }
}
