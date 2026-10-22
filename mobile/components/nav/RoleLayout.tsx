import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { InboxProvider } from '@/context/InboxContext';
import { NAV, Role } from '@/lib/nav';
import AppHeader from './AppHeader';
import AppTabBar from './AppTabBar';
import { WardProvider } from '@/context/WardContext';

export default function RoleLayout({ role }: { role: Role }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Redirect href="/" />;
  if (user.role !== role) return <Redirect href={`/${user.role}` as any} />;
  if (user.must_change_password) return <Redirect href="/change-password" />;

  const items = NAV[role];
  const titleOf = (name: string) => items.find((i) => i.name === name)?.title || 'BBAU';

  return (
    <InboxProvider>
      <WardProvider enabled={role === 'parent'}>
        <Tabs
          initialRouteName="index"
          tabBar={(props) => <AppTabBar {...props} items={items} />}
          screenOptions={{
            header: ({ route }) => <AppHeader title={titleOf(route.name)} base={`/${role}`} />,
          }}
        />
      </WardProvider>
    </InboxProvider>
  );
}
