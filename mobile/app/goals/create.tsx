/**
 * /goals/create -- thin route wrapper around features/goals/GoalCreate.
 *
 * The component itself takes onCreated + onCancel callbacks; this
 * screen wires them to expo-router so the form can sit inside its own
 * route (deep-link friendly, back-stack friendly, modal-presentable).
 */
import React from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable } from '../../src/design-system/primitives/Pressable';
import { Icon } from '../../src/components/Icon';
import { Text } from '../../src/components/Text';
import { GoalCreate } from '../../src/features/goals/GoalCreate';
import { colors, spacing } from '../../src/theme/tokens';

export default function CreateGoalScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false, title: 'New goal' }} />
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          style={styles.backBtn}
        >
          <Icon icon={ChevronLeft} size={22} color={colors.textPrimary} />
        </Pressable>
        <Text variant="title3" color="textPrimary">New goal</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <GoalCreate
          onCreated={() => router.back()}
          onCancel={() => router.back()}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
