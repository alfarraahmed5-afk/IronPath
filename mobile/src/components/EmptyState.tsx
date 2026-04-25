import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { colors, spacing } from '../theme/tokens';

type IllustrationName = 'workouts' | 'followers' | 'notifications' | 'exercises' | 'comments' | '404';

type Props = {
  illustration?: IllustrationName;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
};

function IllustrationPlaceholder({ name }: { name: IllustrationName }) {
  const iconMap: Record<IllustrationName, string> = {
    workouts:      '⟁',
    followers:     '⊕',
    notifications: '◎',
    exercises:     '⊗',
    comments:      '⊡',
    '404':         '⊘',
  };
  return (
    <View style={styles.iconCircle}>
      <Text variant="display3" color="textTertiary" style={{ textAlign: 'center' }}>
        {iconMap[name]}
      </Text>
    </View>
  );
}

export function EmptyState({ illustration, title, description, action }: Props) {
  return (
    <View style={styles.container}>
      {illustration && <IllustrationPlaceholder name={illustration} />}
      <Text variant="title2" color="textPrimary" style={styles.title}>{title}</Text>
      {description ? (
        <Text variant="body" color="textSecondary" style={styles.description}>{description}</Text>
      ) : null}
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="primary"
          size="md"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  action: {
    marginTop: spacing.sm,
  },
});
