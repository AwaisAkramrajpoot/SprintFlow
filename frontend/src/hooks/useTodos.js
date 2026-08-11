import { useCallback, useEffect, useState } from "react";

import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from "../services/todoService";

const useTodos = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch todos
  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getTodos();

      setTodos(data);
    } catch (error) {
      setError(error.message || "Failed to load todos");
    } finally {
      setLoading(false);
    }
  }, []);

  // Create
  const addTodo = async (todoData) => {
    try {
      setError("");

      const newTodo = await createTodo(todoData);

      setTodos((currentTodos) => [
        ...currentTodos,
        newTodo,
      ]);

      return newTodo;
    } catch (error) {
      setError(error.message || "Failed to create todo");
      throw error;
    }
  };

  // Update
  const editTodo = async (todoId, todoData) => {
    try {
      setError("");

      const updatedTodo = await updateTodo(todoId, todoData);

      setTodos((currentTodos) =>
        currentTodos.map((todo) =>
          todo.id === todoId ? updatedTodo : todo
        )
      );

      return updatedTodo;
    } catch (error) {
      setError(error.message || "Failed to update todo");
      throw error;
    }
  };

  // Delete
  const removeTodo = async (todoId) => {
    try {
      setError("");

      await deleteTodo(todoId);

      setTodos((currentTodos) =>
        currentTodos.filter((todo) => todo.id !== todoId)
      );
    } catch (error) {
      setError(error.message || "Failed to delete todo");
      throw error;
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTodos();
  }, [fetchTodos]);

  return {
    todos,
    loading,
    error,
    fetchTodos,
    addTodo,
    editTodo,
    removeTodo,
  };
};

export default useTodos;