import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

// Overrides expo-router's default unmatched-route screen, which exposes a
// "Sitemap" link that lists every .tsx file in the app folder. That sitemap
// is meant for development only — clicking entries from production routes
// users into raw screens (including resurrecting old workout drafts).
export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-gray-950 items-center justify-center px-6">
      <Text className="text-white text-3xl mb-3">🤔</Text>
      <Text className="text-white font-bold text-lg mb-1">Page not found</Text>
      <Text className="text-gray-400 text-sm text-center mb-6">
        We couldn't find what you were looking for.
      </Text>
      <TouchableOpacity
        onPress={() => router.replace('/(tabs)')}
        className="bg-orange-500 px-6 py-3 rounded-full"
      >
        <Text className="text-white font-semibold">Go home</Text>
      </TouchableOpacity>
    </View>
  );
}
