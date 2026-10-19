import os
import re
import requests

from urllib.parse import urlparse

from django.conf import settings
from django.db import transaction
from django.contrib.auth.models import User
from django.db.models import Q, QuerySet

from rest_framework import generics, permissions, status, viewsets
from rest_framework.permissions import IsAuthenticated
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
        return User.objects.filter(is_active=True).order_by("username")


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
# GITHUB INTEGRATION, RECENT COMMITS AND ISSUES
# ============================================================

class GitHubIntegrationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self, request, project_id):
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

        value = value.split("?", 1)[0]
        value = value.split("#", 1)[0].rstrip("/")

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
        token = (
            os.environ.get("GITHUB_TOKEN")
            or getattr(settings, "GITHUB_TOKEN", "")
        )

        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "DevFlow-App",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            response = requests.get(
                url,
                headers=headers,
                timeout=10,
            )
            return response, None

        except requests.Timeout:
            return None, Response(
                {"error": "GitHub request timed out. Please try again."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )

        except requests.RequestException:
            return None, Response(
                {"error": "Could not reach GitHub. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    def github_error_response(self, response):
        if response.status_code == 401:
            return Response(
                {
                    "error": (
                        "GitHub authentication failed. Check your "
                        "GITHUB_TOKEN configuration."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if response.status_code in (403, 429):
            remaining = response.headers.get("X-RateLimit-Remaining")
            reset = response.headers.get("X-RateLimit-Reset")
            retry_after = response.headers.get("Retry-After")

            rate_limited = (
                response.status_code == 429
                or remaining == "0"
                or retry_after is not None
            )

            message = (
                "GitHub API rate limit reached. Please try again later."
                if rate_limited
                else "GitHub denied access to this resource."
            )

            details = {}

            if remaining is not None:
                details["rate_limit_remaining"] = remaining

            if reset is not None:
                details["rate_limit_reset"] = reset

            if retry_after is not None:
                details["retry_after_seconds"] = retry_after

            return Response(
                {"error": message, **details},
                status=(
                    status.HTTP_429_TOO_MANY_REQUESTS
                    if rate_limited
                    else status.HTTP_403_FORBIDDEN
                ),
            )

        return None

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
                "issues": [],
            })

        repo_name = self.normalize_repo(project.github_repo)

        if not repo_name:
            return Response({
                "connected": True,
                "valid": False,
                "repo_name": project.github_repo,
                "commits": [],
                "issues": [],
                "error": "The saved GitHub repository name is invalid.",
            })

        base_url = f"https://api.github.com/repos/{repo_name}"

        response, error_response = self.github_get(base_url)

        if error_response is not None:
            return error_response

        if response is None:
            return Response(
                {"error": "GitHub could not retrieve this repository."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        github_error = self.github_error_response(response)

        if github_error is not None:
            return github_error

        if response.status_code == 404:
            return Response({
                "connected": True,
                "valid": False,
                "repo_name": repo_name,
                "commits": [],
                "issues": [],
                "error": (
                    "Repository not found or not publicly accessible."
                ),
            })

        if response.status_code != 200:
            return Response(
                {"error": "GitHub could not retrieve this repository."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            data = response.json()
        except ValueError:
            return Response(
                {"error": "GitHub returned invalid repository data."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not isinstance(data, dict):
            return Response(
                {"error": "GitHub returned an invalid repository response."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        commits = []

        commits_response, commits_error = self.github_get(
            f"{base_url}/commits?per_page=5"
        )

        if commits_error is not None:
            return commits_error

        if commits_response is not None:
            commits_error_response = self.github_error_response(
                commits_response
            )

            if commits_error_response is not None:
                return commits_error_response

            if commits_response.status_code == 200:
                try:
                    commit_items = commits_response.json()
                except ValueError:
                    commit_items = []

                if isinstance(commit_items, list):
                    for item in commit_items:
                        if not isinstance(item, dict):
                            continue

                        commit_data = item.get("commit") or {}
                        author_data = commit_data.get("author") or {}
                        github_author = item.get("author") or {}

                        message = (
                            commit_data.get("message") or ""
                        ).splitlines()

                        commits.append({
                            "sha": (item.get("sha") or "")[:7],
                            "message": message[0] if message else "",
                            "author": (
                                github_author.get("login")
                                or author_data.get("name")
                                or "Unknown author"
                            ),
                            "date": author_data.get("date"),
                            "html_url": item.get("html_url"),
                        })

        issues = []

        issues_response, issues_error = self.github_get(
            f"{base_url}/issues"
            "?state=all&sort=updated&direction=desc&per_page=30"
        )

        if issues_error is not None:
            return issues_error

        if issues_response is not None:
            issues_error_response = self.github_error_response(
                issues_response
            )

            if issues_error_response is not None:
                return issues_error_response

            if issues_response.status_code == 200:
                try:
                    issue_items = issues_response.json()
                except ValueError:
                    issue_items = []

                if isinstance(issue_items, list):
                    for item in issue_items:
                        if not isinstance(item, dict):
                            continue

                        if "pull_request" in item:
                            continue

                        issue_user = item.get("user") or {}

                        labels = [
                            label.get("name", "")
                            for label in item.get("labels", [])
                            if isinstance(label, dict)
                        ]

                        issues.append({
                            "id": item.get("id"),
                            "number": item.get("number"),
                            "title": item.get("title") or "Untitled issue",
                            "state": item.get("state", "open"),
                            "author": issue_user.get("login") or "Unknown",
                            "labels": labels,
                            "created_at": item.get("created_at"),
                            "updated_at": item.get("updated_at"),
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
            "issues": issues,
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

        github_error = self.github_error_response(response)

        if github_error is not None:
            return github_error

        if response.status_code == 404:
            return Response(
                {
                    "error": (
                        "Repository not found or not publicly accessible."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if response.status_code != 200:
            return Response(
                {"error": "GitHub could not verify this repository."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            data = response.json()
        except ValueError:
            return Response(
                {"error": "GitHub returned invalid repository data."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        canonical_name = data.get("full_name")

        if not canonical_name:
            return Response(
                {"error": "GitHub returned incomplete repository data."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        project.github_repo = canonical_name
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


# ============================================================
# GITHUB ISSUE IMPORT
# ============================================================

class GitHubIssueImportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id, issue_number):
        try:
            issue_number = int(issue_number)

            if issue_number < 1:
                raise ValueError

        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid GitHub issue number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            project = Project.objects.get(
                id=project_id,
                owner=request.user,
            )

        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        repo = (project.github_repo or "").strip()

        if not repo:
            return Response(
                {"error": "Connect a GitHub repository first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_repo = GitHubIntegrationView().normalize_repo(repo)

        if not normalized_repo:
            return Response(
                {
                    "error": (
                        "Invalid repository format. "
                        "Expected owner/repository."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        issue_url = (
            f"https://api.github.com/repos/"
            f"{normalized_repo}/issues/{issue_number}"
        )

        token = (
            os.environ.get("GITHUB_TOKEN")
            or getattr(settings, "GITHUB_TOKEN", "")
        )

        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "DevFlow-App",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            github_response = requests.get(
                issue_url,
                headers=headers,
                timeout=10,
            )

        except requests.RequestException:
            return Response(
                {"error": "Could not connect to GitHub. Try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if github_response.status_code == 404:
            return Response(
                {
                    "error": (
                        "Issue not found. Check that the repository "
                        "is accessible and the issue number is correct."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if github_response.status_code in (403, 429):
            return Response(
                {
                    "error": (
                        "GitHub rate limit reached or access denied."
                    ),
                    "rate_limit_remaining": github_response.headers.get(
                        "X-RateLimit-Remaining"
                    ),
                    "rate_limit_reset": github_response.headers.get(
                        "X-RateLimit-Reset"
                    ),
                },
                status=(
                    status.HTTP_429_TOO_MANY_REQUESTS
                    if github_response.status_code == 429
                    else status.HTTP_403_FORBIDDEN
                ),
            )

        if github_response.status_code == 401:
            return Response(
                {"error": "GitHub authentication failed. Check GITHUB_TOKEN."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if github_response.status_code != 200:
            return Response(
                {"error": "GitHub could not return this issue."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            issue = github_response.json()
        except ValueError:
            return Response(
                {"error": "GitHub returned invalid issue data."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if "pull_request" in issue:
            return Response(
                {
                    "error": (
                        "This number belongs to a pull request, "
                        "not a GitHub issue."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        canonical_issue_url = issue.get("html_url", "")
        issue_title = (issue.get("title") or "").strip()

        if not canonical_issue_url or not issue_title:
            return Response(
                {"error": "GitHub returned incomplete issue data."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        issue_body = (issue.get("body") or "").strip()

        description = (
            f"{issue_body}\n\nGitHub Issue: {canonical_issue_url}"
            if issue_body
            else f"Imported from GitHub.\n\nGitHub Issue: {canonical_issue_url}"
        )

        with transaction.atomic():
            existing_tasks = Task.objects.filter(
                project=project,
                description__contains=canonical_issue_url,
            )

            if existing_tasks.exists():
                existing_task = existing_tasks.first()

                return Response(
                    {
                        "message": "This GitHub issue was already imported.",
                        "already_imported": True,
                        "task": {
                            "id": existing_task.id,
                            "title": existing_task.title,
                            "status": existing_task.status,
                            "priority": existing_task.priority,
                        },
                    },
                    status=status.HTTP_200_OK,
                )

            task = Task.objects.create(
                project=project,
                title=issue_title[:255],
                description=description,
                status="todo",
                priority="medium",
                assignee=None,
                due_date=None,
            )

            ActivityLog.objects.create(
                user=request.user,
                project=project,
                action="github_issue_imported",
                description=(
                    f"Imported GitHub issue #{issue_number}: "
                    f"{issue_title}"
                ),
            )

        return Response(
            {
                "message": "GitHub issue imported successfully.",
                "already_imported": False,
                "task": {
                    "id": task.id,
                    "title": task.title,
                    "description": task.description,
                    "status": task.status,
                    "priority": task.priority,
                },
            },
            status=status.HTTP_201_CREATED,
        )



class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).select_related("user")

    def partial_update(self, request, *args, **kwargs):
        notification = self.get_object()

        if "is_read" not in request.data:
            return Response(
                {"error": "Provide is_read to update the notification."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(
            notification,
            data={"is_read": request.data["is_read"]},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


class ActivityLogListView(generics.ListAPIView):
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        user_projects = Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

        return (
            ActivityLog.objects
            .filter(project__in=user_projects)
            .select_related("user", "project")
            .order_by("-created_at")
        )
