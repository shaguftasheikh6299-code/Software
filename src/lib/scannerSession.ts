import { supabase } from '../lib/supabase';

const SESSION_ID_LENGTH = 8;
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateSessionId(): string {
  let id = '';
  for (let i = 0; i < SESSION_ID_LENGTH; i++) {
    id += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return id;
}

export async function createSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('scan_sessions')
    .insert({ id: sessionId, status: 'waiting' });
  if (error) {
    return false;
  }
  return true;
}

export async function connectSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('scan_sessions')
    .update({ status: 'connected', connected_at: new Date().toISOString() })
    .eq('id', sessionId);
  return !error;
}

export async function disconnectSession(sessionId: string): Promise<void> {
  await supabase
    .from('scan_sessions')
    .update({ status: 'disconnected' })
    .eq('id', sessionId);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await supabase.from('scan_sessions').delete().eq('id', sessionId);
}

export async function sendScanEvent(sessionId: string, code: string): Promise<boolean> {
  const { error } = await supabase
    .from('scan_events')
    .insert({ session_id: sessionId, code, received: false });
  return !error;
}

export async function markScanReceived(eventId: string): Promise<void> {
  await supabase.from('scan_events').update({ received: true }).eq('id', eventId);
}

export async function deleteSessionEvents(sessionId: string): Promise<void> {
  await supabase.from('scan_events').delete().eq('session_id', sessionId).eq('received', true);
}
