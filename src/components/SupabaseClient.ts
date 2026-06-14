import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lehtulataezgrwczdvdz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hRFmzJ31Uz3E0pjtonfAGg_SLiXB8Nb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Fetches the current moments count. If an error occurs, it falls back
 * to a baseline estimate (12,842).
 */
export async function fetchMomentsCount(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('moments_counter')
      .select('count')
      .eq('id', 'total_moments')
      .single();

    if (error) {
      console.warn('Error fetching moments count from Supabase:', error.message);
      return 12842;
    }
    return data?.count ?? 12842;
  } catch (err) {
    console.warn('Failed to fetch moments count from Supabase:', err);
    return 12842;
  }
}

/**
 * Calls the database RPC function to atomically increment the counter.
 */
export async function incrementMomentsCount(): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_moments_counter', {
      row_id: 'total_moments',
    });
    if (error) {
      console.warn('Error incrementing moments count in Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Failed to increment moments count in Supabase:', err);
  }
}

/**
 * Subscribes to realtime updates of the moments_counter table.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToMomentsChanges(onUpdate: (count: number) => void): () => void {
  const channel = supabase
    .channel('moments-realtime')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'moments_counter',
        filter: 'id=eq.total_moments',
      },
      (payload) => {
        if (payload.new && typeof payload.new.count === 'number') {
          onUpdate(payload.new.count);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Uploads a duet photo frame (as a base64 compressed JPEG data URL) to the database.
 */
export async function uploadDuetFrame(
  roomId: string,
  role: 'host' | 'partner',
  frameIndex: number,
  imageData: string
): Promise<void> {
  try {
    const { error } = await supabase.from('duet_frames').insert({
      room_id: roomId,
      user_id: role,
      frame_index: frameIndex,
      image_data: imageData,
    });
    if (error) {
      console.warn('Error uploading duet frame to Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Failed to upload duet frame to Supabase:', err);
  }
}

/**
 * Retrieves all frames uploaded for a specific duet room.
 */
export async function fetchDuetFrames(roomId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('duet_frames')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Error fetching duet frames from Supabase:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Failed to fetch duet frames from Supabase:', err);
    return [];
  }
}

/**
 * Subscribes to real-time additions of frames and monitors user presence (join/leave events).
 */
export function subscribeToDuetRoom(
  roomId: string,
  role: 'host' | 'partner',
  onNewFrame: (frame: any) => void,
  onPresenceSync: (presenceState: any) => void,
  broadcastHandlers: { [event: string]: (payload: any) => void }
) {
  // Subscribe to real-time insertions on the duet_frames table
  const dbChannel = supabase
    .channel(`duet-db-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'duet_frames',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewFrame(payload.new);
        }
      }
    )
    .subscribe();

  // Create presence channel to track online statuses
  const presenceChannel = supabase.channel(`duet-presence-${roomId}`);

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      onPresenceSync(state);
    });

  // Attach broadcast handlers
  for (const [event, handler] of Object.entries(broadcastHandlers)) {
    presenceChannel.on('broadcast', { event }, (payload) => {
      handler(payload);
    });
  }

  // Subscribe and track presence
  presenceChannel.subscribe(async (status: string) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({
        role,
        online: true,
      });
    }
  });

  return {
    dbChannel,
    presenceChannel,
    unsubscribe: () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(presenceChannel);
    },
  };
}
