import { View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Compass } from 'lucide-react-native';
import { Text } from '../src/components/Text';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { colors, spacing } from '../src/theme/tokens';

// Overrides expo-router's default unmatched-route screen, which would expose a
// "Sitemap" link that lists every .tsx file in the app folder. That sitemap
// is dev-only — clicking entries from production routes users into raw screens
// (including resurrecting old workout drafts via stale draft loaders).
export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Not found' }} />
      <View style={styles.root}>
        <Icon icon={Compass} size={64} color={colors.textTertiary} strokeWidth={1.5} />
        <Text variant="title2" color="textPrimary" style={styles.title}>Off the path</Text>
        <Text variant="body" color="textSecondary" style={styles.body}>
          We couldn't find that page.
        </Text>
        <View style={{ height: spacing.xl }} />
        <Button label="Go home" onPress={() => router.replace('/(tabs)')} variant="primary" size="md" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: { marginTop: spacing.lg, textAlign: 'center' },
  body: { marginTop: spacing.sm, textAlign: 'center' },
});
