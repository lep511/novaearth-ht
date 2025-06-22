import { API_CONFIG } from '../config/api-config.js';
import { 
  createTimeoutController, 
  validatePrompt, 
  parseResponse, 
  handleFetchError 
} from '../utils/request-utils.js';

export async function sendPrompt(prompt, options = {}) {
  validatePrompt(prompt);

  const { controller, timeoutId } = createTimeoutController(options.timeout || API_CONFIG.TIMEOUT_MS);

  try {
    const url = `${API_CONFIG.BASE_URL}/converse?prompt=${encodeURIComponent(prompt)}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...API_CONFIG.DEFAULT_HEADERS,
        ...options.headers
      },
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await parseResponse(response);

  } catch (error) {
    clearTimeout(timeoutId);
    handleFetchError(error, API_CONFIG.TIMEOUT_MS);
  }
}