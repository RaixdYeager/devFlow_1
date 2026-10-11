import { useCallback, useEffect, useMemo, useState } from "react";
import apiFetch from "../api";
import "./TeamMembers.css";

const API_BASE_URL = "http://127.0.0.1:8000/api";

const ROLE_OPTIONS = [
    { value: "member", label: "Member" },
    { value: "developer", label: "Developer" },
    { value: "designer", label: "Designer" },
    { value: "tester", label: "Tester" },
    { value: "manager", label: "Manager" },
];

const getRoleLabel = (role) => {
    const foundRole = ROLE_OPTIONS.find((item) => item.value === role);
    return foundRole ? foundRole.label : role || "Member";
};

const getInitials = (username = "") => {
    const parts = username.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return "U";
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const TeamMembers = ({ projectId }) => {
    const [members, setMembers] = useState([]);
    const [users, setUsers] = useState([]);

    const [selectedUser, setSelectedUser] = useState("");
    const [selectedRole, setSelectedRole] = useState("developer");

    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [removingId, setRemovingId] = useState(null);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fetchMembers = useCallback(async () => {
        if (!projectId) {
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await apiFetch(
                `${API_BASE_URL}/accounts/projects/${projectId}/members/`,
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                throw new Error(
                    errorData.detail ||
                        errorData.error ||
                        "Failed to load team members.",
                );
            }

            const data = await response.json();

            setMembers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching team members:", err);
            setError(err.message || "Failed to load team members.");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const fetchUsers = useCallback(async () => {
        try {
            setUsersLoading(true);

            const response = await apiFetch(
                `${API_BASE_URL}/accounts/users/`,
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                throw new Error(
                    errorData.detail ||
                        errorData.error ||
                        "Failed to load users.",
                );
            }

            const data = await response.json();

            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching users:", err);
            setError(err.message || "Failed to load users.");
        } finally {
            setUsersLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const availableUsers = useMemo(() => {
        const existingUserIds = new Set(
            members.map((member) => String(member.user)),
        );

        return users.filter(
            (user) => !existingUserIds.has(String(user.id)),
        );
    }, [members, users]);

    const handleAddMember = async (event) => {
        event.preventDefault();

        if (!selectedUser) {
            setError("Please select a user.");
            setSuccess("");
            return;
        }

        if (!projectId) {
            setError("Project ID is missing.");
            setSuccess("");
            return;
        }

        try {
            setAdding(true);
            setError("");
            setSuccess("");

            const response = await apiFetch(
                `${API_BASE_URL}/accounts/projects/${projectId}/members/`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        user: Number(selectedUser),
                        role: selectedRole,
                    }),
                },
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const backendError =
                    data.detail ||
                    data.error ||
                    data.user?.[0] ||
                    data.non_field_errors?.[0] ||
                    "Failed to add team member.";

                throw new Error(backendError);
            }

            setSuccess("Team member added successfully.");
            setSelectedUser("");
            setSelectedRole("developer");

            await fetchMembers();
        } catch (err) {
            console.error("Error adding team member:", err);
            setError(err.message || "Failed to add team member.");
        } finally {
            setAdding(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        const shouldRemove = window.confirm(
            "Are you sure you want to remove this team member?",
        );

        if (!shouldRemove) {
            return;
        }

        try {
            setRemovingId(memberId);
            setError("");
            setSuccess("");

            const response = await apiFetch(
                `${API_BASE_URL}/accounts/projects/${projectId}/members/${memberId}/`,
                {
                    method: "DELETE",
                },
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                throw new Error(
                    errorData.detail ||
                        errorData.error ||
                        "Failed to remove team member.",
                );
            }

            setSuccess("Team member removed successfully.");

            await fetchMembers();
        } catch (err) {
            console.error("Error removing team member:", err);
            setError(err.message || "Failed to remove team member.");
        } finally {
            setRemovingId(null);
        }
    };

    const clearMessages = () => {
        setError("");
        setSuccess("");
    };

    return (
        <section className="team-members-section">
            <div className="team-members-header">
                <div>
                    <div className="team-members-title-row">
                        <h2>Team Members</h2>

                        <span className="team-members-count">
                            {members.length}
                        </span>
                    </div>

                    <p>
                        Manage the people collaborating on this project.
                    </p>
                </div>
            </div>

            {(error || success) && (
                <div
                    className={`team-members-message ${
                        error ? "error" : "success"
                    }`}
                >
                    <span>{error || success}</span>

                    <button
                        type="button"
                        onClick={clearMessages}
                        aria-label="Close message"
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="team-members-add-card">
                <div className="team-members-add-heading">
                    <div>
                        <h3>Add Team Member</h3>
                        <p>
                            Add an existing DevFlow user to this project.
                        </p>
                    </div>
                </div>

                <form
                    className="team-members-add-form"
                    onSubmit={handleAddMember}
                >
                    <div className="team-members-field">
                        <label htmlFor="team-member-user">
                            User
                        </label>

                        <select
                            id="team-member-user"
                            value={selectedUser}
                            onChange={(event) =>
                                setSelectedUser(event.target.value)
                            }
                            disabled={adding || usersLoading}
                        >
                            <option value="">
                                {usersLoading
                                    ? "Loading users..."
                                    : availableUsers.length === 0
                                      ? "No users available"
                                      : "Select a user"}
                            </option>

                            {availableUsers.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.username}
                                    {user.email
                                        ? ` — ${user.email}`
                                        : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="team-members-field">
                        <label htmlFor="team-member-role">
                            Role
                        </label>

                        <select
                            id="team-member-role"
                            value={selectedRole}
                            onChange={(event) =>
                                setSelectedRole(event.target.value)
                            }
                            disabled={adding}
                        >
                            {ROLE_OPTIONS.map((role) => (
                                <option
                                    key={role.value}
                                    value={role.value}
                                >
                                    {role.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="team-members-add-button"
                        disabled={
                            adding ||
                            usersLoading ||
                            availableUsers.length === 0 ||
                            !selectedUser
                        }
                    >
                        {adding ? "Adding..." : "Add Member"}
                    </button>
                </form>
            </div>

            <div className="team-members-list-card">
                <div className="team-members-list-header">
                    <div>
                        <h3>Project Team</h3>
                        <p>
                            {members.length === 0
                                ? "No members have been added yet."
                                : `${members.length} ${
                                      members.length === 1
                                          ? "member"
                                          : "members"
                                  } in this project.`}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="team-members-loading">
                        <div className="team-members-spinner"></div>
                        <span>Loading team members...</span>
                    </div>
                ) : members.length === 0 ? (
                    <div className="team-members-empty">
                        <div className="team-members-empty-icon">
                            👥
                        </div>

                        <h3>No team members yet</h3>

                        <p>
                            Add developers, designers, testers, or managers
                            to start collaborating on this project.
                        </p>
                    </div>
                ) : (
                    <div className="team-members-grid">
                        {members.map((member) => {
                            const username =
                                member.username ||
                                member.user_username ||
                                "Unknown User";

                            return (
                                <article
                                    className="team-member-card"
                                    key={member.id}
                                >
                                    <div className="team-member-main">
                                        <div className="team-member-avatar">
                                            {getInitials(username)}
                                        </div>

                                        <div className="team-member-info">
                                            <h4>{username}</h4>

                                            {member.email && (
                                                <p>{member.email}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="team-member-bottom">
                                        <span
                                            className={`team-member-role role-${member.role || "member"}`}
                                        >
                                            {getRoleLabel(member.role)}
                                        </span>

                                        <button
                                            type="button"
                                            className="team-member-remove"
                                            onClick={() =>
                                                handleRemoveMember(member.id)
                                            }
                                            disabled={
                                                removingId === member.id
                                            }
                                        >
                                            {removingId === member.id
                                                ? "Removing..."
                                                : "Remove"}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default TeamMembers;