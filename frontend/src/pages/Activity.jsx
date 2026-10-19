
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiFetch from "../api";
import "./Activity.css";

const ACTIVITY_API = "/api/accounts/activity-logs/";

function Activity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(ACTIVITY_API);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Failed to load activity."
        );
      }

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
          ? data.results
          : [];

      setActivities(items);
    } catch (err) {
      setError(err.message || "Unable to load activity.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const formatDate = (value) => {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getActionLabel = (action) => {
    const labels = {
      PROJECT_CREATED: "Project created",
      TASK_CREATED: "Task created",
      STATUS_CHANGED: "Task status updated",
      COMMENT_ADDED: "Comment added",
      MEMBER_ADDED: "Team member added",
      GITHUB_REPOSITORY_CONNECTED: "Repository connected",
      GITHUB_REPOSITORY_DISCONNECTED: "Repository disconnected",
      github_issue_imported: "GitHub issue imported",
    };

    return labels[action] || (action || "Activity").replaceAll("_", " ");
  };

  const getActionStyle = (action) => {
    if (action === "PROJECT_CREATED") return "project";
    if (action === "TASK_CREATED") return "task";
    if (action === "STATUS_CHANGED") return "status";
    if (action === "COMMENT_ADDED") return "comment";
    if (action === "MEMBER_ADDED") return "member";
    return "general";
  };

  return (
    <div className="activity-page">
      <header className="activity-navbar">
        <div className="activity-navbar-inner">
          <Link to="/dashboard" className="activity-logo">
            Dev<span>Flow</span>
          </Link>

          <nav className="activity-nav">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/notifications">Notifications</Link>
            <Link to="/activity" className="active">
              Activity
            </Link>
          </nav>
        </div>
      </header>

      <main className="activity-content">
        <section className="activity-heading">
          <div>
            <span className="activity-eyebrow">
              WORKSPACE HISTORY
            </span>
            <h1>Activity timeline</h1>
            <p>
              See what's been happening across your projects.
            </p>
          </div>

          <button
            type="button"
            className="activity-refresh-button"
            onClick={fetchActivities}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh activity"}
          </button>
        </section>

        {error && (
          <div className="activity-error" role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        <section className="activity-panel">
          <div className="activity-panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>
                {activities.length}{" "}
                {activities.length === 1 ? "event" : "events"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="activity-empty">
              <div className="activity-spinner" />
              <p>Loading activity...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="activity-empty">
              <div className="activity-empty-icon">↗</div>
              <h3>No activity yet</h3>
              <p>
                Creating projects, adding tasks, and updating their status
                will appear here.
              </p>
            </div>
          ) : (
            <div className="activity-timeline">
              {activities.map((activity) => (
                <article className="activity-entry" key={activity.id}>
                  <div
                    className={`activity-marker ${getActionStyle(
                      activity.action
                    )}`}
                  >
                    <span />
                  </div>

                  <div className="activity-entry-content">
                    <div className="activity-entry-top">
                      <span
                        className={`activity-type ${getActionStyle(
                          activity.action
                        )}`}
                      >
                        {getActionLabel(activity.action)}
                      </span>

                      <time dateTime={activity.created_at}>
                        {formatDate(activity.created_at)}
                      </time>
                    </div>

                    <p className="activity-description">
                      {activity.description}
                    </p>

                    <div className="activity-meta">
                      <span>
                        By <strong>{activity.username || "Unknown user"}</strong>
                      </span>

                      {activity.project != null && (
                        <span>
                          Project ID: <strong>{activity.project}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Activity;
