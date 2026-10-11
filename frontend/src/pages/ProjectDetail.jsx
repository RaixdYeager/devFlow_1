
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiFetch from "../api";
import GitHubRepository from "../components/GitHubRepository";
import "./ProjectDetail.css";

const API_URL = "/api/accounts";
const getProjectUrl = (id) => `${API_URL}/projects/${id}/`;
const getTasksUrl = (id) => `${API_URL}/projects/${id}/tasks/`;
const getMembersUrl = (id) => `${API_URL}/projects/${id}/members/`;
const USERS_URL = `${API_URL}/users/`;

function getArray(data, ...keys) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingProject, setEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
  });

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
  });

  const [selectedUser, setSelectedUser] = useState("");
  const [memberRole, setMemberRole] = useState("member");

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);

  const [savingProject, setSavingProject] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingMember, setSavingMember] = useState(false);

  const [activeTab, setActiveTab] = useState("tasks");

  const fetchProject = useCallback(async () => {
    const response = await apiFetch(getProjectUrl(id));

    if (!response.ok) {
      throw new Error("Failed to load project details.");
    }

    const data = await response.json();

    setProject(data);
    setProjectForm({
      name: data.name || "",
      description: data.description || "",
    });
  }, [id]);

  const fetchTasks = useCallback(async () => {
    const response = await apiFetch(getTasksUrl(id));

    if (!response.ok) {
      throw new Error("Failed to load project tasks.");
    }

    const data = await response.json();
    setTasks(getArray(data, "results", "tasks"));
  }, [id]);

  const fetchMembers = useCallback(async () => {
    const response = await apiFetch(getMembersUrl(id));

    if (!response.ok) {
      throw new Error("Failed to load team members.");
    }

    const data = await response.json();
    setMembers(getArray(data, "results", "members"));
  }, [id]);

  const fetchUsers = useCallback(async () => {
    const response = await apiFetch(USERS_URL);

    if (!response.ok) {
      throw new Error("Failed to load available users.");
    }

    const data = await response.json();
    setUsers(getArray(data, "results", "users"));
  }, []);

  const loadProjectData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([fetchProject(), fetchTasks()]);

      // Team membership is optional until its API is configured.
      try {
        await fetchMembers();
      } catch (memberError) {
        console.warn("Could not load team members:", memberError);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [fetchProject, fetchTasks, fetchMembers]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  const handleProjectFormChange = (event) => {
    const { name, value } = event.target;

    setProjectForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSaveProject = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSavingProject(true);

    try {
      const response = await apiFetch(getProjectUrl(id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectForm),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.detail || data.message || "Failed to update project."
        );
      }

      const data = await response.json();
      setProject(data);
      setProjectForm({
        name: data.name || "",
        description: data.description || "",
      });

      setEditingProject(false);
      setSuccess("Project updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update project.");
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project? This action cannot be undone."
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await apiFetch(getProjectUrl(id), {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete project.");
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to delete project.");
    }
  };

  const handleTaskFormChange = (event) => {
    const { name, value } = event.target;

    setNewTask((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!newTask.title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    setSavingTask(true);

    try {
      const response = await apiFetch(getTasksUrl(id), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newTask,
          title: newTask.title.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.detail || data.message || "Failed to create task."
        );
      }

      const createdTask = await response.json();

      setTasks((previous) => [...previous, createdTask]);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
      });
      setShowTaskForm(false);
      setSuccess("Task created successfully.");
    } catch (err) {
      setError(err.message || "Failed to create task.");
    } finally {
      setSavingTask(false);
    }
  };

  const handleTaskStatusChange = async (task, status) => {
    setError("");
    setSuccess("");

    const previousTasks = tasks;

    setTasks((previous) =>
      previous.map((item) =>
        item.id === task.id ? { ...item, status } : item
      )
    );

    try {
      const response = await apiFetch(
        `${getTasksUrl(id)}${task.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update task status.");
      }

      const updatedTask = await response.json();

      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id ? { ...item, ...updatedTask } : item
        )
      );
    } catch (err) {
      setTasks(previousTasks);
      setError(err.message || "Failed to update task status.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await apiFetch(
        `${getTasksUrl(id)}${taskId}/`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete task.");
      }

      setTasks((previous) =>
        previous.filter((task) => task.id !== taskId)
      );

      setSuccess("Task deleted successfully.");
    } catch (err) {
      setError(err.message || "Failed to delete task.");
    }
  };

  const handleOpenMemberForm = async () => {
    setError("");
    setShowMemberForm(true);

    try {
      await fetchUsers();
      await fetchMembers();
    } catch (err) {
      setError(err.message || "Failed to load team information.");
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedUser) {
      setError("Please select a user.");
      return;
    }

    setSavingMember(true);

    try {
      const response = await apiFetch(getMembersUrl(id), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: Number(selectedUser),
          role: memberRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.detail || data.message || "Failed to add team member."
        );
      }

      await fetchMembers();

      setSelectedUser("");
      setMemberRole("member");
      setShowMemberForm(false);
      setSuccess("Team member added successfully.");
    } catch (err) {
      setError(err.message || "Failed to add team member.");
    } finally {
      setSavingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this team member?"
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await apiFetch(
        `${getMembersUrl(id)}${memberId}/`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove team member.");
      }

      setMembers((previous) =>
        previous.filter((member) => member.id !== memberId)
      );

      setSuccess("Team member removed successfully.");
    } catch (err) {
      setError(err.message || "Failed to remove team member.");
    }
  };

  const getStatus = (task) =>
    (task.status || "todo").toLowerCase().replaceAll(" ", "_");

  const getPriority = (task) =>
    (task.priority || "medium").toLowerCase();

  const todoTasks = tasks.filter((task) =>
    ["todo", "to_do", "pending", "backlog"].includes(getStatus(task))
  );

  const inProgressTasks = tasks.filter((task) =>
    ["in_progress", "inprogress", "doing"].includes(getStatus(task))
  );

  const completedTasks = tasks.filter((task) =>
    ["done", "completed", "complete"].includes(getStatus(task))
  );

  const getMemberUser = (member) => member.user || member;

  if (loading) {
    return (
      <div className="project-detail">
        <p>Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail">
        <p>{error || "Project not found."}</p>
        <Link to="/dashboard">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="project-detail">
      <div className="project-detail-header">
        <div>
          <Link to="/dashboard" className="back-link">
            &larr; Back to Dashboard
          </Link>

          <h1>{project.name}</h1>

          <p>
            {project.description || "No project description available."}
          </p>
        </div>

        <div className="project-actions">
          <button
            type="button"
            onClick={() => setEditingProject((previous) => !previous)}
          >
            {editingProject ? "Cancel Edit" : "Edit Project"}
          </button>

          <button type="button" onClick={handleDeleteProject}>
            Delete Project
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message" role="status">
          {success}
        </div>
      )}

      {editingProject && (
        <form onSubmit={handleSaveProject} className="project-edit-form">
          <h2>Edit Project</h2>

          <label htmlFor="project-name">Project Name</label>
          <input
            id="project-name"
            name="name"
            value={projectForm.name}
            onChange={handleProjectFormChange}
            required
          />

          <label htmlFor="project-description">Description</label>
          <textarea
            id="project-description"
            name="description"
            value={projectForm.description}
            onChange={handleProjectFormChange}
            rows={4}
          />

          <button type="submit" disabled={savingProject}>
            {savingProject ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}

      <section className="project-stats">
        <div className="stat-card">
          <h3>Total Tasks</h3>
          <p>{tasks.length}</p>
        </div>

        <div className="stat-card">
          <h3>To Do</h3>
          <p>{todoTasks.length}</p>
        </div>

        <div className="stat-card">
          <h3>In Progress</h3>
          <p>{inProgressTasks.length}</p>
        </div>

        <div className="stat-card">
          <h3>Completed</h3>
          <p>{completedTasks.length}</p>
        </div>
      </section>

      <section className="github-integration-section">
        <h2>GitHub Integration</h2>
        <p>Connect your code repository to this project.</p>

        <GitHubRepository projectId={id} />
      </section>

      <section className="team-members-section">
        <div className="section-header">
          <h2>Team Members ({members.length})</h2>

          <button
            type="button"
            onClick={
              showMemberForm
                ? () => setShowMemberForm(false)
                : handleOpenMemberForm
            }
          >
            {showMemberForm ? "Cancel" : "Add Member"}
          </button>
        </div>

        {showMemberForm && (
          <form onSubmit={handleAddMember} className="member-form">
            <label htmlFor="team-user">Select User</label>

            <select
              id="team-user"
              value={selectedUser}
              onChange={(event) => setSelectedUser(event.target.value)}
              required
            >
              <option value="">Choose a user</option>

              {users
                .filter(
                  (user) =>
                    !members.some(
                      (member) =>
                        String(getMemberUser(member).id) ===
                        String(user.id)
                    )
                )
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username || user.email || `User ${user.id}`}
                  </option>
                ))}
            </select>

            <label htmlFor="member-role">Role</label>

            <select
              id="member-role"
              value={memberRole}
              onChange={(event) => setMemberRole(event.target.value)}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>

            <button type="submit" disabled={savingMember}>
              {savingMember ? "Adding..." : "Add to Project"}
            </button>
          </form>
        )}

        {members.length === 0 ? (
          <p>No team members have been added yet.</p>
        ) : (
          <div className="team-members-list">
            {members.map((member) => {
              const user = getMemberUser(member);

              return (
                <div className="team-member-card" key={member.id}>
                  <div>
                    <h3>
                      {user.username ||
                        user.email ||
                        `User ${user.id ?? member.id}`}
                    </h3>

                    {user.email && <p>{user.email}</p>}

                    <span>{member.role || "member"}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="project-tasks-section">
        <div className="section-header">
          <h2>Tasks ({tasks.length})</h2>

          <div className="task-actions">
            <Link to={`/projects/${id}/board`}>
              Open Kanban Board
            </Link>

            <button
              type="button"
              onClick={() => setShowTaskForm((previous) => !previous)}
            >
              {showTaskForm ? "Cancel" : "Create Task"}
            </button>
          </div>
        </div>

        {showTaskForm && (
          <form onSubmit={handleCreateTask} className="task-form">
            <label htmlFor="task-title">Task Title</label>

            <input
              id="task-title"
              name="title"
              value={newTask.title}
              onChange={handleTaskFormChange}
              placeholder="Enter task title"
              required
            />

            <label htmlFor="task-description">Description</label>

            <textarea
              id="task-description"
              name="description"
              value={newTask.description}
              onChange={handleTaskFormChange}
              placeholder="Describe the task"
              rows={3}
            />

            <label htmlFor="task-priority">Priority</label>

            <select
              id="task-priority"
              name="priority"
              value={newTask.priority}
              onChange={handleTaskFormChange}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <button type="submit" disabled={savingTask}>
              {savingTask ? "Creating..." : "Create Task"}
            </button>
          </form>
        )}

        {tasks.length === 0 ? (
          <p>No tasks yet. Create your first task to get started.</p>
        ) : (
          <div className="task-list">
            {tasks.map((task) => (
              <article className="task-card" key={task.id}>
                <div className="task-card-header">
                  <h3>{task.title}</h3>

                  <span className={`priority priority-${getPriority(task)}`}>
                    {task.priority || "Medium"}
                  </span>
                </div>

                <p>
                  {task.description || "No description provided."}
                </p>

                <div className="task-card-meta">
                  <label htmlFor={`status-${task.id}`}>
                    Status
                  </label>

                  <select
                    id={`status-${task.id}`}
                    value={getStatus(task)}
                    onChange={(event) =>
                      handleTaskStatusChange(task, event.target.value)
                    }
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div className="task-card-actions">
                  <Link
                    to={`/projects/${id}/tasks/${task.id}`}
                  >
                    View Details
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    Delete Task
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ProjectDetail;
