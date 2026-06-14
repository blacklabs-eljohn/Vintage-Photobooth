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
