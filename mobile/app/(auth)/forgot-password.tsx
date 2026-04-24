import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../src/lib/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch {
      setSent(true); // non-enumerable — always show success
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-black" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="flex-1 px-6 justify-center">
        <TouchableOpacity onPress={() => router.back()} className="mb-6 self-start">
          <Text className="text-orange-400">← Back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-white mb-2">Reset Password</Text>

        {sent ? (
          <View>
            <Text className="text-gray-300 text-base mb-6">
              If an account exists for that email, a reset link has been sent. Check your inbox.
            </Text>
            <TouchableOpacity onPress={() => router.back()} className="bg-orange-500 py-4 rounded-xl items-center">
              <Text className="text-white font-semibold">Back to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text className="text-gray-400 mb-8">Enter your email and we'll send a reset link.</Text>
            <Text className="text-gray-300 mb-1 text-sm">Email</Text>
            <TextInput
              className="bg-gray-900 text-white px-4 py-3 rounded-xl mb-6 text-base"
              placeholder="your@email.com" placeholderTextColor="#6b7280"
              value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none"
            />
            <TouchableOpacity
              className="bg-orange-500 py-4 rounded-xl items-center"
              onPress={handleSubmit} disabled={loading}
            >
              <Text className="text-white font-semibold">{loading ? 'Sending...' : 'Send Reset Link'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
