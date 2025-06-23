use aws_sdk_bedrockruntime::{
    error::{SdkError, BuildError},
    operation::converse::ConverseError,
};

// Define custom error type
#[derive(Debug)]
pub enum BedrockError {
    ServiceError(String),
    SdkError(String),
    NoResponse,
    BuildError(String),
}

impl From<&str> for BedrockError {
    fn from(err: &str) -> Self {
        BedrockError::ServiceError(err.to_string())
    }
}

impl From<String> for BedrockError {
    fn from(err: String) -> Self {
        BedrockError::ServiceError(err)
    }
}

impl From<SdkError<ConverseError>> for BedrockError {
    fn from(err: SdkError<ConverseError>) -> Self {
        match err {
            SdkError::ServiceError(context) => {
                BedrockError::ServiceError(format!("Service error: {:?}", context.err()))
            }
            _ => BedrockError::SdkError(format!("SDK error: {}", err)),
        }
    }
}

impl From<BuildError> for BedrockError {
    fn from(err: BuildError) -> Self {
        BedrockError::BuildError(format!("Build error: {}", err))
    }
}

impl std::fmt::Display for BedrockError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BedrockError::ServiceError(msg) => write!(f, "Bedrock service error: {}", msg),
            BedrockError::SdkError(msg) => write!(f, "Bedrock SDK error: {}", msg),
            BedrockError::NoResponse => write!(f, "No response from Bedrock"),
            BedrockError::BuildError(msg) => write!(f, "Build error: {}", msg),
        }
    }
}

impl std::error::Error for BedrockError {}