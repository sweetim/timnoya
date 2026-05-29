use crate::db::DbPool;
use crate::switchbot::SwitchBotClient;

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub switchbot: SwitchBotClient,
    pub kitchen_light_device_id: String,
}
