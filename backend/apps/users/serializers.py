from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, UserProfile, UserAddress


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'full_name', 'password', 'password_confirm')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password': "Пароли не совпадают."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError("Необходимо указать email и пароль.")

        user = authenticate(
            request=self.context.get('request'),
            username=email,
            password=password,
        )

        if not user:
            raise serializers.ValidationError("Неверный email или пароль.")

        if not user.is_active:
            raise serializers.ValidationError("Аккаунт пользователя отключён.")

        attrs['user'] = user
        return attrs


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate_refresh(self, value):
        try:
            self.token = RefreshToken(value)
        except Exception:
            raise serializers.ValidationError('Невалидный refresh-токен.')
        return value

    def save(self, **kwargs):
        self.token.blacklist()


class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.ReadOnlyField(source='user.email')
    full_name = serializers.ReadOnlyField(source='user.full_name')

    class Meta:
        model = UserProfile
        fields = (
            'email',
            'full_name',
            'avatar',
            'phone',
            'date_of_birth',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')


class UserAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAddress
        fields = (
            'id',
            'city',
            'street',
            'house',
            'apartment',
            'postal_code',
            'title',
            'recipient_name',
            'recipient_phone',
            'is_default',
            'created_at',
        )
        read_only_fields = ('id', 'created_at')

    def create(self, validated_data):
        user = self.context['request'].user
        if validated_data.get('is_default'):
            UserAddress.objects.filter(user=user, is_default=True).update(is_default=False)
        return UserAddress.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        if validated_data.get('is_default'):
            UserAddress.objects.filter(
                user=instance.user, is_default=True
            ).exclude(pk=instance.pk).update(is_default=False)
        return super().update(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Текущий пароль указан неверно.')
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password': 'Пароли не совпадают.'})

        user = self.context['request'].user
        if user.check_password(attrs['new_password']):
            raise serializers.ValidationError(
                {'new_password': 'Новый пароль должен отличаться от текущего.'}
            )
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self, **kwargs):
        email = self.validated_data['email']

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = PasswordResetTokenGenerator().make_token(user)
        reset_link = f'{settings.FRONTEND_URL}/reset-password/{uid}/{token}/'

        send_mail(
            subject='Восстановление пароля',
            message=(
                f'Здравствуйте, {user.full_name}!\n\n'
                f'Для сброса пароля перейдите по ссылке:\n{reset_link}\n\n'
                f'Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password': 'Пароли не совпадают.'})

        try:
            uid = force_str(urlsafe_base64_decode(attrs['uid']))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError('Ссылка для сброса пароля недействительна.')

        if not PasswordResetTokenGenerator().check_token(user, attrs['token']):
            raise serializers.ValidationError('Ссылка для сброса пароля недействительна или устарела.')

        attrs['user'] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data['user']
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user