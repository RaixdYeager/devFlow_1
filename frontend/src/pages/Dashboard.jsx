import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiFetch from "../api";
import "./Dashboard.css";

const PROJECTS_API_URL =
  "http://127.0.0.1:8000/api/accounts/projects/";

function Dashboard() {
  const [projects, setProjects] = useState([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // =========================
  // FETCH PROJECTS
  // =========================

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(
        PROJECTS_API_URL,
        {
          method: "GET",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load projects."
        );
      }

      const projectList = Array.isArray(data)
        ? data
        : [];

      // Fetch tasks for every project
      const projectsWithTasks =
        await Promise.all(
          projectList.map(async (project) => {
            try {
              const taskResponse =
                await apiFetch(
                  `${PROJECTS_API_URL}${project.id}/tasks/`
                );

              if (!taskResponse.ok) {
                return {
                  ...project,
                  tasks: [],
                };
              }

              const taskData =
                await taskResponse.json();

              let projectTasks = [];

              if (Array.isArray(taskData)) {
                projectTasks = taskData;
              } else if (
                Array.isArray(taskData.results)
              ) {
                projectTasks =
                  taskData.results;
              } else if (
                Array.isArray(taskData.tasks)
              ) {
                projectTasks =
                  taskData.tasks;
              } else if (
                Array.isArray(taskData.data)
              ) {
                projectTasks =
                  taskData.data;
              }

              return {
                ...project,
                tasks: projectTasks,
              };
            } catch (taskError) {
              console.error(
                `Task fetch error for project ${project.id}:`,
                taskError
              );

              return {
                ...project,
                tasks: [],
              };
            }
          })
        );

      setProjects(projectsWithTasks);
    } catch (err) {
      console.error(
        "Project fetch error:",
        err
      );

      setError(
        err.message ||
          "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // =========================
  // CREATE PROJECT
  // =========================

  const handleCreateProject = async (
    event
  ) => {
    event.preventDefault();

    if (!name.trim()) {
      setError(
        "Project name is required."
      );

      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await apiFetch(
        PROJECTS_API_URL,
        {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            description:
              description.trim(),
            deadline:
              deadline || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to create project."
        );
      }

      const newProject = {
        ...data,
        tasks: [],
      };

      setProjects((currentProjects) => [
        newProject,
        ...currentProjects,
      ]);

      setName("");
      setDescription("");
      setDeadline("");
    } catch (err) {
      console.error(
        "Project creation error:",
        err
      );

      setError(
        err.message ||
          "Failed to create project."
      );
    } finally {
      setCreating(false);
    }
  };

  // =========================
  // DATE FORMAT
  // =========================

  const formatDeadline = (date) => {
    if (!date) {
      return "No deadline";
    }

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
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
  };

  // =========================
  // TASK STATISTICS
  // =========================

  const getProjectStats = (project) => {
    const tasks = Array.isArray(
      project.tasks
    )
      ? project.tasks
      : [];

    const total = tasks.length;

    const completed = tasks.filter(
      (task) =>
        task.status === "done"
    ).length;

    const inProgress = tasks.filter(
      (task) =>
        task.status === "in_progress"
    ).length;

    const testing = tasks.filter(
      (task) =>
        task.status === "testing"
    ).length;

    const backlog = tasks.filter(
      (task) =>
        task.status === "todo"
    ).length;

    const progress =
      total === 0
        ? 0
        : Math.round(
            (completed / total) *
              100
          );

    return {
      total,
      completed,
      inProgress,
      testing,
      backlog,
      progress,
    };
  };

  // =========================
  // DASHBOARD TOTALS
  // =========================

  const dashboardStats =
    projects.reduce(
      (stats, project) => {
        const projectStats =
          getProjectStats(project);

        return {
          totalTasks:
            stats.totalTasks +
            projectStats.total,

          completed:
            stats.completed +
            projectStats.completed,

          inProgress:
            stats.inProgress +
            projectStats.inProgress,

          testing:
            stats.testing +
            projectStats.testing,
        };
      },
      {
        totalTasks: 0,
        completed: 0,
        inProgress: 0,
        testing: 0,
      }
    );

  return (
    <div className="dashboard-page">
      {/* =========================
          NAVBAR
      ========================= */}

      <header className="dashboard-navbar">
        <div className="dashboard-navbar-inner">
          <Link
            to="/"
            className="dashboard-logo"
          >
            Dev<span>Flow</span>
          </Link>

          <nav className="dashboard-nav">
            <Link
              to="/dashboard"
              className="dashboard-nav-link active"
            >
              Dashboard
            </Link>

            <Link
              to="/"
              className="dashboard-nav-link"
            >
              Home
            </Link>

            <button
              type="button"
              className="dashboard-logout-button"
              onClick={() => {
                localStorage.removeItem(
                  "access_token"
                );

                localStorage.removeItem(
                  "refresh_token"
                );

                window.location.href =
                  "/login";
              }}
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* =========================
          MAIN
      ========================= */}

      <main className="dashboard-content">
        {/* =========================
            HERO
        ========================= */}

        <section className="dashboard-hero">
          <div className="dashboard-hero-content">
            <span className="dashboard-eyebrow">
              DEVELOPMENT WORKSPACE
            </span>

            <h1>
              Build. Track.{" "}
              <span>Ship.</span>
            </h1>

            <p>
              Manage your development
              projects, organize tasks,
              and keep everything moving
              forward from one workspace.
            </p>
          </div>

          <div className="dashboard-hero-badge">
            <strong>
              {projects.length}
            </strong>

            <span>
              {projects.length === 1
                ? "Project"
                : "Projects"}
            </span>
          </div>
        </section>

        {/* =========================
            ERROR
        ========================= */}

        {error && (
          <div className="error-message dashboard-error">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="error-close"
            >
              ×
            </button>
          </div>
        )}

        {/* =========================
            STATS
        ========================= */}

        <section className="dashboard-stats">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">
              P
            </div>

            <div>
              <span>
                Total Projects
              </span>

              <strong>
                {projects.length}
              </strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">
              T
            </div>

            <div>
              <span>
                Total Tasks
              </span>

              <strong>
                {dashboardStats.totalTasks}
              </strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">
              ✓
            </div>

            <div>
              <span>
                Completed
              </span>

              <strong>
                {dashboardStats.completed}
              </strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">
              →
            </div>

            <div>
              <span>
                In Progress
              </span>

              <strong>
                {dashboardStats.inProgress}
              </strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">
              QA
            </div>

            <div>
              <span>
                Testing
              </span>

              <strong>
                {dashboardStats.testing}
              </strong>
            </div>
          </div>
        </section>

        {/* =========================
            CREATE PROJECT
        ========================= */}

        <section className="project-create-card">
          <div className="section-heading">
            <div>
              <span className="section-label">
                START SOMETHING
              </span>

              <h2>
                Create a new project
              </h2>

              <p>
                Define your project and
                start building your
                workflow.
              </p>
            </div>
          </div>

          <form
            className="project-create-form"
            onSubmit={
              handleCreateProject
            }
          >
            <div className="form-group">
              <label htmlFor="project-name">
                Project name
              </label>

              <input
                id="project-name"
                type="text"
                placeholder="e.g. DevHire"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="project-description">
                Description
              </label>

              <textarea
                id="project-description"
                placeholder="What are you building?"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="project-deadline">
                Deadline
              </label>

              <input
                id="project-deadline"
                type="date"
                value={deadline}
                onChange={(event) =>
                  setDeadline(
                    event.target.value
                  )
                }
              />
            </div>

            <button
              type="submit"
              className="create-project-button"
              disabled={creating}
            >
              {creating
                ? "Creating..."
                : "Create project"}
            </button>
          </form>
        </section>

        {/* =========================
            PROJECTS
        ========================= */}

        <section className="projects-section">
          <div className="projects-section-header">
            <div>
              <span className="section-label">
                YOUR WORKSPACE
              </span>

              <h2>
                Your projects
              </h2>

              <p>
                Open a project to manage
                its workflow and tasks.
              </p>
            </div>

            <div className="project-count">
              {projects.length}{" "}
              {projects.length === 1
                ? "project"
                : "projects"}
            </div>
          </div>

          {loading ? (
            <div className="projects-empty-state">
              <div className="loading-spinner"></div>

              <p>
                Loading projects...
              </p>
            </div>
          ) : projects.length === 0 ? (
            <div className="projects-empty-state">
              <div className="empty-icon">
                +
              </div>

              <h3>
                No projects yet
              </h3>

              <p>
                Create your first project
                above to start building
                your workflow.
              </p>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map(
                (project) => {
                  const stats =
                    getProjectStats(
                      project
                    );

                  return (
                    <Link
                      to={`/projects/${project.id}`}
                      className="project-card"
                      key={project.id}
                    >
                      {/* CARD HEADER */}

                      <div className="project-card-top">
                        <span className="project-card-label">
                          PROJECT
                        </span>

                        <span className="project-card-arrow">
                          →
                        </span>
                      </div>

                      {/* PROJECT NAME */}

                      <h3>
                        {project.name}
                      </h3>

                      <p>
                        {project.description ||
                          "No description provided."}
                      </p>

                      {/* PROGRESS */}

                      <div className="project-progress-section">
                        <div className="project-progress-header">
                          <span>
                            Progress
                          </span>

                          <strong>
                            {stats.progress}%
                          </strong>
                        </div>

                        <div className="project-progress-bar">
                          <div
                            className="project-progress-fill"
                            style={{
                              width: `${stats.progress}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* TASK COUNTS */}

                      <div className="project-task-summary">
                        <div>
                          <strong>
                            {stats.completed}
                          </strong>

                          <span>
                            Completed
                          </span>
                        </div>

                        <div>
                          <strong>
                            {stats.inProgress}
                          </strong>

                          <span>
                            In Progress
                          </span>
                        </div>

                        <div>
                          <strong>
                            {stats.testing}
                          </strong>

                          <span>
                            Testing
                          </span>
                        </div>

                        <div>
                          <strong>
                            {stats.backlog}
                          </strong>

                          <span>
                            Backlog
                          </span>
                        </div>
                      </div>

                      {/* FOOTER */}

                      <div className="project-card-footer">
                        <span>
                          {formatDeadline(
                            project.deadline
                          )}
                        </span>

                        <span className="project-open-label">
                          Open →
                        </span>
                      </div>
                    </Link>
                  );
                }
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;