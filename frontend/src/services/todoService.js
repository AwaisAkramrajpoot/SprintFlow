const API_URL = import.meta.env.VITE_API_URL;

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = "Something went wrong";

    try {
      const errorData = await response.json();

      if (Array.isArray(errorData.detail)) {
        errorMessage = errorData.detail
          .map((error) => error.msg)
          .join(", ");
      } else if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch {
      // Ignore JSON parsing error
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

// GET all todos
export const getTodos = async () => {
  const response = await fetch(`${API_URL}/todos/`);

  return handleResponse(response);
};

// GET single todo
export const getTodo = async (todoId) => {
  const response = await fetch(`${API_URL}/todos/${todoId}`);

  return handleResponse(response);
};

// CREATE todo
export const createTodo = async (todo) => {
  const response = await fetch(`${API_URL}/todos/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(todo),
  });

  return handleResponse(response);
};

// UPDATE todo
export const updateTodo = async (todoId, todo) => {
  const response = await fetch(`${API_URL}/todos/${todoId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(todo),
  });

  return handleResponse(response);
};

// DELETE todo
export const deleteTodo = async (todoId) => {
  const response = await fetch(`${API_URL}/todos/${todoId}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });

  return handleResponse(response);
};