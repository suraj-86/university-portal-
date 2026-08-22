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
import { useFocusEffect } from 'expo-router';

import api, { getFileUrl } from '../../services/api';
import { getItem } from '../../services/storage';
import { useAppTheme } from '../../context/ThemeContext';

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

export default function StudentNotices() {
  const { isDark } = useAppTheme();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingNotice, setViewingNotice] = useState<Notice | null>(null);
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

  const loadNotices = useCallback(async () => {
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
        throw new Error('Student account information is unavailable.');
      }

      const response = await api.get(`/student/${userId}/notices`);
      setNotices(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error(
        'STUDENT NOTICES ERROR:',
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadNotices();
    }, [loadNotices])
  );

  const filteredNotices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return [...notices]
      .filter((notice) => {
        const title = String(notice.title || '').toLowerCase();
        const content = String(notice.content || '').toLowerCase();

        if (
          query &&
          !title.includes(query) &&
          !content.includes(query)
        ) {
          return false;
        }

        if (filterType === 'Teacher') {
          return notice.author_role?.toLowerCase() === 'teacher';
        }

        if (filterType === 'Admin') {
          return notice.author_role?.toLowerCase() === 'admin';
        }

        return true;
      })
      .sort((a, b) => {
        const aHigh =
          String(a.priority || '').toLowerCase() === 'high';
        const bHigh =
          String(b.priority || '').toLowerCase() === 'high';

        if (aHigh && !bHigh) return -1;
        if (!aHigh && bHigh) return 1;

        return (
          new Date(b.date || 0).getTime() -
          new Date(a.date || 0).getTime()
        );
      });
  }, [filterType, searchTerm, notices]);

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

  const highPriority = (notice?: Notice | null) =>
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
      console.error('NOTICE ATTACHMENT ERROR:', err);
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
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Loading notice board...
        </Text>
      </View>
    );
  }

  if (error && notices.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.errorIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="notifications-outline" size={30} color={colors.primary} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Notices unavailable
        </Text>
        <Text style={[styles.errorMessage, { color: colors.muted }]}>
          {error}
        </Text>
        <Pressable
          onPress={() => {
            setLoading(true);
            loadNotices();
          }}
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
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>NOTICE</Text>
              <Text style={[styles.titleAccent, { color: colors.primary }]}>
                {' '}UPDATES
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.subtle }]}>
              OFFICIAL UNIVERSITY ANNOUNCEMENTS
            </Text>
          </View>

          <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="notifications-outline" size={23} color={colors.primary} />
          </View>
        </View>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={19} color={colors.subtle} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search notices..."
            placeholderTextColor={colors.subtle}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {!!searchTerm && (
            <Pressable onPress={() => setSearchTerm('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.subtle} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {(['All', 'Teacher', 'Admin'] as FilterType[]).map((type) => {
            const active = filterType === type;
            const label =
              type === 'Teacher'
                ? 'Academic'
                : type === 'Admin'
                  ? 'Official'
                  : 'All Updates';

            return (
              <Pressable
                key={type}
                onPress={() => setFilterType(type)}
                style={[
                  styles.filterButton,
                  active
                    ? { backgroundColor: isDark ? '#1E293B' : '#0F172A' }
                    : {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? '#FFFFFF' : colors.muted },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.resultHeader}>
          <Text style={[styles.resultCount, { color: colors.subtle }]}>
            {filteredNotices.length}{' '}
            {filteredNotices.length === 1 ? 'NOTICE' : 'NOTICES'}
          </Text>
          {highPriority(filteredNotices[0]) && (
            <View style={styles.priorityLegend}>
              <View style={styles.priorityDot} />
              <Text style={styles.priorityLegendText}>HIGH PRIORITY</Text>
            </View>
          )}
        </View>

        <View style={styles.list}>
          {filteredNotices.length ? (
            filteredNotices.map((notice) => {
              const high = highPriority(notice);
              const teacher =
                notice.author_role?.toLowerCase() === 'teacher';

              return (
                <Pressable
                  key={String(notice.id)}
                  onPress={() => setViewingNotice(notice)}
                  style={({ pressed }) => [
                    styles.noticeCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.priorityBar,
                      {
                        backgroundColor: high
                          ? colors.danger
                          : colors.primary,
                      },
                    ]}
                  />

                  <View style={styles.noticeMain}>
                    <View style={styles.metaRow}>
                      <View
                        style={[
                          styles.roleBadge,
                          {
                            backgroundColor: teacher
                              ? colors.primarySoft
                              : colors.cardSoft,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleBadgeText,
                            {
                              color: teacher ? colors.primary : colors.muted,
                            },
                          ]}
                        >
                          {teacher ? 'FACULTY' : 'ADMIN'}
                        </Text>
                      </View>

                      {high && (
                        <View
                          style={[
                            styles.highBadge,
                            { backgroundColor: colors.dangerSoft },
                          ]}
                        >
                          <View
                            style={[
                              styles.highDot,
                              { backgroundColor: colors.danger },
                            ]}
                          />
                          <Text
                            style={[
                              styles.highBadgeText,
                              { color: colors.danger },
                            ]}
                          >
                            HIGH
                          </Text>
                        </View>
                      )}

                      <View style={styles.dateRow}>
                        <Ionicons
                          name="time-outline"
                          size={12}
                          color={colors.subtle}
                        />
                        <Text style={[styles.dateText, { color: colors.subtle }]}>
                          {formatDate(notice.date)}
                        </Text>
                      </View>
                    </View>

                    <Text
                      numberOfLines={2}
                      style={[styles.noticeTitle, { color: colors.text }]}
                    >
                      {notice.title}
                    </Text>

                    <Text
                      numberOfLines={2}
                      style={[styles.noticePreview, { color: colors.muted }]}
                    >
                      {notice.content || 'No description available.'}
                    </Text>

                    <View style={styles.noticeBottom}>
                      {notice.attachment_url ? (
                        <Pressable
                          onPress={(event) => {
                            event.stopPropagation();
                            openAttachment(notice.attachment_url);
                          }}
                          style={[
                            styles.attachmentChip,
                            {
                              backgroundColor: colors.cardSoft,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name="document-text-outline"
                            size={16}
                            color={colors.primary}
                          />
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.attachmentName,
                              { color: colors.muted },
                            ]}
                          >
                            {attachmentName(notice.attachment_url)}
                          </Text>
                          <Ionicons
                            name="download-outline"
                            size={15}
                            color={colors.primary}
                          />
                        </Pressable>
                      ) : (
                        <View />
                      )}

                      <View
                        style={[
                          styles.arrowButton,
                          { backgroundColor: colors.cardSoft },
                        ]}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={19}
                          color={colors.subtle}
                        />
                      </View>
                    </View>

                    {teacher && !!notice.author_name && (
                      <View style={styles.authorRow}>
                        <View
                          style={[
                            styles.authorAvatar,
                            {
                              backgroundColor: isDark ? '#1E293B' : '#0F172A',
                            },
                          ]}
                        >
                          <Text style={styles.authorAvatarText}>
                            {notice.author_name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text
                          numberOfLines={1}
                          style={[styles.authorName, { color: colors.muted }]}
                        >
                          {notice.author_name}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: colors.cardSoft }]}>
                <Ionicons
                  name="megaphone-outline"
                  size={38}
                  color={colors.subtle}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No notices found
              </Text>
              <Text style={[styles.emptyText, { color: colors.subtle }]}>
                {searchTerm.trim()
                  ? 'Try a different search term.'
                  : 'There are no announcements available right now.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!viewingNotice}
        transparent
        animationType="slide"
        onRequestClose={() => setViewingNotice(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.modalHeaderText}>
                <View style={styles.modalMetaRow}>
                  <View
                    style={[
                      styles.modalPriority,
                      {
                        backgroundColor: highPriority(viewingNotice)
                          ? colors.dangerSoft
                          : colors.primarySoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalPriorityText,
                        {
                          color: highPriority(viewingNotice)
                            ? colors.danger
                            : colors.primary,
                        },
                      ]}
                    >
                      {highPriority(viewingNotice)
                        ? 'HIGH PRIORITY'
                        : 'NOTICE'}
                    </Text>
                  </View>

                  <Text style={[styles.modalDate, { color: colors.subtle }]}>
                    {formatDate(viewingNotice?.date)}
                  </Text>
                </View>

                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {viewingNotice?.title}
                </Text>

                {viewingNotice?.author_role !== 'admin' &&
                  viewingNotice?.author_name && (
                    <View style={styles.modalAuthor}>
                      <Ionicons
                        name="person-outline"
                        size={13}
                        color={colors.subtle}
                      />
                      <Text
                        style={[
                          styles.modalAuthorText,
                          { color: colors.subtle },
                        ]}
                      >
                        By: {viewingNotice.author_name}
                      </Text>
                    </View>
                  )}
              </View>

              <Pressable
                onPress={() => setViewingNotice(null)}
                style={[styles.closeButton, { backgroundColor: colors.cardSoft }]}
              >
                <Ionicons name="close" size={21} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}
            >
              <View
                style={[
                  styles.contentBox,
                  {
                    backgroundColor: colors.cardSoft,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.contentText, { color: colors.text }]}>
                  {viewingNotice?.content || 'No description available.'}
                </Text>
              </View>

              {viewingNotice?.attachment_url && (
                <View
                  style={[
                    styles.modalAttachment,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.attachmentLeft}>
                    <View
                      style={[
                        styles.attachmentIcon,
                        { backgroundColor: colors.primarySoft },
                      ]}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={21}
                        color={colors.primary}
                      />
                    </View>

                    <View style={styles.attachmentTextWrap}>
                      <Text
                        style={[
                          styles.attachmentLabel,
                          { color: colors.subtle },
                        ]}
                      >
                        ATTACHMENT
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.modalAttachmentName,
                          { color: colors.text },
                        ]}
                      >
                        {attachmentName(viewingNotice.attachment_url)}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    disabled={openingAttachment}
                    onPress={() =>
                      openAttachment(viewingNotice.attachment_url)
                    }
                    style={[
                      styles.downloadButton,
                      {
                        backgroundColor: colors.primary,
                        opacity: openingAttachment ? 0.65 : 1,
                      },
                    ]}
                  >
                    {openingAttachment ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons
                        name="download-outline"
                        size={19}
                        color="#FFFFFF"
                      />
                    )}
                  </Pressable>
                </View>
              )}

              <Pressable
                onPress={() => setViewingNotice(null)}
                style={[
                  styles.closePreviewButton,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#0F172A',
                  },
                ]}
              >
                <Text style={styles.closePreviewText}>CLOSE PREVIEW</Text>
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
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText: { marginTop: 14, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  errorIcon: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  errorMessage: { fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 330 },
  retryButton: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.7 },
  titleAccent: { fontSize: 27, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.7 },
  subtitle: { marginTop: 5, fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  headerIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },

  searchBox: { height: 50, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  searchInput: { flex: 1, marginLeft: 10, marginRight: 8, fontSize: 13, fontWeight: '600' },

  filters: { gap: 8, paddingBottom: 5 },
  filterButton: { paddingHorizontal: 18, minHeight: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },

  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10, minHeight: 18 },
  resultCount: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  priorityLegend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priorityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  priorityLegendText: { color: '#EF4444', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },

  list: { gap: 10 },
  noticeCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  priorityBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  noticeMain: { padding: 16, paddingLeft: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', minHeight: 22, gap: 7 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  highBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  highDot: { width: 5, height: 5, borderRadius: 2.5 },
  highBadgeText: { fontSize: 7, fontWeight: '900', letterSpacing: 0.6 },
  dateRow: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 9, fontWeight: '700' },
  noticeTitle: { marginTop: 10, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  noticePreview: { marginTop: 5, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  noticeBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, minHeight: 40 },
  attachmentChip: { flex: 1, maxWidth: '84%', minHeight: 38, paddingHorizontal: 9, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  attachmentName: { flex: 1, fontSize: 9, fontWeight: '700' },
  arrowButton: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  authorRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorAvatar: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  authorAvatarText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  authorName: { flex: 1, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },

  emptyCard: { minHeight: 330, borderRadius: 26, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '900', marginBottom: 6 },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.65)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '92%', minHeight: '65%', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  modalHeader: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 1, flexDirection: 'row' },
  modalHeaderText: { flex: 1, paddingRight: 10 },
  modalMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  modalPriority: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7 },
  modalPriorityText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  modalDate: { marginLeft: 'auto', fontSize: 9, fontWeight: '800' },
  modalTitle: { fontSize: 22, lineHeight: 28, fontWeight: '900' },
  modalAuthor: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  modalAuthorText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  closeButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: 16, paddingBottom: 28 },
  contentBox: { borderRadius: 18, borderWidth: 1, padding: 18, minHeight: 150 },
  contentText: { fontSize: 14, lineHeight: 23, fontWeight: '500' },
  modalAttachment: { marginTop: 14, padding: 13, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attachmentLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  attachmentIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  attachmentTextWrap: { flex: 1, marginLeft: 10, paddingRight: 8 },
  attachmentLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
  modalAttachmentName: { fontSize: 11, lineHeight: 15, fontWeight: '800' },
  downloadButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  closePreviewButton: { height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  closePreviewText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
});
