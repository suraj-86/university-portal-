import { Ionicons } from '@expo/vector-icons';

export type Role = 'student' | 'parent' | 'teacher';
type Icon = keyof typeof Ionicons.glyphMap;
export type NavItem = { name: string; title: string; icon: Icon; primary?: boolean };

const common: NavItem[] = [
  { name: 'timetable', title: 'Timetable', icon: 'time-outline' },
  { name: 'notices', title: 'Notices', icon: 'notifications-outline' },
  { name: 'announcements', title: 'Announcements', icon: 'megaphone-outline' },
  { name: 'messages', title: 'Messages', icon: 'chatbubbles-outline' },
  { name: 'notifications', title: 'Notifications', icon: 'alert-circle-outline' },
  { name: 'calendar', title: 'Academic Calendar', icon: 'calendar-number-outline' },
  { name: 'holidays', title: 'Holidays', icon: 'sunny-outline' },
  { name: 'help', title: 'Help & Contacts', icon: 'help-buoy-outline' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline' },
];

// The first four "primary" entries sit in the bottom bar; everything else lives in the drag-up panel.
export const NAV: Record<Role, NavItem[]> = {
  student: [
    { name: 'index', title: 'Home', icon: 'home-outline', primary: true },
    { name: 'attendance', title: 'Attendance', icon: 'calendar-outline', primary: true },
    { name: 'results', title: 'Results', icon: 'ribbon-outline', primary: true },
    { name: 'fees', title: 'Fees', icon: 'wallet-outline', primary: true },
    { name: 'subjects', title: 'My Subjects', icon: 'book-outline' },
    { name: 'profile', title: 'Profile', icon: 'person-outline' },
    { name: 'report-card', title: 'Report Card', icon: 'document-text-outline' },
    { name: 'hostel', title: 'Hostel', icon: 'business-outline' },
    ...common,
  ],
  parent: [
    { name: 'index', title: 'Home', icon: 'home-outline', primary: true },
    { name: 'attendance', title: 'Attendance', icon: 'calendar-outline', primary: true },
    { name: 'results', title: 'Results', icon: 'ribbon-outline', primary: true },
    { name: 'fees', title: 'Fees', icon: 'wallet-outline', primary: true },
    { name: 'profile', title: 'Ward Profile', icon: 'person-outline' },
    { name: 'report-card', title: 'Report Card', icon: 'document-text-outline' },
    { name: 'hostel', title: 'Hostel', icon: 'business-outline' },
    ...common,
  ],
  teacher: [
    { name: 'index', title: 'Home', icon: 'home-outline', primary: true },
    { name: 'attendance', title: 'Attendance', icon: 'calendar-outline', primary: true },
    { name: 'marks', title: 'Marks Entry', icon: 'create-outline', primary: true },
    { name: 'subjects', title: 'My Subjects', icon: 'book-outline', primary: true },
    { name: 'contacts', title: 'Student & Parent Contacts', icon: 'people-outline' },
    ...common,
  ],
};

// Headings for the Menu panel. A page not listed here falls under "More".
export const GROUPS: { title: string; names: string[] }[] = [
  { title: 'Academics', names: ['attendance', 'results', 'marks', 'subjects', 'report-card', 'timetable', 'calendar', 'holidays'] },
  { title: 'Fees and campus', names: ['fees', 'hostel'] },
  { title: 'Communication', names: ['notices', 'announcements', 'messages', 'notifications', 'contacts'] },
  { title: 'Account', names: ['profile', 'help', 'settings'] },
];

export const homePath = (role: string) => `/${role}`;
