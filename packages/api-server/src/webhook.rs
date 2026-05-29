use crate::database::{insert_webhook_event, DbPool};
use crate::switchbot::SwitchBotClient;
use tracing::{error, info};

pub async fn ensure_webhook(pool: DbPool, client: SwitchBotClient) {
    let webhook_url = std::env::var("WEBHOOK_URL")
        .unwrap_or_else(|_| "https://webhooks.timx.co/webhook/switchbot".to_string());

    match client.get_registered_webhooks().await {
        Ok(webhooks) => {
            let already_registered = webhooks.iter().any(|u| u == &webhook_url);
            if already_registered {
                info!("{webhook_url} already registered, skipping");
                return;
            }

            match client.setup_webhook(&webhook_url).await {
                Ok(response) => {
                    let payload = serde_json::json!({
                        "request": { "url": webhook_url, "deviceList": "ALL" },
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
                    info!("Registered {webhook_url} for all devices");
                }
                Err(e) => error!("Failed to setup webhook: {e}"),
            }
        }
        Err(e) => error!("Failed to ensure webhook: {e}"),
    }
}
