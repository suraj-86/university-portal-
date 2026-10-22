import React from 'react';
import { useAuth } from '@/context/AuthContext';
import WardScreen from '@/components/WardScreen';
import WardDashboard from '@/screens/WardDashboard';

export default function Home() {
  const { user } = useAuth();
  const first = (user?.full_name || user?.username || 'there').split(' ')[0];
  return (
    <WardScreen>
      {(t) => <WardDashboard key={t.studentUserId} studentUserId={t.studentUserId} base={t.base} parent={t.parent} subject={t.subject} greetingName={first} top={t.top} />}
    </WardScreen>
  );
}
