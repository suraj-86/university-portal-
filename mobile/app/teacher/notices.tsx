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
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import api, { getFileUrl } from '../../services/api';
import { getItem } from '../../services/storage';
import { useAppTheme } from '../../context/ThemeContext';

type Subject = {
  id: number | string;
  subject_code?: string | null;
  subject_name?: string | null;
  course_name?: string | null;
  semester?: number | string | null;
};

type Notice = {
  id: number | string;
  title: string;
  content?: string | null;
  target_role?: string | null;
  priority?: string | null;
  attachment_url?: string | null;
  posted_by?: number | string | null;
  subject_id?: number | string | null;
  subject_name?: string | null;
  author?: string | null;
  date?: string | null;
};

type SelectedFile = {
  uri: string;
  name: string;
  type?: string | null;
  size?: number | null;
};

type Colors = {
  background: string;
  card: string;
  soft: string;
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
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

const classLabel = (subject?: Subject | null) => {
  if (!subject) return 'Assigned Class';

  return [
    subject.course_name,
    subject.semester !== null && subject.semester !== undefined
      ? `Sem ${subject.semester}`
      : null,
    subject.subject_name,
  ]
    .filter(Boolean)
    .join(' • ');
};

export default function TeacherNotices() {
  const { isDark } = useAppTheme();

  const colors: Colors = {
    background: isDark ? '#050817' : '#F8FAFC',
    card: isDark ? '#101525' : '#FFFFFF',
    soft: isDark ? '#151D31' : '#F8FAFC',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#66728B' : '#94A3B8',
    border: isDark ? '#202A42' : '#E2E8F0',
    primary: '#1764FF',
    primarySoft: isDark ? '#172554' : '#EFF6FF',
    success: '#18D7A0',
    successSoft: isDark ? '#063B34' : '#ECFDF5',
    danger: '#EF4444',
    dangerSoft: isDark ? '#3B1515' : '#FEF2F2',
  };

  const [teacherId, setTeacherId] = useState<number | string | null>(null);
  const [activeTab, setActiveTab] = useState<'broadcast' | 'inbox'>('broadcast');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<number | string | ''>('');
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<SelectedFile | null>(null);

  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<number | string | ''>('');
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingAttachment, setEditingAttachment] = useState<SelectedFile | null>(null);

  const [viewingNotice, setViewingNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
  const [openingAttachment, setOpeningAttachment] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError('');

      const rawUser = await getItem('authUser');
      if (!rawUser) {
        throw new Error('Your session could not be restored. Please sign in again.');
      }

      const user = JSON.parse(rawUser);
      if (!user?.id) {
        throw new Error('Teacher account information is unavailable.');
      }

      setTeacherId(user.id);

      const [subjectResponse, noticeResponse] = await Promise.all([
        api.get(`/teacher/${user.id}/assigned-subjects`),
        api.get(`/teacher/${user.id}/notices`),
      ]);

      const assignedSubjects: Subject[] = Array.isArray(subjectResponse.data)
        ? subjectResponse.data
        : [];
      const noticeList: Notice[] = Array.isArray(noticeResponse.data)
        ? noticeResponse.data
        : [];

      setSubjects(assignedSubjects);
      setNotices(noticeList);

      setSelectedSubjectId((current) => {
        if (current && assignedSubjects.some((item) => String(item.id) === String(current))) {
          return current;
        }
        return assignedSubjects[0]?.id ?? '';
      });
    } catch (err: any) {
      console.error(
        'TEACHER NOTICES ERROR:',
        err?.response?.data || err?.message || err
      );
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load notices.'
      );
      setSubjects([]);
      setNotices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const sentNotices = useMemo(
    () =>
      notices
        .filter(
          (notice) =>
            Number(notice.posted_by) === Number(teacherId) &&
            String(notice.target_role || '').toLowerCase() === 'student'
        )
        .sort(
          (a, b) =>
            new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        ),
    [notices, teacherId]
  );

  const adminNotices = useMemo(
    () =>
      notices
        .filter((notice) => {
          const role = String(notice.target_role || '').toLowerCase();
          return role === 'teacher' || role === 'all';
        })
        .sort(
          (a, b) =>
            new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        ),
    [notices]
  );

  const selectedSubject = useMemo(
    () =>
      subjects.find((subject) => String(subject.id) === String(selectedSubjectId)) || null,
    [selectedSubjectId, subjects]
  );

  const resetDraft = () => {
    setSelectedSubjectId('');
    setTitle('');
    setContent('');
    setAttachment(null);
  };

  const validateFile = (file: SelectedFile | null) => {
    if (!file) return true;

    if (file.size && file.size > MAX_FILE_SIZE) {
      Alert.alert('File too large', 'Only PDF, DOC and DOCX files up to 5 MB are allowed.');
      return false;
    }

    const lowerName = file.name.toLowerCase();
    const validExtension = ['.pdf', '.doc', '.docx'].some((extension) =>
      lowerName.endsWith(extension)
    );

    if (!validExtension) {
      Alert.alert('Unsupported file', 'Please choose a PDF, DOC or DOCX document.');
      return false;
    }

    return true;
  };

  const pickDocument = async (forEdit = false) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const file: SelectedFile = {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType,
        size: asset.size,
      };

      if (!validateFile(file)) return;

      if (forEdit) {
        setEditingAttachment(file);
      } else {
        setAttachment(file);
      }
    } catch (err: any) {
      console.error('TEACHER NOTICE FILE PICKER ERROR:', err);
      Alert.alert('Unable to choose document', err?.message || 'Please try again.');
    }
  };

  const appendFile = (form: FormData, fieldName: string, file: SelectedFile) => {
    form.append(fieldName, {
      uri: file.uri,
      name: file.name,
      type: file.type || 'application/octet-stream',
    } as any);
  };

  const handleSendNotice = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!selectedSubjectId) {
      Alert.alert('Target class required', 'Please select an assigned class before broadcasting.');
      return;
    }

    if (!trimmedTitle) {
      Alert.alert('Subject line required', 'Please enter a subject line.');
      return;
    }

    if (!trimmedContent) {
      Alert.alert('Message required', 'Please enter the announcement content.');
      return;
    }

    if (attachment && !validateFile(attachment)) return;

    try {
      setSubmitting(true);

      const form = new FormData();
      form.append('title', trimmedTitle);
      form.append('content', trimmedContent);
      form.append('target_role', 'student');
      form.append('subject_id', String(selectedSubjectId));

      if (attachment) {
        appendFile(form, 'attachment', attachment);
      }

      await api.post('/notices', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      resetDraft();
      Alert.alert('Notice sent', 'The notice was broadcast to the selected class.');
      await loadData(false);
    } catch (err: any) {
      console.error('TEACHER NOTICE CREATE ERROR:', err?.response?.data || err?.message || err);
      Alert.alert(
        'Broadcast failed',
        err?.response?.data?.error || err?.response?.data?.message || 'Unable to send the notice.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setEditingSubjectId(notice.subject_id ?? '');
    setEditingTitle(notice.title || '');
    setEditingContent(notice.content || '');
    setEditingAttachment(null);
  };

  const closeEdit = () => {
    if (submitting) return;
    setEditingNotice(null);
    setEditingSubjectId('');
    setEditingTitle('');
    setEditingContent('');
    setEditingAttachment(null);
  };

  const handleUpdateNotice = async () => {
    if (!editingNotice) return;

    const trimmedTitle = editingTitle.trim();
    const trimmedContent = editingContent.trim();

    if (!editingSubjectId) {
      Alert.alert('Target class required', 'Please select an assigned class.');
      return;
    }

    if (!trimmedTitle || !trimmedContent) {
      Alert.alert('Missing information', 'Subject line and message content are required.');
      return;
    }

    if (editingAttachment && !validateFile(editingAttachment)) return;

    try {
      setSubmitting(true);

      const form = new FormData();
      form.append('title', trimmedTitle);
      form.append('content', trimmedContent);
      form.append('target_role', 'student');
      form.append('subject_id', String(editingSubjectId));
      form.append('priority', editingNotice.priority || 'Normal');

      if (editingAttachment) {
        appendFile(form, 'attachment', editingAttachment);
      } else if (editingNotice.attachment_url) {
        form.append('attachment_url', editingNotice.attachment_url);
      }

      await api.put(`/notices/${editingNotice.id}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      closeEdit();
      Alert.alert('Notice updated', 'The notice has been updated successfully.');
      await loadData(false);
    } catch (err: any) {
      console.error('TEACHER NOTICE UPDATE ERROR:', err?.response?.data || err?.message || err);
      Alert.alert(
        'Update failed',
        err?.response?.data?.error || err?.response?.data?.message || 'Unable to update the notice.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = (notice: Notice) => {
    if (deletingId !== null) return;
    setDeleteTarget(notice);
  };

  const confirmDeleteNotice = async () => {
    if (!deleteTarget || deletingId !== null) return;

    const noticeId = deleteTarget.id;

    try {
      setDeletingId(noticeId);
      await api.delete(`/notices/${noticeId}`);

      setNotices((current) =>
        current.filter((item) => String(item.id) !== String(noticeId))
      );

      if (viewingNotice && String(viewingNotice.id) === String(noticeId)) {
        setViewingNotice(null);
      }

      setDeleteTarget(null);
      Alert.alert('Notice deleted', 'The notice was deleted successfully.');
    } catch (err: any) {
      console.error(
        'TEACHER NOTICE DELETE ERROR:',
        err?.response?.data || err?.message || err
      );

      Alert.alert(
        'Delete failed',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Unable to delete the notice.'
      );
    } finally {
      setDeletingId(null);
    }
  };

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
      console.error('TEACHER NOTICE ATTACHMENT ERROR:', err);
      Alert.alert(
        'Unable to open attachment',
        err?.message || 'The attachment could not be opened.'
      );
    } finally {
      setOpeningAttachment(false);
    }
  };

  const renderAttachment = (fileName?: string | null) => {
    if (!fileName) return null;

    return (
      <Pressable
        onPress={() => openAttachment(fileName)}
        style={({ pressed }) => [
          styles.attachmentCard,
          { backgroundColor: colors.soft, borderColor: colors.border },
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.attachmentIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.attachmentText}>
          <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
            {attachmentName(fileName)}
          </Text>
          <Text style={[styles.attachmentMeta, { color: colors.subtle }]}>DOCUMENT ATTACHED • TAP TO OPEN</Text>
        </View>
        <Ionicons name="open-outline" size={18} color={colors.muted} />
      </Pressable>
    );
  };

  const renderSelectedFile = (file: SelectedFile | null, existing?: string | null) => {
    if (file) {
      return (
        <View style={[styles.selectedFile, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
          <Ionicons name="document-attach-outline" size={19} color={colors.primary} />
          <Text style={[styles.selectedFileText, { color: colors.primary }]} numberOfLines={1}>
            {file.name}
          </Text>
          <Pressable onPress={() => (existing ? setEditingAttachment(null) : setAttachment(null))} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={colors.primary} />
          </Pressable>
        </View>
      );
    }

    if (existing) {
      return (
        <View style={[styles.selectedFile, { backgroundColor: colors.soft, borderColor: colors.border }]}>
          <Ionicons name="document-text-outline" size={19} color={colors.muted} />
          <Text style={[styles.selectedFileText, { color: colors.muted }]} numberOfLines={1}>
            Keep existing: {attachmentName(existing)}
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderDraft = () => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
        <View style={[styles.cardHeaderIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="send-outline" size={17} color={colors.primary} />
        </View>
        <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Draft Message</Text>
      </View>

      <View style={styles.form}>
        <FieldLabel label="Target Class" colors={colors} required />
        <Pressable
          onPress={() => setSubjectPickerOpen(true)}
          style={[styles.selectButton, { backgroundColor: colors.soft, borderColor: colors.border }]}
        >
          <View style={styles.selectTextWrap}>
            <Text
              style={[styles.selectText, { color: selectedSubject ? colors.text : colors.subtle }]}
              numberOfLines={2}
            >
              {selectedSubject ? classLabel(selectedSubject) : '-- Select Assigned Class --'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        </Pressable>

        <FieldLabel label="Subject Line" colors={colors} required />
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter notice title"
          placeholderTextColor={colors.subtle}
          style={[styles.input, { backgroundColor: colors.soft, borderColor: colors.border, color: colors.text }]}
          maxLength={160}
        />

        <FieldLabel label="Message Content" colors={colors} required />
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Write your announcement..."
          placeholderTextColor={colors.subtle}
          style={[styles.textarea, { backgroundColor: colors.soft, borderColor: colors.border, color: colors.text }]}
          multiline
          textAlignVertical="top"
          maxLength={5000}
        />

        <FieldLabel label="Attachment (Optional)" colors={colors} />
        <Pressable
          onPress={() => pickDocument(false)}
          style={({ pressed }) => [
            styles.uploadBox,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.uploadIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.uploadTitle, { color: colors.text }]}>Choose Document</Text>
          <Text style={[styles.uploadSubtitle, { color: colors.subtle }]}>PDF, DOC or DOCX • Maximum 5 MB</Text>
        </Pressable>
        {renderSelectedFile(attachment)}

        <Pressable
          onPress={handleSendNotice}
          disabled={submitting}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.primary },
            (pressed || submitting) && styles.pressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="megaphone-outline" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.primaryButtonText}>{submitting ? 'Sending...' : 'Broadcast Now'}</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderNoticeCard = (notice: Notice, sent: boolean) => {
    const isDeleting = String(deletingId) === String(notice.id);

    return (
      <View key={String(notice.id)} style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <View style={styles.noticeInner}>
          <View style={styles.noticeTop}>
            <View style={styles.noticeMain}>
              {sent ? (
                <View style={[styles.recipientBadge, { backgroundColor: colors.primarySoft, borderColor: isDark ? '#1E3A8A' : '#DBEAFE' }]}>
                  <Ionicons name="people-outline" size={12} color={colors.primary} />
                  <Text style={[styles.recipientText, { color: colors.primary }]} numberOfLines={1}>
                    To: {notice.subject_name || 'Assigned Class'}
                  </Text>
                </View>
              ) : (
                <View style={[styles.recipientBadge, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                  <Ionicons name="business-outline" size={12} color={colors.muted} />
                  <Text style={[styles.recipientText, { color: colors.muted }]}>University Announcement</Text>
                </View>
              )}

              <Text style={[styles.noticeTitle, { color: colors.text }]} numberOfLines={2}>
                {notice.title}
              </Text>
            </View>

            <View style={styles.noticeDateWrap}>
              {sent && (
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => openEdit(notice)}
                    disabled={isDeleting}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.iconButton,
                      { backgroundColor: colors.primarySoft },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="create-outline" size={17} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteNotice(notice)}
                    disabled={isDeleting}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.iconButton,
                      { backgroundColor: colors.dangerSoft },
                      pressed && styles.pressed,
                    ]}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                      <Ionicons name="trash-outline" size={17} color={colors.danger} />
                    )}
                  </Pressable>
                </View>
              )}
              <Text style={[styles.noticeDate, { color: colors.subtle }]}>{formatDate(notice.date)}</Text>
            </View>
          </View>

          <Text style={[styles.noticeContent, { color: colors.muted }]} numberOfLines={3}>
            {notice.content || 'No message content.'}
          </Text>

          <View style={styles.noticeFooter}>
            <Pressable
              onPress={() => setViewingNotice(notice)}
              style={({ pressed }) => [styles.readMoreButton, pressed && styles.pressed]}
            >
              <Text style={[styles.readMoreText, { color: colors.primary }]}>Read More</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>

            {notice.attachment_url ? (
              <View style={styles.attachmentIndicator}>
                <Ionicons name="attach-outline" size={14} color={colors.muted} />
                <Text style={[styles.attachmentIndicatorText, { color: colors.muted }]}>Attachment</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const renderSentHistory = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>SENT HISTORY</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{sentNotices.length}</Text>
        </View>
      </View>

      {sentNotices.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="No notices sent yet"
          message="Choose an assigned class and send your first notice."
          colors={colors}
        />
      ) : (
        sentNotices.map((notice) => renderNoticeCard(notice, true))
      )}
    </View>
  );

  const renderInbox = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>OFFICIAL ANNOUNCEMENTS</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{adminNotices.length}</Text>
        </View>
      </View>

      {adminNotices.length === 0 ? (
        <EmptyState
          icon="mail-open-outline"
          title="University inbox is empty"
          message="Official announcements from the university will appear here."
          colors={colors}
        />
      ) : (
        adminNotices.map((notice) => renderNoticeCard(notice, false))
      )}
    </View>
  );

  const renderHeader = () => (
    <>
      <View style={styles.pageHeader}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="megaphone-outline" size={23} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Notice Updates</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Send class-specific notices and keep track of university announcements.</Text>
        </View>
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TabButton
          label="Broadcast to Class"
          icon="megaphone-outline"
          active={activeTab === 'broadcast'}
          onPress={() => setActiveTab('broadcast')}
          colors={colors}
        />
        <TabButton
          label={`University Inbox (${adminNotices.length})`}
          icon="mail-outline"
          active={activeTab === 'inbox'}
          onPress={() => setActiveTab('inbox')}
          colors={colors}
        />
      </View>
    </>
  );

  if (loading && notices.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading communication hub...</Text>
      </View>
    );
  }

  if (error && notices.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}> 
        <View style={[styles.errorIcon, { backgroundColor: colors.dangerSoft }]}>
          <Ionicons name="alert-circle-outline" size={30} color={colors.danger} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Notices unavailable</Text>
        <Text style={[styles.errorMessage, { color: colors.muted }]}>{error}</Text>
        <Pressable
          onPress={() => loadData()}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="refresh-outline" size={17} color="#FFFFFF" />
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData(false);
            }}
            tintColor={colors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}

        {activeTab === 'broadcast' ? (
          <View style={styles.broadcastLayout}>
            {renderDraft()}
            {renderSentHistory()}
          </View>
        ) : (
          renderInbox()
        )}
      </ScrollView>

      <SubjectPickerModal
        visible={subjectPickerOpen}
        subjects={subjects}
        selectedId={selectedSubjectId}
        onClose={() => setSubjectPickerOpen(false)}
        onSelect={(id) => {
          setSelectedSubjectId(id);
          setSubjectPickerOpen(false);
        }}
        colors={colors}
      />

      <EditNoticeModal
        visible={!!editingNotice}
        notice={editingNotice}
        subjects={subjects}
        selectedSubjectId={editingSubjectId}
        title={editingTitle}
        content={editingContent}
        attachment={editingAttachment}
        submitting={submitting}
        colors={colors}
        onClose={closeEdit}
        onSelectSubject={setEditingSubjectId}
        onChangeTitle={setEditingTitle}
        onChangeContent={setEditingContent}
        onPickAttachment={() => pickDocument(true)}
        onClearAttachment={() => setEditingAttachment(null)}
        onSubmit={handleUpdateNotice}
        renderAttachment={renderSelectedFile}
      />

      <DeleteNoticeModal
        visible={!!deleteTarget}
        notice={deleteTarget}
        deleting={deletingId !== null}
        colors={colors}
        onCancel={() => {
          if (deletingId === null) setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteNotice}
      />

      <NoticePreviewModal
        visible={!!viewingNotice}
        notice={viewingNotice}
        colors={colors}
        onClose={() => setViewingNotice(null)}
        onOpenAttachment={openAttachment}
        attachmentOpening={openingAttachment}
      />
    </View>
  );
}

function FieldLabel({
  label,
  required,
  colors,
}: {
  label: string;
  required?: boolean;
  colors: Colors;
}) {
  return (
    <Text style={[styles.fieldLabel, { color: colors.muted }]}> 
      {label.toUpperCase()}
      {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
    </Text>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
  colors,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  colors: Colors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        active
          ? { backgroundColor: colors.primary }
          : { backgroundColor: colors.card },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={17} color={active ? '#FFFFFF' : colors.muted} />
      <Text style={[styles.tabText, { color: active ? '#FFFFFF' : colors.muted }]}>{label}</Text>
    </Pressable>
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
    <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.muted }]}>{message}</Text>
    </View>
  );
}

function SubjectPickerModal({
  visible,
  subjects,
  selectedId,
  onClose,
  onSelect,
  colors,
}: {
  visible: boolean;
  subjects: Subject[];
  selectedId: number | string | '';
  onClose: () => void;
  onSelect: (id: number | string) => void;
  colors: Colors;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}> 
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Select Target Class</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.muted }]}>Choose one of your assigned subjects.</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close-circle-outline" size={27} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetList}>
            {subjects.length === 0 ? (
              <EmptyState
                icon="book-outline"
                title="No assigned classes"
                message="You do not have any assigned subjects available for notices."
                colors={colors}
              />
            ) : (
              subjects.map((subject) => {
                const active = String(subject.id) === String(selectedId);
                return (
                  <Pressable
                    key={String(subject.id)}
                    onPress={() => onSelect(subject.id)}
                    style={({ pressed }) => [
                      styles.subjectOption,
                      {
                        backgroundColor: active ? colors.primarySoft : colors.soft,
                        borderColor: active ? colors.primary : colors.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: active ? colors.primary : colors.card }]}>
                      <Ionicons name="book-outline" size={19} color={active ? '#FFFFFF' : colors.primary} />
                    </View>
                    <View style={styles.optionTextWrap}>
                      <Text style={[styles.optionTitle, { color: colors.text }]} numberOfLines={2}>
                        {subject.subject_name || 'Unnamed Subject'}
                      </Text>
                      <Text style={[styles.optionSubtitle, { color: colors.muted }]} numberOfLines={2}>
                        {[subject.course_name, subject.semester ? `Semester ${subject.semester}` : null, subject.subject_code]
                          .filter(Boolean)
                          .join(' • ')}
                      </Text>
                    </View>
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'ellipse-outline'}
                      size={23}
                      color={active ? colors.primary : colors.subtle}
                    />
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function EditNoticeModal({
  visible,
  notice,
  subjects,
  selectedSubjectId,
  title,
  content,
  attachment,
  submitting,
  colors,
  onClose,
  onSelectSubject,
  onChangeTitle,
  onChangeContent,
  onPickAttachment,
  onClearAttachment,
  onSubmit,
  renderAttachment,
}: {
  visible: boolean;
  notice: Notice | null;
  subjects: Subject[];
  selectedSubjectId: number | string | '';
  title: string;
  content: string;
  attachment: SelectedFile | null;
  submitting: boolean;
  colors: Colors;
  onClose: () => void;
  onSelectSubject: (id: number | string) => void;
  onChangeTitle: (value: string) => void;
  onChangeContent: (value: string) => void;
  onPickAttachment: () => void;
  onClearAttachment: () => void;
  onSubmit: () => void;
  renderAttachment: (file: SelectedFile | null, existing?: string | null) => React.ReactNode;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedSubject = subjects.find((subject) => String(subject.id) === String(selectedSubjectId)) || null;

  if (!visible || !notice) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.editModal, { backgroundColor: colors.card }]}> 
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Edit Announcement</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.muted }]}>Update the notice just like the web portal.</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} disabled={submitting}>
              <Ionicons name="close-circle-outline" size={27} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.editContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <FieldLabel label="Target Class" colors={colors} required />
            <Pressable
              onPress={() => setPickerOpen((current) => !current)}
              style={[styles.selectButton, { backgroundColor: colors.soft, borderColor: colors.border }]}
            >
              <Text style={[styles.selectText, { color: selectedSubject ? colors.text : colors.subtle }]} numberOfLines={2}>
                {selectedSubject ? classLabel(selectedSubject) : '-- Select Assigned Class --'}
              </Text>
              <Ionicons name={pickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </Pressable>

            {pickerOpen ? (
              <View style={[styles.inlinePicker, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                {subjects.map((subject) => {
                  const active = String(subject.id) === String(selectedSubjectId);
                  return (
                    <Pressable
                      key={String(subject.id)}
                      onPress={() => {
                        onSelectSubject(subject.id);
                        setPickerOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.inlineOption,
                        {
                          backgroundColor: active ? colors.primarySoft : colors.card,
                          borderColor: active ? colors.primary : colors.border,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={[styles.optionIcon, { backgroundColor: active ? colors.primary : colors.soft }]}>
                        <Ionicons name="book-outline" size={17} color={active ? '#FFFFFF' : colors.primary} />
                      </View>
                      <View style={styles.optionTextWrap}>
                        <Text style={[styles.optionTitle, { color: colors.text }]} numberOfLines={1}>
                          {subject.subject_name || 'Unnamed Subject'}
                        </Text>
                        <Text style={[styles.optionSubtitle, { color: colors.muted }]} numberOfLines={1}>
                          {[subject.course_name, subject.semester ? `Sem ${subject.semester}` : null]
                            .filter(Boolean)
                            .join(' • ')}
                        </Text>
                      </View>
                      <Ionicons
                        name={active ? 'checkmark-circle' : 'ellipse-outline'}
                        size={21}
                        color={active ? colors.primary : colors.subtle}
                      />
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <FieldLabel label="Subject Line" colors={colors} required />
            <TextInput
              value={title}
              onChangeText={onChangeTitle}
              placeholder="Enter notice title"
              placeholderTextColor={colors.subtle}
              style={[styles.input, { backgroundColor: colors.soft, borderColor: colors.border, color: colors.text }]}
            />

            <FieldLabel label="Message Content" colors={colors} required />
            <TextInput
              value={content}
              onChangeText={onChangeContent}
              placeholder="Write your announcement..."
              placeholderTextColor={colors.subtle}
              style={[styles.textarea, { backgroundColor: colors.soft, borderColor: colors.border, color: colors.text }]}
              multiline
              textAlignVertical="top"
            />

            <FieldLabel label="Attachment (Optional)" colors={colors} />
            <Pressable
              onPress={onPickAttachment}
              style={({ pressed }) => [
                styles.uploadBox,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.uploadIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.uploadTitle, { color: colors.text }]}>Choose New Document</Text>
              <Text style={[styles.uploadSubtitle, { color: colors.subtle }]}>PDF, DOC or DOCX • Maximum 5 MB</Text>
            </Pressable>

            {renderAttachment(attachment, notice.attachment_url)}

            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary },
                pressed && styles.pressed,
              ]}
            >
              {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="save-outline" size={18} color="#FFFFFF" />}
              <Text style={styles.primaryButtonText}>{submitting ? 'Updating...' : 'Update Notice'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>

    </Modal>
  );
}

function DeleteNoticeModal({
  visible,
  notice,
  deleting,
  colors,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  notice: Notice | null;
  deleting: boolean;
  colors: Colors;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!visible || !notice) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmBackdrop}>
        <View style={[styles.confirmModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.confirmIcon, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="trash-outline" size={24} color={colors.danger} />
          </View>

          <Text style={[styles.confirmTitle, { color: colors.text }]}>Delete notice?</Text>
          <Text style={[styles.confirmMessage, { color: colors.muted }]}>This will permanently remove this notice. This action cannot be undone.</Text>

          <View style={styles.confirmActions}>
            <Pressable
              onPress={onCancel}
              disabled={deleting}
              style={[styles.confirmButton, { backgroundColor: colors.soft, borderColor: colors.border }]}
            >
              <Text style={[styles.confirmCancelText, { color: colors.text }]}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={deleting}
              style={[styles.confirmButton, { backgroundColor: colors.danger, borderColor: colors.danger }]}
            >
              {deleting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.confirmDeleteText}>Delete</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NoticePreviewModal({
  visible,
  notice,
  colors,
  onClose,
  onOpenAttachment,
  attachmentOpening,
}: {
  visible: boolean;
  notice: Notice | null;
  colors: Colors;
  onClose: () => void;
  onOpenAttachment: (fileName?: string | null) => void;
  attachmentOpening: boolean;
}) {
  if (!visible || !notice) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.previewModal, { backgroundColor: colors.card }]}> 
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Announcement Preview</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close-circle-outline" size={27} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.previewContent}>
            <View style={styles.previewMetaRow}>
              {notice.priority ? (
                <View style={[styles.priorityBadge, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[styles.priorityText, { color: colors.primary }]}>{notice.priority} Priority</Text>
                </View>
              ) : null}
              <Text style={[styles.previewDate, { color: colors.subtle }]}>Posted: {formatDate(notice.date)}</Text>
            </View>

            <Text style={[styles.previewTitle, { color: colors.text }]}>{notice.title}</Text>

            <View style={[styles.previewBody, { backgroundColor: colors.soft, borderColor: colors.border }]}>
              <Text style={[styles.previewMessage, { color: colors.muted }]}>
                {notice.content || 'No message content.'}
              </Text>
            </View>

            {notice.attachment_url ? (
              <View style={styles.previewAttachmentSection}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>ATTACHED MATERIAL</Text>
                <Pressable
                  onPress={() => onOpenAttachment(notice.attachment_url)}
                  style={[styles.attachmentCard, { backgroundColor: colors.soft, borderColor: colors.border }]}
                >
                  <View style={[styles.attachmentIcon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.attachmentText}>
                    <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                      {attachmentName(notice.attachment_url)}
                    </Text>
                    <Text style={[styles.attachmentMeta, { color: colors.subtle }]}>TAP TO OPEN</Text>
                  </View>
                  {attachmentOpening ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="open-outline" size={18} color={colors.muted} />
                  )}
                </Pressable>
              </View>
            ) : null}

            <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.text }]}> 
              <Text style={[styles.closeButtonText, { color: colors.card }]}>Close Preview</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  loadingText: { marginTop: 12, fontSize: 13, fontWeight: '600' },
  errorIcon: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  errorTitle: { fontSize: 19, fontWeight: '800' },
  errorMessage: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7, maxWidth: 340 },
  retryButton: { marginTop: 18, paddingHorizontal: 18, height: 44, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  pageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, marginLeft: 12 },
  title: { fontSize: 25, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, lineHeight: 18, marginTop: 3 },

  tabBar: { flexDirection: 'row', padding: 4, borderWidth: 1, borderRadius: 16, marginBottom: 18 },
  tabButton: { flex: 1, minHeight: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 7 },
  tabText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },

  broadcastLayout: { gap: 20 },
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { minHeight: 62, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  cardHeaderIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardHeaderTitle: { marginLeft: 10, fontSize: 15, fontWeight: '800' },
  form: { padding: 16, gap: 10 },
  fieldLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 5, marginBottom: 1 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 14, fontWeight: '600' },
  textarea: { minHeight: 120, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingTop: 13, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  selectButton: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  selectTextWrap: { flex: 1 },
  selectText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  uploadBox: { minHeight: 112, borderWidth: 1, borderStyle: 'dashed', borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  uploadIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  uploadTitle: { fontSize: 12, fontWeight: '800' },
  uploadSubtitle: { fontSize: 9, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  selectedFile: { minHeight: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedFileText: { flex: 1, fontSize: 11, fontWeight: '700' },
  primaryButton: { minHeight: 50, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },

  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3, marginBottom: 2 },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  countBadge: { minWidth: 27, height: 25, paddingHorizontal: 8, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 11, fontWeight: '900' },
  noticeCard: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  noticeInner: { padding: 15 },
  noticeTop: { flexDirection: 'row', gap: 10 },
  noticeMain: { flex: 1, minWidth: 0 },
  recipientBadge: { alignSelf: 'flex-start', maxWidth: '100%', borderRadius: 7, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  recipientText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.4, flexShrink: 1 },
  noticeTitle: { fontSize: 17, fontWeight: '900', lineHeight: 22, marginTop: 7 },
  noticeDateWrap: { alignItems: 'flex-end', minWidth: 78 },
  actionRow: { flexDirection: 'row', gap: 6, marginBottom: 7 },
  iconButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  noticeDate: { fontSize: 9, fontWeight: '800', textAlign: 'right' },
  noticeContent: { fontSize: 13, lineHeight: 20, marginTop: 12 },
  noticeFooter: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  readMoreButton: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4 },
  readMoreText: { fontSize: 11, fontWeight: '900' },
  attachmentIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attachmentIndicatorText: { fontSize: 9, fontWeight: '700' },

  attachmentCard: { minHeight: 62, borderRadius: 14, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  attachmentIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  attachmentText: { flex: 1, minWidth: 0 },
  attachmentName: { fontSize: 11, fontWeight: '800' },
  attachmentMeta: { fontSize: 8, fontWeight: '800', letterSpacing: 0.7, marginTop: 3 },

  emptyState: { minHeight: 190, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 22 },
  emptyIcon: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  emptyTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyMessage: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5, maxWidth: 300 },

  confirmBackdrop: { flex: 1, backgroundColor: "rgba(2,6,23,0.62)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmModal: { width: "100%", maxWidth: 390, borderRadius: 22, borderWidth: 1, padding: 20 },
  confirmIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  confirmTitle: { fontSize: 20, fontWeight: "900" },
  confirmMessage: { fontSize: 13, lineHeight: 20, marginTop: 7 },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  confirmButton: { flex: 1, minHeight: 48, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  confirmCancelText: { fontSize: 13, fontWeight: "800" },
  confirmDeleteText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2,6,23,0.62)', justifyContent: 'flex-end' },
  bottomSheet: { maxHeight: '86%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingHorizontal: 16, paddingBottom: 22 },
  editModal: { maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingHorizontal: 16, paddingBottom: 18 },
  previewModal: { maxHeight: '84%', marginHorizontal: 16, borderRadius: 22, padding: 16 },
  sheetHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#94A3B8', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 13 },
  sheetTitle: { fontSize: 19, fontWeight: '900' },
  sheetSubtitle: { fontSize: 11, marginTop: 3 },
  sheetList: { paddingTop: 2 },
  subjectOption: { minHeight: 76, borderWidth: 1, borderRadius: 15, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  inlinePicker: { borderWidth: 1, borderRadius: 14, padding: 7, gap: 7, marginTop: -2, maxHeight: 260 },
  inlineOption: { minHeight: 62, borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionTextWrap: { flex: 1, minWidth: 0 },
  optionTitle: { fontSize: 13, fontWeight: '800', lineHeight: 18 },
  optionSubtitle: { fontSize: 9.5, fontWeight: '600', lineHeight: 14, marginTop: 3 },
  editContent: { paddingBottom: 20, gap: 10 },
  previewContent: { paddingBottom: 5, gap: 12 },
  previewMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  priorityBadge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  priorityText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  previewDate: { fontSize: 9, fontWeight: '800' },
  previewTitle: { fontSize: 24, lineHeight: 30, fontWeight: '900' },
  previewBody: { borderWidth: 1, borderRadius: 16, padding: 15 },
  previewMessage: { fontSize: 14, lineHeight: 22 },
  previewAttachmentSection: { gap: 5 },
  closeButton: { minHeight: 49, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  closeButtonText: { fontSize: 13, fontWeight: '900' },
  pressed: { opacity: 0.72 },
});