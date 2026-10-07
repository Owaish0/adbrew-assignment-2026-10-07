import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { createTodo, listTodos } from './api';

jest.mock('./api');

beforeEach(() => {
  jest.resetAllMocks();
  listTodos.mockResolvedValue([]);
});

test('loads stored todos on mount', async () => {
  listTodos.mockResolvedValue([{ id: '1', description: 'Stored task' }]);
  render(<App />);
  expect(await screen.findByText('Stored task')).toBeInTheDocument();
});

test('shows an empty state', async () => {
  render(<App />);
  expect(await screen.findByText(/Nothing here yet/)).toBeInTheDocument();
});

test('saves a trimmed description and fetches the list again', async () => {
  listTodos.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: '1', description: 'New task' }]);
  createTodo.mockResolvedValue({ id: '1', description: 'New task' });
  render(<App />);
  await screen.findByText(/Nothing here yet/);
  fireEvent.change(screen.getByLabelText('ToDo:'), { target: { value: '  New task  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add ToDo!' }));
  expect(await screen.findByText('New task')).toBeInTheDocument();
  expect(createTodo).toHaveBeenCalledWith('New task');
  expect(listTodos).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText('ToDo:')).toHaveValue('');
});

test.each(['   ', 'x'.repeat(501)])('rejects invalid input', async (description) => {
  render(<App />);
  await screen.findByText(/Nothing here yet/);
  fireEvent.change(screen.getByLabelText('ToDo:'), { target: { value: description } });
  fireEvent.click(screen.getByRole('button', { name: 'Add ToDo!' }));
  expect(screen.getByRole('alert')).toHaveTextContent('between 1 and 500');
  expect(createTodo).not.toHaveBeenCalled();
});

test('preserves the draft after a failed save', async () => {
  createTodo.mockRejectedValue(new Error('Database unavailable.'));
  render(<App />);
  await screen.findByText(/Nothing here yet/);
  fireEvent.change(screen.getByLabelText('ToDo:'), { target: { value: 'Keep this' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add ToDo!' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable.');
  expect(screen.getByLabelText('ToDo:')).toHaveValue('Keep this');
});

test('allows retrying a failed list request', async () => {
  listTodos.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce([{ id: '1', description: 'Recovered' }]);
  render(<App />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh list' }));
  expect(await screen.findByText('Recovered')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('keeps successful save feedback when the subsequent refresh fails', async () => {
  listTodos.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Offline'));
  createTodo.mockResolvedValue({ id: '1', description: 'Saved' });
  render(<App />);
  await screen.findByText(/Nothing here yet/);
  fireEvent.change(screen.getByLabelText('ToDo:'), { target: { value: 'Saved' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add ToDo!' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not refresh');
  expect(screen.getByText('To-do saved.')).toBeInTheDocument();
  expect(screen.getByLabelText('ToDo:')).toHaveValue('');
  expect(createTodo).toHaveBeenCalledTimes(1);
});

test('blocks duplicate submissions while saving', async () => {
  let finishSave;
  createTodo.mockImplementation(() => new Promise((resolve) => { finishSave = resolve; }));
  render(<App />);
  await screen.findByText(/Nothing here yet/);
  fireEvent.change(screen.getByLabelText('ToDo:'), { target: { value: 'Once' } });
  const button = screen.getByRole('button', { name: 'Add ToDo!' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(createTodo).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  await act(async () => { finishSave({ id: '1', description: 'Once' }); });
  await waitFor(() => expect(button).not.toBeDisabled());
});
