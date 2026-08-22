import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import api from '../../services/api';
import { getItem } from '../../services/storage';
import { useAppTheme } from '../../context/ThemeContext';

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

export default function StudentFees() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [paymentModalVisible, setPaymentModalVisible] =
    useState(false);

  const [selectedFeeId, setSelectedFeeId] =
    useState<string>('');

  const [paymentMethod, setPaymentMethod] =
    useState<'Online' | 'Bank Transfer' | 'Cash'>('Online');

  const [paymentStep, setPaymentStep] = useState(1);
  const [processingPayment, setProcessingPayment] =
    useState(false);

  const [downloadingReceiptId, setDownloadingReceiptId] =
    useState<string | null>(null);

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

  const loadFees = useCallback(async () => {
    try {
      setError('');

      const rawUser = await getItem('authUser');

      if (!rawUser) {
        throw new Error(
          'Your session could not be restored. Please sign in again.'
        );
      }

      const user = JSON.parse(rawUser);
      const userId = user?.id;

      if (!userId) {
        throw new Error(
          'Student account information is unavailable.'
        );
      }

      const [feesResponse, paymentsResponse] =
        await Promise.all([
          api.get(`/student/${userId}/fees`),
          api.get(`/student/${userId}/payments`),
        ]);

      setFees(
        Array.isArray(feesResponse.data)
          ? feesResponse.data
          : []
      );

      setPayments(
        Array.isArray(paymentsResponse.data)
          ? paymentsResponse.data
          : []
      );
    } catch (err: any) {
      console.error(
        'STUDENT FEES ERROR:',
        err?.response?.data || err?.message || err
      );

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load fee information.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFees();
    }, [loadFees])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadFees();
  };

  const money = (value: unknown) => {
    const amount = Number(value || 0);

    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const overallTotal = useMemo(
    () =>
      fees.reduce(
        (sum, fee) => sum + Number(fee.total_fee || 0),
        0
      ),
    [fees]
  );

  const overallPaid = useMemo(
    () =>
      fees.reduce(
        (sum, fee) => sum + Number(fee.paid_amount || 0),
        0
      ),
    [fees]
  );

  const overallDue = Math.max(
    overallTotal - overallPaid,
    0
  );

  const clearancePercentage =
    overallTotal > 0
      ? Math.round(
          (overallPaid / overallTotal) * 100
        )
      : 0;

  const pendingFees = useMemo(
    () =>
      fees.filter(
        fee =>
          String(fee.status || '').toLowerCase() !==
          'paid'
      ),
    [fees]
  );

  const selectedFee = useMemo(
    () =>
      pendingFees.find(
        fee => String(fee.id) === selectedFeeId
      ),
    [pendingFees, selectedFeeId]
  );

  const selectedFeeDue = selectedFee
    ? Math.max(
        Number(selectedFee.total_fee || 0) -
          Number(selectedFee.paid_amount || 0),
        0
      )
    : 0;

  const semesterGroups = useMemo(() => {
    const groups: Record<string, FeeRecord[]> = {};

    fees.forEach(fee => {
      const semester = String(
        fee.semester || 'Other'
      );

      if (!groups[semester]) {
        groups[semester] = [];
      }

      groups[semester].push(fee);
    });

    return Object.entries(groups).sort(
      ([a], [b]) => Number(a) - Number(b)
    );
  }, [fees]);

  const openPaymentModal = () => {
    setSelectedFeeId('');
    setPaymentMethod('Online');
    setPaymentStep(1);
    setPaymentModalVisible(true);
  };

  const closePaymentModal = () => {
    if (processingPayment) return;

    setPaymentModalVisible(false);
    setSelectedFeeId('');
    setPaymentStep(1);
    setPaymentMethod('Online');
  };

  const handleSelectFee = (feeId: string) => {
    setSelectedFeeId(feeId);
  };

  const handleProceed = () => {
    if (!selectedFee) return;

    setPaymentStep(2);
  };

  const handleProcessPayment = async () => {
    if (!selectedFee) return;

    try {
      setProcessingPayment(true);
      setPaymentStep(3);

      const payload = {
        fee_id: Number(selectedFee.id),
        amount_paid: selectedFeeDue,
        payment_method: paymentMethod,
        transaction_reference: `TXN-${Date.now()}`,
      };

      await api.post('/payments', payload);

      setPaymentModalVisible(false);
      setSelectedFeeId('');
      setPaymentStep(1);

      await loadFees();
    } catch (err: any) {
      console.error(
        'PAYMENT ERROR:',
        err?.response?.data || err?.message || err
      );

      setPaymentStep(2);
    } finally {
      setProcessingPayment(false);
    }
  };


  const arrayBufferToBase64 = (data: ArrayBuffer) => {
    const bytes = new Uint8Array(data);
    const chunkSize = 0x8000;
    let binary = '';

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(
        i,
        Math.min(i + chunkSize, bytes.length)
      );
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  };

  const handleDownloadReceipt = async (payment: PaymentRecord) => {
    const paymentId = String(payment.id);

    if (downloadingReceiptId) return;

    try {
      setDownloadingReceiptId(paymentId);

      const response = await api.get(
        `/payments/${paymentId}/receipt`,
        {
          responseType: 'arraybuffer',
          headers: {
            Accept: 'application/pdf',
          },
        }
      );

      if (!response.data) {
        throw new Error('The server returned an empty receipt.');
      }

      const base64 = arrayBufferToBase64(response.data);
      const reference =
        payment.transaction_reference || `payment-${paymentId}`;

      const safeReference = reference
        .replace(/[^a-z0-9_-]/gi, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);

      const fileUri =
        `${FileSystem.cacheDirectory}receipt-${safeReference}.pdf`;

      await FileSystem.writeAsStringAsync(
        fileUri,
        base64,
        {
          encoding: FileSystem.EncodingType.Base64,
        }
      );

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
        'RECEIPT DOWNLOAD ERROR:',
        err?.response?.data || err?.message || err
      );

      let message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Unable to download the receipt.';

      if (err?.response?.status === 404) {
        message = 'Receipt not found for this payment.';
      }

      Alert.alert('Receipt Download Failed', message);
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            { color: colors.muted },
          ]}
        >
          Loading fee information...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backButton,
            {
              backgroundColor: colors.cardSoft,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.headerText}>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.text },
            ]}
          >
            Fees
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              { color: colors.muted },
            ]}
          >
            Track your Academic Fee Dues and Payments
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Error */}
        {error ? (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: colors.dangerSoft,
                borderColor: colors.danger,
              },
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color={colors.danger}
            />

            <Text
              style={[
                styles.errorText,
                { color: colors.danger },
              ]}
            >
              {error}
            </Text>
          </View>
        ) : null}

        {/* Summary */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Fee Summary
        </Text>

        <Text
          style={[
            styles.sectionSubtitle,
            { color: colors.muted },
          ]}
        >
          Your current fee overview
        </Text>

        <View style={styles.summaryGrid}>
          <SummaryCard
            icon="wallet-outline"
            label="TOTAL FEE"
            value={money(overallTotal)}
            iconColor={colors.primary}
            iconBackground={colors.primarySoft}
            colors={colors}
          />

          <SummaryCard
            icon="checkmark-circle-outline"
            label="TOTAL PAID"
            value={money(overallPaid)}
            iconColor={colors.success}
            iconBackground={colors.successSoft}
            colors={colors}
          />

          <SummaryCard
            icon="time-outline"
            label="OUTSTANDING"
            value={money(overallDue)}
            iconColor={
              overallDue > 0
                ? colors.danger
                : colors.success
            }
            iconBackground={
              overallDue > 0
                ? colors.dangerSoft
                : colors.successSoft
            }
            colors={colors}
          />

          <SummaryCard
            icon="stats-chart-outline"
            label="CLEARED"
            value={`${clearancePercentage}%`}
            iconColor={colors.primary}
            iconBackground={colors.primarySoft}
            colors={colors}
          />
        </View>

        {/* Clearance */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.clearanceHeader}>
            <View>
              <Text
                style={[
                  styles.cardLabel,
                  { color: colors.subtle },
                ]}
              >
                FEE CLEARANCE
              </Text>

              <Text
                style={[
                  styles.clearanceValue,
                  { color: colors.text },
                ]}
              >
                {clearancePercentage}%
              </Text>
            </View>

            <View
              style={[
                styles.clearanceIcon,
                {
                  backgroundColor:
                    clearancePercentage >= 100
                      ? colors.successSoft
                      : colors.primarySoft,
                },
              ]}
            >
              <Ionicons
                name={
                  clearancePercentage >= 100
                    ? 'checkmark-circle-outline'
                    : 'trending-up-outline'
                }
                size={25}
                color={
                  clearancePercentage >= 100
                    ? colors.success
                    : colors.primary
                }
              />
            </View>
          </View>

          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    clearancePercentage,
                    100
                  )}%`,
                  backgroundColor:
                    clearancePercentage >= 100
                      ? colors.success
                      : colors.primary,
                },
              ]}
            />
          </View>

          <View style={styles.progressFooter}>
            <Text
              style={[
                styles.progressText,
                { color: colors.muted },
              ]}
            >
              Paid {money(overallPaid)}
            </Text>

            <Text
              style={[
                styles.progressText,
                { color: colors.muted },
              ]}
            >
              Due {money(overallDue)}
            </Text>
          </View>
        </View>

        {/* Pending dues */}
        {pendingFees.length > 0 ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text },
                  ]}
                >
                  Pending Dues
                </Text>

                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.muted },
                  ]}
                >
                  Fees that still need to be cleared
                </Text>
              </View>

              <Pressable
                onPress={openPaymentModal}
                style={[
                  styles.payButton,
                  {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name="card-outline"
                  size={16}
                  color="#FFFFFF"
                />

                <Text style={styles.payButtonText}>
                  Pay
                </Text>
              </Pressable>
            </View>

            {pendingFees.map(fee => {
              const due = Math.max(
                Number(fee.total_fee || 0) -
                  Number(fee.paid_amount || 0),
                0
              );

              return (
                <View
                  key={String(fee.id)}
                  style={[
                    styles.feeCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.feeTopRow}>
                    <View
                      style={[
                        styles.feeIcon,
                        {
                          backgroundColor:
                            colors.warningSoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={21}
                        color={colors.warning}
                      />
                    </View>

                    <View style={styles.feeMain}>
                      <Text
                        style={[
                          styles.feeTitle,
                          { color: colors.text },
                        ]}
                        numberOfLines={2}
                      >
                        {fee.fee_type ||
                          'Academic Fee'}
                      </Text>

                      <Text
                        style={[
                          styles.feeMeta,
                          { color: colors.muted },
                        ]}
                      >
                        Semester {fee.semester || '—'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            colors.dangerSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: colors.danger },
                        ]}
                      >
                        {fee.status || 'Pending'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.feeDivider,
                      {
                        backgroundColor: colors.border,
                      },
                    ]}
                  />

                  <View style={styles.feeBottomRow}>
                    <View>
                      <Text
                        style={[
                          styles.smallLabel,
                          { color: colors.subtle },
                        ]}
                      >
                        TOTAL / PAID
                      </Text>

                      <Text
                        style={[
                          styles.feeAmount,
                          { color: colors.text },
                        ]}
                      >
                        {money(fee.total_fee)} /{' '}
                        <Text
                          style={{
                            color: colors.success,
                          }}
                        >
                          {money(fee.paid_amount)}
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.dueBlock}>
                      <Text
                        style={[
                          styles.smallLabel,
                          { color: colors.subtle },
                        ]}
                      >
                        DUE
                      </Text>

                      <Text
                        style={[
                          styles.dueAmount,
                          { color: colors.danger },
                        ]}
                      >
                        {money(due)}
                      </Text>
                    </View>
                  </View>

                  {fee.due_date ? (
                    <View style={styles.dueDateRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={colors.muted}
                      />

                      <Text
                        style={[
                          styles.dueDateText,
                          { color: colors.muted },
                        ]}
                      >
                        Due {formatDate(fee.due_date)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </>
        ) : null}

        {/* Fee ledger */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Fee Ledger
        </Text>

        <Text
          style={[
            styles.sectionSubtitle,
            { color: colors.muted },
          ]}
        >
          Semester-wise fee records
        </Text>

        {semesterGroups.length > 0 ? (
          semesterGroups.map(
            ([semester, semesterFees]) => {
              const semesterTotal =
                semesterFees.reduce(
                  (sum, fee) =>
                    sum +
                    Number(fee.total_fee || 0),
                  0
                );

              const semesterPaid =
                semesterFees.reduce(
                  (sum, fee) =>
                    sum +
                    Number(fee.paid_amount || 0),
                  0
                );

              const semesterDue = Math.max(
                semesterTotal - semesterPaid,
                0
              );

              return (
                <View
                  key={semester}
                  style={[
                    styles.ledgerCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.ledgerHeader}>
                    <View
                      style={[
                        styles.ledgerIcon,
                        {
                          backgroundColor:
                            colors.primarySoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name="school-outline"
                        size={21}
                        color={colors.primary}
                      />
                    </View>

                    <View style={styles.ledgerHeaderText}>
                      <Text
                        style={[
                          styles.ledgerTitle,
                          { color: colors.text },
                        ]}
                      >
                        Semester {semester}
                      </Text>

                      <Text
                        style={[
                          styles.ledgerSubtitle,
                          { color: colors.muted },
                        ]}
                      >
                        {semesterFees.length}{' '}
                        fee record
                        {semesterFees.length !== 1
                          ? 's'
                          : ''}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.ledgerDue,
                        {
                          color:
                            semesterDue > 0
                              ? colors.danger
                              : colors.success,
                        },
                      ]}
                    >
                      {semesterDue > 0
                        ? money(semesterDue)
                        : 'Cleared'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.ledgerStats,
                      {
                        borderTopColor:
                          colors.border,
                      },
                    ]}
                  >
                    <LedgerStat
                      label="TOTAL"
                      value={money(semesterTotal)}
                      colors={colors}
                    />

                    <LedgerStat
                      label="PAID"
                      value={money(semesterPaid)}
                      valueColor={colors.success}
                      colors={colors}
                    />

                    <LedgerStat
                      label="DUE"
                      value={money(semesterDue)}
                      valueColor={
                        semesterDue > 0
                          ? colors.danger
                          : colors.success
                      }
                      colors={colors}
                    />
                  </View>
                </View>
              );
            }
          )
        ) : (
          <EmptyState
            icon="document-text-outline"
            title="No Fee Records"
            message="No fee information has been assigned to your account yet."
            colors={colors}
          />
        )}

        {/* Transaction history */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Payment History
        </Text>

        <Text
          style={[
            styles.sectionSubtitle,
            { color: colors.muted },
          ]}
        >
          Your recorded fee payments
        </Text>

        {payments.length > 0 ? (
          payments.map(payment => (
            <View
              key={String(payment.id)}
              style={[
                styles.paymentCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.paymentIcon,
                  {
                    backgroundColor:
                      colors.successSoft,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color={colors.success}
                />
              </View>

              <View style={styles.paymentInfo}>
                <Text
                  style={[
                    styles.transactionReference,
                    { color: colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {payment.transaction_reference ||
                    `Payment #${payment.id}`}
                </Text>

                <Text
                  style={[
                    styles.paymentMeta,
                    { color: colors.muted },
                  ]}
                >
                  {formatDate(
                    payment.payment_date
                  )}
                  {' • '}
                  {payment.payment_method ||
                    'Payment'}
                </Text>

                {payment.fee_type ? (
                  <Text
                    style={[
                      styles.paymentFeeType,
                      { color: colors.subtle },
                    ]}
                    numberOfLines={1}
                  >
                    {payment.fee_type}
                  </Text>
                ) : null}
              </View>

              <View style={styles.paymentAction}>
                <Text
                  style={[
                    styles.paymentAmount,
                    { color: colors.success },
                  ]}
                >
                  {money(payment.amount_paid)}
                </Text>

                <Pressable
                  onPress={() => handleDownloadReceipt(payment)}
                  disabled={downloadingReceiptId !== null}
                  style={[
                    styles.receiptButton,
                    {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primary,
                      opacity:
                        downloadingReceiptId === String(payment.id)
                          ? 0.65
                          : 1,
                    },
                  ]}
                >
                  {downloadingReceiptId === String(payment.id) ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                    />
                  ) : (
                    <Ionicons
                      name="download-outline"
                      size={14}
                      color={colors.primary}
                    />
                  )}

                  <Text
                    style={[
                      styles.receiptButtonText,
                      { color: colors.primary },
                    ]}
                  >
                    {downloadingReceiptId === String(payment.id)
                      ? 'Saving...'
                      : 'Receipt'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="No Payments Yet"
            message="No fee payments have been recorded for your account."
            colors={colors}
          />
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closePaymentModal}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor: isDark
                ? 'rgba(0,0,0,0.72)'
                : 'rgba(15,23,42,0.45)',
            },
          ]}
        >
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: colors.card,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: colors.text },
                  ]}
                >
                  {paymentStep === 1
                    ? 'Pay Dues'
                    : paymentStep === 2
                    ? 'Confirm Payment'
                    : 'Processing...'}
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: colors.muted },
                  ]}
                >
                  {paymentStep === 1
                    ? 'Select an outstanding fee'
                    : paymentStep === 2
                    ? 'Review your payment'
                    : 'Please wait'}
                </Text>
              </View>

              {paymentStep !== 3 ? (
                <Pressable
                  onPress={closePaymentModal}
                  style={styles.closeButton}
                >
                  <Ionicons
                    name="close"
                    size={23}
                    color={colors.muted}
                  />
                </Pressable>
              ) : null}
            </View>

            {paymentStep === 1 ? (
              <>
                <Text
                  style={[
                    styles.modalLabel,
                    { color: colors.muted },
                  ]}
                >
                  OUTSTANDING FEE
                </Text>

                <ScrollView
                  style={styles.feeSelectionList}
                  showsVerticalScrollIndicator={false}
                >
                  {pendingFees.map(fee => {
                    const due = Math.max(
                      Number(fee.total_fee || 0) -
                        Number(
                          fee.paid_amount || 0
                        ),
                      0
                    );

                    const selected =
                      String(fee.id) ===
                      selectedFeeId;

                    return (
                      <Pressable
                        key={String(fee.id)}
                        onPress={() =>
                          handleSelectFee(
                            String(fee.id)
                          )
                        }
                        style={[
                          styles.selectFeeCard,
                          {
                            backgroundColor:
                              selected
                                ? colors.primarySoft
                                : colors.cardSoft,
                            borderColor: selected
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.radio,
                            {
                              borderColor: selected
                                ? colors.primary
                                : colors.subtle,
                            },
                          ]}
                        >
                          {selected ? (
                            <View
                              style={[
                                styles.radioInner,
                                {
                                  backgroundColor:
                                    colors.primary,
                                },
                              ]}
                            />
                          ) : null}
                        </View>

                        <View
                          style={styles.selectFeeInfo}
                        >
                          <Text
                            style={[
                              styles.selectFeeTitle,
                              {
                                color: colors.text,
                              },
                            ]}
                          >
                            {fee.fee_type ||
                              'Academic Fee'}
                          </Text>

                          <Text
                            style={[
                              styles.selectFeeMeta,
                              {
                                color: colors.muted,
                              },
                            ]}
                          >
                            Semester{' '}
                            {fee.semester || '—'}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.selectFeeAmount,
                            {
                              color: colors.danger,
                            },
                          ]}
                        >
                          {money(due)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {selectedFee ? (
                  <>
                    <Text
                      style={[
                        styles.modalLabel,
                        { color: colors.muted },
                      ]}
                    >
                      PAYMENT METHOD
                    </Text>

                    <View style={styles.methodRow}>
                      <PaymentMethod
                        icon="card-outline"
                        label="Online"
                        selected={
                          paymentMethod ===
                          'Online'
                        }
                        onPress={() =>
                          setPaymentMethod(
                            'Online'
                          )
                        }
                        colors={colors}
                      />

                      <PaymentMethod
                        icon="business-outline"
                        label="Bank"
                        selected={
                          paymentMethod ===
                          'Bank Transfer'
                        }
                        onPress={() =>
                          setPaymentMethod(
                            'Bank Transfer'
                          )
                        }
                        colors={colors}
                      />

                      <PaymentMethod
                        icon="cash-outline"
                        label="Cash"
                        selected={
                          paymentMethod === 'Cash'
                        }
                        onPress={() =>
                          setPaymentMethod(
                            'Cash'
                          )
                        }
                        colors={colors}
                      />
                    </View>

                    <Pressable
                      onPress={handleProceed}
                      style={[
                        styles.modalPrimaryButton,
                        {
                          backgroundColor:
                            colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={
                          styles.modalPrimaryText
                        }
                      >
                        Continue
                      </Text>

                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color="#FFFFFF"
                      />
                    </Pressable>
                  </>
                ) : (
                  <View
                    style={[
                      styles.selectHint,
                      {
                        backgroundColor:
                          colors.cardSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={colors.muted}
                    />

                    <Text
                      style={[
                        styles.selectHintText,
                        { color: colors.muted },
                      ]}
                    >
                      Select a fee to continue.
                    </Text>
                  </View>
                )}
              </>
            ) : null}

            {paymentStep === 2 ? (
              <View>
                <View
                  style={[
                    styles.confirmCard,
                    {
                      backgroundColor:
                        colors.primarySoft,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.confirmIcon,
                      {
                        backgroundColor:
                          colors.primary,
                      },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={25}
                      color="#FFFFFF"
                    />
                  </View>

                  <Text
                    style={[
                      styles.confirmLabel,
                      { color: colors.muted },
                    ]}
                  >
                    PAYMENT AMOUNT
                  </Text>

                  <Text
                    style={[
                      styles.confirmAmount,
                      { color: colors.text },
                    ]}
                  >
                    {money(selectedFeeDue)}
                  </Text>

                  <Text
                    style={[
                      styles.confirmMethod,
                      { color: colors.muted },
                    ]}
                  >
                    Via {paymentMethod}
                  </Text>
                </View>

                {selectedFee ? (
                  <View
                    style={[
                      styles.confirmDetails,
                      {
                        backgroundColor:
                          colors.cardSoft,
                      },
                    ]}
                  >
                    <DetailRow
                      label="Fee"
                      value={
                        selectedFee.fee_type ||
                        'Academic Fee'
                      }
                      colors={colors}
                    />

                    <DetailRow
                      label="Semester"
                      value={String(
                        selectedFee.semester ||
                          '—'
                      )}
                      colors={colors}
                    />

                    <DetailRow
                      label="Amount"
                      value={money(selectedFeeDue)}
                      colors={colors}
                      valueColor={colors.primary}
                    />
                  </View>
                ) : null}

                <View style={styles.confirmButtons}>
                  <Pressable
                    onPress={() => setPaymentStep(1)}
                    disabled={processingPayment}
                    style={[
                      styles.cancelButton,
                      {
                        borderColor:
                          colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cancelButtonText,
                        { color: colors.text },
                      ]}
                    >
                      Back
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleProcessPayment}
                    disabled={processingPayment}
                    style={[
                      styles.confirmButton,
                      {
                        backgroundColor:
                          colors.success,
                      },
                    ]}
                  >
                    <Text
                      style={styles.confirmButtonText}
                    >
                      Confirm & Pay
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {paymentStep === 3 ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                />

                <Text
                  style={[
                    styles.processingTitle,
                    { color: colors.text },
                  ]}
                >
                  Processing Payment
                </Text>

                <Text
                  style={[
                    styles.processingText,
                    { color: colors.muted },
                  ]}
                >
                  Please wait while your payment is
                  being processed.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  iconColor,
  iconBackground,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  iconColor: string;
  iconBackground: string;
  colors: Colors;
}) {
  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor: iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={iconColor}
        />
      </View>

      <Text
        style={[
          styles.summaryLabel,
          { color: colors.subtle },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.summaryValue,
          { color: colors.text },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function LedgerStat({
  label,
  value,
  valueColor,
  colors,
}: {
  label: string;
  value: string;
  valueColor?: string;
  colors: Colors;
}) {
  return (
    <View style={styles.ledgerStat}>
      <Text
        style={[
          styles.smallLabel,
          { color: colors.subtle },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.ledgerStatValue,
          {
            color: valueColor || colors.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function PaymentMethod({
  icon,
  label,
  selected,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: Colors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.methodButton,
        {
          backgroundColor: selected
            ? colors.primarySoft
            : colors.cardSoft,
          borderColor: selected
            ? colors.primary
            : colors.border,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={
          selected
            ? colors.primary
            : colors.muted
        }
      />

      <Text
        style={[
          styles.methodText,
          {
            color: selected
              ? colors.primary
              : colors.muted,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DetailRow({
  label,
  value,
  colors,
  valueColor,
}: {
  label: string;
  value: string;
  colors: Colors;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text
        style={[
          styles.detailLabel,
          { color: colors.muted },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.detailValue,
          {
            color:
              valueColor || colors.text,
          },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  message,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  colors: Colors;
}) {
  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.emptyIcon,
          {
            backgroundColor: colors.cardSoft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={26}
          color={colors.subtle}
        />
      </View>

      <Text
        style={[
          styles.emptyTitle,
          { color: colors.text },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.emptyMessage,
          { color: colors.muted },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },

  header: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    marginLeft: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
  },

  content: {
    padding: 16,
    paddingBottom: 32,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 18,
    letterSpacing: -0.2,
  },

  sectionSubtitle: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 20,
    marginBottom: 12,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 14,
  },

  summaryCard: {
    width: '48.3%',
    minHeight: 138,
    borderRadius: 17,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  summaryLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  summaryValue: {
    fontSize: 21,
    fontWeight: '900',
    marginTop: 6,
  },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 6,
  },

  clearanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  clearanceValue: {
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },

  clearanceIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressTrack: {
    height: 8,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 16,
  },

  progressFill: {
    height: '100%',
    borderRadius: 20,
  },

  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  progressText: {
    fontSize: 10,
    fontWeight: '700',
  },

  payButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  payButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  feeCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
  },

  feeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  feeIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  feeMain: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  feeTitle: {
    fontSize: 13,
    fontWeight: '900',
  },

  feeMeta: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  statusText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  feeDivider: {
    height: 1,
    marginVertical: 13,
  },

  feeBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  smallLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  feeAmount: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },

  dueBlock: {
    alignItems: 'flex-end',
  },

  dueAmount: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 3,
  },

  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 11,
    gap: 5,
  },

  dueDateText: {
    fontSize: 10,
    fontWeight: '600',
  },

  ledgerCard: {
    borderWidth: 1,
    borderRadius: 18,
    marginTop: 12,
    overflow: 'hidden',
  },

  ledgerHeader: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  ledgerIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ledgerHeaderText: {
    flex: 1,
    marginLeft: 11,
  },

  ledgerTitle: {
    fontSize: 14,
    fontWeight: '900',
  },

  ledgerSubtitle: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: '600',
  },

  ledgerDue: {
    fontSize: 12,
    fontWeight: '900',
  },

  ledgerStats: {
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: 13,
  },

  ledgerStat: {
    flex: 1,
    alignItems: 'center',
  },

  ledgerStatValue: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },

  paymentCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  paymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  paymentInfo: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  transactionReference: {
    fontSize: 12,
    fontWeight: '900',
  },

  paymentMeta: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
  },

  paymentFeeType: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },

  paymentAction: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 82,
  },

  paymentAmount: {
    fontSize: 13,
    fontWeight: '900',
  },

  receiptButton: {
    minHeight: 32,
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 7,
  },

  receiptButtonText: {
    fontSize: 9,
    fontWeight: '900',
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 28,
    marginTop: 12,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 12,
  },

  emptyMessage: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 5,
    maxWidth: 280,
  },

  errorCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  errorText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '600',
    marginLeft: 9,
  },

  bottomSpace: {
    height: 20,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalContainer: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
  },

  modalSubtitle: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 9,
  },

  feeSelectionList: {
    maxHeight: 210,
    marginBottom: 16,
  },

  selectFeeCard: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  selectFeeInfo: {
    flex: 1,
    marginLeft: 10,
  },

  selectFeeTitle: {
    fontSize: 12,
    fontWeight: '900',
  },

  selectFeeMeta: {
    fontSize: 9,
    marginTop: 3,
    fontWeight: '600',
  },

  selectFeeAmount: {
    fontSize: 12,
    fontWeight: '900',
  },

  methodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },

  methodButton: {
    flex: 1,
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  methodText: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: 6,
  },

  modalPrimaryButton: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  selectHint: {
    minHeight: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  selectHintText: {
    fontSize: 11,
    fontWeight: '600',
  },

  confirmCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },

  confirmIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  confirmLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  confirmAmount: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 5,
  },

  confirmMethod: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },

  confirmDetails: {
    borderRadius: 15,
    padding: 14,
    marginTop: 12,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },

  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
  },

  detailValue: {
    fontSize: 11,
    fontWeight: '900',
    maxWidth: '65%',
    textAlign: 'right',
  },

  confirmButtons: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 15,
  },

  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },

  confirmButton: {
    flex: 1.4,
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  processingContainer: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  processingTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 18,
  },

  processingText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 7,
  },
});