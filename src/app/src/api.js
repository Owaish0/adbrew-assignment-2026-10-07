const API_URL = 'http://localhost:8000';

async function request(options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${API_URL}/todos`, {
      ...options,
      signal: controller.signal,
    });
    const body = await response.json();
    if (!response.ok) {
      const message = body.detail || body.description?.[0] || 'The request failed. Please try again.';
      throw new Error(message);
    }
    return body;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The request timed out. Refresh the list before trying to add again.');
    }
    if (error instanceof TypeError) {
      throw new Error('Cannot reach the server. Check your connection and refresh the list.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const listTodos = () => request();
export const createTodo = (description) => request({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ description }),
});
