
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    SignupView,
    ProjectListCreateView,
    ProjectDetailView,
    TaskListCreateView,
    TaskDetailView,
    CommentListCreateView,
    CommentDetailView,
    TeamMemberListCreateView,
    TeamMemberDetailView,
    UserListView,
    GitHubIntegrationView,
    GitHubIssueImportView,
    NotificationViewSet,
    ActivityLogListView,
    DashboardStatsView,
)


urlpatterns = [
    # Authentication
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Users
    path("users/", UserListView.as_view(), name="user-list"),

    # Dashboard
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),

    # Projects
    path("projects/", ProjectListCreateView.as_view(), name="project-list"),
    path(
        "projects/<int:pk>/",
        ProjectDetailView.as_view(),
        name="project-detail",
    ),

    # Project tasks
    path(
        "projects/<int:project_id>/tasks/",
        TaskListCreateView.as_view(),
        name="project-task-list",
    ),
    path(
        "projects/<int:project_id>/tasks/<int:pk>/",
        TaskDetailView.as_view(),
        name="project-task-detail",
    ),

    # Comments
    path(
        "projects/<int:project_id>/tasks/<int:task_id>/comments/",
        CommentListCreateView.as_view(),
        name="comment-list",
    ),
    path(
        "projects/<int:project_id>/tasks/<int:task_id>/comments/<int:pk>/",
        CommentDetailView.as_view(),
        name="comment-detail",
    ),

    # Team members
    path(
        "projects/<int:project_id>/team-members/",
        TeamMemberListCreateView.as_view(),
        name="team-member-list",
    ),
    path(
        "projects/<int:project_id>/team-members/<uuid:pk>/",
        TeamMemberDetailView.as_view(),
        name="team-member-detail",
    ),

    # GitHub integration
    path(
        "projects/<int:project_id>/github/",
        GitHubIntegrationView.as_view(),
        name="project-github",
    ),
    path(
        "projects/<int:project_id>/github/issues/<int:issue_number>/import/",
        GitHubIssueImportView.as_view(),
        name="project-github-issue-import",
    ),

    # Notifications
    path(
        "notifications/",
        NotificationViewSet.as_view({
            "get": "list",
            "patch": "partial_update",
        }),
        name="notification-list",
    ),
    path(
        "notifications/<uuid:pk>/",
        NotificationViewSet.as_view({
            "get": "retrieve",
            "patch": "partial_update",
        }),
        name="notification-detail",
    ),

    # Activity logs
    path(
        "activity-logs/",
        ActivityLogListView.as_view(),
        name="activity-log-list",
    ),
]
