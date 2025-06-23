use lambda_http::{run, service_fn, tracing, Error};
mod error_bedrock;
mod http_handler;
use http_handler::function_handler;

const MODEL_ID: &str = "us.anthropic.claude-sonnet-4-20250514-v1:0";

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}
