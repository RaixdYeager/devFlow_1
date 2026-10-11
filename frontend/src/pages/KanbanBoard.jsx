import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api";
import "./KanbanBoard.css";

const STATUS_COLUMNS = [
  {
    key: "todo",
    title: "Backlog",
    dotClass: "backlog-dot",
  },
  {
    key: "in_progress",
    title: "In Progress",
    dotClass: "progress-dot",
  },
  {
    key: "testing",
    title: "Testing",
    dotClass: "testing-dot",
  },
  {
    key: "done",
    title: "Done",
    dotClass: "done-dot",
  },
];

function KanbanBoard() {
  const { id } = useParams();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [draggedTask, setDraggedTask] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  const [activeView, setActiveView] = useState("board");

  // =========================
  // SEARCH & FILTERS
  // =========================

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // =========================
  // NEW TASK
  // =========================

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
  });

  useEffect(() => {
    loadBoard();
  }, [id]);

  // =========================
  // LOAD BOARD
  // =========================

  async function loadBoard() {
    try {
      setLoading(true);
      setError("");

      const projectResponse = await apiFetch(
        `http://127.0.0.1:8000/api/accounts/projects/${id}/`
      );

      const tasksResponse = await apiFetch(
        `http://127.0.0.1:8000/api/accounts/projects/${id}/tasks/`
      );

      if (!projectResponse.ok) {
        throw new Error("Unable to load project.");
      }

      if (!tasksResponse.ok) {
        throw new Error("Unable to load tasks.");
      }

      const projectData = await projectResponse.json();
      const tasksData = await tasksResponse.json();

      setProject(projectData);

      let normalizedTasks = [];

      if (Array.isArray(tasksData)) {
        normalizedTasks = tasksData;
      } else if (Array.isArray(tasksData.results)) {
        normalizedTasks = tasksData.results;
      } else if (Array.isArray(tasksData.tasks)) {
        normalizedTasks = tasksData.tasks;
      } else if (Array.isArray(tasksData.data)) {
        normalizedTasks = tasksData.data;
      }

      setTasks(normalizedTasks);
    } catch (err) {
      console.error("Kanban loading error:", err);

      setError("Unable to load the project board.");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // FILTERED TASKS
  // =========================

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query);

      const matchesPriority =
        priorityFilter === "all" ||
        task.priority === priorityFilter;

      const matchesStatus =
        statusFilter === "all" ||
        task.status === statusFilter;

      return (
        matchesSearch &&
        matchesPriority &&
        matchesStatus
      );
    });
  }, [
    tasks,
    searchQuery,
    priorityFilter,
    statusFilter,
  ]);

  // =========================
  // GROUP TASKS
  // =========================

  const groupedTasks = useMemo(() => {
    const groups = {
      todo: [],
      in_progress: [],
      testing: [],
      done: [],
    };

    filteredTasks.forEach((task) => {
      if (groups[task.status]) {
        groups[task.status].push(task);
      }
    });

    return groups;
  }, [filteredTasks]);

  const completedCount = filteredTasks.filter(
    (task) => task.status === "done"
  ).length;

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    priorityFilter !== "all" ||
    statusFilter !== "all";

  function clearFilters() {
    setSearchQuery("");
    setPriorityFilter("all");
    setStatusFilter("all");
  }

  // =========================
  // DRAG & DROP
  // =========================

  function handleDragStart(event, task) {
    setDraggedTask(task);

    event.dataTransfer.effectAllowed = "move";

    event.dataTransfer.setData(
      "text/plain",
      String(task.id)
    );
  }

  function handleDragEnd() {
    setDraggedTask(null);
  }

  function handleDragOver(event) {
    event.preventDefault();

    event.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(event, newStatus) {
    event.preventDefault();

    if (!draggedTask) {
      return;
    }

    if (draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    await updateTaskStatus(
      draggedTask.id,
      newStatus
    );

    setDraggedTask(null);
  }

  // =========================
  // UPDATE TASK STATUS
  // =========================

  async function updateTaskStatus(
    taskId,
    newStatus
  ) {
    try {
      setUpdatingTaskId(taskId);
      setError("");

      const response = await apiFetch(
        `http://127.0.0.1:8000/api/accounts/projects/${id}/tasks/${taskId}/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to update task."
        );
      }

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId
            ? data
            : task
        )
      );
    } catch (err) {
      console.error(
        "Task status update error:",
        err
      );

      setError(
        err.message ||
          "Unable to update the task status."
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  // =========================
  // CREATE TASK
  // =========================

  function handleTaskInputChange(event) {
    const { name, value } = event.target;

    setNewTask((currentTask) => ({
      ...currentTask,
      [name]: value,
    }));
  }

  async function handleCreateTask(event) {
    event.preventDefault();

    if (!newTask.title.trim()) {
      setError("Task title is required.");
      return;
    }

    try {
      setCreatingTask(true);
      setError("");

      const response = await apiFetch(
        `http://127.0.0.1:8000/api/accounts/projects/${id}/tasks/`,
        {
          method: "POST",
          body: JSON.stringify({
            title: newTask.title.trim(),
            description: newTask.description.trim(),
            priority: newTask.priority,
            due_date: newTask.due_date || null,
            status: "todo",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to create task."
        );
      }

      setTasks((currentTasks) => [
        ...currentTasks,
        data,
      ]);

      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        due_date: "",
      });

      setShowTaskForm(false);
    } catch (err) {
      console.error(
        "Task creation error:",
        err
      );

      setError(
        err.message ||
          "Unable to create the task."
      );
    } finally {
      setCreatingTask(false);
    }
  }

  // =========================
  // PRIORITY HELPERS
  // =========================

  function getPriorityClass(priority) {
    if (priority === "high") {
      return "priority-high";
    }

    if (priority === "low") {
      return "priority-low";
    }

    return "priority-medium";
  }

  function formatPriority(priority) {
    if (!priority) {
      return "Medium";
    }

    return (
      priority.charAt(0).toUpperCase() +
      priority.slice(1)
    );
  }

  // =========================
  // DATE HELPERS
  // =========================

  function formatDate(date) {
    if (!date) {
      return "No due date";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  // =========================
  // DEADLINE INTELLIGENCE
  // =========================

  function getDeadlineInfo(date, status) {
    if (!date || status === "done") {
      return {
        type: "none",
        label: "",
      };
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const deadline = new Date(
      `${date}T00:00:00`
    );

    if (Number.isNaN(deadline.getTime())) {
      return {
        type: "none",
        label: "",
      };
    }

    const difference =
      deadline.getTime() -
      today.getTime();

    const daysRemaining = Math.ceil(
      difference /
        (1000 * 60 * 60 * 24)
    );

    if (daysRemaining < 0) {
      const daysOverdue = Math.abs(
        daysRemaining
      );

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
      label: `Due in ${daysRemaining} days`,
    };
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="kanban-page">
        <div className="kanban-loading">
          <div className="kanban-spinner"></div>

          <p>Loading project board...</p>
        </div>
      </div>
    );
  }

  // =========================
  // ERROR
  // =========================

  if (error && !project) {
    return (
      <div className="kanban-page">
        <div className="kanban-error">
          <h2>Something went wrong</h2>

          <p>{error}</p>

          <button
            className="primary-btn"
            onClick={loadBoard}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="kanban-page">
      {/* =================================
          HEADER
      ================================= */}

      <header className="kanban-header">
        <div className="kanban-header-left">
          <Link
            to={`/projects/${id}`}
            className="kanban-back"
          >
            ←
          </Link>

          <div>
            <span className="kanban-label">
              PROJECT BOARD
            </span>

            <h1>
              {project?.name || "Project"}
            </h1>
          </div>
        </div>

        <div className="kanban-header-actions">
          <Link
            to={`/projects/${id}`}
            className="secondary-btn"
          >
            Project Details
          </Link>

          <button
            className="primary-btn"
            onClick={() => {
              setShowTaskForm(
                (current) => !current
              );

              setError("");
            }}
          >
            {showTaskForm
              ? "Close"
              : "+ New Task"}
          </button>
        </div>
      </header>

      <main className="kanban-content">
        {/* =================================
            TOOLBAR
        ================================= */}

        <div className="kanban-toolbar">
          <div className="kanban-toolbar-heading">
            <div>
              <span className="kanban-label">
                WORKFLOW
              </span>

              <h2>Task Board</h2>

              <p>
                Drag tasks between columns to
                update their status.
              </p>
            </div>

            <div className="kanban-board-summary">
              <span>
                {filteredTasks.length}{" "}
                {filteredTasks.length === 1
                  ? "task"
                  : "tasks"}
              </span>

              <span>
                {completedCount} completed
              </span>
            </div>
          </div>

          <div className="kanban-tabs">
            <button
              type="button"
              className={`kanban-tab ${
                activeView === "board"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveView("board")
              }
            >
              Board
            </button>

            <button
              type="button"
              className={`kanban-tab ${
                activeView === "list"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveView("list")
              }
            >
              List
            </button>

            <button
              type="button"
              className="kanban-tab"
              disabled
            >
              Timeline
            </button>
          </div>
        </div>

        {/* =================================
            SEARCH & FILTERS
        ================================= */}

        <section className="kanban-filter-card">
          <div className="kanban-search-wrapper">
            <span className="kanban-search-icon">
              ⌕
            </span>

            <input
              type="text"
              className="kanban-search-input"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
            />
          </div>

          <div className="kanban-filter-group">
            <label htmlFor="priority-filter">
              Priority
            </label>

            <select
              id="priority-filter"
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All priorities
              </option>

              <option value="high">
                High
              </option>

              <option value="medium">
                Medium
              </option>

              <option value="low">
                Low
              </option>
            </select>
          </div>

          <div className="kanban-filter-group">
            <label htmlFor="status-filter">
              Status
            </label>

            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All statuses
              </option>

              <option value="todo">
                Backlog
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

          {hasActiveFilters && (
            <button
              type="button"
              className="kanban-clear-filters"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </section>

        {/* =================================
            NEW TASK FORM
        ================================= */}

        {showTaskForm && (
          <section className="kanban-task-form-card">
            <div className="kanban-task-form-header">
              <div>
                <span className="kanban-label">
                  NEW TASK
                </span>

                <h2>Create a task</h2>
              </div>

              <button
                type="button"
                className="kanban-form-close"
                onClick={() =>
                  setShowTaskForm(false)
                }
              >
                ×
              </button>
            </div>

            <form
              className="kanban-task-form"
              onSubmit={handleCreateTask}
            >
              <div className="kanban-form-group kanban-form-full">
                <label htmlFor="task-title">
                  Task title
                </label>

                <input
                  id="task-title"
                  name="title"
                  type="text"
                  placeholder="e.g. Build authentication API"
                  value={newTask.title}
                  onChange={
                    handleTaskInputChange
                  }
                  required
                />
              </div>

              <div className="kanban-form-group kanban-form-full">
                <label htmlFor="task-description">
                  Description
                </label>

                <textarea
                  id="task-description"
                  name="description"
                  placeholder="What needs to be done?"
                  value={newTask.description}
                  onChange={
                    handleTaskInputChange
                  }
                  rows="3"
                ></textarea>
              </div>

              <div className="kanban-form-group">
                <label htmlFor="task-priority">
                  Priority
                </label>

                <select
                  id="task-priority"
                  name="priority"
                  value={newTask.priority}
                  onChange={
                    handleTaskInputChange
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

              <div className="kanban-form-group">
                <label htmlFor="task-due-date">
                  Due date
                </label>

                <input
                  id="task-due-date"
                  name="due_date"
                  type="date"
                  value={newTask.due_date}
                  onChange={
                    handleTaskInputChange
                  }
                />
              </div>

              <div className="kanban-form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    setShowTaskForm(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={creatingTask}
                >
                  {creatingTask
                    ? "Creating..."
                    : "Create Task"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* =================================
            ERROR
        ================================= */}

        {error && (
          <div className="kanban-inline-error">
            {error}
          </div>
        )}

        {/* =================================
            BOARD VIEW
        ================================= */}

        {activeView === "board" && (
          <>
            {filteredTasks.length === 0 &&
            hasActiveFilters ? (
              <div className="kanban-no-results">
                <div className="kanban-no-results-icon">
                  ⌕
                </div>

                <h3>
                  No matching tasks
                </h3>

                <p>
                  Try changing your search or
                  filters.
                </p>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <section className="kanban-board">
                {STATUS_COLUMNS.map(
                  (column) => {
                    const columnTasks =
                      groupedTasks[
                        column.key
                      ] || [];

                    return (
                      <div
                        key={column.key}
                        className={`kanban-column ${
                          draggedTask
                            ? "kanban-column-drag-active"
                            : ""
                        }`}
                        onDragOver={
                          handleDragOver
                        }
                        onDrop={(event) =>
                          handleDrop(
                            event,
                            column.key
                          )
                        }
                      >
                        <div className="kanban-column-header">
                          <div className="kanban-column-title">
                            <span
                              className={`kanban-dot ${column.dotClass}`}
                            ></span>

                            <h3>
                              {column.title}
                            </h3>

                            <span className="kanban-count">
                              {
                                columnTasks.length
                              }
                            </span>
                          </div>
                        </div>

                        <div className="kanban-column-body">
                          {columnTasks.length ===
                          0 ? (
                            <div className="kanban-empty">
                              <span>
                                Drop tasks here
                              </span>
                            </div>
                          ) : (
                            columnTasks.map(
                              (task) => {
                                const deadlineInfo =
                                  getDeadlineInfo(
                                    task.due_date,
                                    task.status
                                  );

                                return (
                                  <Link
                                    key={
                                      task.id
                                    }
                                    to={`/projects/${id}/tasks/${task.id}`}
                                    className="task-card-link"
                                    draggable={
                                      false
                                    }
                                    onClick={(
                                      event
                                    ) => {
                                      if (
                                        draggedTask
                                      ) {
                                        event.preventDefault();
                                      }
                                    }}
                                  >
                                    <article
                                      className={`task-card ${
                                        draggedTask?.id ===
                                        task.id
                                          ? "task-card-dragging"
                                          : ""
                                      }`}
                                      draggable
                                      onDragStart={(
                                        event
                                      ) =>
                                        handleDragStart(
                                          event,
                                          task
                                        )
                                      }
                                      onDragEnd={
                                        handleDragEnd
                                      }
                                    >
                                      <div className="task-card-top">
                                        <span
                                          className={`task-priority ${getPriorityClass(
                                            task.priority
                                          )}`}
                                        >
                                          {formatPriority(
                                            task.priority
                                          )}
                                        </span>

                                        {updatingTaskId ===
                                          task.id && (
                                          <span className="task-updating">
                                            Updating...
                                          </span>
                                        )}
                                      </div>

                                      <h4>
                                        {task.title}
                                      </h4>

                                      {task.description && (
                                        <p className="task-description">
                                          {
                                            task.description
                                          }
                                        </p>
                                      )}

                                      <div className="task-card-footer">
                                        <div className="task-card-deadline-wrapper">
                                          <span className="task-due-date">
                                            {task.due_date
                                              ? `Due ${formatDate(
                                                  task.due_date
                                                )}`
                                              : "No due date"}
                                          </span>

                                          {deadlineInfo.type !==
                                            "none" && (
                                            <span
                                              className={`task-deadline-status ${deadlineInfo.type}`}
                                            >
                                              {
                                                deadlineInfo.label
                                              }
                                            </span>
                                          )}
                                        </div>

                                        <select
                                          value={
                                            task.status
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            updateTaskStatus(
                                              task.id,
                                              event
                                                .target
                                                .value
                                            )
                                          }
                                          onClick={(
                                            event
                                          ) =>
                                            event.stopPropagation()
                                          }
                                          onMouseDown={(
                                            event
                                          ) =>
                                            event.stopPropagation()
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
                                    </article>
                                  </Link>
                                );
                              }
                            )
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </section>
            )}
          </>
        )}

        {/* =================================
            LIST VIEW
        ================================= */}

        {activeView === "list" && (
          <section className="kanban-list-view">
            {filteredTasks.length === 0 ? (
              <div className="kanban-list-empty">
                <h3>
                  {hasActiveFilters
                    ? "No matching tasks"
                    : "No tasks yet"}
                </h3>

                <p>
                  {hasActiveFilters
                    ? "Try changing your search or filters."
                    : "Create a task to see it in your project list."}
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="kanban-list-card">
                <div className="kanban-list-header">
                  <span>Task</span>
                  <span>Status</span>
                  <span>Priority</span>
                  <span>Due Date</span>
                  <span>Action</span>
                </div>

                {filteredTasks.map(
                  (task) => (
                    <div
                      className="kanban-list-row"
                      key={task.id}
                    >
                      <div className="kanban-list-task">
                        <strong>
                          {task.title}
                        </strong>

                        {task.description && (
                          <span>
                            {
                              task.description
                            }
                          </span>
                        )}
                      </div>

                      <div>
                        <select
                          value={
                            task.status
                          }
                          onChange={(
                            event
                          ) =>
                            updateTaskStatus(
                              task.id,
                              event.target
                                .value
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

                      <span
                        className={`task-priority ${getPriorityClass(
                          task.priority
                        )}`}
                      >
                        {formatPriority(
                          task.priority
                        )}
                      </span>

                      <span className="kanban-list-date">
                        {task.due_date
                          ? formatDate(
                              task.due_date
                            )
                          : "No due date"}
                      </span>

                      <Link
                        to={`/projects/${id}/tasks/${task.id}`}
                        className="kanban-list-view-button"
                      >
                        View
                      </Link>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default KanbanBoard;