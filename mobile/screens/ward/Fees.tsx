import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import WardScreen from '@/components/WardScreen';
import { useAppTheme } from '@/context/ThemeContext';
import { Badge, Button, Card, EmptyState, Field, Gate, LinkText, ProgressBar, Row, Screen, Segmented, SelectField, Sheet, T, useLoad } from '@/components/ui';
import { dateLabel, money } from '@/lib/format';
import { downloadAndShare } from '@/lib/download';
import api, { errorMessage } from '@/services/api';

type Fee = { id: number; fee_type: string; semester: number | string; due_date: string; total_fee: number | string; paid_amount: number | string; status: string };
type Payment = { id: number; transaction_reference?: string; payment_date: string; payment_method?: string; amount_paid: number | string; fee_type?: string };

const METHODS = [
  { value: 'Online', label: 'Online' },
  { value: 'Bank Transfer', label: 'Bank' },
  { value: 'Cash', label: 'Cash' },
];

function FeesBody({ studentUserId, parent, subject, top }: { studentUserId: number; parent: boolean; subject: string; top: React.ReactNode }) {
  const { c } = useAppTheme();
  const load = useLoad([`/student/${studentUserId}/fees`, `/student/${studentUserId}/payments`]);
  const [payOpen, setPayOpen] = useState(false);
  const [feeId, setFeeId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Online');
  const [busy, setBusy] = useState(false);

  const closePay = () => { setPayOpen(false); setFeeId(''); setAmount(''); setMethod('Online'); };

  const submitPayment = async () => {
    const value = parseFloat(amount);
    if (!feeId || !value || value <= 0) { Alert.alert('Payment', 'Choose a fee and enter a valid amount.'); return; }
    setBusy(true);
    try {
      await api.post('/payments', { fee_id: parseInt(feeId, 10), amount_paid: value, payment_method: method, transaction_reference: `TXN-${Date.now()}` });
      closePay();
      Alert.alert('Payment recorded', `Paid ${money(value)} via ${method}.`);
      load.reload();
    } catch (e) {
      Alert.alert('Payment failed', errorMessage(e, 'The payment could not be processed.'));
    } finally { setBusy(false); }
  };

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      {top}
      <Gate load={load} cards={3}>
        {([feesRaw, paymentsRaw]) => {
          const fees: Fee[] = Array.isArray(feesRaw) ? feesRaw : [];
          const payments: Payment[] = Array.isArray(paymentsRaw) ? paymentsRaw : [];
          const total = fees.reduce((s, f) => s + Number(f.total_fee), 0);
          const paid = fees.reduce((s, f) => s + Number(f.paid_amount), 0);
          const due = Math.max(0, total - paid);
          const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
          const pending = fees.filter((f) => f.status !== 'Paid');
          const tone = (s: string) => (s === 'Paid' ? 'success' : s === 'Partial' ? 'warn' : 'danger');

          return (
            <>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <T v="h2">{parent ? `${subject}'s fees` : 'Your fees'}</T>
                  <Badge label={due > 0 ? 'Dues pending' : 'All cleared'} tone={due > 0 ? 'danger' : 'success'} />
                </View>
                <T v="small" style={{ marginTop: 10 }}>Outstanding</T>
                <Text style={{ color: due > 0 ? c.danger : c.success, fontSize: 28, fontWeight: '700' }}>{money(due)}</Text>
                <View style={{ height: 10 }} />
                <ProgressBar value={pct} tone="success" />
                <T v="small" style={{ marginTop: 6 }}>{money(paid)} paid of {money(total)} · {pct}% cleared</T>
                {!parent && pending.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <Button label="Pay dues" icon="card-outline" onPress={() => setPayOpen(true)} />
                  </View>
                )}
              </Card>

              <Card pad={false}>
                <View style={{ padding: 16, paddingBottom: 6 }}><T v="h2">Fee statement</T></View>
                {fees.length === 0 ? <EmptyState text="No fees have been billed yet." icon="wallet-outline" /> : fees.map((f, i) => (
                  <View key={f.id} style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: c.text, fontWeight: '700', fontSize: 14, flex: 1 }}>{f.fee_type} <Text style={{ color: c.muted, fontWeight: '600', fontSize: 12 }}>(Sem {f.semester})</Text></Text>
                      <Badge label={f.status} tone={tone(f.status)} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <T v="small">Due {dateLabel(f.due_date)}</T>
                      <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }}>{money(f.total_fee)} / <Text style={{ color: c.success }}>{money(f.paid_amount)}</Text></Text>
                    </View>
                    {i === fees.length - 1 ? null : null}
                  </View>
                ))}
              </Card>

              <Card pad={false}>
                <View style={{ padding: 16, paddingBottom: 6 }}><T v="h2">Payment history</T></View>
                {payments.length === 0 ? <EmptyState text="No payments recorded yet." icon="receipt-outline" /> : (
                  <View style={{ paddingHorizontal: 16 }}>
                    {payments.map((p, i) => (
                      <Row key={p.id} last={i === payments.length - 1}
                        title={`${money(p.amount_paid)} · ${p.fee_type || 'Fee'}`}
                        subtitle={[dateLabel(p.payment_date), p.payment_method, p.transaction_reference].filter(Boolean).join(' · ')}
                        right={(
                          <Pressable onPress={() => downloadAndShare(`/payments/${p.id}/receipt`, `payment-receipt-${p.id}.pdf`)} accessibilityLabel="Download receipt"
                            style={{ padding: 8, borderRadius: 10, backgroundColor: c.primarySoft }}>
                            <Ionicons name="download-outline" size={18} color={c.primary} />
                          </Pressable>
                        )} />
                    ))}
                  </View>
                )}
              </Card>

              <Sheet visible={payOpen} title="Pay dues" onClose={closePay}>
                <SelectField label="Fee" value={feeId || null} placeholder="Choose a pending fee"
                  options={pending.map((f) => ({ value: String(f.id), label: `${f.fee_type} (${money(Number(f.total_fee) - Number(f.paid_amount))})` }))}
                  onChange={(v) => {
                    setFeeId(String(v));
                    const f = pending.find((x) => String(x.id) === String(v));
                    setAmount(f ? String(Number(f.total_fee) - Number(f.paid_amount)) : '');
                  }} />
                <Field label="Amount (₹)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" />
                <View style={{ gap: 6 }}>
                  <T v="label">Payment method</T>
                  <Segmented options={METHODS} value={method} onChange={setMethod} />
                </View>
                <Button label={`Pay ${amount ? money(amount) : ''}`.trim()} onPress={submitPayment} loading={busy} disabled={!feeId || !amount} />
                <LinkText label="Cancel" onPress={closePay} />
              </Sheet>
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

export default function Fees() {
  return <WardScreen>{(t) => <FeesBody key={t.studentUserId} studentUserId={t.studentUserId} parent={t.parent} subject={t.subject} top={t.top} />}</WardScreen>;
}
