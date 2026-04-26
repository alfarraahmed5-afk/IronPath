import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Avatar } from '../../src/components/Avatar';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/Text';
import { Icon } from '../../src/components/Icon';
import { Pressable } from '../../src/components/Pressable';
import { colors, spacing, radii } from '../../src/theme/tokens';

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handlePickPhoto() {
    if (uploadingPhoto) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access to change your avatar.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setUploadingPhoto(true);

      // Resize/compress to keep upload light
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const res = await api.post<{ data: { user: any; avatar_url: string } }>('/users/me/avatar', {
        image_base64: base64,
        mime_type: 'image/jpeg',
      });

      const newUrl = res.data?.avatar_url ?? null;
      setAvatarUrl(newUrl);
      if (res.data?.user && setUser) {
        setUser({
          ...(user as any),
          ...res.data.user,
        });
      }
    } catch (e: any) {
      Alert.alert('Upload failed', e?.error?.message ?? 'Could not upload photo. Try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const body: Record<string, any> = {};
      if (fullName.trim() !== (user?.full_name ?? '')) body.full_name = fullName.trim();
      if (username.trim() && username.trim() !== user?.username) body.username = username.trim();
      if (bio !== (user?.bio ?? '')) body.bio = bio;

      if (Object.keys(body).length === 0) {
        router.back();
        return;
      }

      const res = await api.patch<{ data: any }>('/users/me', body);
      if (res.data && setUser) {
        setUser({ ...(user as any), ...res.data });
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.error?.message ?? 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Edit Profile" back />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar with edit affordance */}
          <View style={styles.avatarSection}>
            <Pressable
              onPress={handlePickPhoto}
              style={styles.avatarWrap}
              accessibilityLabel="Change profile photo"
            >
              <Avatar
                username={user?.full_name || user?.username || 'U'}
                avatarUrl={avatarUrl ?? undefined}
                size={80}
              />
              <View style={styles.cameraBtn}>
                {uploadingPhoto
                  ? <ActivityIndicator size="small" color={colors.textOnBrand} />
                  : <Icon icon={Camera} size={14} color={colors.textOnBrand} />
                }
              </View>
            </Pressable>
            <Pressable onPress={handlePickPhoto} disabled={uploadingPhoto} accessibilityLabel="Change photo">
              <Text variant="label" color="brand" style={{ marginTop: spacing.sm }}>
                {uploadingPhoto ? 'Uploading…' : 'Change Photo'}
              </Text>
            </Pressable>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              autoCapitalize="words"
              returnKeyType="next"
            />
            <View style={{ height: spacing.base }} />
            <Input
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <View style={{ height: spacing.base }} />
            <Input
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people a bit about yourself"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 72, paddingTop: spacing.md }}
            />
          </View>
        </ScrollView>

        {/* Sticky save button */}
        <View style={styles.footer}>
          <Button
            label="Save"
            onPress={handleSave}
            variant="primary"
            size="lg"
            loading={saving}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 48 },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.xl },
  avatarWrap: { position: 'relative' },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  form: { paddingHorizontal: spacing.base },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
