
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiFetch from "../api";
import "./Notifications.css";

const NOTIFICATIONS_API = "/api/accounts/notifications/";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState("all");

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(NOTIFICATIONS_API);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Failed to load notifications."
        );
      }

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
          ? data.results
          : [];

      setNotifications(items);
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notification) => {
    if (notification.is_read) return;

    try {
      setUpdatingId(notification.id);
      setError("");

      const response = await apiFetch(
        `${NOTIFICATIONS_API}${notification.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_read: true }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Could not mark as read."
        );
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch (err) {
      setError(err.message || "Could not update notification.");
    } finally {
      setUpdatingId(null);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((item) => !item.is_read);

    for (const notification of unread) {
      await markAsRead(notification);
    }
  };

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  const visibleNotifications = notifications.filter((item) => {
    if (filter === "unread") return !item.is_read;
    if (filter === "read") return item.is_read;
    return true;
  });

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="notifications-page">
      <header className="notifications-navbar">
        <div className="notifications-navbar-inner">
          <Link to="/dashboard" className="notifications-logo">
            Dev<span>Flow</span>
          </Link>

          <nav className="notifications-nav">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/notifications" className="active">
              Notifications
              {unreadCount > 0 && (
                <span className="notification-nav-count">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link to="/activity">Activity</Link>
          </nav>
        </div>
      </header>

      <main className="notifications-content">
        <section className="notifications-heading">
          <div>
            <span className="notifications-eyebrow">
              YOUR WORKSPACE
            </span>
            <h1>Notifications</h1>
            <p>
              Stay up to date with changes across your projects.
            </p>
          </div>

          <div className="notifications-count-card">
            <strong>{unreadCount}</strong>
            <span>Unread</span>
          </div>
        </section>

        {error && (
          <div className="notifications-error" role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        <section className="notifications-panel">
          <div className="notifications-toolbar">
            <div className="notifications-filters">
              {["all", "unread", "read"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={filter === item ? "selected" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="mark-all-button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0 || updatingId !== null}
            >
              Mark all as read
            </button>
          </div>

          {loading ? (
            <div className="notifications-empty">
              <div className="notifications-spinner" />
              <p>Loading notifications...</p>
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="notifications-empty">
              <div className="notifications-empty-icon">✓</div>
              <h2>
                {filter === "unread"
                  ? "You're all caught up"
                  : filter === "read"
                    ? "No read notifications"
                    : "No notifications yet"}
              </h2>
              <p>
                {filter === "unread"
                  ? "New updates will appear here."
                  : "Project updates and team notifications will show up here."}
              </p>
            </div>
          ) : (
            <div className="notifications-list">
              {visibleNotifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-item ${
                    notification.is_read ? "is-read" : "is-unread"
                  }`}
                >
                  <div className="notification-indicator">
                    {notification.is_read ? "✓" : "•"}
                  </div>

                  <div className="notification-body">
                    <div className="notification-title-row">
                      <h2>{notification.title}</h2>
                      {!notification.is_read && (
                        <span className="unread-label">NEW</span>
                      )}
                    </div>

                    <p>{notification.message}</p>

                    <time dateTime={notification.created_at}>
                      {formatDate(notification.created_at)}
                    </time>
                  </div>

                  {!notification.is_read && (
                    <button
                      type="button"
                      className="mark-read-button"
                      disabled={updatingId === notification.id}
                      onClick={() => markAsRead(notification)}
                    >
                      {updatingId === notification.id
                        ? "Saving..."
                        : "Mark read"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Notifications;
