import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiFetch from "../api";
import "./TaskDetail.css";

function TaskDetail() {
  const { id, taskId } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editing, setEditing] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [dueDate, setDueDate] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const TASK_API_URL =
    `http://127.0.0.1:8000/api/accounts/projects/${id}/tasks/${taskId}/`;

  const COMMENTS_API_URL =
    `http://127.0.0.1:8000/api/accounts/projects/${id}/tasks/${taskId}/comments/`;

  useEffect(() => {
    fetchTask();
    fetchComments();
  }, [id, taskId]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(TASK_API_URL);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load task."
        );
      }

      setTask(data);

      setTitle(data.title || "");
      setDescription(data.description || "");
      setPriority(data.priority || "medium");
      setStatus(data.status || "todo");
      setDueDate(data.due_date || "");
    } catch (err) {
      console.error("Task fetch error:", err);

      setError(
        err.message || "Failed to load task."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      setCommentLoading(true);

      const response = await apiFetch(COMMENTS_API_URL);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load comments."
        );
      }

      if (Array.isArray(data)) {
        setComments(data);
      } else if (Array.isArray(data.results)) {
        setComments(data.results);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error("Comments fetch error:", err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    window.location.href = "/login";
  };

  const handleEdit = () => {
    setError("");
    setSuccess("");
    setEditing(true);
  };

  const handleCancel = () => {
    setTitle(task.title || "");
    setDescription(task.description || "");
    setPriority(task.priority || "medium");
    setStatus(task.status || "todo");
    setDueDate(task.due_date || "");

    setError("");
    setSuccess("");
    setEditing(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await apiFetch(TASK_API_URL, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          due_date: dueDate || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to update task."
        );
      }

      setTask(data);

      setTitle(data.title || "");
      setDescription(data.description || "");
      setPriority(data.priority || "medium");
      setStatus(data.status || "todo");
      setDueDate(data.due_date || "");

      setEditing(false);
      setSuccess("Task updated successfully.");
    } catch (err) {
      console.error("Task update error:", err);

      setError(
        err.message || "Failed to update task."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      const response = await apiFetch(TASK_API_URL, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data.detail || "Unable to delete task."
        );
      }

      navigate(`/projects/${id}/board`);
    } catch (err) {
      console.error("Task delete error:", err);

      setError(
        err.message || "Failed to delete task."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();

    if (!commentText.trim()) {
      return;
    }

    try {
      setCommentSubmitting(true);
      setError("");

      const response = await apiFetch(COMMENTS_API_URL, {
        method: "POST",
        body: JSON.stringify({
          content: commentText.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to add comment."
        );
      }

      setComments((previousComments) => [
        ...previousComments,
        data,
      ]);

      setCommentText("");
    } catch (err) {
      console.error("Comment add error:", err);

      setError(
        err.message || "Failed to add comment."
      );
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleStartCommentEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
    setError("");
  };

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleSaveCommentEdit = async (commentId) => {
    if (!editingCommentText.trim()) {
      return;
    }

    try {
      setError("");

      const response = await apiFetch(
        `${COMMENTS_API_URL}${commentId}/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            content: editingCommentText.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to update comment."
        );
      }

      setComments((previousComments) =>
        previousComments.map((comment) =>
          comment.id === commentId
            ? data
            : comment
        )
      );

      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (err) {
      console.error("Comment update error:", err);

      setError(
        err.message || "Failed to update comment."
      );
    }
  };

  const handleDeleteComment = async (commentId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this comment?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await apiFetch(
        `${COMMENTS_API_URL}${commentId}/`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data.detail || "Unable to delete comment."
        );
      }

      setComments((previousComments) =>
        previousComments.filter(
          (comment) => comment.id !== commentId
        )
      );
    } catch (err) {
      console.error("Comment delete error:", err);

      setError(
        err.message || "Failed to delete comment."
      );
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "No due date";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCommentDate = (date) => {
    if (!date) {
      return "";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getDeadlineInfo = (date, currentStatus) => {
    if (!date || currentStatus === "done") {
      return {
        type: "none",
        label: "",
      };
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const deadline = new Date(`${date}T00:00:00`);

    if (Number.isNaN(deadline.getTime())) {
      return {
        type: "none",
        label: "",
      };
    }

    const difference =
      deadline.getTime() - today.getTime();

    const daysRemaining = Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining < 0) {
      const daysOverdue = Math.abs(daysRemaining);

      return {
        type: "overdue",
        label:
          daysOverdue === 1
            ? "1 day overdue"
            : `${daysOverdue} days overdue`,
      };
    }

    if (daysRemaining === 0) {
      return {
        type: "today",
        label: "Due today",
      };
    }

    if (daysRemaining === 1) {
      return {
        type: "soon",
        label: "Due tomorrow",
      };
    }

    if (daysRemaining <= 3) {
      return {
        type: "soon",
        label: `Due in ${daysRemaining} days`,
      };
    }

    return {
      type: "normal",
      label: `${daysRemaining} days remaining`,
    };
  };

  const formatStatus = (value) => {
    const statuses = {
      todo: "To Do",
      in_progress: "In Progress",
      testing: "Testing",
      done: "Done",
    };

    return statuses[value] || value;
  };

  const formatPriority = (value) => {
    if (!value) {
      return "Medium";
    }

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  };

  const deadlineInfo = task
    ? getDeadlineInfo(
        task.due_date,
        task.status
      )
    : {
        type: "none",
        label: "",
      };

  if (loading) {
    return (
      <div className="task-detail-page">
        <div className="task-detail-loading">
          <div className="task-loading-spinner"></div>

          <p>Loading task...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="task-detail-page">
        <div className="task-detail-error-card">
          <h2>Unable to load task</h2>

          <p>
            {error ||
              "This task could not be found."}
          </p>

          <Link
            to={`/projects/${id}/board`}
            className="task-primary-button"
          >
            ← Back to Board
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="task-detail-page">
      <header className="task-detail-navbar">
        <div className="task-detail-navbar-inner">
          <Link
            to="/dashboard"
            className="task-detail-logo"
          >
            Dev<span>Flow</span>
          </Link>

          <nav className="task-detail-nav">
            <Link
              to="/dashboard"
              className="task-detail-nav-link"
            >
              Dashboard
            </Link>

            <Link
              to={`/projects/${id}`}
              className="task-detail-nav-link"
            >
              Project
            </Link>

            <Link
              to={`/projects/${id}/board`}
              className="task-detail-nav-link"
            >
              Kanban Board
            </Link>

            <button
              type="button"
              className="task-detail-logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="task-detail-container">
        <div className="task-detail-breadcrumbs">
          <Link to="/dashboard">
            Dashboard
          </Link>

          <span>/</span>

          <Link to={`/projects/${id}`}>
            Project
          </Link>

          <span>/</span>

          <span>Task #{task.id}</span>
        </div>

        <div className="task-detail-top-actions">
          <Link
            to={`/projects/${id}/board`}
            className="task-secondary-button"
          >
            ← Back to Board
          </Link>

          <div className="task-detail-action-group">
            {!editing && (
              <>
                <button
                  type="button"
                  className="task-edit-button"
                  onClick={handleEdit}
                >
                  Edit Task
                </button>

                <button
                  type="button"
                  className="task-delete-button"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete Task"}
                </button>
              </>
            )}
          </div>
        </div>

        {success && (
          <div className="task-success-message">
            {success}
          </div>
        )}

        {error && (
          <div className="task-error-message">
            {error}
          </div>
        )}

        {editing ? (
          <section className="task-detail-card task-edit-card">
            <div className="task-detail-section-heading">
              <span className="task-detail-label">
                EDIT TASK
              </span>

              <h1>Update task</h1>

              <p>
                Modify the task details and workflow
                status.
              </p>
            </div>

            <form
              className="task-edit-form"
              onSubmit={handleSave}
            >
              <div className="task-form-group">
                <label htmlFor="task-title">
                  Task title
                </label>

                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Task title"
                  required
                />
              </div>

              <div className="task-form-group">
                <label htmlFor="task-description">
                  Description
                </label>

                <textarea
                  id="task-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Describe the task..."
                  rows="6"
                ></textarea>
              </div>

              <div className="task-form-grid">
                <div className="task-form-group">
                  <label htmlFor="task-priority">
                    Priority
                  </label>

                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(event) =>
                      setPriority(
                        event.target.value
                      )
                    }
                  >
                    <option value="low">
                      Low
                    </option>

                    <option value="medium">
                      Medium
                    </option>

                    <option value="high">
                      High
                    </option>
                  </select>
                </div>

                <div className="task-form-group">
                  <label htmlFor="task-status">
                    Status
                  </label>

                  <select
                    id="task-status"
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target.value
                      )
                    }
                  >
                    <option value="todo">
                      To Do
                    </option>

                    <option value="in_progress">
                      In Progress
                    </option>

                    <option value="testing">
                      Testing
                    </option>

                    <option value="done">
                      Done
                    </option>
                  </select>
                </div>

                <div className="task-form-group">
                  <label htmlFor="task-due-date">
                    Due date
                  </label>

                  <input
                    id="task-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(event) =>
                      setDueDate(
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="task-edit-actions">
                <button
                  type="button"
                  className="task-secondary-button"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="task-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <>
            <section className="task-detail-card">
              <div className="task-detail-header">
                <div>
                  <span className="task-detail-label">
                    TASK #{task.id}
                  </span>

                  <h1>{task.title}</h1>
                </div>

                <span
                  className={`task-detail-priority ${
                    task.priority || "medium"
                  }`}
                >
                  {formatPriority(task.priority)}
                </span>
              </div>

              {deadlineInfo.type !== "none" && (
                <div
                  className={`task-deadline-alert ${deadlineInfo.type}`}
                >
                  <span className="task-deadline-alert-icon">
                    !
                  </span>

                  <div>
                    <strong>
                      {deadlineInfo.label}
                    </strong>

                    <span>
                      Deadline:{" "}
                      {formatDate(task.due_date)}
                    </span>
                  </div>
                </div>
              )}

              <div className="task-detail-status-row">
                <div className="task-detail-status">
                  <span className="task-detail-meta-label">
                    STATUS
                  </span>

                  <strong>
                    {formatStatus(task.status)}
                  </strong>
                </div>

                <div className="task-detail-status">
                  <span className="task-detail-meta-label">
                    PRIORITY
                  </span>

                  <strong>
                    {formatPriority(
                      task.priority
                    )}
                  </strong>
                </div>

                <div className="task-detail-status">
                  <span className="task-detail-meta-label">
                    DUE DATE
                  </span>

                  <strong>
                    {formatDate(task.due_date)}
                  </strong>
                </div>
              </div>

              <div className="task-detail-description">
                <span className="task-detail-label">
                  DESCRIPTION
                </span>

                <p>
                  {task.description ||
                    "No description provided for this task."}
                </p>
              </div>

              <div className="task-detail-footer">
                <Link
                  to={`/projects/${id}`}
                  className="task-secondary-button"
                >
                  Project Details
                </Link>

                <Link
                  to={`/projects/${id}/board`}
                  className="task-primary-button"
                >
                  Open Kanban Board
                </Link>
              </div>
            </section>

            {/* =====================================================
                COMMENTS
            ====================================================== */}

            <section className="task-comments-section">
              <div className="task-comments-header">
                <div>
                  <span className="task-detail-label">
                    DISCUSSION
                  </span>

                  <h2>Comments</h2>

                  <p>
                    Discuss this task with your team.
                  </p>
                </div>

                <span className="task-comments-count">
                  {comments.length}
                </span>
              </div>

              <div className="task-comments-card">
                {commentLoading ? (
                  <div className="task-comments-loading">
                    <div className="task-loading-spinner"></div>

                    <p>Loading comments...</p>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="task-comments-empty">
                    <div className="task-comments-empty-icon">
                      💬
                    </div>

                    <h3>No comments yet</h3>

                    <p>
                      Start the discussion by adding
                      the first comment.
                    </p>
                  </div>
                ) : (
                  <div className="task-comments-list">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="task-comment"
                      >
                        <div className="task-comment-avatar">
                          {(
                            comment.username ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="task-comment-content">
                          <div className="task-comment-top">
                            <div className="task-comment-author">
                              <strong>
                                {comment.username ||
                                  "User"}
                              </strong>

                              <span>
                                {formatCommentDate(
                                  comment.created_at
                                )}
                              </span>
                            </div>

                            <div className="task-comment-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  handleStartCommentEdit(
                                    comment
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteComment(
                                    comment.id
                                  )
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {editingCommentId ===
                          comment.id ? (
                            <div className="task-comment-edit">
                              <textarea
                                value={
                                  editingCommentText
                                }
                                onChange={(event) =>
                                  setEditingCommentText(
                                    event.target.value
                                  )
                                }
                                rows="3"
                                autoFocus
                              ></textarea>

                              <div className="task-comment-edit-actions">
                                <button
                                  type="button"
                                  className="task-comment-cancel-button"
                                  onClick={
                                    handleCancelCommentEdit
                                  }
                                >
                                  Cancel
                                </button>

                                <button
                                  type="button"
                                  className="task-comment-save-button"
                                  onClick={() =>
                                    handleSaveCommentEdit(
                                      comment.id
                                    )
                                  }
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="task-comment-text">
                              {comment.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  className="task-comment-form"
                  onSubmit={handleAddComment}
                >
                  <div className="task-comment-form-avatar">
                    U
                  </div>

                  <div className="task-comment-input-wrapper">
                    <textarea
                      value={commentText}
                      onChange={(event) =>
                        setCommentText(
                          event.target.value
                        )
                      }
                      placeholder="Write a comment..."
                      rows="3"
                    ></textarea>

                    <div className="task-comment-form-footer">
                      <span>
                        Share your thoughts about
                        this task.
                      </span>

                      <button
                        type="submit"
                        className="task-comment-submit-button"
                        disabled={
                          commentSubmitting ||
                          !commentText.trim()
                        }
                      >
                        {commentSubmitting
                          ? "Posting..."
                          : "Add Comment"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default TaskDetail;