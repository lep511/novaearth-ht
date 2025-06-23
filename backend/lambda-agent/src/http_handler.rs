use lambda_http::{Body, Error, Request, Response};
use tracing::{info, error};
use aws_sdk_bedrockruntime::{
    Client,
    types::{Message, ContentBlock, ConversationRole},
};
use crate::error_bedrock::BedrockError;
use serde::{Serialize, Deserialize};

use crate::MODEL_ID;

#[derive(Debug, Serialize, Deserialize)]
struct RequestBody {
    prompt: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AgentResponse {
    response: String,
}

async fn call_bedrock(
    client: &Client, 
    user_message: &str,
) -> Result<String, BedrockError> {
    // Build the message - this can fail, so we handle the Result
    let message = Message::builder()
        .role(ConversationRole::User)
        .content(ContentBlock::Text(user_message.to_string()))
        .build()?; // This will use the From<BuildError> impl

    let response = client
        .converse()
        .model_id(MODEL_ID)
        .messages(message) // Now message is a Message, not a Result
        .send()
        .await?;

    // Extract the response text
    if let Some(output) = response.output() {
        if let Ok(output_message) = output.as_message() {
            let content_blocks = output_message.content();
            for content_block in content_blocks {
                if let Ok(text) = content_block.as_text() {
                    return Ok(text.to_string());
                }
            }
        }
    }

    Err(BedrockError::NoResponse)
}

async fn extract_prompt_from_body(
    event: &Request
) -> Result<String, Box<dyn std::error::Error>> {
    // Get the body from the request
    let body = event.body();

    if body.is_empty() {
        return Err("Request body is empty".into());
    }
    
    // Convert body to string
    let body_str = std::str::from_utf8(body)?;
    
    // Parse JSON body
    let request_body: RequestBody = serde_json::from_str(body_str)?;
    
    // Return the prompt or default value
    Ok(request_body.prompt.unwrap_or_else(|| "Hello!".to_string()))
}

pub(crate) async fn function_handler(event: Request) -> Result<Response<Body>, Error> {
    info!("Event: {:?}", event);

    // Extract the prompt from request body
    let prompt = match extract_prompt_from_body(&event).await {
        Ok(p) => p,
        Err(e) => {
            let error_message = format!("{}", e);
            let bedrock_error: BedrockError = error_message.into();
            error!("{}", bedrock_error);
            
            return Ok(Response::builder()
                .status(400)
                .header("content-type", "application/json")
                .body(format!(r#"{{"error": "{}"}}"#, bedrock_error).into())
                .map_err(Box::new)?);
        }
    };
    
    // Load AWS config and create Bedrock client
    let config = aws_config::load_from_env().await;
    let client = Client::new(&config);

    // Call Bedrock with the prompt
    let response_text = match call_bedrock(&client, &prompt).await {
        Ok(message) => message,
        Err(e) => {
            error!("Bedrock error: {}", e);
            let error_response = format!("Error calling Bedrock: {}", e);
            return Ok(Response::builder()
                .status(500)
                .header("content-type", "application/json")
                .body(format!(r#"{{"error": "{}"}}"#, error_response).into())
                .map_err(Box::new)?);
        }
    };

    let agent_response = AgentResponse {
        response: response_text,
    };

    // Return successful response
    let response = Response::builder()
        .status(200)
        .header("content-type", "application/json")
        .header("access-control-allow-origin", "*") // Enable CORS if needed
        .body(serde_json::to_string(&agent_response)?.into())
        .map_err(Box::new)?;
    
    Ok(response)
}
