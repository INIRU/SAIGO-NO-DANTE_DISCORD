import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export const supabase = createClient(config.supabase.url, config.supabase.anonKey);

/** limbus 스키마 쿼리 헬퍼 */
export function limbus() {
  return supabase.schema('limbus');
}
