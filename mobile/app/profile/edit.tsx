import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
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

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await api.patch('/users/me', {
        full_name: fullName.trim() || undefined,
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header
        title="Edit Profile"
        back
        right={
          <Button
            label="Save"
            onPress={handleSave}
            variant="primary"
            size="sm"
            loading={saving}
          />
        }
      />

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
            <View style={styles.avatarWrap}>
              <Avatar
                username={user?.full_name || user?.username || 'U'}
                avatarUrl={user?.avatar_url}
                size={80}
              />
              <Pressable style={styles.cameraBtn} accessibilityLabel="Change photo">
                <Icon icon={Camera} size={14} color={colors.textOnBrand} />
              </Pressable>
            </View>
            <Text variant="label" color="brand" style={{ marginTop: spacing.sm }}>Change Photo</Text>
            <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xxs }}>Photo editing coming soon</Text>
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
});
