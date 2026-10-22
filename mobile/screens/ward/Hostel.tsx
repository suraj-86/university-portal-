import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import WardScreen from '@/components/WardScreen';
import { useAppTheme } from '@/context/ThemeContext';
import { Card, EmptyState, Gate, Row, Screen, T, useLoad } from '@/components/ui';

function Call({ value }: { value?: string | null }) {
  const { c } = useAppTheme();
  if (!value) return <Text style={{ color: c.faint, fontWeight: '700' }}>—</Text>;
  return (
    <Pressable onPress={() => Linking.openURL(`tel:${String(value).replace(/[^0-9+]/g, '')}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessibilityLabel={`Call ${value}`}>
      <Ionicons name="call-outline" size={15} color={c.primary} />
      <Text style={{ color: c.primary, fontWeight: '700' }}>{value}</Text>
    </Pressable>
  );
}

function HostelBody({ studentUserId, parent, subject, top }: { studentUserId: number; parent: boolean; subject: string; top: React.ReactNode }) {
  const { c } = useAppTheme();
  const load = useLoad([`/student/${studentUserId}/hostel`]);
  const val = (v: any) => <Text style={{ color: v ? c.text : c.faint, fontWeight: '700', flexShrink: 1, textAlign: 'right' }}>{v || '—'}</Text>;
  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      {top}
      <Gate load={load} cards={2}>
        {([d]) => {
          if (!d || !d.allotted) {
            return (
              <Card>
                <EmptyState text={`${parent ? `${subject} has` : 'You have'} no hostel allotted. If this looks wrong, please contact the hostel office.`} icon="business-outline" />
              </Card>
            );
          }
          return (
            <>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="business" size={22} color={c.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T v="label">Allotted hostel</T>
                    <T v="h2">{d.hostel}</T>
                  </View>
                </View>
              </Card>
              <Card>
                <T v="h2" style={{ marginBottom: 4 }}>Room details</T>
                <Row title="Block" right={val(d.block)} />
                <Row title="Room number" right={val(d.room)} />
                <Row title="Session" right={val(d.session)} />
                <Row title="Semester" right={val(d.semester)} />
                <Row last title="Allotted on" right={val(d.allottedOn)} />
              </Card>
              <Card>
                <T v="h2" style={{ marginBottom: 4 }}>Contacts</T>
                <Row title="Warden" right={val(d.warden?.name)} />
                <Row title="Warden contact" right={<Call value={d.warden?.contact} />} />
                <Row last title="Hostel contact" right={<Call value={d.hostelContact} />} />
              </Card>
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

export default function Hostel() {
  return <WardScreen>{(t) => <HostelBody key={t.studentUserId} studentUserId={t.studentUserId} parent={t.parent} subject={t.subject} top={t.top} />}</WardScreen>;
}
