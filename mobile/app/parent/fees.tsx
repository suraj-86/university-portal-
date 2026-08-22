import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import api from '../../services/api';
import { getItem } from '../../services/storage';
import { useAppTheme } from '../../context/ThemeContext';

type Ward = {
  student_id: string | number;
  user_id?: string | number;
  full_name: string;
  course_name?: string;
  semester?: string | number;
  roll_no?: string | number;
  roll_number?: string | number;
  enrollment_no?: string | number;
};

type FeeRecord = {
  id: number | string;
  fee_type?: string | null;
  semester?: number | string | null;
  total_fee?: number | string | null;
  paid_amount?: number | string | null;
  status?: string | null;
  due_date?: string | null;
};

type PaymentRecord = {
  id: number | string;
  transaction_reference?: string | null;
  amount_paid?: number | string | null;
  payment_date?: string | null;
  payment_method?: string | null;
  fee_type?: string | null;
};

type Colors = {
  background: string;
  card: string;
  cardSoft: string;
  text: string;
  muted: string;
  subtle: string;
  border: string;
  primary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
};

export default function ParentFees() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const [wardPickerOpen, setWardPickerOpen] = useState(false);
  const [loadingWard, setLoadingWard] = useState(true);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  const colors: Colors = {
    background: isDark ? '#050817' : '#F8FAFC',
    card: isDark ? '#101525' : '#FFFFFF',
    cardSoft: isDark ? '#151D31' : '#F8FAFC',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#66728B' : '#94A3B8',
    border: isDark ? '#202A42' : '#E2E8F0',
    primary: '#1764FF',
    primarySoft: isDark ? '#172554' : '#EFF6FF',
    success: '#18D7A0',
    successSoft: isDark ? '#052E2A' : '#ECFDF5',
    danger: '#EF4444',
    dangerSoft: isDark ? '#3B1111' : '#FEF2F2',
    warning: '#F59E0B',
    warningSoft: isDark ? '#3A2705' : '#FFFBEB',
  };

  const rollNumber = (ward: Ward | null) =>
    ward?.roll_no ?? ward?.roll_number ?? ward?.enrollment_no ?? null;

  const loadWardAndFinancials = useCallback(async () => {
    try {
      setError('');
      setLoadingWard(true);

      const rawUser = await getItem('authUser');

      if (!rawUser) {
        throw new Error('Your session could not be restored. Please sign in again.');
      }

      const parent = JSON.parse(rawUser);

      if (!parent?.id) {
        throw new Error('Parent account information is unavailable.');
      }

      const overviewUrl = selectedWardId
        ? `/parent/${parent.id}/wards-overview?student_id=${selectedWardId}`
        : `/parent/${parent.id}/wards-overview`;

      const overviewResponse = await api.get(overviewUrl);
      const overview = overviewResponse.data || {};

      const availableWards: Ward[] = Array.isArray(overview.allWards)
        ? overview.allWards
        : [];

      setWards(availableWards);

      if (!overview.childProfile) {
        setSelectedWard(null);
        setFees([]);
        setPayments([]);
        setError('No active students are linked to your parent account.');
        return;
      }

      const child: Ward = {
        ...overview.childProfile,
        student_id: overview.childProfile.student_id,
        user_id: overview.childProfile.user_id,
        full_name: overview.childProfile.full_name,
      };

      setSelectedWard(child);

      if (!selectedWardId) {
        setSelectedWardId(String(child.student_id));
      }

      if (!child.user_id) {
        throw new Error('The selected ward account information is unavailable.');
      }

      setLoadingFinancials(true);

      const childUserId = child.user_id;
      const [feesResponse, paymentsResponse] = await Promise.all([
        api.get(`/student/${childUserId}/fees`),
        api.get(`/student/${childUserId}/payments`),
      ]);

      setFees(Array.isArray(feesResponse.data) ? feesResponse.data : []);
      setPayments(Array.isArray(paymentsResponse.data) ? paymentsResponse.data : []);
    } catch (err: any) {
      console.error(
        'PARENT FEES ERROR:',
        err?.response?.data || err?.message || err
      );

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load fee information.'
      );
    } finally {
      setLoadingWard(false);
      setLoadingFinancials(false);
      setRefreshing(false);
    }
  }, [selectedWardId]);

  useFocusEffect(
    useCallback(() => {
      setLoadingWard(true);
      loadWardAndFinancials();
    }, [loadWardAndFinancials])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadWardAndFinancials();
  };

  const handleWardChange = (wardId: string) => {
    if (wardId === selectedWardId) {
      setWardPickerOpen(false);
      return;
    }

    setWardPickerOpen(false);
    setSelectedWardId(wardId);
    setSelectedWard(null);
    setFees([]);
    setPayments([]);
    setError('');
  };

  const money = (value: unknown) => {
    const amount = Number(value || 0);
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const overallTotal = useMemo(
    () => fees.reduce((sum, fee) => sum + Number(fee.total_fee || 0), 0),
    [fees]
  );

  const overallPaid = useMemo(
    () => fees.reduce((sum, fee) => sum + Number(fee.paid_amount || 0), 0),
    [fees]
  );

  const overallDue = Math.max(overallTotal - overallPaid, 0);

  const clearancePercentage =
    overallTotal > 0 ? Math.min(Math.round((overallPaid / overallTotal) * 100), 100) : 0;

  const pendingFees = useMemo(
    () =>
      fees.filter(
        fee =>
          String(fee.status || '').toLowerCase() !== 'paid' &&
          Math.max(Number(fee.total_fee || 0) - Number(fee.paid_amount || 0), 0) > 0
      ),
    [fees]
  );

  const semesterGroups = useMemo(() => {
    const groups: Record<string, FeeRecord[]> = {};

    fees.forEach(fee => {
      const semester = String(fee.semester || 'Other');
      if (!groups[semester]) groups[semester] = [];
      groups[semester].push(fee);
    });

    return Object.entries(groups).sort(([a], [b]) => {
      const aNum = Number(a);
      const bNum = Number(b);
      if (Number.isNaN(aNum) || Number.isNaN(bNum)) return a.localeCompare(b);
      return aNum - bNum;
    });
  }, [fees]);

  const arrayBufferToBase64 = (data: ArrayBuffer) => {
    const bytes = new Uint8Array(data);
    const chunkSize = 0x8000;
    let binary = '';

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  };

  const handleDownloadReceipt = async (payment: PaymentRecord) => {
    const paymentId = String(payment.id);
    if (downloadingReceiptId) return;

    try {
      setDownloadingReceiptId(paymentId);

      const response = await api.get(`/payments/${paymentId}/receipt`, {
        responseType: 'arraybuffer',
        headers: { Accept: 'application/pdf' },
      });

      if (!response.data) {
        throw new Error('The server returned an empty receipt.');
      }

      const base64 = arrayBufferToBase64(response.data);
      const reference = payment.transaction_reference || `payment-${paymentId}`;
      const safeReference = reference
        .replace(/[^a-z0-9_-]/gi, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);

      const fileUri = `${FileSystem.cacheDirectory}receipt-${safeReference}.pdf`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('Receipt could not be saved on this device.');
      }

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          'Receipt Saved',
          'The receipt PDF was generated, but sharing is not available on this device.'
        );
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Download / Share Receipt',
        UTI: 'com.adobe.pdf',
      });
    } catch (err: any) {
      console.error(
        'PARENT RECEIPT DOWNLOAD ERROR:',
        err?.response?.data || err?.message || err
      );

      Alert.alert(
        'Receipt Unavailable',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to download the receipt.'
      );
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  if (loadingWard && !selectedWard) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading fee information...</Text>
      </View>
    );
  }

  if (error && !selectedWard) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.errorIcon, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
          <Ionicons name="card-outline" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Fees unavailable</Text>
        <Text style={[styles.errorText, { color: colors.muted }]}>{error}</Text>
        <Pressable onPress={() => loadWardAndFinancials()} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (!selectedWard) return null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="arrow-back" size={21} color={colors.text} />
            </Pressable>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Fees & Payments</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>Monitor your ward's financial ledger</Text>
            </View>
          </View>
        </View>

        {/* WARD SELECTOR — same interaction as Dashboard / Attendance */}
        <View style={[styles.wardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.wardCardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="people-outline" size={19} color={colors.primary} />
            </View>
            <View style={styles.wardHeaderText}>
              <Text style={[styles.eyebrow, { color: colors.subtle }]}>SELECT WARD</Text>
              <Text style={[styles.wardName, { color: colors.text }]} numberOfLines={1}>{selectedWard.full_name}</Text>
              <Text style={[styles.wardMeta, { color: colors.muted }]} numberOfLines={1}>
                {selectedWard.course_name || 'Student'}
                {rollNumber(selectedWard) !== null ? ` • Roll No. ${rollNumber(selectedWard)}` : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => setWardPickerOpen(true)}
              style={[styles.changeWardButton, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}
            >
              <Ionicons name="chevron-down" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <Modal
          visible={wardPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setWardPickerOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setWardPickerOpen(false)} />
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Select Ward</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Choose the student you want to view</Text>
                </View>
                <Pressable
                  onPress={() => setWardPickerOpen(false)}
                  style={[styles.modalClose, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </Pressable>
              </View>

              {wards.map(ward => {
                const wardId = String(ward.student_id);
                const active = wardId === selectedWardId;

                return (
                  <Pressable
                    key={wardId}
                    onPress={() => handleWardChange(wardId)}
                    style={[
                      styles.wardOption,
                      {
                        backgroundColor: active ? colors.primarySoft : colors.cardSoft,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.wardOptionIcon, { backgroundColor: active ? colors.primary : colors.card }]}>
                      <Ionicons name="person-outline" size={18} color={active ? '#FFFFFF' : colors.muted} />
                    </View>
                    <View style={styles.wardOptionText}>
                      <Text style={[styles.wardOptionName, { color: colors.text }]} numberOfLines={1}>{ward.full_name}</Text>
                      <Text style={[styles.wardOptionMeta, { color: colors.muted }]} numberOfLines={1}>
                        {ward.course_name || 'Student'}
                        {rollNumber(ward) !== null ? ` • Roll No. ${rollNumber(ward)}` : ''}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Modal>

        {error && selectedWard && (
          <View style={[styles.errorCard, { backgroundColor: colors.dangerSoft, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={[styles.inlineError, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {/* SUMMARY */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="receipt-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>TOTAL FEES</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{money(overallTotal)}</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>PAID</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{money(overallPaid)}</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryIcon, { backgroundColor: overallDue > 0 ? colors.warningSoft : colors.successSoft }]}>
              <Ionicons name="wallet-outline" size={18} color={overallDue > 0 ? colors.warning : colors.success} />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>OUTSTANDING</Text>
            <Text style={[styles.summaryValue, { color: overallDue > 0 ? colors.warning : colors.success }]}>{money(overallDue)}</Text>
          </View>
        </View>

        {/* CLEARANCE */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.clearanceHeader}>
            <View>
              <Text style={[styles.cardLabel, { color: colors.muted }]}>FEE CLEARANCE</Text>
              <Text style={[styles.clearanceValue, { color: colors.text }]}>{clearancePercentage}%</Text>
              <Text style={[styles.clearanceHint, { color: colors.muted }]}>of total fees have been paid</Text>
            </View>
            <View style={[styles.clearanceIcon, { backgroundColor: clearancePercentage >= 100 ? colors.successSoft : colors.primarySoft }]}>
              <Ionicons
                name={clearancePercentage >= 100 ? 'checkmark-done-outline' : 'trending-up-outline'}
                size={25}
                color={clearancePercentage >= 100 ? colors.success : colors.primary}
              />
            </View>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.cardSoft }]}>
            <View style={[styles.progressFill, { width: `${clearancePercentage}%`, backgroundColor: clearancePercentage >= 100 ? colors.success : colors.primary }]} />
          </View>
          <View style={styles.progressFooter}>
            <Text style={[styles.progressText, { color: colors.muted }]}>{money(overallPaid)} paid</Text>
            <Text style={[styles.progressText, { color: colors.muted }]}>{money(overallDue)} remaining</Text>
          </View>
        </View>

        {/* PENDING FEES */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Outstanding Fees</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>Fees that still require clearance</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: pendingFees.length ? colors.warningSoft : colors.successSoft }]}>
            <Text style={[styles.countText, { color: pendingFees.length ? colors.warning : colors.success }]}>{pendingFees.length}</Text>
          </View>
        </View>

        {loadingFinancials ? (
          <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingCardText, { color: colors.muted }]}>Loading financial records...</Text>
          </View>
        ) : pendingFees.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="checkmark-done-outline" size={26} color={colors.success} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Outstanding Fees</Text>
            <Text style={[styles.emptyMessage, { color: colors.muted }]}>Your ward has no pending fee balance at the moment.</Text>
          </View>
        ) : (
          pendingFees.map(fee => {
            const total = Number(fee.total_fee || 0);
            const paid = Number(fee.paid_amount || 0);
            const due = Math.max(total - paid, 0);
            const status = String(fee.status || 'Pending');

            return (
              <View key={String(fee.id)} style={[styles.feeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.feeTopRow}>
                  <View style={[styles.feeIcon, { backgroundColor: colors.warningSoft }]}>
                    <Ionicons name="document-text-outline" size={20} color={colors.warning} />
                  </View>
                  <View style={styles.feeMain}>
                    <Text style={[styles.feeTitle, { color: colors.text }]}>{fee.fee_type || 'Fee'}</Text>
                    <Text style={[styles.feeMeta, { color: colors.muted }]}>Semester {fee.semester || '—'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: colors.dangerSoft }]}>
                    <Text style={[styles.statusText, { color: colors.danger }]}>{status}</Text>
                  </View>
                </View>

                <View style={[styles.feeDivider, { backgroundColor: colors.border }]} />

                <View style={styles.feeBottomRow}>
                  <View>
                    <Text style={[styles.smallLabel, { color: colors.subtle }]}>TOTAL / PAID</Text>
                    <Text style={[styles.feeAmount, { color: colors.text }]}>{money(total)} / {money(paid)}</Text>
                  </View>
                  <View style={styles.dueBlock}>
                    <Text style={[styles.smallLabel, { color: colors.subtle }]}>DUE</Text>
                    <Text style={[styles.dueAmount, { color: colors.danger }]}>{money(due)}</Text>
                  </View>
                </View>

                <View style={styles.dueDateRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.muted} />
                  <Text style={[styles.dueDateText, { color: colors.muted }]}>Due {formatDate(fee.due_date)}</Text>
                </View>
              </View>
            );
          })
        )}

        {/* FEE LEDGER */}
        <View style={styles.sectionHeaderLarge}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Fee Ledger</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>Complete fee history by semester</Text>
          </View>
        </View>

        {semesterGroups.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="receipt-outline" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Fee Records</Text>
            <Text style={[styles.emptyMessage, { color: colors.muted }]}>No fee records are available for this ward.</Text>
          </View>
        ) : (
          semesterGroups.map(([semester, semesterFees]) => {
            const semesterTotal = semesterFees.reduce((sum, fee) => sum + Number(fee.total_fee || 0), 0);
            const semesterPaid = semesterFees.reduce((sum, fee) => sum + Number(fee.paid_amount || 0), 0);
            const semesterDue = Math.max(semesterTotal - semesterPaid, 0);

            return (
              <View key={semester} style={[styles.ledgerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.ledgerHeader}>
                  <View style={[styles.ledgerIcon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="layers-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.ledgerHeaderText}>
                    <Text style={[styles.ledgerTitle, { color: colors.text }]}>Semester {semester}</Text>
                    <Text style={[styles.ledgerSubtitle, { color: colors.muted }]}>{semesterFees.length} fee record{semesterFees.length === 1 ? '' : 's'}</Text>
                  </View>
                  <Text style={[styles.ledgerDue, { color: semesterDue > 0 ? colors.warning : colors.success }]}>{money(semesterDue)}</Text>
                </View>

                <View style={[styles.ledgerStats, { borderTopColor: colors.border }]}>
                  <View style={styles.ledgerStat}>
                    <Text style={[styles.smallLabel, { color: colors.subtle }]}>TOTAL</Text>
                    <Text style={[styles.ledgerStatValue, { color: colors.text }]}>{money(semesterTotal)}</Text>
                  </View>
                  <View style={[styles.ledgerDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.ledgerStat}>
                    <Text style={[styles.smallLabel, { color: colors.subtle }]}>PAID</Text>
                    <Text style={[styles.ledgerStatValue, { color: colors.success }]}>{money(semesterPaid)}</Text>
                  </View>
                  <View style={[styles.ledgerDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.ledgerStat}>
                    <Text style={[styles.smallLabel, { color: colors.subtle }]}>DUE</Text>
                    <Text style={[styles.ledgerStatValue, { color: semesterDue > 0 ? colors.warning : colors.success }]}>{money(semesterDue)}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* PAYMENT HISTORY */}
        <View style={styles.sectionHeaderLarge}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment History</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>Recorded payments and downloadable receipts</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.successSoft }]}>
            <Text style={[styles.countText, { color: colors.success }]}>{payments.length}</Text>
          </View>
        </View>

        {payments.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="card-outline" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Payments Yet</Text>
            <Text style={[styles.emptyMessage, { color: colors.muted }]}>No payment transactions have been recorded for this ward.</Text>
          </View>
        ) : (
          payments.map(payment => {
            const paymentId = String(payment.id);
            const downloading = downloadingReceiptId === paymentId;

            return (
              <View key={paymentId} style={[styles.paymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.paymentIcon, { backgroundColor: colors.successSoft }]}>
                  <Ionicons name="checkmark-circle-outline" size={21} color={colors.success} />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={[styles.transactionReference, { color: colors.text }]} numberOfLines={1}>
                    {payment.transaction_reference || `Payment #${paymentId}`}
                  </Text>
                  <Text style={[styles.paymentMeta, { color: colors.muted }]}>
                    {formatDate(payment.payment_date)} • {payment.payment_method || 'Payment'}
                  </Text>
                  {payment.fee_type ? (
                    <Text style={[styles.paymentFeeType, { color: colors.muted }]} numberOfLines={1}>
                      {payment.fee_type}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.paymentAction}>
                  <Text style={[styles.paymentAmount, { color: colors.success }]}>{money(payment.amount_paid)}</Text>
                  <Pressable
                    onPress={() => handleDownloadReceipt(payment)}
                    disabled={!!downloadingReceiptId}
                    style={[styles.receiptButton, { borderColor: colors.border, backgroundColor: colors.cardSoft, opacity: downloadingReceiptId && !downloading ? 0.5 : 1 }]}
                  >
                    {downloading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="download-outline" size={13} color={colors.primary} />
                    )}
                    <Text style={[styles.receiptButtonText, { color: colors.primary }]}>{downloading ? 'Saving' : 'Receipt'}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText: { marginTop: 12, fontSize: 12, fontWeight: '700' },
  loadingCard: { minHeight: 72, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginBottom: 10 },
  loadingCardText: { fontSize: 11, fontWeight: '700' },
  header: { marginBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  wardCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  wardCardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  wardHeaderText: { flex: 1, marginLeft: 11, marginRight: 8 },
  eyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  wardName: { fontSize: 14, fontWeight: '900', marginTop: 3 },
  wardMeta: { fontSize: 9, fontWeight: '600', marginTop: 3 },
  changeWardButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 18, paddingBottom: 28, maxHeight: '82%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { fontSize: 19, fontWeight: '900' },
  modalSubtitle: { fontSize: 11, marginTop: 3, fontWeight: '500' },
  modalClose: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  wardOption: { minHeight: 68, borderRadius: 15, borderWidth: 1, paddingHorizontal: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  wardOptionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  wardOptionText: { flex: 1, marginLeft: 10, marginRight: 8 },
  wardOptionName: { fontSize: 12, fontWeight: '900' },
  wardOptionMeta: { fontSize: 9, fontWeight: '600', marginTop: 4 },
  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  summaryCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 11, minHeight: 126 },
  summaryIcon: { width: 35, height: 35, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  summaryValue: { fontSize: 16, fontWeight: '900', marginTop: 5 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12 },
  clearanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  clearanceValue: { fontSize: 30, fontWeight: '900', marginTop: 4 },
  clearanceHint: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  clearanceIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 8, borderRadius: 20, overflow: 'hidden', marginTop: 16 },
  progressFill: { height: '100%', borderRadius: 20 },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressText: { fontSize: 10, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 7, marginBottom: 10 },
  sectionHeaderLarge: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '900' },
  sectionSubtitle: { fontSize: 9, fontWeight: '600', marginTop: 3 },
  countBadge: { minWidth: 28, height: 28, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 10, fontWeight: '900' },
  feeCard: { borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 10 },
  feeTopRow: { flexDirection: 'row', alignItems: 'center' },
  feeIcon: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  feeMain: { flex: 1, marginLeft: 11, marginRight: 8 },
  feeTitle: { fontSize: 13, fontWeight: '900' },
  feeMeta: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  feeDivider: { height: 1, marginVertical: 13 },
  feeBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  smallLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  feeAmount: { fontSize: 12, fontWeight: '800', marginTop: 3 },
  dueBlock: { alignItems: 'flex-end' },
  dueAmount: { fontSize: 15, fontWeight: '900', marginTop: 3 },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 11, gap: 5 },
  dueDateText: { fontSize: 10, fontWeight: '600' },
  ledgerCard: { borderWidth: 1, borderRadius: 18, marginBottom: 10, overflow: 'hidden' },
  ledgerHeader: { padding: 15, flexDirection: 'row', alignItems: 'center' },
  ledgerIcon: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  ledgerHeaderText: { flex: 1, marginLeft: 11 },
  ledgerTitle: { fontSize: 14, fontWeight: '900' },
  ledgerSubtitle: { fontSize: 10, marginTop: 3, fontWeight: '600' },
  ledgerDue: { fontSize: 12, fontWeight: '900' },
  ledgerStats: { borderTopWidth: 1, flexDirection: 'row', paddingVertical: 13 },
  ledgerStat: { flex: 1, alignItems: 'center' },
  ledgerDivider: { width: 1, height: 28, alignSelf: 'center' },
  ledgerStatValue: { fontSize: 12, fontWeight: '900', marginTop: 4 },
  paymentCard: { borderWidth: 1, borderRadius: 16, padding: 13, marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  paymentIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  paymentInfo: { flex: 1, marginLeft: 11, marginRight: 8 },
  transactionReference: { fontSize: 12, fontWeight: '900' },
  paymentMeta: { fontSize: 9, fontWeight: '600', marginTop: 4 },
  paymentFeeType: { fontSize: 9, fontWeight: '600', marginTop: 2 },
  paymentAction: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 82 },
  paymentAmount: { fontSize: 13, fontWeight: '900' },
  receiptButton: { minHeight: 32, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 7 },
  receiptButtonText: { fontSize: 9, fontWeight: '900' },
  emptyCard: { borderWidth: 1, borderRadius: 18, padding: 28, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '900', marginTop: 12 },
  emptyMessage: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5, maxWidth: 280 },
  errorIcon: { width: 58, height: 58, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 16, fontWeight: '900', marginTop: 14 },
  errorText: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6, maxWidth: 310 },
  retryButton: { minHeight: 44, paddingHorizontal: 22, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  retryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  errorCard: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  inlineError: { flex: 1, fontSize: 10, lineHeight: 16, fontWeight: '700', marginLeft: 8 },
  bottomSpace: { height: 20 },
});