import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { initDB } from '../src/lib/db';

export default function RootLayout() {
  const { loadFromStorage } = useAuthStore();

  useEffect(() => {
    initDB();
    loadFromStorage();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
