import { limbus } from './supabase.js';

export async function getAllSinners() {
  const { data, error } = await limbus()
    .from('sinners')
    .select('*')
    .order('order_num');

  if (error) throw error;
  return data;
}

export async function getSinnerById(sinnerId: string) {
  const { data, error } = await limbus()
    .from('sinners')
    .select('*')
    .eq('id', sinnerId)
    .single();

  if (error) throw error;
  return data;
}
