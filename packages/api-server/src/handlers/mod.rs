mod devices;
mod sensors;
mod switches;
mod webhooks;

pub use devices::*;
pub use sensors::*;
pub use switches::*;
pub use webhooks::*;

use serde::Deserialize;

#[derive(Deserialize)]
pub struct PaginationQuery {
    pub limit: Option<i64>,
}
