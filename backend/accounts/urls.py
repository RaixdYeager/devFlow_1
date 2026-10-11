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
)


urlpatterns = [

    # Authentication

    path(
        "signup/",
        SignupView.as_view(),
        name="signup",
    ),

    path(
        "login/",
        TokenObtainPairView.as_view(),
        name="login",
    ),

    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),

    path(
        "users/",
        UserListView.as_view(),
        name="user-list",
    ),


    # Projects

    path(
        "projects/",
        ProjectListCreateView.as_view(),
        name="project-list-create",
    ),

    path(
        "projects/<int:pk>/",
        ProjectDetailView.as_view(),
        name="project-detail",
    ),

    path(
        "projects/<int:project_id>/github/",
        GitHubIntegrationView.as_view(),
        name="github-integration",
    ),


    # Tasks

    path(
        "projects/<int:project_id>/tasks/",
        TaskListCreateView.as_view(),
        name="task-list-create",
    ),

    path(
        "projects/<int:project_id>/tasks/<int:pk>/",
        TaskDetailView.as_view(),
        name="task-detail",
    ),


    # Comments

    path(
        "projects/<int:project_id>/tasks/<int:task_id>/comments/",
        CommentListCreateView.as_view(),
        name="comment-list-create",
    ),

    path(
        "projects/<int:project_id>/tasks/<int:task_id>/comments/<int:pk>/",
        CommentDetailView.as_view(),
        name="comment-detail",
    ),


    # Team Members

    path(
        "projects/<int:project_id>/members/",
        TeamMemberListCreateView.as_view(),
        name="team-member-list-create",
    ),

    path(
        "projects/<int:project_id>/members/<int:pk>/",
        TeamMemberDetailView.as_view(),
        name="team-member-detail",
    ),
]