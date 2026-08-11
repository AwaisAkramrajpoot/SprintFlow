import TodoItem from "./TodoItem";

const TodoList = ({
  todos,
  onEdit,
  onDelete,
}) => {
  if (todos.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Todos Found</h3>
        <p>Create your first todo to get started.</p>
      </div>
    );
  }

  return (
    <div className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default TodoList;