import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, radii } from '../theme/tokens';

const PALETTE = [
  '#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B',
  '#06B6D4', '#EC4899', '#10B981',
];

function hashUsername(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

type Props = {
  username: string;
  avatarUrl?: string | null;
  size?: 24 | 32 | 40 | 56 | 80;
};

export function Avatar({ username, avatarUrl, size = 40 }: Props) {
  const bgColor = PALETTE[hashUsername(username) % PALETTE.length];
  const initial = username.charAt(0).toUpperCase();
  const fontSize = size <= 32 ? 12 : size <= 40 ? 16 : size <= 56 ? 20 : 28;

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: radii.full }}
        contentFit="cover"
        cachePolicy="memory-disk"
        placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1Ex@@or[Q6.' }}
        transition={200}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radii.full, backgroundColor: bgColor }]}>
      <Text style={[styles.initial, { fontSize, color: '#fff' }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: 'Barlow_700Bold',
    fontWeight: '700',
  },
});
