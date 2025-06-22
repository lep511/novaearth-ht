import { API_CONFIG } from '../config/api-config.js';
import { 
  createTimeoutController, 
  validatePrompt, 
  parseResponse, 
  handleFetchError 
} from '../utils/request-utils.js';

export class APIClient {
  constructor(baseUrl = API_CONFIG.BASE_URL, timeout = API_CONFIG.TIMEOUT_MS) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async sendPrompt(prompt, options = {}) {
    validatePrompt(prompt);

    const { controller, timeoutId } = createTimeoutController(options.timeout || this.timeout);
    
    const url = `${this.baseUrl}/converse`;
    
    const raw = JSON.stringify({
      "prompt": prompt
    });
    
    const requestConfig = {
      method: 'POST',
      headers: {
        ...API_CONFIG.DEFAULT_HEADERS,
        ...options.headers
      },
      redirect: 'follow',
      body: raw,
      signal: controller.signal,
      ...options.fetchOptions
    };

    try {
      console.log(`Sending request to: ${url}`);
      const response = await fetch(url, requestConfig);
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`);
      }
      
      return await parseResponse(response);
      
    } catch (error) {
      clearTimeout(timeoutId);
      handleFetchError(error, this.timeout);
    }
  }

  async sendPrompts(prompts, options = {}) {
    const results = [];
    const errors = [];
    
    for (const [index, prompt] of prompts.entries()) {
      try {
        const result = await this.sendPrompt(prompt, options);
        results.push({ index, prompt, result, success: true });
      } catch (error) {
        const errorObj = { index, prompt, error: error.message, success: false };
        errors.push(errorObj);
        results.push(errorObj);
      }
    }
    
    return { results, errors, hasErrors: errors.length > 0 };
  }
}