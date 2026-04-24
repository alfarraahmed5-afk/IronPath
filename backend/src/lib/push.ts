import Expo, { ExpoPushMessage } from 'expo-server-sdk';
import { supabase } from './supabase';
import { logger } from './logger';

const expo = new Expo();

export async function sendPushNotifications(messages: ExpoPushMessage[]): Promise<void> {
  if (!messages.length) return;
  const valid = messages.filter(m => Expo.isExpoPushToken(m.to as string));
  if (!valid.length) return;

  const chunks = expo.chunkPushNotifications(valid);
  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i];
        if (receipt.status === 'error') {
          logger.error({ details: receipt.details }, 'Push send error');
          if (receipt.details?.error === 'DeviceNotRegistered') {
            const token = (chunk[i] as ExpoPushMessage).to as string;
            await supabase.from('user_push_tokens').delete().eq('token', token);
          }
        }
      }
    } catch (err) {
      logger.error({ err }, 'Push chunk send failed');
    }
  }
}

export async function sendPushToUser(
  userId: string,
  message: Omit<ExpoPushMessage, 'to'>
): Promise<void> {
  const { data: tokens } = await supabase
    .from('user_push_tokens')
    .select('token')
    .eq('user_id', userId);
  if (!tokens?.length) return;

  const messages: ExpoPushMessage[] = tokens
    .filter(t => Expo.isExpoPushToken(t.token))
    .map(t => ({ to: t.token, ...message }));

  await sendPushNotifications(messages);
}
