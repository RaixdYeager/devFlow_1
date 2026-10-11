
import { useCallback, useEffect, useState } from "react";
import apiFetch from "../api";

function GitHubRepository({ projectId }) {
  const [repository, setRepository] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [repoInput, setRepoInput] = useState("");
  const [showConnectForm, setShowConnectForm] = useState(false);

  const endpoint = `/api/accounts/projects/${projectId}/github/`;

  const fetchRepository = useCallback(async () => {
    if (!projectId) {
      setError("Project ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiFetch(endpoint);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Failed to load GitHub repository."
        );
      }

      if (data.connected) {
        setRepository(data);
        setRepoInput(data.repo_name || "");
      } else {
        setRepository(null);
        setRepoInput("");
      }
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [endpoint, projectId]);

  useEffect(() => {
    fetchRepository();
  }, [fetchRepository]);

  const connectRepository = async (event) => {
    event.preventDefault();

    const repo = repoInput.trim();

    if (!repo) {
      setError("Enter a GitHub repository URL or owner/repository.");
      return;
    }

    setConnecting(true);
    setError("");

    try {
      const response = await apiFetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          github_repo: repo,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Failed to connect repository."
        );
      }

      setShowConnectForm(false);
      await fetchRepository();
    } catch (err) {
      setError(err.message || "Could not connect the repository.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectRepository = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to disconnect this GitHub repository?"
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await apiFetch(endpoint, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Failed to disconnect repository."
        );
      }

      setRepository(null);
      setRepoInput("");
      setShowConnectForm(false);
    } catch (err) {
      setError(err.message || "Could not disconnect the repository.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date unavailable";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <section className="github-repository">
        <div className="github-section-heading">
          <span className="github-eyebrow">DEVELOPMENT ACTIVITY</span>
          <h2>GitHub Repository</h2>
          <p>Repository information and recent development activity.</p>
        </div>

        <div className="github-status-message">Loading GitHub repository...</div>
      </section>
    );
  }

  return (
    <section className="github-repository">
      <div className="github-section-heading">
        <span className="github-eyebrow">DEVELOPMENT ACTIVITY</span>
        <h2>GitHub Repository</h2>
        <p>Repository information and recent development activity.</p>
      </div>

      {error && (
        <div className="github-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="github-error-dismiss"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {!repository ? (
        <div className="github-empty-state">
          <div className="github-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="42" height="42" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.4.6.1.8-.3.8-.6v-2.2c-3.34.7-4.04-1.4-4.04-1.4-.55-1.4-1.33-1.8-1.33-1.8-1.1-.75.08-.74.08-.74 1.2.08 1.84 1.23 1.84 1.23 1.08 1.84 2.83 1.3 3.52 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.3.47-2.36 1.24-3.2-.12-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.22a11.4 11.4 0 0 1 6 0c2.29-1.54 3.3-1.22 3.3-1.22.66 1.64.24 2.86.12 3.16.77.84 1.24 1.9 1.24 3.2 0 4.62-2.8 5.64-5.48 5.94.43.37.81 1.1.81 2.22v3.3c0 .3.2.7.8.6A12.01 12.01 0 0 0 24 12C24 5.37 18.63 0 12 0Z" />
            </svg>
          </div>

          <h3>No repository connected</h3>
          <p>
            Connect a GitHub repository to view its details, statistics, and
            recent commits here.
          </p>

          {!showConnectForm && (
            <button
              type="button"
              className="github-primary-button"
              onClick={() => setShowConnectForm(true)}
            >
              + Connect Repository
            </button>
          )}

          {showConnectForm && (
            <form className="github-connect-form" onSubmit={connectRepository}>
              <label htmlFor={`github-repo-${projectId}`}>
                Repository URL or owner/repository
              </label>

              <input
                id={`github-repo-${projectId}`}
                type="text"
                value={repoInput}
                onChange={(event) => setRepoInput(event.target.value)}
                placeholder="e.g. django/django"
                autoComplete="off"
                required
              />

              <div className="github-form-actions">
                <button
                  type="submit"
                  className="github-primary-button"
                  disabled={connecting}
                >
                  {connecting ? "Connecting..." : "Connect Repository"}
                </button>

                <button
                  type="button"
                  className="github-secondary-button"
                  onClick={() => {
                    setShowConnectForm(false);
                    setRepoInput("");
                    setError("");
                  }}
                  disabled={connecting}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <>
          <div className="github-repo-header">
            <div className="github-repo-information">
              <div className="github-repo-title-row">
                <h3>{repository.repo_name || "GitHub Repository"}</h3>

                <span className="github-connected-badge">
                  <span className="github-status-dot" />
                  Connected
                </span>
              </div>

              <p className="github-repo-description">
                {repository.description || "No repository description available."}
              </p>

              {repository.language && (
                <span className="github-language">
                  <span className="github-language-dot" />
                  {repository.language}
                </span>
              )}
            </div>

            <div className="github-repo-actions">
              <a
                href={repository.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="github-open-button"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.4.6.1.8-.3.8-.6v-2.2c-3.34.7-4.04-1.4-4.04-1.4-.55-1.4-1.33-1.8-1.33-1.8-1.1-.75.08-.74.08-.74 1.2.08 1.84 1.23 1.84 1.23 1.08 1.84 2.83 1.3 3.52 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.3.47-2.36 1.24-3.2-.12-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.22a11.4 11.4 0 0 1 6 0c2.29-1.54 3.3-1.22 3.3-1.22.66 1.64.24 2.86.12 3.16.77.84 1.24 1.9 1.24 3.2 0 4.62-2.8 5.64-5.48 5.94.43.37.81 1.1.81 2.22v3.3c0 .3.2.7.8.6A12.01 12.01 0 0 0 24 12C24 5.37 18.63 0 12 0Z" />
                </svg>
                <span>Open on GitHub</span>
                <span className="github-open-arrow" aria-hidden="true">↗</span>
              </a>

              <button
                type="button"
                className="github-refresh-button"
                onClick={fetchRepository}
                title="Refresh repository information"
                aria-label="Refresh repository information"
              >
                ↻
              </button>
            </div>
          </div>

          <div className="github-stats-grid">
            <div className="github-stat-card">
              <span className="github-stat-label">Stars</span>
              <strong>{repository.stars ?? 0}</strong>
            </div>

            <div className="github-stat-card">
              <span className="github-stat-label">Forks</span>
              <strong>{repository.forks ?? 0}</strong>
            </div>

            <div className="github-stat-card">
              <span className="github-stat-label">Open Issues</span>
              <strong>{repository.open_issues ?? 0}</strong>
            </div>

            <div className="github-stat-card">
              <span className="github-stat-label">Language</span>
              <strong>{repository.language || "—"}</strong>
            </div>
          </div>

          <div className="github-commits-section">
            <div className="github-commits-heading">
              <div>
                <h3>Recent Commits</h3>
                <p>Latest changes pushed to this repository.</p>
              </div>

              <a
                href={`${repository.html_url}/commits`}
                target="_blank"
                rel="noopener noreferrer"
                className="github-view-all-link"
              >
                View all ↗
              </a>
            </div>

            {Array.isArray(repository.commits) && repository.commits.length > 0 ? (
              <div className="github-commits-list">
                {repository.commits.map((commit, index) => (
                  <a
                    className="github-commit-item"
                    key={commit.sha || index}
                    href={commit.html_url || `${repository.html_url}/commits`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="github-commit-icon" aria-hidden="true">
                      ↗
                    </div>

                    <div className="github-commit-content">
                      <p className="github-commit-message">
                        {commit.message || "Commit message unavailable"}
                      </p>

                      <span className="github-commit-meta">
                        {commit.author || "Unknown author"} · {formatDate(commit.date)}
                      </span>
                    </div>

                    {commit.sha && (
                      <code className="github-commit-sha">
                        {commit.sha.slice(0, 7)}
                      </code>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <div className="github-no-commits">
                No recent commits were returned by GitHub.
              </div>
            )}
          </div>

          <div className="github-footer-actions">
            <button
              type="button"
              className="github-secondary-button"
              onClick={() => {
                setRepoInput(repository.repo_name || "");
                setShowConnectForm(true);
                setRepository(null);
              }}
            >
              Change Repository
            </button>

            <button
              type="button"
              className="github-danger-button"
              onClick={disconnectRepository}
            >
              Disconnect
            </button>
          </div>

          {showConnectForm && (
            <form className="github-connect-form github-change-form" onSubmit={connectRepository}>
              <label htmlFor={`github-change-${projectId}`}>
                New repository URL or owner/repository
              </label>

              <input
                id={`github-change-${projectId}`}
                type="text"
                value={repoInput}
                onChange={(event) => setRepoInput(event.target.value)}
                placeholder="e.g. django/django"
                required
              />

              <div className="github-form-actions">
                <button
                  type="submit"
                  className="github-primary-button"
                  disabled={connecting}
                >
                  {connecting ? "Connecting..." : "Save Repository"}
                </button>

                <button
                  type="button"
                  className="github-secondary-button"
                  onClick={() => {
                    setShowConnectForm(false);
                    fetchRepository();
                  }}
                  disabled={connecting}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}

export default GitHubRepository;
