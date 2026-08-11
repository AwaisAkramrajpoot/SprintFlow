const TodoItem = ({
    todo,
    onEdit,
    onDelete,
  }) => {
    return (
      <div className="todo-item">
        <div className="todo-content">
          <h3>{todo.name}</h3>
  
          <p>
            {todo.description || "No description provided."}
          </p>
  
          <span className="todo-id">
            ID: {todo.id}
          </span>
        </div>
  
        <div className="todo-actions">
          <button
            onClick={() => onEdit(todo)}
            className="btn btn-edit"
          >
            Edit
          </button>
  
          <button
            onClick={() => onDelete(todo.id)}
            className="btn btn-danger"
          >
            Delete
          </button>
        </div>
      </div>
    );
  };
  
  export default TodoItem;