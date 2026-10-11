import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function ProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const API_URL = `http://127.0.0.1:8000/api/accounts/projects/${id}/`;

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError("");

        const accessToken = localStorage.getItem("access_token");

        if (!accessToken) {
          setError("You are not logged in. Please log in again.");
          setLoading(false);
          return;
        }

        const response = await fetch(API_URL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            setError("Your login session is invalid. Please log in again.");
            return;
          }

          throw new Error(data.detail || "Unable to load project.");
        }

        setName(data.name || "");
        setDescription(data.description || "");
        setDeadline(data.deadline || "");
      } catch (err) {
        console.error("Load project error:", err);
        setError(err.message || "Failed to load project.");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const accessToken = localStorage.getItem("access_token");

      if (!accessToken) {
        setError("You are not logged in. Please log in again.");
        return;
      }

      const response = await fetch(API_URL, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          deadline: deadline || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError("Your login session is invalid. Please log in again.");
          return;
        }

        throw new Error(data.detail || "Unable to update project.");
      }

      navigate(`/projects/${id}`);
    } catch (err) {
      console.error("Update project error:", err);
      setError(err.message || "Failed to update project.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="project-detail-page">
        <div className="project-detail-container">
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-detail-page">
      <div className="project-detail-container">
        <Link to={`/projects/${id}`} className="back-link">
          ← Back to project
        </Link>

        <div className="project-detail-card">
          <div className="project-detail-header">
            <div>
              <p className="project-label">EDIT PROJECT</p>

              <h1>Edit project</h1>

              <p>Update your project information.</p>
            </div>
          </div>

          <form className="project-edit-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="project-name">Project name</label>

              <input
                id="project-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Project name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="project-description">Description</label>

              <textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What are you building?"
                rows="6"
              />
            </div>

            <div className="form-group">
              <label htmlFor="project-deadline">Deadline</label>

              <input
                id="project-deadline"
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="project-edit-actions">
              <Link to={`/projects/${id}`} className="cancel-button">
                Cancel
              </Link>

              <button type="submit" className="save-button" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProjectEdit;
