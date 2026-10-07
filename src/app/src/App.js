import { useCallback, useEffect, useRef, useState } from 'react';
import { createTodo, listTodos } from './api';
import './App.css';

export function App() {
  const [todos, setTodos] = useState([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const busy = useRef(false);
  const mounted = useRef(false);
  const input = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const items = await listTodos();
      // Replace the list only after a successful fetch, so a failed refresh leaves existing items visible.
      if (mounted.current) setTodos(items);
    } catch (error) {
      if (mounted.current) setListError(error.message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => { mounted.current = false; };
  }, [refresh]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy.current) return;
    const value = description.trim();
    if (!value || Array.from(value).length > 500) {
      setFormError('Enter a description between 1 and 500 characters.');
      return;
    }
    busy.current = true;
    setSaving(true);
    setFormError('');
    setNotice('');
    try {
      await createTodo(value);
      if (!mounted.current) return;
      // Clear the draft only after saving succeeds; keep it if the request fails.
      setDescription('');
      setNotice('To-do saved.');
      // refresh handles its own errors: reporting a saved todo as failed could prompt a duplicate submission.
      await refresh();
    } catch (error) {
      if (mounted.current) setFormError(error.message);
    } finally {
      busy.current = false;
      if (mounted.current) {
        setSaving(false);
        input.current?.focus();
      }
    }
  }

  return (
    <div className="App">
      <div>
        <h1>List of TODOs</h1>
        {loading && <p role="status">Loading to-dos…</p>}
        {listError && <p role="alert">Could not refresh the list: {listError}</p>}
        {!loading && !listError && todos.length === 0 && (
          <p>Nothing here yet. Add your first to-do below.</p>
        )}
        <ul>{todos.map((todo) => <li key={todo.id}>{todo.description}</li>)}</ul>
        <button onClick={refresh} disabled={loading || saving}>Refresh list</button>
      </div>
      <div>
        <h1>Create a ToDo</h1>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="todo">ToDo: </label>
            <input id="todo" type="text" ref={input} value={description}
              onChange={(event) => setDescription(event.target.value)}
              readOnly={saving} aria-invalid={Boolean(formError)} />
          </div>
          <div style={{ marginTop: '5px' }}>
            <button type="submit" disabled={saving || loading}>
              {saving ? 'Saving…' : 'Add ToDo!'}
            </button>
          </div>
          {formError && <p role="alert">{formError}</p>}
          {notice && <p role="status">To-do saved.</p>}
        </form>
      </div>
    </div>
  );
}

export default App;
