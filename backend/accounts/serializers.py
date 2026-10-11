from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    ActivityLog,
    Notification,
    Project,
    Task,
    Comment,
    TeamMember,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
        ]


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "deadline",
            "github_repo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "project",
            "created_at",
            "updated_at",
        ]


class CommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    class Meta:
        model = Comment
        fields = [
            "id",
            "task",
            "user",
            "username",
            "content",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "task",
            "user",
            "username",
            "created_at",
            "updated_at",
        ]


class TeamMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    class Meta:
        model = TeamMember
        fields = [
            "id",
            "project",
            "user",
            "username",
            "email",
            "role",
            "added_at",
        ]
        read_only_fields = [
            "id",
            "project",
            "user",
            "username",
            "email",
            "added_at",
        ]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "user",
            "title",
            "message",
            "is_read",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "created_at",
        ]


class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "user",
            "username",
            "project",
            "action",
            "description",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "username",
            "project",
            "created_at",
        ]