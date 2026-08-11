import { useState } from "react";

import TodoForm from "./components/TodoForm";
import TodoList from "./components/TodoList";
import useTodos from "./hooks/useTodos";

import "./App.css";

function App() {
  const {
    todos,
    loading,
    error,
    addTodo,
    editTodo,
    removeTodo,
  } = useTodos();

  const [editingTodo, setEditingTodo] = useState(null);

  const handleCreate = async (todoData) => {
    await addTodo(todoData);
  };

  const handleUpdate = async (todoData) => {
    if (!editingTodo) {
      return;
    }

    await editTodo(editingTodo.id, {
      id: editingTodo.id,
      ...todoData,
    });

    setEditingTodo(null);
  };

  const handleDelete = async (todoId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this todo?"
    );

    if (!confirmed) {
      return;
    }

    await removeTodo(todoId);

    if (editingTodo?.id === todoId) {
      setEditingTodo(null);
    }
  };

  const handleSubmit = async (todoData) => {
    if (editingTodo) {
      await handleUpdate(todoData);
    } else {
      await handleCreate(todoData);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">
            FastAPI + React + PostgreSQL
          </p>

          <h1>Todo Management</h1>

          <p className="subtitle">
            Manage your todos using a production-style
            CRUD application.
          </p>
        </div>

        <div className="todo-count">
          <span>Total Todos</span>
          <strong>{todos.length}</strong>
        </div>
      </header>

      <main className="container">
        <section className="card">
          <div className="section-header">
            <h2>
              {editingTodo
                ? "Edit Todo"
                : "Create Todo"}
            </h2>
          </div>

          <TodoForm
            onSubmit={handleSubmit}
            editingTodo={editingTodo}
            onCancelEdit={() => setEditingTodo(null)}
          />
        </section>

        <section className="card">
          <div className="section-header">
            <div>
              <h2>Todo List</h2>

              <p>
                {todos.length}{" "}
                {todos.length === 1
                  ? "todo"
                  : "todos"}
              </p>
            </div>
          </div>

          {loading && (
            <div className="loading">
              Loading todos...
            </div>
          )}

          {error && (
            <div className="error">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && (
            <TodoList
              todos={todos}
              onEdit={setEditingTodo}
              onDelete={handleDelete}
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;