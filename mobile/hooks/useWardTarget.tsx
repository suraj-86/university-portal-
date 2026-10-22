import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWards } from '@/context/WardContext';
import WardBar from '@/components/WardBar';

export type WardTarget = {
  parent: boolean;
  base: '/student' | '/parent';
  studentUserId: number;
  // 'You' for students, the child's first name for parents; use in sentences like "{subject} has no backlogs".
  subject: string;
  // Show this at the top of every page (the ward selector for parents).
  top: React.ReactNode;
};

// Student and parent pages are the same screens; this says whose records to load.
export default function useWardTarget(): { target: WardTarget | null; state: 'ready' | 'loading' | 'empty' | 'error'; message: string } {
  const { user } = useAuth();
  const { ward, wards, loading, error } = useWards();
  if (!user) return { target: null, state: 'loading', message: '' };
  if (user.role === 'parent') {
    if (loading) return { target: null, state: 'loading', message: '' };
    if (error) return { target: null, state: 'error', message: error };
    if (!ward || wards.length === 0) return { target: null, state: 'empty', message: 'No student is linked to your account yet. Please contact the university office.' };
    return { target: { parent: true, base: '/parent', studentUserId: ward.user_id, subject: ward.full_name.split(' ')[0], top: <WardBar /> }, state: 'ready', message: '' };
  }
  return { target: { parent: false, base: '/student', studentUserId: user.id, subject: 'You', top: null }, state: 'ready', message: '' };
}
