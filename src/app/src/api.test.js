import { createTodo, listTodos } from './api';

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { jest.useRealTimers(); delete global.fetch; });

test('posts the JSON contract', async () => {
  fetch.mockResolvedValue({ ok: true, json: async () => ({ id: '1', description: 'Task' }) });
  await expect(createTodo('Task')).resolves.toEqual({ id: '1', description: 'Task' });
  expect(fetch).toHaveBeenCalledWith('http://localhost:8000/todos', expect.objectContaining({
    method: 'POST', body: '{"description":"Task"}', headers: { 'Content-Type': 'application/json' },
  }));
});

test('surfaces validation errors', async () => {
  fetch.mockResolvedValue({ ok: false, json: async () => ({ description: ['Too long.'] }) });
  await expect(createTodo('Task')).rejects.toThrow('Too long.');
});

test('explains network failures', async () => {
  fetch.mockRejectedValue(new TypeError('Failed to fetch'));
  await expect(listTodos()).rejects.toThrow('Cannot reach the server');
});

test('times out stalled requests', async () => {
  jest.useFakeTimers();
  fetch.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      reject(error);
    });
  }));
  const pending = expect(listTodos()).rejects.toThrow('request timed out');
  jest.advanceTimersByTime(10000);
  await pending;
});
