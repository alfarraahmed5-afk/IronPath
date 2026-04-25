import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';

export default function RegisterScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [gymInfo, setGymInfo] = useState<{ gym_id: string; gym_name: string } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [step, setStep] = useState<'invite' | 'details'>('invite');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  async function validateInvite() {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter your invite code.');
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.get(`/gyms/validate-invite/${inviteCode.trim().toUpperCase()}`);
      setGymInfo(res.data);
      setStep('details');
    } catch {
      Alert.alert('Invalid Code', 'Invite code not found. Please check with your gym.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!email.trim() || !password || !username.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.post('/auth/register', {
        invite_code: inviteCode.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        password,
        username: username.trim(),
        full_name: fullName.trim() || undefined,
      });
      await login(res.data.user, res.data.access_token, res.data.refresh_token);
      router.replace('/(tabs)');
    } catch (err: any) {
      const fields = err?.error?.fields;
      if (fields?.length) {
        const msg = fields.map((f: any) => `${f.field}: ${f.message}`).join('\n');
        Alert.alert('Registration Failed', msg);
      } else {
        Alert.alert('Registration Failed', err?.error?.message || 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-6 justify-center">
          <TouchableOpacity onPress={() => router.back()} className="mb-6 self-start">
            <Text className="text-orange-400">← Back</Text>
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-white mb-2">Join IronPath</Text>

          {step === 'invite' ? (
            <>
              <Text className="text-gray-400 mb-8">Enter the invite code from your gym</Text>
              <Text className="text-gray-300 mb-1 text-sm">Invite Code</Text>
              <TextInput
                className="bg-gray-900 text-white px-4 py-3 rounded-xl mb-6 text-base tracking-widest"
                placeholder="Enter your invite code"
                placeholderTextColor="#6b7280"
                value={inviteCode}
                onChangeText={v => setInviteCode(v.toUpperCase())}
                autoCapitalize="characters"
                maxLength={10}
              />
              <TouchableOpacity
                className="bg-orange-500 py-4 rounded-xl items-center"
                onPress={validateInvite}
                disabled={loading}
              >
                <Text className="text-white font-semibold text-base">
                  {loading ? 'Checking...' : 'Continue'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-gray-400 mb-6">
                Joining <Text className="text-orange-400 font-semibold">{gymInfo?.gym_name}</Text>
              </Text>

              <Text className="text-gray-300 mb-1 text-sm">Full Name</Text>
              <TextInput className="bg-gray-900 text-white px-4 py-3 rounded-xl mb-4 text-base"
                placeholder="Your name" placeholderTextColor="#6b7280"
                value={fullName} onChangeText={setFullName} />

              <Text className="text-gray-300 mb-1 text-sm">Username *</Text>
              <TextInput className="bg-gray-900 text-white px-4 py-3 rounded-xl mb-4 text-base"
                placeholder="yourhandle" placeholderTextColor="#6b7280"
                value={username} onChangeText={v => setUsername(v.toLowerCase())}
                autoCapitalize="none" autoCorrect={false} />

              <Text className="text-gray-300 mb-1 text-sm">Email *</Text>
              <TextInput className="bg-gray-900 text-white px-4 py-3 rounded-xl mb-4 text-base"
                placeholder="your@email.com" placeholderTextColor="#6b7280"
                value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none" />

              <Text className="text-gray-300 mb-1 text-sm">Password *</Text>
              <TextInput className="bg-gray-900 text-white px-4 py-3 rounded-xl mb-6 text-base"
                placeholder="Min. 8 characters" placeholderTextColor="#6b7280"
                value={password} onChangeText={setPassword} secureTextEntry />

              <TouchableOpacity
                className="bg-orange-500 py-4 rounded-xl items-center"
                onPress={handleRegister} disabled={loading}
              >
                <Text className="text-white font-semibold text-base">
                  {loading ? 'Creating account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
