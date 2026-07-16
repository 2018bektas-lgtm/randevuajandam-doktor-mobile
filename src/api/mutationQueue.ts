import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const QUEUE_KEY = 'ra.doctor.mutation.queue';

export type QueuedMutation = {
  id: string;
  method: 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: Record<string, unknown> | null;
  createdAt: string;
};

async function readRaw(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(QUEUE_KEY);
  }
  try {
    return await AsyncStorage.getItem(QUEUE_KEY);
  } catch {
    return null;
  }
}

async function writeRaw(value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(QUEUE_KEY, value);
    return;
  }
  try {
    await AsyncStorage.setItem(QUEUE_KEY, value);
  } catch {
    //
  }
}

export async function getMutationQueue(): Promise<QueuedMutation[]> {
  try {
    const raw = await readRaw();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function enqueueMutation(
  item: Omit<QueuedMutation, 'id' | 'createdAt'>,
): Promise<QueuedMutation> {
  const queue = await getMutationQueue();
  const entry: QueuedMutation = {
    ...item,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  queue.push(entry);
  // Cap queue size
  const next = queue.slice(-40);
  await writeRaw(JSON.stringify(next));
  return entry;
}

export async function setMutationQueue(queue: QueuedMutation[]): Promise<void> {
  await writeRaw(JSON.stringify(queue));
}

export async function clearMutationQueue(): Promise<void> {
  await writeRaw(JSON.stringify([]));
}
