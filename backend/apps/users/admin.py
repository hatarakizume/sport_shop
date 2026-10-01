from django.contrib import admin
from .models import User, UserProfile, UserAddress
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin


class UserAdmin(BaseUserAdmin):
    model = User
    list_display = ("email", "full_name", "is_staff", "is_active")
    ordering = ("email",)
    search_fields = ("email", "full_name")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("full_name",)}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "full_name", "password1", "password2"),
            },
        ),
    )


admin.site.register(User, UserAdmin)
admin.site.register(UserProfile)
admin.site.register(UserAddress)
