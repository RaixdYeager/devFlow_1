
# pyright: reportIncompatibleMethodOverride=false

import re
from typing import Any
from urllib.parse import urlparse

import requests

from django.contrib.auth.models import User
from django.db.models import Q, QuerySet

from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Project,
    Task,
    Comment,
    TeamMember,
    ActivityLog,
    Notification,
)

from .serializers import (
    ProjectSerializer,
    TaskSerializer,
    CommentSerializer,
    TeamMemberSerializer,
    UserSerializer,
    NotificationSerializer,
    ActivityLogSerializer,
)


# ============================================================
# PROJECT VIEWSET
# ============================================================

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[Project]:
        user = self.request.user
        return Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user)

        TeamMember.objects.get_or_create(
            project=project,
            user=self.request.user,
            defaults={"role": "manager"},
        )

        ActivityLog.objects.create(
            user=self.request.user,
            project=project,
            action="PROJECT_CREATED",
            description=f"Created project '{project.name}'",
        )


# ============================================================
# TASK VIEWSET
# ============================================================

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[Task]:
        project_id = self.kwargs.get("project_pk")
        user = self.request.user

        accessible_projects = Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

        return Task.objects.filter(
            project_id=project_id,
            project__in=accessible_projects,
        )

    def perform_create(self, serializer):
        project_id = self.kwargs.get("project_pk")

        project = Project.objects.get(
            id=project_id,
            owner=self.request.user,
        )

        task = serializer.save(project=project)

        ActivityLog.objects.create(
            user=self.request.user,
            project=project,
            action="TASK_CREATED",
            description=(
                f"Created task '{task.title}' "
                f"in project '{project.name}'"
            ),
        )

    def perform_update(self, serializer):
        old_status = self.get_object().status
        task = serializer.save()

        if old_status != task.status:
            ActivityLog.objects.create(
                user=self.request.user,
                project=task.project,
                action="STATUS_CHANGED",
                description=(
                    f"Updated status of task '{task.title}' "
                    f"to {task.get_status_display()}"
                ),
            )


# ============================================================
# COMMENT VIEWSET
# ============================================================

class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[Comment]:
        task_id = self.kwargs.get("task_pk")
        user = self.request.user

        accessible_projects = Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

        return Comment.objects.filter(
            task_id=task_id,
            task__project__in=accessible_projects,
        )

    def perform_create(self, serializer):
        task_id = self.kwargs.get("task_pk")
        user = self.request.user

        task = Task.objects.get(
            id=task_id,
            project__in=Project.objects.filter(
                Q(owner=user) | Q(members__user=user)
            ).distinct(),
        )

        serializer.save(user=user, task=task)

        ActivityLog.objects.create(
            user=user,
            project=task.project,
            action="COMMENT_ADDED",
            description=f"Commented on task '{task.title}'",
        )


# ============================================================
# TEAM MEMBER VIEWSET
# ============================================================

class TeamMemberViewSet(viewsets.ModelViewSet):
    serializer_class = TeamMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[TeamMember]:
        project_id = self.kwargs.get("project_pk")
        user = self.request.user

        accessible_projects = Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

        return TeamMember.objects.filter(
            project_id=project_id,
            project__in=accessible_projects,
        )

    def perform_create(self, serializer):
        project_id = self.kwargs.get("project_pk")

        project = Project.objects.get(
            id=project_id,
            owner=self.request.user,
        )

        member = serializer.save(project=project)

        ActivityLog.objects.create(
            user=self.request.user,
            project=project,
            action="MEMBER_ADDED",
            description=(
                f"Added {member.user.username} "
                f"to team as {member.role}"
            ),
        )

        Notification.objects.create(
            user=member.user,
            title="Added to Project Team",
            message=(
                f"You have been added to '{project.name}' "
                f"as a {member.role}."
            ),
        )


# ============================================================
# AUTHENTICATION
# ============================================================

class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username")
        email = request.data.get("email")
        password = request.data.get("password")

        if not username or not email or not password:
            return Response(
                {
                    "error": (
                        "username, email, and password are required"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "Username already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )

        return Response(
            {"user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[User]:
        return User.objects.filter(
            is_active=True
        ).order_by("username")


# ============================================================
# PROJECT LIST, CREATE, DETAIL
# ============================================================

class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[Project]:
        user = self.request.user

        return Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user)

        TeamMember.objects.get_or_create(
            project=project,
            user=self.request.user,
            defaults={"role": "manager"},
        )

        ActivityLog.objects.create(
            user=self.request.user,
            project=project,
            action="PROJECT_CREATED",
            description=f"Created project '{project.name}'",
        )


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[Project]:
        user = self.request.user

        return Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()


# ============================================================
# TASK LIST, CREATE, DETAIL
# ============================================================

class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[Task]:
        project_id = self.kwargs.get("project_id")
        user = self.request.user

        accessible_projects = Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

        return Task.objects.filter(
            project_id=project_id,
            project__in=accessible_projects,
        )

    def perform_create(self, serializer):
        project_id = self.kwargs.get("project_id")

        project = Project.objects.get(
            id=project_id,
            owner=self.request.user,
        )

        task = serializer.save(project=project)

        ActivityLog.objects.create(
            user=self.request.user,
            project=project,
            action="TASK_CREATED",
            description=(
                f"Created task '{task.title}' "
                f"in project '{project.name}'"
            ),
        )


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[Task]:
        project_id = self.kwargs.get("project_id")
        user = self.request.user

        accessible_projects = Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

        return Task.objects.filter(
            project_id=project_id,
            project__in=accessible_projects,
        )

    def perform_update(self, serializer):
        old_status = self.get_object().status
        task = serializer.save()

        if old_status != task.status:
            ActivityLog.objects.create(
                user=self.request.user,
                project=task.project,
                action="STATUS_CHANGED",
                description=(
                    f"Updated status of task '{task.title}' "
                    f"to {task.get_status_display()}"
                ),
            )


# ============================================================
# COMMENT LIST, CREATE, DETAIL
# ============================================================

class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[Comment]:
        task_id = self.kwargs.get("task_id")
        user = self.request.user

        accessible_projects = Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

        return Comment.objects.filter(
            task_id=task_id,
            task__project__in=accessible_projects,
        )

    def perform_create(self, serializer):
        task_id = self.kwargs.get("task_id")
        user = self.request.user

        task = Task.objects.get(
            id=task_id,
            project__in=Project.objects.filter(
                Q(owner=user) | Q(members__user=user)
            ).distinct(),
        )

        serializer.save(user=user, task=task)

        ActivityLog.objects.create(
            user=user,
            project=task.project,
            action="COMMENT_ADDED",
            description=f"Commented on task '{task.title}'",
        )


class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[Comment]:
        task_id = self.kwargs.get("task_id")
        user = self.request.user

        accessible_projects = Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

        return Comment.objects.filter(
            task_id=task_id,
            task__project__in=accessible_projects,
        )


# ============================================================
# TEAM MEMBER LIST, CREATE, DETAIL
# ============================================================

class TeamMemberListCreateView(generics.ListCreateAPIView):
    serializer_class = TeamMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[TeamMember]:
        project_id = self.kwargs.get("project_id")
        user = self.request.user

        accessible_projects = Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

        return TeamMember.objects.filter(
            project_id=project_id,
            project__in=accessible_projects,
        )

    def perform_create(self, serializer):
        project_id = self.kwargs.get("project_id")

        project = Project.objects.get(
            id=project_id,
            owner=self.request.user,
        )

        member = serializer.save(project=project)

        ActivityLog.objects.create(
            user=self.request.user,
            project=project,
            action="MEMBER_ADDED",
            description=(
                f"Added {member.user.username} "
                f"to team as {member.role}"
            ),
        )

        Notification.objects.create(
            user=member.user,
            title="Added to Project Team",
            message=(
                f"You have been added to '{project.name}' "
                f"as a {member.role}."
            ),
        )


class TeamMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TeamMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[TeamMember]:
        project_id = self.kwargs.get("project_id")
        user = self.request.user

        accessible_projects = Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

        return TeamMember.objects.filter(
            project_id=project_id,
            project__in=accessible_projects,
        )


# ============================================================
# GITHUB INTEGRATION + RECENT COMMITS
# ============================================================

class GitHubIntegrationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self, request, project_id):
        # Only the project owner can manage this integration.
        try:
            return Project.objects.get(
                id=project_id,
                owner=request.user,
            )
        except Project.DoesNotExist:
            return None

    def normalize_repo(self, value):
        if not isinstance(value, str):
            return None

        value = value.strip()

        if value.startswith(("https://", "http://")):
            parsed = urlparse(value)

            if parsed.netloc.lower() not in {
                "github.com",
                "www.github.com",
            }:
                return None

            value = parsed.path.strip("/")
        elif value.lower().startswith("github.com/"):
            value = value[len("github.com/"):]

        value = value.split("?", 1)[0].split("#", 1)[0].rstrip("/")

        if value.endswith(".git"):
            value = value[:-4]

        parts = value.split("/")

        if len(parts) != 2:
            return None

        owner, repo = parts
        valid_part = re.compile(r"^[A-Za-z0-9_.-]+$")

        if not valid_part.fullmatch(owner):
            return None

        if not valid_part.fullmatch(repo):
            return None

        if owner in {".", ".."} or repo in {".", ".."}:
            return None

        return f"{owner}/{repo}"

    def github_get(self, url):
        try:
            response = requests.get(
                url,
                headers={
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "DevFlow-App",
                },
                timeout=10,
            )
            return response, None

        except requests.RequestException:
            return None, Response(
                {"error": "Could not reach GitHub. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    def get(self, request, project_id):
        project = self.get_project(request, project_id)

        if project is None:
            return Response(
                {"error": "Project not found or unauthorized."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not project.github_repo:
            return Response({
                "connected": False,
                "repo": None,
                "commits": [],
            })

        repo_name = self.normalize_repo(project.github_repo)

        if not repo_name:
            return Response({
                "connected": True,
                "valid": False,
                "repo_name": project.github_repo,
                "commits": [],
                "error": "The saved GitHub repository name is invalid.",
            })

        base_url = f"https://api.github.com/repos/{repo_name}"

        # Fetch repository information.
        response, error_response = self.github_get(base_url)

        if error_response is not None:
            return error_response

        if response is None:
            return Response(
                {"error": "GitHub could not retrieve this repository."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if response.status_code == 404:
            return Response({
                "connected": True,
                "valid": False,
                "repo_name": repo_name,
                "commits": [],
                "error": "Repository not found or not publicly accessible.",
            })

        if response.status_code in (403, 429):
            return Response(
                {"error": "GitHub rate limit reached or access was denied."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if response.status_code != 200:
            return Response(
                {"error": "GitHub could not retrieve this repository."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        data = response.json()

        if not isinstance(data, dict):
            return Response(
                {"error": "GitHub returned an invalid repository response."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Fetch the five most recent commits.
        commits = []
        commits_response, commits_error = self.github_get(
            f"{base_url}/commits?per_page=5"
        )

        # Repository information remains available if commit history fails.
        if (
            commits_error is None
            and commits_response is not None
            and commits_response.status_code == 200
        ):
            commit_items = commits_response.json()

            if isinstance(commit_items, list):
                for item in commit_items:
                    commit_data = item.get("commit") or {}
                    author_data = commit_data.get("author") or {}
                    github_author = item.get("author") or {}

                    commits.append({
                        "sha": (item.get("sha") or "")[:7],
                        "message": (
                            commit_data.get("message") or ""
                        ).splitlines()[0],
                        "author": (
                            github_author.get("login")
                            or author_data.get("name")
                            or "Unknown author"
                        ),
                        "date": author_data.get("date"),
                        "html_url": item.get("html_url"),
                    })

        return Response({
            "connected": True,
            "valid": True,
            "repo_name": data.get("full_name"),
            "description": data.get("description"),
            "stars": data.get("stargazers_count", 0),
            "forks": data.get("forks_count", 0),
            "open_issues": data.get("open_issues_count", 0),
            "html_url": data.get("html_url"),
            "language": data.get("language"),
            "commits": commits,
        })

    def post(self, request, project_id):
        project = self.get_project(request, project_id)

        if project is None:
            return Response(
                {"error": "Project not found or unauthorized."},
                status=status.HTTP_404_NOT_FOUND,
            )

        submitted_repo = (
            request.data.get("github_repo")
            or request.data.get("repo")
            or request.data.get("url")
        )

        repo_name = self.normalize_repo(submitted_repo)

        if not repo_name:
            return Response(
                {
                    "error": (
                        "Enter a valid GitHub repository URL "
                        "or owner/repo."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        response, error_response = self.github_get(
            f"https://api.github.com/repos/{repo_name}"
        )

        if error_response is not None:
            return error_response

        if response is None:
            return Response(
                {"error": "Could not reach GitHub. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if response.status_code != 200:
            if response.status_code in (403, 429):
                return Response(
                    {"error": "GitHub rate limit reached or access was denied."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            return Response(
                {
                    "error": (
                        "Repository not found or not publicly accessible."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = response.json()
        project.github_repo = data.get("full_name", repo_name)
        project.save(update_fields=["github_repo", "updated_at"])

        ActivityLog.objects.create(
            user=request.user,
            project=project,
            action="GITHUB_REPOSITORY_CONNECTED",
            description=(
                f"Connected GitHub repository '{project.github_repo}' "
                f"to project '{project.name}'"
            ),
        )

        return Response({
            "message": "GitHub repository connected successfully.",
            "connected": True,
            "valid": True,
            "repo_name": project.github_repo,
            "html_url": data.get("html_url"),
        }, status=status.HTTP_200_OK)

    def delete(self, request, project_id):
        project = self.get_project(request, project_id)

        if project is None:
            return Response(
                {"error": "Project not found or unauthorized."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not project.github_repo:
            return Response({
                "message": "No GitHub repository is connected.",
                "connected": False,
            })

        old_repo = project.github_repo
        project.github_repo = ""
        project.save(update_fields=["github_repo", "updated_at"])

        ActivityLog.objects.create(
            user=request.user,
            project=project,
            action="GITHUB_REPOSITORY_DISCONNECTED",
            description=(
                f"Disconnected GitHub repository '{old_repo}' "
                f"from project '{project.name}'"
            ),
        )

        return Response({
            "message": "GitHub repository disconnected successfully.",
            "connected": False,
        })


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        projects = Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

        tasks = Task.objects.filter(project__in=projects)

        return Response({
            "total_projects": projects.count(),
            "total_tasks": tasks.count(),
            "completed_tasks": tasks.filter(status="done").count(),
            "in_progress_tasks": tasks.filter(
                status="in_progress"
            ).count(),
            "testing_tasks": tasks.filter(status="testing").count(),
            "todo_tasks": tasks.filter(status="todo").count(),
        })


# ============================================================
# NOTIFICATIONS
# ============================================================

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[Notification]:
        return Notification.objects.filter(user=self.request.user)


# ============================================================
# ACTIVITY LOG
# ============================================================

class ActivityLogListView(generics.ListAPIView):
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[ActivityLog]:
        user = self.request.user

        user_projects = Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

        return ActivityLog.objects.filter(project__in=user_projects)
