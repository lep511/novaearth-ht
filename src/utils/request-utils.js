export function createTimeoutController(timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  // Clear timeout if request completes normally
  controller.signal.addEventListener('abort', () => clearTimeout(timeoutId));
  
  return { controller, timeoutId };
}

export function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt must be a non-empty string');
  }
}

export async function parseResponse(response) {
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  } else {
    return await response.text();
  }
}

export function handleFetchError(error, timeout) {
  if (error.name === 'AbortError') {
    throw new Error(`Request timed out after ${timeout}ms`);
  }
  
  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new Error(`Network error: Unable to reach server`);
  }
  
  throw new Error(`API request failed: ${error.message}`);
}