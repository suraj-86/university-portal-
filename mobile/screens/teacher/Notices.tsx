import React, { useState } from 'react';
import { Gate, Screen, Segmented, useLoad } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ComposeTab, ReceivedTab, SentTab, type ClassRow, type FeedNotice, type SentNotice, type Target } from './teacherNoticeParts';

type Tab = 'received' | 'sent' | 'new';

// Teacher notices: the inbox feed, notices the teacher sent (with read counts), and a compose form.
export default function TeacherNotices() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('received');
  const feed = useLoad(['/notices/feed']);
  const sent = useLoad(['/notices/sent']);
  const compose = useLoad(user?.id ? [`/teacher/${user.id}/assigned-subjects`, '/notices/targets'] : null);

  const active = tab === 'received' ? feed : tab === 'sent' ? sent : compose;

  return (
    <Screen onRefresh={active.refresh} refreshing={active.refreshing}>
      <Segmented<Tab> options={[{ value: 'received', label: 'Received' }, { value: 'sent', label: 'Sent' }, { value: 'new', label: 'New' }]} value={tab} onChange={setTab} />
      {tab === 'received' ? (
        <Gate load={feed} cards={4}>{(d) => <ReceivedTab items={(d[0] as FeedNotice[]) || []} />}</Gate>
      ) : tab === 'sent' ? (
        <Gate load={sent} cards={3}>{(d) => <SentTab items={(d[0] as SentNotice[]) || []} onChanged={sent.reload} />}</Gate>
      ) : (
        <Gate load={compose} cards={2}>
          {(d) => (
            <ComposeTab
              classes={Array.isArray(d[0]) ? (d[0] as ClassRow[]) : []}
              targets={(d[1]?.students as Target[]) || []}
              onSent={() => { sent.reload(); setTab('sent'); }}
            />
          )}
        </Gate>
      )}
    </Screen>
  );
}
