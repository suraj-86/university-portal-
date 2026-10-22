import React, { ReactNode } from 'react';
import useWardTarget, { WardTarget } from '@/hooks/useWardTarget';
import { EmptyState, ErrorState, LoadingBlock, Screen } from '@/components/ui';

// Wrap a student/parent page: it waits for the parent's children to load and then calls children(target).
export default function WardScreen({ children }: { children: (t: WardTarget) => ReactNode }) {
  const { target, state, message } = useWardTarget();
  if (state === 'ready' && target) return <>{children(target)}</>;
  return (
    <Screen>
      {state === 'loading' ? <LoadingBlock cards={2} /> : state === 'error' ? <ErrorState message={message} /> : <EmptyState text={message} icon="people-outline" />}
    </Screen>
  );
}
