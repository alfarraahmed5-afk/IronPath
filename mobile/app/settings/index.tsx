import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useAuthStore(s => s.logout);

  return (
    <View className="flex-1 bg-gray-950">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-14 pb-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-white text-xl">←</Text>
        </TouchableOpacity>
        <Text className="text-white font-bold text-xl">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-gray-400 text-sm mb-4">
          More settings coming soon. For now, you can sign out below.
        </Text>

        <TouchableOpacity
          onPress={async () => {
            await logout();
            router.replace('/(auth)/login');
          }}
          className="bg-gray-900 py-4 rounded-xl items-center mt-4"
        >
          <Text className="text-red-400 font-semibold text-base">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
