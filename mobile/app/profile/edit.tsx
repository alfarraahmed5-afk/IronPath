import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

// Minimal placeholder so the route resolves (was hitting Unmatched Route).
// Full edit form (avatar upload, username/bio fields, save handler) is part
// of Batch 4 / profile-management work.
export default function EditProfileScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-gray-950">
      <View className="flex-row items-center px-4 pt-14 pb-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-white text-xl">←</Text>
        </TouchableOpacity>
        <Text className="text-white font-bold text-xl">Edit Profile</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-10">
        <Text className="text-white text-base text-center font-semibold mb-2">
          Coming soon
        </Text>
        <Text className="text-gray-400 text-sm text-center">
          Profile editing will land in the next update.
        </Text>
      </ScrollView>
    </View>
  );
}
