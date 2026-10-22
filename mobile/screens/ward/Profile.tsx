import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Text } from '@/components/AppText';
import WardScreen from '@/components/WardScreen';
import { useAppTheme } from '@/context/ThemeContext';
import { Button, Card, Field, Gate, Notice, Row, Screen, SelectField, Sheet, T, useLoad } from '@/components/ui';
import api, { errorMessage } from '@/services/api';

const EMPTY = new Set(['', 'n/a', 'not available', 'not available in db', 'null', 'undefined']);
const clean = (v: any) => {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return EMPTY.has(s.toLowerCase()) ? '' : s;
};
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PHONE = /^[0-9+\-\s]{7,15}$/;

function ProfileBody({ studentUserId, parent, subject, top }: { studentUserId: number; parent: boolean; subject: string; top: React.ReactNode }) {
  const { c } = useAppTheme();
  const load = useLoad([`/student/${studentUserId}/profile`]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const val = (v: string) => <Text style={{ color: v ? c.text : c.faint, fontWeight: '700', flexShrink: 1, textAlign: 'right' }}>{v || 'Not provided'}</Text>;

  const save = async () => {
    if (!PHONE.test((form.contact || '').trim())) { setError('Enter a valid contact number (digits only, 7 to 15 characters).'); return; }
    if (form.emergency_contact && !PHONE.test(form.emergency_contact.trim())) { setError('Enter a valid emergency contact number.'); return; }
    if (form.pin_code && !/^\d{6}$/.test(form.pin_code.trim())) { setError('PIN code must be 6 digits.'); return; }
    setBusy(true); setError('');
    try {
      await api.put(`/student/${studentUserId}/profile`, Object.fromEntries(Object.entries(form).map(([k, v]) => [k, (v || '').trim()])));
      setOpen(false);
      Alert.alert('Saved', 'Your details were updated.');
      load.reload();
    } catch (e) {
      setError(errorMessage(e, 'Could not save your changes.'));
    } finally { setBusy(false); }
  };

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      {top}
      <Gate load={load} cards={3}>
        {([data]) => {
          const { personal = {}, academic = {}, guardians = {} } = data || {};
          const address = [clean(personal.address), clean(personal.city), clean(personal.state)].filter(Boolean).join(', ') + (clean(personal.pin_code) ? ` - ${clean(personal.pin_code)}` : '');
          const initial = String(personal.name || '?').trim().charAt(0).toUpperCase();
          const openEdit = () => {
            setForm({
              contact: clean(personal.contact), blood_group: clean(personal.blood_group), address: clean(personal.address), city: clean(personal.city),
              state: clean(personal.state), pin_code: clean(personal.pin_code), father_name: clean(guardians.father_name),
              guardian_relation: clean(guardians.guardian_relation), emergency_contact: clean(guardians.emergency_contact),
            });
            setError(''); setOpen(true);
          };
          return (
            <>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '700' }}>{initial}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T v="h2" numberOfLines={2}>{personal.name}</T>
                    <T v="small">{[academic.course, academic.semester].filter(Boolean).join(' · ')}</T>
                  </View>
                </View>
                <View style={{ marginTop: 10 }}>
                  <Row title="Roll no." right={val(clean(academic.roll_no))} />
                  <Row last title="Enrollment no." right={val(clean(academic.enrollment_no))} />
                </View>
              </Card>

              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <T v="h2">Contact and personal</T>
                  {!parent && <Button label="Edit" variant="soft" icon="create-outline" onPress={openEdit} />}
                </View>
                <Row title="Email" right={val(clean(personal.email))} />
                <Row title="Phone" right={val(clean(personal.contact))} />
                <Row title="Date of birth" right={val(clean(personal.dob))} />
                <Row title="Blood group" right={val(clean(personal.blood_group))} />
                <Row last title="Address" right={val(address)} />
              </Card>

              <Card>
                <T v="h2" style={{ marginBottom: 4 }}>Guardian</T>
                <Row title="Guardian's name" right={val(clean(guardians.father_name))} />
                <Row title="Relation" right={val(clean(guardians.guardian_relation))} />
                <Row last title="Emergency contact" right={<Text style={{ color: clean(guardians.emergency_contact) ? c.danger : c.faint, fontWeight: '700' }}>{clean(guardians.emergency_contact) || 'Not provided'}</Text>} />
              </Card>
              {parent ? <T v="small" style={{ textAlign: 'center' }}>Details on record for {subject}.</T> : null}

              <Sheet visible={open} title="Edit your details" onClose={() => setOpen(false)}>
                {error ? <Notice tone="danger">{error}</Notice> : null}
                <Field label="Contact number" value={form.contact || ''} onChangeText={set('contact')} keyboardType="phone-pad" />
                <SelectField label="Blood group" value={form.blood_group || null} placeholder="Not provided" options={[{ value: '', label: 'Not provided' }, ...BLOOD.map((b) => ({ value: b, label: b }))]} onChange={set('blood_group')} />
                <Field label="Address" value={form.address || ''} onChangeText={set('address')} />
                <Field label="City" value={form.city || ''} onChangeText={set('city')} />
                <Field label="State" value={form.state || ''} onChangeText={set('state')} />
                <Field label="PIN code" value={form.pin_code || ''} onChangeText={set('pin_code')} keyboardType="number-pad" maxLength={6} />
                <Field label="Guardian's name" value={form.father_name || ''} onChangeText={set('father_name')} />
                <Field label="Guardian relation" value={form.guardian_relation || ''} onChangeText={set('guardian_relation')} />
                <Field label="Emergency contact" value={form.emergency_contact || ''} onChangeText={set('emergency_contact')} keyboardType="phone-pad" />
                <Button label="Save changes" onPress={save} loading={busy} />
              </Sheet>
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

export default function Profile() {
  return <WardScreen>{(t) => <ProfileBody key={t.studentUserId} studentUserId={t.studentUserId} parent={t.parent} subject={t.subject} top={t.top} />}</WardScreen>;
}
