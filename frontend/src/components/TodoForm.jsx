import { useEffect, useState } from "react";

const TodoForm = ({
  onSubmit,
  editingTodo,
  onCancelEdit,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingTodo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: editingTodo.name || "",
        description: editingTodo.description || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
      });
    }
  }, [editingTodo]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    try {
      setSubmitting(true);

      await onSubmit(formData);

      if (!editingTodo) {
        setFormData({
          name: "",
          description: "",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">
          Todo Name
        </label>

        <input
          id="name"
          name="name"
          type="text"
          placeholder="Enter todo name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">
          Description
        </label>

        <textarea
          id="description"
          name="description"
          placeholder="Enter description"
          value={formData.description}
          onChange={handleChange}
          rows="4"
        />
      </div>

      <div className="form-actions">
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary"
        >
          {submitting
            ? "Saving..."
            : editingTodo
            ? "Update Todo"
            : "Create Todo"}
        </button>

        {editingTodo && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default TodoForm;