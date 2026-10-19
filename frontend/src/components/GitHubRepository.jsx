
import { useCallback, useEffect, useState } from "react";
import apiFetch from "../api";

function GitHubRepository({ projectId }) {
  const [repository, setRepository] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [repoInput, setRepoInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [issueFilter, setIssueFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [importingIssues, setImportingIssues] = useState({});
  const [importedIssues, setImportedIssues] = useState({});

  const endpoint = `/api/accounts/projects/${projectId}/github/`;

  const fetchRepository = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");
      setNotice("");

      try {
        const response = await apiFetch(endpoint);

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            data.error || "Failed to load GitHub repository."
          );
        }

        const data = await response.json();
        setRepository(data);
      } catch (err) {
        setError(err.message || "Unable to load GitHub information.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [endpoint]
  );

  useEffect(() => {
    fetchRepository();
  }, [fetchRepository]);

  const connectRepository = async (event) => {
    event.preventDefault();

    if (!repoInput.trim()) {
      setError("Enter a GitHub repository URL or owner/repo.");
      return;
    }

    setConnecting(true);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_repo: repoInput.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Could not connect repository.");
      }

      setRepoInput("");
      setNotice("GitHub repository connected successfully.");
      await fetchRepository(false);
    } catch (err) {
      setError(err.message || "Could not connect repository.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectRepository = async () => {
    if (
      !window.confirm(
        "Disconnect this GitHub repository from the project?"
      )
    ) {
      return;
    }

    setDisconnecting(true);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(endpoint, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Could not disconnect repository.");
      }

      setRepository({
        connected: false,
        repo: null,
        commits: [],
        issues: [],
      });

      setImportedIssues({});
      setNotice("GitHub repository disconnected.");
    } catch (err) {
      setError(err.message || "Could not disconnect repository.");
    } finally {
      setDisconnecting(false);
    }
  };

  const importIssue = async (issue) => {
    if (!issue?.number) {
      setError("This GitHub issue has no valid issue number.");
      return;
    }

    const issueNumber = issue.number;

    setImportingIssues((previous) => ({
      ...previous,
      [issueNumber]: true,
    }));

    setError("");
    setNotice("");

    try {
      const response = await apiFetch(
        `/api/accounts/projects/${projectId}/github/issues/${issueNumber}/import/`,
        { method: "POST" }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Could not import this GitHub issue."
        );
      }

      setImportedIssues((previous) => ({
        ...previous,
        [issueNumber]: true,
      }));

      setNotice(
        data.already_imported
          ? `GitHub issue #${issueNumber} was already imported.`
          : `GitHub issue #${issueNumber} imported as a DevFlow task!`
      );

      // Notify the parent page in case it listens for task updates.
      window.dispatchEvent(
        new CustomEvent("devflow:tasks-updated", {
          detail: { projectId, issueNumber },
        })
      );
    } catch (err) {
      setError(err.message || "Could not import this GitHub issue.");
    } finally {
      setImportingIssues((previous) => ({
        ...previous,
        [issueNumber]: false,
      }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date unavailable";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const issues = Array.isArray(repository?.issues)
    ? repository.issues
    : [];

  const commits = Array.isArray(repository?.commits)
    ? repository.commits
    : [];

  const filteredIssues = issues.filter((issue) => {
    if (issueFilter === "open") return issue.state === "open";
    if (issueFilter === "closed") return issue.state === "closed";
    return true;
  });

  const isConnected =
    repository?.connected === true &&
    repository?.valid !== false &&
    Boolean(repository?.repo_name);

  if (loading) {
    return (
      <section className="project-detail-card github-repository-section">
        <div className="project-section-heading">
          <div>
            <h2>GitHub Integration</h2>
            <p>Loading repository information...</p>
          </div>
        </div>

        <div className="github-loading">
          <span className="github-spinner" />
          <span>Connecting to GitHub...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="project-detail-card github-repository-section">
      <div className="project-section-heading github-repo-header">
        <div>
          <h2>GitHub Integration</h2>
          <p>Connect your repository and track development activity.</p>
        </div>

        <button
          type="button"
          className="github-refresh-button"
          onClick={() => fetchRepository(false)}
          disabled={refreshing}
        >
          <span
            className={
              refreshing
                ? "github-refresh-icon spinning"
                : "github-refresh-icon"
            }
          >
            ↻
          </span>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="github-message github-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {notice && (
        <div className="github-message github-success" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}

      {!isConnected ? (
        <div className="github-connect-card">
          <div className="github-connect-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="38" height="38" fill="currentColor">
              <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.53v-2.08c-3.1.67-3.76-1.32-3.76-1.32-.5-1.29-1.24-1.63-1.24-1.63-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.23.93.1-.72.39-1.21.71-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.11-1.45 3.05-1.15 3.05-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.29-2.62 5.23-5.11 5.51.4.35.76 1.02.76 2.06V22c0 .29.2.63.77.52A11.1 11.1 0 0 0 12 .9Z" />
            </svg>
          </div>

          <h3>
            {repository?.connected && repository?.valid === false
              ? "Repository unavailable"
              : "Connect your GitHub repository"}
          </h3>

          <p>
            Enter a public GitHub repository to view its details, recent
            commits, and issues directly in DevFlow.
          </p>

          <form className="github-connect-form" onSubmit={connectRepository}>
            <input
              type="text"
              value={repoInput}
              onChange={(event) => setRepoInput(event.target.value)}
              placeholder="owner/repository or GitHub URL"
              aria-label="GitHub repository"
              required
            />

            <button
              type="submit"
              className="project-primary-button"
              disabled={connecting}
            >
              {connecting ? "Connecting..." : "Connect Repository"}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="github-connected-card">
            <div className="github-connected-main">
              <div className="github-connected-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
                  <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.53v-2.08c-3.1.67-3.76-1.32-3.76-1.32-.5-1.29-1.24-1.63-1.24-1.63-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.23.93.1-.72.39-1.21.71-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.11-1.45 3.05-1.15 3.05-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.29-2.62 5.23-5.11 5.51.4.35.76 1.02.76 2.06V22c0 .29.2.63.77.52A11.1 11.1 0 0 0 12 .9Z" />
                </svg>
              </div>

              <div className="github-connected-details">
                <span className="github-connected-label">
                  <span className="github-status-dot" />
                  Repository connected
                </span>

                <h3>{repository.repo_name}</h3>
                <p>
                  {repository.description || "No repository description provided."}
                </p>
              </div>
            </div>

            <div className="github-footer-actions">
              {repository.html_url && (
                <a
                  href={repository.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="github-open-button"
                >
                  Open on GitHub ↗
                </a>
              )}

              <button
                type="button"
                className="github-disconnect-button"
                onClick={disconnectRepository}
                disabled={disconnecting}
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>

          <div className="github-stats-grid">
            <div className="github-stat-card">
              <span className="github-stat-icon">★</span>
              <div>
                <p>Stars</p>
                <strong>{repository.stars ?? 0}</strong>
              </div>
            </div>

            <div className="github-stat-card">
              <span className="github-stat-icon">⑂</span>
              <div>
                <p>Forks</p>
                <strong>{repository.forks ?? 0}</strong>
              </div>
            </div>

            <div className="github-stat-card">
              <span className="github-stat-icon">◎</span>
              <div>
                <p>Open Issues</p>
                <strong>{repository.open_issues ?? 0}</strong>
              </div>
            </div>

            <div className="github-stat-card">
              <span className="github-stat-icon">⌘</span>
              <div>
                <p>Language</p>
                <strong>{repository.language || "N/A"}</strong>
              </div>
            </div>
          </div>

          <section className="github-content-section">
            <div className="github-section-title">
              <div>
                <h3>Issues</h3>
                <p>Import GitHub issues into your DevFlow task board.</p>
              </div>
              <span className="github-count-badge">{issues.length}</span>
            </div>

            <div className="github-issue-filters">
              {["all", "open", "closed"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={issueFilter === filter ? "active" : ""}
                  onClick={() => setIssueFilter(filter)}
                >
                  {filter[0].toUpperCase() + filter.slice(1)}
                  {" ("}
                  {filter === "all"
                    ? issues.length
                    : issues.filter((issue) => issue.state === filter).length}
                  {")"}
                </button>
              ))}
            </div>

            {filteredIssues.length === 0 ? (
              <div className="github-empty-state">
                <span className="github-empty-icon">✓</span>
                <h4>
                  {issues.length === 0
                    ? "No issues found"
                    : `No ${issueFilter} issues`}
                </h4>
                <p>
                  {issues.length === 0
                    ? "No issues were returned by GitHub for this repository."
                    : "Try another filter to see more issues."}
                </p>
              </div>
            ) : (
              <div className="github-issues-list">
                {filteredIssues.map((issue) => {
                  const issueNumber = issue.number;
                  const isImporting = Boolean(importingIssues[issueNumber]);
                  const isImported = Boolean(importedIssues[issueNumber]);

                  return (
                    <article
                      className="github-issue-card"
                      key={issue.id || issueNumber}
                    >
                      <div className="github-issue-status">
                        <span
                          className={`github-issue-state ${
                            issue.state === "closed" ? "closed" : "open"
                          }`}
                        >
                          {issue.state === "closed" ? "✓ Closed" : "● Open"}
                        </span>
                      </div>

                      <div className="github-issue-main">
                        <a
                          href={issue.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="github-issue-title"
                        >
                          {issue.title}
                        </a>

                        <p className="github-issue-meta">
                          #{issueNumber} opened by{" "}
                          <strong>{issue.author || "Unknown"}</strong>
                          {" · "}
                          {formatDate(issue.created_at)}
                        </p>

                        {Array.isArray(issue.labels) &&
                          issue.labels.length > 0 && (
                            <div className="github-issue-labels">
                              {issue.labels.map((label) => (
                                <span
                                  className="github-issue-label"
                                  key={`${issueNumber}-${label}`}
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}

                        <button
                          type="button"
                          className="github-import-task-button"
                          onClick={() => importIssue(issue)}
                          disabled={isImporting || isImported}
                        >
                          {isImporting
                            ? "Importing..."
                            : isImported
                              ? "✓ Imported"
                              : "＋ Import as Task"}
                        </button>
                      </div>

                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="github-issue-link"
                        aria-label={`Open issue ${issueNumber} on GitHub`}
                      >
                        ↗
                      </a>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="github-content-section">
            <div className="github-section-title">
              <div>
                <h3>Recent Commits</h3>
                <p>Latest changes pushed to the repository.</p>
              </div>
              <span className="github-count-badge">{commits.length}</span>
            </div>

            {commits.length === 0 ? (
              <div className="github-empty-state">
                <h4>No recent commits found</h4>
                <p>
                  Commits may be unavailable or the repository may be empty.
                </p>
              </div>
            ) : (
              <div className="github-commits-list">
                {commits.map((commit, index) => (
                  <article
                    className="github-commit-card"
                    key={commit.sha || index}
                  >
                    <div className="github-commit-icon">⌘</div>

                    <div className="github-commit-main">
                      <a
                        href={commit.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="github-commit-message"
                      >
                        {commit.message || "Commit message unavailable"}
                      </a>

                      <p className="github-commit-meta">
                        <strong>{commit.author || "Unknown author"}</strong>
                        {" · "}
                        {formatDate(commit.date)}
                      </p>
                    </div>

                    <code className="github-commit-sha">
                      {commit.sha || "—"}
                    </code>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

export default GitHubRepository;
