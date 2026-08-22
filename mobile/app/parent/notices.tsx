import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import api, { getFileUrl } from '../../services/api';
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

type Notice = {
  id: string | number;
  title: string;
  content?: string | null;
  author_role?: string | null;
  author_name?: string | null;
  priority?: string | null;
  date?: string | null;
  attachment_url?: string | null;
};

type FilterType = 'All' | 'Teacher' | 'Admin';

export default function ParentNotices() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [wardPickerOpen, setWardPickerOpen] = useState(false);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [viewingNotice, setViewingNotice] = useState<Notice | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [openingAttachment, setOpeningAttachment] = useState(false);

  const colors = {
    background: isDark ? '#050817' : '#F8FAFC',
    card: isDark ? '#101525' : '#FFFFFF',
    cardSoft: isDark ? '#151D31' : '#F8FAFC',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#66728B' : '#94A3B8',
    border: isDark ? '#202A42' : '#E2E8F0',
    primary: '#1764FF',
    primarySoft: isDark ? '#172554' : '#EFF6FF',
    danger: '#EF4444',
    dangerSoft: isDark ? '#3B1111' : '#FEF2F2',
  };

  const rollNumber = (ward: Ward | null) =>
    ward?.roll_no ?? ward?.roll_number ?? ward?.enrollment_no ?? null;

  const loadNotices = useCallback(async () => {
    try {
      setError('');
      setLoading(true);

      const rawUser = await getItem('authUser');
      if (!rawUser) {
        throw new Error('Your session could not be restored. Please sign in again.');
      }

      const parent = JSON.parse(rawUser);
      if (!parent?.id) {
        throw new Error('Parent account information is unavailable.');
      }

      const url = selectedWardId
        ? `/parent/${parent.id}/wards-overview?student_id=${selectedWardId}`
        : `/parent/${parent.id}/wards-overview`;

      const summaryResponse = await api.get(url);
      const data = summaryResponse.data || {};
      const availableWards: Ward[] = Array.isArray(data.allWards)
        ? data.allWards
        : [];

      setWards(availableWards);

      if (!data.childProfile) {
        setSelectedWard(null);
        setNotices([]);
        setError('No active students are linked to your parent account.');
        return;
      }

      const child: Ward = {
        ...data.childProfile,
        student_id: data.childProfile.student_id,
        user_id: data.childProfile.user_id,
        full_name: data.childProfile.full_name,
      };

      setSelectedWard(child);

      if (!selectedWardId) {
        setSelectedWardId(String(child.student_id));
      }

      if (!child.user_id) {
        setNotices([]);
        return;
      }

      const response = await api.get(`/student/${child.user_id}/notices`);
      setNotices(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error(
        'PARENT NOTICES ERROR:',
        err?.response?.data || err?.message || err
      );
      setNotices([]);
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load notices.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedWardId]);

  useFocusEffect(
    useCallback(() => {
      loadNotices();
    }, [loadNotices])
  );

  const handleWardChange = (wardId: string) => {
    if (wardId === selectedWardId) {
      setWardPickerOpen(false);
      return;
    }

    setSelectedWardId(wardId);
    setSelectedWard(null);
    setNotices([]);
    setWardPickerOpen(false);
  };

  const filteredNotices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return [...notices]
      .filter((notice) => {
        if (filterType === 'Teacher' && notice.author_role?.toLowerCase() !== 'teacher') {
          return false;
        }
        if (filterType === 'Admin' && notice.author_role?.toLowerCase() !== 'admin') {
          return false;
        }

        if (!query) return true;

        return (
          String(notice.title || '').toLowerCase().includes(query) ||
          String(notice.content || '').toLowerCase().includes(query) ||
          String(notice.author_name || '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const aHigh = String(a.priority || '').toLowerCase() === 'high';
        const bHigh = String(b.priority || '').toLowerCase() === 'high';
        if (aHigh && !bHigh) return -1;
        if (!aHigh && bHigh) return 1;
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      });
  }, [filterType, notices, searchTerm]);

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const attachmentName = (value?: string | null) => {
    if (!value) return '';
    const clean = value.split('?')[0];
    const parts = clean.split('/');
    return decodeURIComponent(parts[parts.length - 1] || clean);
  };

  const isHighPriority = (notice?: Notice | null) =>
    String(notice?.priority || '').toLowerCase() === 'high';

  const openAttachment = async (fileName?: string | null) => {
    if (!fileName || openingAttachment) return;

    try {
      setOpeningAttachment(true);
      const url = getFileUrl(fileName);
      if (!url || !(await Linking.canOpenURL(url))) {
        throw new Error('This attachment cannot be opened on this device.');
      }
      await Linking.openURL(url);
    } catch (err: any) {
      console.error('PARENT NOTICE ATTACHMENT ERROR:', err);
      Alert.alert(
        'Unable to Open Attachment',
        err?.message || 'The attachment could not be opened.'
      );
    } finally {
      setOpeningAttachment(false);
    }
  };

  const refresh = () => {
    setRefreshing(true);
    loadNotices();
  };

  if (loading && notices.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading campus notices...</Text>
      </View>
    );
  }

  if (error && notices.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.errorIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="notifications-outline" size={30} color={colors.primary} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Notices unavailable</Text>
        <Text style={[styles.errorMessage, { color: colors.muted }]}>{error}</Text>
        <Pressable
          onPress={() => loadNotices()}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>Campus Notices</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Official announcements regarding your ward</Text>
          </View>
        </View>

        {selectedWard && (
          <View style={[styles.wardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="people-outline" size={19} color={colors.primary} />
            </View>
            <View style={styles.wardBody}>
              <Text style={[styles.eyebrow, { color: colors.subtle }]}>SELECT WARD</Text>
              <Text numberOfLines={1} style={[styles.wardName, { color: colors.text }]}>{selectedWard.full_name}</Text>
              <Text numberOfLines={1} style={[styles.wardMeta, { color: colors.muted }]}>
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
        )}

        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={19} color={colors.subtle} />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search notices..."
              placeholderTextColor={colors.subtle}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
            />
            {!!searchTerm && (
              <Pressable onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={18} color={colors.subtle} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={[styles.filterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.subtle }]}>NOTICE SOURCE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {(['All', 'Teacher', 'Admin'] as FilterType[]).map((filter) => {
              const active = filterType === filter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setFilterType(filter)}
                  style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.cardSoft, borderColor: active ? colors.primary : colors.border }]}
                >
                  <Ionicons
                    name={filter === 'All' ? 'apps-outline' : filter === 'Teacher' ? 'school-outline' : 'shield-checkmark-outline'}
                    size={15}
                    color={active ? '#FFFFFF' : colors.muted}
                  />
                  <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.muted }]}>{filter}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.listHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Announcements</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.subtle }]}>
              {filteredNotices.length} {filteredNotices.length === 1 ? 'notice' : 'notices'} available
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="notifications-outline" size={15} color={colors.primary} />
            <Text style={[styles.countText, { color: colors.primary }]}>{filteredNotices.length}</Text>
          </View>
        </View>

        {filteredNotices.length > 0 ? (
          filteredNotices.map((notice) => (
            <Pressable
              key={String(notice.id)}
              onPress={() => setViewingNotice(notice)}
              style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.priorityBar, { backgroundColor: isHighPriority(notice) ? colors.danger : colors.primary }]} />
              <View style={styles.noticeTopRow}>
                <View style={[styles.noticeType, { backgroundColor: isHighPriority(notice) ? colors.dangerSoft : colors.primarySoft }]}>
                  <Ionicons
                    name={notice.author_role?.toLowerCase() === 'teacher' ? 'school-outline' : 'megaphone-outline'}
                    size={13}
                    color={isHighPriority(notice) ? colors.danger : colors.primary}
                  />
                  <Text style={[styles.noticeTypeText, { color: isHighPriority(notice) ? colors.danger : colors.primary }]}>
                    {notice.author_role?.toLowerCase() === 'teacher' ? 'FACULTY' : 'ADMIN'}
                  </Text>
                </View>
                <Text style={[styles.noticeDate, { color: colors.subtle }]}>{formatDate(notice.date)}</Text>
              </View>

              <Text numberOfLines={2} style={[styles.noticeTitle, { color: colors.text }]}>{notice.title}</Text>
              <Text numberOfLines={3} style={[styles.noticePreview, { color: colors.muted }]}>
                {notice.content || 'No description available.'}
              </Text>

              <View style={styles.noticeBottom}>
                {notice.attachment_url ? (
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      openAttachment(notice.attachment_url);
                    }}
                    style={[styles.attachmentChip, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}
                  >
                    <Ionicons name="document-text-outline" size={15} color={colors.primary} />
                    <Text numberOfLines={1} style={[styles.attachmentName, { color: colors.muted }]}>
                      {attachmentName(notice.attachment_url)}
                    </Text>
                    <Ionicons name="download-outline" size={15} color={colors.primary} />
                  </Pressable>
                ) : (
                  <View style={styles.noAttachment} />
                )}

                <View style={[styles.arrowButton, { backgroundColor: colors.cardSoft }]}>
                  <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
                </View>
              </View>

              {!!notice.author_name && notice.author_role?.toLowerCase() !== 'admin' && (
                <View style={styles.authorRow}>
                  <View style={[styles.authorAvatar, { backgroundColor: isDark ? '#1E293B' : '#0F172A' }]}>
                    <Text style={styles.authorAvatarText}>{notice.author_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text numberOfLines={1} style={[styles.authorName, { color: colors.muted }]}>By {notice.author_name}</Text>
                </View>
              )}
            </Pressable>
          ))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.cardSoft }]}>
              <Ionicons name="megaphone-outline" size={38} color={colors.subtle} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notices found</Text>
            <Text style={[styles.emptyText, { color: colors.subtle }]}>
              {searchTerm.trim() ? 'Try a different search term.' : 'There are no announcements available for this ward right now.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={wardPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setWardPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setWardPickerOpen(false)} />
          <View style={[styles.wardModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Ward</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Choose the student whose notices you want to view</Text>
              </View>
              <Pressable onPress={() => setWardPickerOpen(false)} style={[styles.modalClose, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wardOptions}>
              {wards.map((ward) => {
                const active = String(ward.student_id) === String(selectedWardId);
                const wardRoll = rollNumber(ward);
                return (
                  <Pressable
                    key={String(ward.student_id)}
                    onPress={() => handleWardChange(String(ward.student_id))}
                    style={[styles.wardOption, { backgroundColor: active ? colors.primarySoft : colors.cardSoft, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <View style={[styles.wardOptionIcon, { backgroundColor: active ? colors.primary : colors.card }]}>
                      <Ionicons name="person-outline" size={19} color={active ? '#FFFFFF' : colors.primary} />
                    </View>
                    <View style={styles.wardOptionBody}>
                      <Text style={[styles.wardOptionName, { color: colors.text }]}>{ward.full_name}</Text>
                      <Text style={[styles.wardOptionMeta, { color: colors.muted }]}>
                        {ward.course_name || 'Student'}{wardRoll !== null ? ` • Roll No. ${wardRoll}` : ''}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!viewingNotice}
        transparent
        animationType="slide"
        onRequestClose={() => setViewingNotice(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.noticeModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, styles.noticeModalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderText}>
                <View style={styles.modalMetaRow}>
                  <View style={[styles.modalPriority, { backgroundColor: isHighPriority(viewingNotice) ? colors.dangerSoft : colors.primarySoft }]}>
                    <Text style={[styles.modalPriorityText, { color: isHighPriority(viewingNotice) ? colors.danger : colors.primary }]}>
                      {isHighPriority(viewingNotice) ? 'HIGH PRIORITY' : 'NOTICE'}
                    </Text>
                  </View>
                  <Text style={[styles.modalDate, { color: colors.subtle }]}>{formatDate(viewingNotice?.date)}</Text>
                </View>
                <Text style={[styles.modalNoticeTitle, { color: colors.text }]}>{viewingNotice?.title}</Text>
                {!!viewingNotice?.author_name && viewingNotice?.author_role?.toLowerCase() !== 'admin' && (
                  <View style={styles.modalAuthor}>
                    <Ionicons name="person-outline" size={13} color={colors.subtle} />
                    <Text style={[styles.modalAuthorText, { color: colors.subtle }]}>By: {viewingNotice.author_name}</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={() => setViewingNotice(null)} style={[styles.modalClose, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.noticeModalBody}>
              <View style={[styles.contentBox, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
                <Text style={[styles.contentText, { color: colors.text }]}>{viewingNotice?.content || 'No description available.'}</Text>
              </View>

              {viewingNotice?.attachment_url && (
                <View style={[styles.modalAttachment, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.attachmentLeft}>
                    <View style={[styles.attachmentIcon, { backgroundColor: colors.primarySoft }]}>
                      <Ionicons name="document-text-outline" size={21} color={colors.primary} />
                    </View>
                    <View style={styles.attachmentTextWrap}>
                      <Text style={[styles.attachmentLabel, { color: colors.subtle }]}>ATTACHMENT</Text>
                      <Text numberOfLines={2} style={[styles.modalAttachmentName, { color: colors.text }]}>
                        {attachmentName(viewingNotice.attachment_url)}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    disabled={openingAttachment}
                    onPress={() => openAttachment(viewingNotice.attachment_url)}
                    style={[styles.downloadButton, { backgroundColor: colors.primary, opacity: openingAttachment ? 0.6 : 1 }]}
                  >
                    {openingAttachment ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="download-outline" size={18} color="#FFFFFF" />}
                  </Pressable>
                </View>
              )}

              <Pressable onPress={() => setViewingNotice(null)} style={[styles.closePreviewButton, { backgroundColor: isDark ? '#111827' : '#0F172A' }]}>
                <Text style={styles.closePreviewText}>Close Preview</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 13, fontWeight: '700' },
  errorIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  errorMessage: { textAlign: 'center', fontSize: 14, lineHeight: 21, maxWidth: 310, marginBottom: 20 },
  retryButton: { paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14 },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { marginTop: 3, fontSize: 12, fontWeight: '600' },
  wardCard: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  wardBody: { flex: 1, marginHorizontal: 11 },
  eyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginBottom: 3 },
  wardName: { fontSize: 15, fontWeight: '900' },
  wardMeta: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  changeWardButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  searchRow: { marginBottom: 10 },
  searchBox: { minHeight: 48, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', paddingVertical: 0 },
  filterCard: { borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 18 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginBottom: 10 },
  filters: { gap: 8 },
  filterChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterText: { fontSize: 11, fontWeight: '800' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '900' },
  sectionSubtitle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  countBadge: { minWidth: 42, height: 32, paddingHorizontal: 9, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  countText: { fontSize: 11, fontWeight: '900' },
  noticeCard: { borderWidth: 1, borderRadius: 20, padding: 15, marginBottom: 10, overflow: 'hidden' },
  priorityBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  noticeTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9, paddingLeft: 3 },
  noticeType: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  noticeTypeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  noticeDate: { fontSize: 9, fontWeight: '800' },
  noticeTitle: { fontSize: 16, fontWeight: '900', lineHeight: 21, marginBottom: 5 },
  noticePreview: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
  noticeBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 14 },
  attachmentChip: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  attachmentName: { flex: 1, fontSize: 9, fontWeight: '700' },
  noAttachment: { flex: 1 },
  arrowButton: { width: 35, height: 35, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  authorAvatar: { width: 23, height: 23, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  authorAvatarText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  authorName: { flex: 1, fontSize: 10, fontWeight: '700' },
  emptyCard: { borderWidth: 1, borderRadius: 20, padding: 28, alignItems: 'center', justifyContent: 'center', minHeight: 210 },
  emptyIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '900', marginBottom: 6 },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 290 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.62)', justifyContent: 'flex-end' },
  wardModal: { maxHeight: '78%', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, padding: 16 },
  noticeModal: { maxHeight: '88%', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 14 },
  noticeModalHeader: { padding: 16, borderBottomWidth: 1 },
  modalHeaderText: { flex: 1 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 3, maxWidth: 280 },
  modalClose: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  wardOptions: { gap: 9, paddingTop: 6, paddingBottom: 12 },
  wardOption: { borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  wardOptionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  wardOptionBody: { flex: 1 },
  wardOptionName: { fontSize: 14, fontWeight: '900' },
  wardOptionMeta: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  modalMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  modalPriority: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  modalPriorityText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  modalDate: { fontSize: 9, fontWeight: '800' },
  modalNoticeTitle: { fontSize: 21, lineHeight: 27, fontWeight: '900' },
  modalAuthor: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  modalAuthorText: { fontSize: 10, fontWeight: '700' },
  noticeModalBody: { padding: 16, gap: 12 },
  contentBox: { borderWidth: 1, borderRadius: 17, padding: 15 },
  contentText: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
  modalAttachment: { borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  attachmentLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  attachmentIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  attachmentTextWrap: { flex: 1 },
  attachmentLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginBottom: 3 },
  modalAttachmentName: { fontSize: 12, fontWeight: '800' },
  downloadButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  closePreviewButton: { borderRadius: 15, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  closePreviewText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
});