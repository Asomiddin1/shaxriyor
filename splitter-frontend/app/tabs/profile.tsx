import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInputProps,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { YStack, XStack, Text, Button, Separator, Spinner, useTheme } from 'tamagui';
import {
  Copy,
  LogOut,
  Upload,
  RotateCcw,
  CheckCircle,
  User as UserIcon,
  Mail,
  Lock,
  Edit3,
  X,
  Check,
  Languages,
  Moon,
  Sun,
  Camera,
  ChevronRight,
  Shield,
  Palette,
  Globe,
  ArrowRight,
} from '@tamagui/lucide-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/shared/ui/ScreenContainer';
import UserAvatar from '@/shared/ui/UserAvatar';
import Input from '@/shared/ui/Input';
import PasswordInput from '@/shared/ui/PasswordInput';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { changePassword, resetAvatar, updateEmail, updateUsername, uploadAvatar } from '@/features/auth/api';
import { LANGUAGE_OPTIONS, type LanguageCode } from '@/shared/config/languages';
import { LanguageSegmentedControl } from '@/shared/ui/LanguageSegmentedControl';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SuccessKey = 'avatar' | 'password';
type StatusState = 'idle' | 'saving' | 'success';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.9,
};

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  successTrigger?: number;
  gradient?: boolean;
}

function SectionCard({ title, icon, children, successTrigger = 0, gradient = false }: SectionCardProps) {
  const theme = useTheme();
  
  return (
    <YStack
      borderWidth={1}
      borderColor={gradient ? 'transparent' : '$gray5'}
      borderRadius={24}
      padding="$5"
      gap="$4"
      backgroundColor="$background"
      position="relative"
      overflow="hidden"
      shadowColor="$shadowColor"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.08}
      shadowRadius={12}
      elevation={3}
    >
      {gradient && (
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          height={3}
          backgroundColor="$green9"
          borderTopLeftRadius={24}
          borderTopRightRadius={24}
        />
      )}
      <XStack ai="center" jc="space-between">
        <XStack ai="center" gap="$3">
          <YStack
            backgroundColor="$green4"
            borderRadius={12}
            padding="$2.5"
          >
            {icon}
          </YStack>
          <Text fontSize={17} fontWeight="700" letterSpacing={-0.3}>
            {title}
          </Text>
        </XStack>
        <SuccessBadge trigger={successTrigger} />
      </XStack>
      {children}
    </YStack>
  );
}

function SuccessBadge({ trigger }: { trigger?: number }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (!trigger) return;

    setVisible(true);
    opacity.setValue(0);
    scale.setValue(0.9);
    translateY.setValue(10);

    Animated.parallel([
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 140,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 140,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 6,
        tension: 140,
      }),
    ]).start(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        delay: 1800,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    });
  }, [trigger, opacity, scale, translateY]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ scale }, { translateY }],
        backgroundColor: 'rgba(34,197,94,0.12)',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.2)',
      }}
    >
      <XStack ai="center" gap="$1.5">
        <CheckCircle size={14} color="#22c55e" />
        <Text fontSize={12} fontWeight="600" color="#22c55e">
          {t('profile.status.saved', 'Saved')}
        </Text>
      </XStack>
    </Animated.View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  onCopy?: () => void;
}

function InfoRow({ label, value, onCopy }: InfoRowProps) {
  const { t } = useTranslation();
  return (
    <YStack gap="$2">
      <Text fontSize={12} fontWeight="500" color="$gray9" letterSpacing={0.3} textTransform="uppercase">
        {label}
      </Text>
      <XStack ai="center" jc="space-between" backgroundColor="$gray2" borderRadius={12} padding="$3">
        <Text fontSize={15} fontWeight="600" letterSpacing={-0.2} numberOfLines={1} flex={1}>
          {value || '—'}
        </Text>
        {onCopy && (
          <Button
            size="$2.5"
            variant="outlined"
            borderRadius={10}
            borderColor="$gray5"
            backgroundColor="$background"
            icon={<Copy size={14} color="$gray11" />}
            onPress={onCopy}
            pressStyle={{ scale: 0.95 }}
          >
            {t('profile.actions.copy', 'Copy')}
          </Button>
        )}
      </XStack>
    </YStack>
  );
}

interface EditableFieldRowProps {
  label: string;
  value: string;
  draft: string;
  setDraft: (value: string) => void;
  placeholder: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  status: StatusState;
  error?: string | null;
  onCopy?: () => void;
  textInputProps?: Partial<TextInputProps>;
}

function EditableFieldRow({
  label,
  value,
  draft,
  setDraft,
  placeholder,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  status,
  error,
  onCopy,
  textInputProps,
}: EditableFieldRowProps) {
  const { t } = useTranslation();
  const animatedScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'success' && !isEditing) {
      animatedScale.setValue(0.85);
      Animated.spring(animatedScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 120,
      }).start();
    }
  }, [animatedScale, status, isEditing]);

  const editIcon = () => {
    if (status === 'saving') {
      return <Spinner size="small" color="$gray11" />;
    }
    if (status === 'success' && !isEditing) {
      return (
        <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
          <CheckCircle size={16} color="#22c55e" />
        </Animated.View>
      );
    }
    return <Edit3 size={16} color="$gray11" />;
  };

  return (
    <YStack gap="$2.5">
      <Text fontSize={12} fontWeight="500" color="$gray9" letterSpacing={0.3} textTransform="uppercase">
        {label}
      </Text>
      <XStack ai="center" jc="space-between" gap="$2">
        <XStack flex={1}>
          {isEditing ? (
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder={placeholder}
              error={error || undefined}
              textInputProps={{ autoCapitalize: 'none', autoCorrect: false, ...textInputProps }}
            />
          ) : (
            <YStack 
              backgroundColor="$gray2" 
              borderRadius={12} 
              paddingHorizontal="$3" 
              paddingVertical="$3"
              flex={1}
            >
              <Text fontSize={15} fontWeight="600" letterSpacing={-0.2} numberOfLines={1}>
                {value || '—'}
              </Text>
            </YStack>
          )}
        </XStack>
        <XStack gap="$2">
          {isEditing ? (
            <>
              <Button
                size="$2.5"
                variant="outlined"
                borderRadius={10}
                borderColor="$gray5"
                backgroundColor="$background"
                icon={<X size={16} color="$gray11" />}
                onPress={onCancelEdit}
                pressStyle={{ scale: 0.95 }}
              />
              <Button
                size="$2.5"
                bg="$green9"
                color="white"
                borderRadius={10}
                icon={status === 'saving' ? <Spinner size="small" color="white" /> : <Check size={16} color="white" />}
                onPress={onSave}
                disabled={status === 'saving'}
                pressStyle={{ scale: 0.95 }}
              />
            </>
          ) : (
            <>
              {onCopy && (
                <Button
                  size="$2.5"
                  variant="outlined"
                  borderRadius={10}
                  borderColor="$gray5"
                  backgroundColor="$background"
                  icon={<Copy size={14} color="$gray11" />}
                  onPress={onCopy}
                  pressStyle={{ scale: 0.95 }}
                >
                  {t('profile.actions.copy', 'Copy')}
                </Button>
              )}
              <Button
                size="$2.5"
                variant="outlined"
                borderRadius={10}
                borderColor="$gray5"
                backgroundColor="$background"
                onPress={onStartEdit}
                icon={editIcon()}
                pressStyle={{ scale: 0.95 }}
              />
            </>
          )}
        </XStack>
      </XStack>
    </YStack>
  );
}

function ProfileHeader({ 
  displayName, 
  email, 
  previewUri, 
  onEditAvatar 
}: { 
  displayName: string;
  email: string;
  previewUri: string | null;
  onEditAvatar: () => void;
}) {
  const theme = useTheme();
  
  return (
    <YStack 
      backgroundColor="$background"
      borderRadius={24}
      borderWidth={1}
      borderColor="$gray5"
      overflow="hidden"
      shadowColor="$shadowColor"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.1}
      shadowRadius={16}
      elevation={4}
    >
      {/* Banner */}
      <LinearGradient
        colors={['#10b981', '#059669', '#047857']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 80 }}
      />
      
      {/* Avatar Section */}
      <YStack ai="center" marginTop={-48} gap="$3" paddingHorizontal="$5" paddingBottom="$5">
        <Pressable onPress={onEditAvatar}>
          <YStack position="relative">
            <YStack
              borderWidth={4}
              borderColor="$background"
              borderRadius={999}
              shadowColor="$shadowColor"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.15}
              shadowRadius={8}
              elevation={5}
            >
              <UserAvatar
                uri={previewUri ?? undefined}
                label={displayName.slice(0, 1).toUpperCase()}
                size={96}
                textSize={34}
              />
            </YStack>
            <YStack
              position="absolute"
              bottom={0}
              right={0}
              backgroundColor="$green9"
              borderRadius={20}
              padding="$2"
              borderWidth={3}
              borderColor="$background"
            >
              <Camera size={16} color="white" />
            </YStack>
          </YStack>
        </Pressable>
        
        <YStack ai="center" gap="$1">
          <Text fontSize={22} fontWeight="800" letterSpacing={-0.5}>
            {displayName}
          </Text>
          {email && (
            <Text fontSize={14} color="$gray9" fontWeight="500">
              {email}
            </Text>
          )}
        </YStack>
      </YStack>
    </YStack>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  
  return (
    <Pressable onPress={onToggle}>
      <XStack
        backgroundColor={isDark ? '$gray3' : '$yellow2'}
        borderRadius={30}
        padding="$1.5"
        width={64}
        height={36}
        ai="center"
        jc={isDark ? 'flex-end' : 'flex-start'}
        animation="quick"
        borderWidth={1}
        borderColor={isDark ? '$gray5' : '$yellow5'}
      >
        <YStack
          backgroundColor={isDark ? '$gray9' : '$yellow9'}
          borderRadius={20}
          width={28}
          height={28}
          ai="center"
          jc="center"
          animation="quick"
        >
          {isDark ? (
            <Moon size={16} color="white" />
          ) : (
            <Sun size={16} color="white" />
          )}
        </YStack>
      </XStack>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setUser } = useAppStore();

  // language from store
  const language = useAppStore((s) => s.language);
  const { t } = useTranslation();
  const setLanguage = useAppStore((s) => s.setLanguage);

  // theme from store
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const themeColors = useTheme();
  const screenBg = themeColors.background?.val ?? '#ffffff';

  const guestLabel = t('profile.labels.guest', 'Guest');
  const notAvailableLabel = t('profile.labels.notAvailable', 'N/A');
  const avatarTitle = t('profile.avatar.title', 'Avatar');
  const avatarHint = t(
    'profile.avatar.hint',
    'Uploaded avatars are delivered via our CDN and refresh instantly.'
  );
  const avatarUploadLabel = t('profile.avatar.upload', 'Upload');
  const avatarUploadingLabel = t('profile.avatar.uploading', 'Uploading...');
  const avatarResetLabel = t('profile.avatar.reset', 'Reset');
  const avatarResettingLabel = t('profile.avatar.resetting', 'Resetting...');
  const userInfoTitle = t('profile.info.title', 'Profile information');
  const usernameLabel = t('profile.info.usernameLabel', 'Username');
  const usernamePlaceholder = t('profile.info.usernamePlaceholder', 'Enter a new username');
  const emailLabel = t('profile.info.emailLabel', 'Email');
  const emailPlaceholder = t('profile.info.emailPlaceholder', 'Enter a new email');
  const userIdLabel = t('profile.info.userId', 'User ID');
  const passwordTitle = t('password.title', 'Security');
  const currentPasswordLabel = t('profile.password.currentLabel', 'Current password');
  const currentPasswordPlaceholder = t('profile.password.currentPlaceholder', 'Enter current password');
  const newPasswordLabel = t('profile.password.newLabel', 'New password');
  const newPasswordPlaceholder = t('profile.password.newPlaceholder', 'Enter new password');
  const confirmPasswordLabel = t('profile.password.confirmLabel', 'Confirm new password');
  const confirmPasswordPlaceholder = t('profile.password.confirmPlaceholder', 'Confirm new password');
  const passwordRequirements = t(
    'profile.password.requirements',
    'Password must be at least 8 characters and include uppercase, lowercase, number, and special symbol.'
  );
  const passwordSubmitLabel = t('profile.password.submit', 'Update password');
  const passwordUpdatingLabel = t('profile.password.updating', 'Updating...');
  const logoutLabel = t('profile.logout', 'Log out');

  const displayName = user?.username || guestLabel;
  const userId = user?.uniqueId ?? '';

  const [previewUri, setPreviewUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isResettingAvatar, setIsResettingAvatar] = useState(false);
  const [successCounters, setSuccessCounters] = useState<Record<SuccessKey, number>>({
    avatar: 0,
    password: 0,
  });

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(user?.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<StatusState>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const usernameResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(user?.email ?? '');
  const [emailStatus, setEmailStatus] = useState<StatusState>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);
  const emailResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  useEffect(() => {
    setPreviewUri(user?.avatarUrl ?? null);
  }, [user?.avatarUrl]);

  useEffect(() => {
    setUsernameDraft(user?.username ?? '');
    setIsEditingUsername(false);
    setUsernameStatus('idle');
    setUsernameError(null);
  }, [user?.username]);

  useEffect(() => {
    setEmailDraft(user?.email ?? '');
    setIsEditingEmail(false);
    setEmailStatus('idle');
    setEmailError(null);
  }, [user?.email]);

  useEffect(() => () => {
    if (usernameResetTimer.current) clearTimeout(usernameResetTimer.current);
    if (emailResetTimer.current) clearTimeout(emailResetTimer.current);
  }, []);

  const triggerSuccess = useCallback((key: SuccessKey) => {
    setSuccessCounters((prev) => ({ ...prev, [key]: prev[key] + 1 }));
  }, []);

  const validateUsername = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return t('profile.validation.usernameRequired', 'Username cannot be empty');
      if (trimmed.length < 2) return t('profile.validation.usernameMin', 'Username must be at least 2 characters');
      return null;
    },
    [t]
  );

  const validateEmail = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return t('profile.validation.emailRequired', 'Email cannot be empty');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) return t('profile.validation.emailInvalid', 'Enter a valid email address');
      return null;
    },
    [t]
  );

  const validatePasswordForm = useCallback(() => {
    if (!currentPassword.trim()) {
      return t('profile.validation.passwordCurrent', 'Enter your current password');
    }
    if (newPassword.length < 8) {
      return t('profile.validation.passwordLength', 'New password must be at least 8 characters');
    }
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9\s]/.test(newPassword);
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
      return t(
        'profile.validation.passwordComplexity',
        'Password must include uppercase, lowercase, number, and special character'
      );
    }
    if (newPassword !== confirmPassword) {
      return t('profile.validation.passwordMismatch', 'Passwords do not match');
    }
    if (newPassword === currentPassword) {
      return t('profile.validation.passwordDifferent', 'Choose a different password');
    }
    return null;
  }, [confirmPassword, currentPassword, newPassword, t]);

  useEffect(() => {
    if (usernameError) {
      const error = validateUsername(usernameDraft);
      if (!error) setUsernameError(null);
    }
  }, [usernameDraft, usernameError, validateUsername]);

  useEffect(() => {
    if (emailError) {
      const error = validateEmail(emailDraft);
      if (!error) setEmailError(null);
    }
  }, [emailDraft, emailError, validateEmail]);

  useEffect(() => {
    if (passwordError) {
      const error = validatePasswordForm();
      if (!error) setPasswordError(null);
    }
  }, [passwordError, validatePasswordForm]);

  const ensureMediaPermission = useCallback(async () => {
    if (mediaPermission?.granted) return true;
    const response = await requestMediaPermission();
    if (response?.granted) return true;
    Alert.alert(
      t('profile.alerts.permissionTitle', 'Permission needed'),
      t(
        'profile.alerts.permissionMessage',
        'Please allow access to your photo library to pick an avatar.'
      )
    );
    return false;
  }, [mediaPermission?.granted, requestMediaPermission, t]);

  const buildAvatarFormData = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      if (!asset.uri) {
        throw new Error(t('profile.alerts.imageMissing', 'Image file is missing a URI.'));
      }

      const formData = new FormData();
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const extension = mimeType.split('/').pop() || 'jpg';
      const fileName = asset.fileName ?? `avatar.${extension}`;

      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        if (!response.ok) {
          throw new Error(
            t('profile.alerts.uploadReadFailed', 'Unable to read the selected file for upload.')
          );
        }
        const blob = await response.blob();
        formData.append('file', blob, fileName);
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        } as any);
      }

      return formData;
    },
    [t]
  );

  const handleUploadSelectedAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      if (!asset) return;
      if (!user) {
        Alert.alert(
          t('profile.alerts.unavailableTitle', 'Unavailable'),
          t('profile.alerts.avatarLoginRequired', 'Sign in to update your avatar.')
        );
        return;
      }

      try {
        setIsSavingAvatar(true);
        const formData = await buildAvatarFormData(asset);
        const { avatarUrl: uploadedUrl } = await uploadAvatar(formData);
        setPreviewUri(uploadedUrl);
        setUser({ ...user, avatarUrl: uploadedUrl });
        triggerSuccess('avatar');
      } catch (error) {
        console.error('Avatar upload error:', error);
        const fallback = t('profile.alerts.avatarUpdateFailed', 'Could not update the avatar.');
        const message = error instanceof Error && error.message ? error.message : fallback;
        Alert.alert(t('common.error', 'Error'), message);
      } finally {
        setIsSavingAvatar(false);
      }
    },
    [buildAvatarFormData, setUser, t, triggerSuccess, user]
  );

  const handlePickFromLibrary = useCallback(async () => {
    const allowed = await ensureMediaPermission();
    if (!allowed) return;
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleUploadSelectedAsset(result.assets[0]);
    }
  }, [ensureMediaPermission, handleUploadSelectedAsset]);

  const handleResetAvatar = useCallback(async () => {
    if (!user) {
      Alert.alert(
        t('profile.alerts.unavailableTitle', 'Unavailable'),
        t('profile.alerts.avatarLoginRequired', 'Sign in to update your avatar.')
      );
      return;
    }
    try {
      setIsResettingAvatar(true);
      try {
        const updatedUser = await resetAvatar();
        setUser(updatedUser);
        setPreviewUri(updatedUser.avatarUrl ?? null);
      } catch (apiError) {
        console.warn('Reset avatar API unavailable, falling back to local reset.', apiError);
        setUser({ ...user, avatarUrl: null });
        setPreviewUri(null);
      }
      triggerSuccess('avatar');
    } catch (error) {
      console.error('Reset avatar error:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('profile.alerts.avatarResetFailed', 'Could not reset the avatar.')
      );
    } finally {
      setIsResettingAvatar(false);
    }
  }, [setUser, t, triggerSuccess, user]);

  const handleCopy = useCallback(
    async (label: string, value: string | null | undefined) => {
      if (!value) {
        Alert.alert(
          t('profile.alerts.unavailableTitle', 'Unavailable'),
          t('profile.copy.unavailableMessage', {
            field: label,
            defaultValue: `${label} is not available yet.`,
          })
        );
        return;
      }
      await Clipboard.setStringAsync(value);
      Alert.alert(
        t('profile.copy.successTitle', 'Copied'),
        t('profile.copy.successMessage', {
          field: label,
          defaultValue: `${label} copied to the clipboard.`,
        })
      );
    },
    [t]
  );

  const handleSaveUsername = useCallback(async () => {
    if (!user) {
      Alert.alert(
        t('profile.alerts.unavailableTitle', 'Unavailable'),
        t('profile.alerts.profileLoginRequired', 'Sign in to update your profile.')
      );
      return;
    }

    const issue = validateUsername(usernameDraft);
    setUsernameError(issue);
    if (issue) return;

    const trimmed = usernameDraft.trim();
    if (trimmed === (user.username ?? '')) {
      setIsEditingUsername(false);
      return;
    }

    try {
      setUsernameStatus('saving');
      const updatedUser = await updateUsername({ username: trimmed });
      setUser(updatedUser);
      setUsernameStatus('success');
      setIsEditingUsername(false);
      if (usernameResetTimer.current) clearTimeout(usernameResetTimer.current);
      usernameResetTimer.current = setTimeout(() => setUsernameStatus('idle'), 1600);
    } catch (error) {
      console.error('Username update failed:', error);
      const fallback = t('profile.alerts.usernameUpdateFailed', 'Could not update the username.');
      const message = error instanceof Error && error.message ? error.message : fallback;
      Alert.alert(t('common.error', 'Error'), message);
      setUsernameStatus('idle');
    }
  }, [setUser, t, user, usernameDraft, validateUsername]);

  const handleSaveEmail = useCallback(async () => {
    if (!user) {
      Alert.alert(
        t('profile.alerts.unavailableTitle', 'Unavailable'),
        t('profile.alerts.profileLoginRequired', 'Sign in to update your profile.')
      );
      return;
    }

    const issue = validateEmail(emailDraft);
    setEmailError(issue);
    if (issue) return;

    const trimmed = emailDraft.trim();
    if (trimmed.toLowerCase() === (user.email ?? '').toLowerCase()) {
      setIsEditingEmail(false);
      return;
    }

    try {
      setEmailStatus('saving');
      const updatedUser = await updateEmail({ email: trimmed });
      setUser(updatedUser);
      setEmailStatus('success');
      setIsEditingEmail(false);
      if (emailResetTimer.current) clearTimeout(emailResetTimer.current);
      emailResetTimer.current = setTimeout(() => setEmailStatus('idle'), 1600);
    } catch (error) {
      console.error('Email update failed:', error);
      const fallback = t('profile.alerts.emailUpdateFailed', 'Could not update the email.');
      const message = error instanceof Error && error.message ? error.message : fallback;
      Alert.alert(t('common.error', 'Error'), message);
      setEmailStatus('idle');
    }
  }, [emailDraft, setUser, t, user, validateEmail]);

  const handleChangePassword = useCallback(async () => {
    if (!user) {
      Alert.alert(
        t('profile.alerts.unavailableTitle', 'Unavailable'),
        t('profile.alerts.passwordLoginRequired', 'Sign in to change your password.')
      );
      return;
    }

    const error = validatePasswordForm();
    if (error) {
      setPasswordError(error);
      return;
    }
    setPasswordError(null);

    try {
      setIsChangingPassword(true);
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      triggerSuccess('password');
    } catch (err) {
      console.error('Password change failed:', err);
      const fallback = t('profile.alerts.passwordChangeFailed', 'Could not change the password.');
      const message = err instanceof Error && err.message ? err.message : fallback;
      Alert.alert(t('common.error', 'Error'), message);
    } finally {
      setIsChangingPassword(false);
    }
  }, [
    changePassword,
    confirmPassword,
    currentPassword,
    newPassword,
    t,
    triggerSuccess,
    user,
    validatePasswordForm,
  ]);

  const handleLogout = useCallback(() => {
    logout()
      .then(() => router.replace({ pathname: '/' }))
      .catch(() =>
        Alert.alert(
          t('common.error', 'Error'),
          t('profile.alerts.logoutFailed', 'Could not log out. Please try again.')
        )
      );
  }, [logout, router, t]);

  const isResetDisabled = isResettingAvatar || (!user?.avatarUrl && !previewUri);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 }) ?? 0}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: '$gray1' }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <YStack backgroundColor="$gray1">
            <ScreenContainer>
              <YStack gap="$4" pb="$6" paddingTop="$4">
                {/* Profile Header Card */}
                <ProfileHeader
                  displayName={displayName}
                  email={user?.email ?? ''}
                  previewUri={previewUri}
                  onEditAvatar={handlePickFromLibrary}
                />

                {/* Quick Avatar Actions */}
                <XStack gap="$3">
                  <Button
                    flex={1}
                    size="$4"
                    bg="$green9"
                    color="white"
                    borderRadius={16}
                    icon={<Upload size={18} color="white" />}
                    disabled={isSavingAvatar}
                    onPress={handlePickFromLibrary}
                    pressStyle={{ scale: 0.97 }}
                    fontWeight="600"
                    letterSpacing={-0.3}
                  >
                    {isSavingAvatar ? avatarUploadingLabel : avatarUploadLabel}
                  </Button>
                  <Button
                    flex={1}
                    size="$4"
                    variant="outlined"
                    borderRadius={16}
                    borderColor="$gray6"
                    icon={<RotateCcw size={18} color="$gray11" />}
                    disabled={isResetDisabled}
                    onPress={handleResetAvatar}
                    pressStyle={{ scale: 0.97 }}
                    fontWeight="600"
                    letterSpacing={-0.3}
                  >
                    {isResettingAvatar ? avatarResettingLabel : avatarResetLabel}
                  </Button>
                </XStack>

                {/* Appearance Section */}
                <SectionCard
                  title={t('settings.appearance.title', 'Appearance')}
                  icon={<Palette size={18} color="$green11" />}
                >
                  <XStack ai="center" jc="space-between">
                    <XStack ai="center" gap="$3">
                      {theme === 'dark' ? (
                        <Moon size={20} color="$gray11" />
                      ) : (
                        <Sun size={20} color="$yellow11" />
                      )}
                      <YStack>
                        <Text fontSize={15} fontWeight="600" letterSpacing={-0.3}>
                          {theme === 'dark'
                            ? t('settings.appearance.dark', 'Dark mode')
                            : t('settings.appearance.light', 'Light mode')}
                        </Text>
                        <Text fontSize={12} color="$gray9">
                          {t('settings.appearance.description', 'Switch between light and dark theme')}
                        </Text>
                      </YStack>
                    </XStack>
                    <ThemeToggle theme={theme} onToggle={toggleTheme} />
                  </XStack>
                </SectionCard>

                {/* Language Section */}
                <SectionCard
                  title={t('settings.language.title', 'Language')}
                  icon={<Globe size={18} color="$green11" />}
                >
                  <YStack gap="$3">
                    <Text fontSize={13} color="$gray9" lineHeight={18}>
                      {t('settings.language.description', 'Choose the language used across the app.')}
                    </Text>
                    <LanguageSegmentedControl
                      value={language}
                      onChange={(code) => setLanguage(code)}
                      getLabel={(code, fallback) => t(`settings.language.options.${code}`, fallback)}
                    />
                  </YStack>
                </SectionCard>

                {/* Profile Information */}
                <SectionCard title={userInfoTitle} icon={<UserIcon size={18} color="$green11" />}>
                  <EditableFieldRow
                    label={usernameLabel}
                    value={user?.username ?? ''}
                    draft={usernameDraft}
                    setDraft={setUsernameDraft}
                    placeholder={usernamePlaceholder}
                    isEditing={isEditingUsername}
                    onStartEdit={() => setIsEditingUsername(true)}
                    onCancelEdit={() => {
                      setUsernameDraft(user?.username ?? '');
                      setIsEditingUsername(false);
                      setUsernameError(null);
                    }}
                    onSave={handleSaveUsername}
                    status={usernameStatus}
                    error={usernameError}
                    onCopy={() => handleCopy(usernameLabel, user?.username)}
                  />
                  <Separator borderColor="$gray4" />
                  <EditableFieldRow
                    label={emailLabel}
                    value={user?.email ?? ''}
                    draft={emailDraft}
                    setDraft={setEmailDraft}
                    placeholder={emailPlaceholder}
                    isEditing={isEditingEmail}
                    onStartEdit={() => setIsEditingEmail(true)}
                    onCancelEdit={() => {
                      setEmailDraft(user?.email ?? '');
                      setIsEditingEmail(false);
                      setEmailError(null);
                    }}
                    onSave={handleSaveEmail}
                    status={emailStatus}
                    error={emailError}
                    onCopy={() => handleCopy(emailLabel, user?.email)}
                    textInputProps={{ keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false }}
                  />
                  <Separator borderColor="$gray4" />
                  <InfoRow
                    label={userIdLabel}
                    value={userId || notAvailableLabel}
                    onCopy={() => handleCopy(userIdLabel, userId)}
                  />
                </SectionCard>

                {/* Security Section */}
                <SectionCard
                  title={passwordTitle}
                  icon={<Shield size={18} color="$green11" />}
                  successTrigger={successCounters.password}
                >
                  <YStack gap="$4">
                    <PasswordInput
                      label={currentPasswordLabel}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder={currentPasswordPlaceholder}
                      textInputProps={{ returnKeyType: 'next' }}
                    />
                    <PasswordInput
                      label={newPasswordLabel}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder={newPasswordPlaceholder}
                      textInputProps={{ returnKeyType: 'next' }}
                    />
                    <YStack backgroundColor="$yellow2" borderRadius={12} padding="$3" borderWidth={1} borderColor="$yellow4">
                      <Text fontSize={12} color="$yellow11" lineHeight={16} fontWeight="500">
                        {passwordRequirements}
                      </Text>
                    </YStack>
                    <PasswordInput
                      label={confirmPasswordLabel}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder={confirmPasswordPlaceholder}
                      error={passwordError || undefined}
                      textInputProps={{ returnKeyType: 'done' }}
                    />
                    <Button
                      size="$4"
                      bg="$green9"
                      color="white"
                      borderRadius={16}
                      disabled={isChangingPassword}
                      onPress={handleChangePassword}
                      pressStyle={{ scale: 0.97 }}
                      fontWeight="600"
                      letterSpacing={-0.3}
                      icon={<Lock size={18} color="white" />}
                    >
                      {isChangingPassword ? passwordUpdatingLabel : passwordSubmitLabel}
                    </Button>
                  </YStack>
                </SectionCard>

                {/* Logout Button */}
                <Button
                  size="$4"
                  backgroundColor="$red4"
                  color="$red11"
                  borderRadius={16}
                  hoverStyle={{ backgroundColor: '$red5' }}
                  pressStyle={{ backgroundColor: '$red6', scale: 0.97 }}
                  icon={<LogOut size={18} color="$red11" />}
                  onPress={handleLogout}
                  fontWeight="600"
                  letterSpacing={-0.3}
                  marginTop="$2"
                >
                  {logoutLabel}
                </Button>
              </YStack>
            </ScreenContainer>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}