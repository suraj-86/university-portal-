import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import { usePathname, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/context/ThemeContext';
import { removeItem } from '@/services/storage';

function ParentDrawerContent({ navigation }: any) {
  const { isDark, toggleTheme } = useAppTheme();
  const pathname = usePathname();
  const router = useRouter();

  const activeRoute = pathname.endsWith('/attendance')
    ? 'attendance'
    : pathname.endsWith('/results')
      ? 'results'
      : pathname.endsWith('/fees')
        ? 'fees'
        : pathname.endsWith('/notices')
          ? 'notices'
          : pathname.endsWith('/profile')
            ? 'profile'
            : pathname.endsWith('/settings')
              ? 'settings'
              : 'index';

  const colors = {
    background: isDark ? '#0F172A' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#1E293B' : '#E2E8F0',
    activeBackground: isDark ? '#172554' : '#EFF6FF',
    activeText: '#2563EB',
  };

  const navigate = (screen: string) => {
    navigation.navigate(screen);
  };

  return (
    <View
      style={[
        styles.drawer,
        { backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.brandSection,
          { borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.logo}>
          <Text style={styles.logoText}>U</Text>
        </View>

        <View style={styles.brandText}>
          <Text
            style={[
              styles.universityName,
              { color: colors.text },
            ]}
          >
            Babasaheb Bhimrao
          </Text>

          <Text
            style={[
              styles.universityName,
              { color: colors.text },
            ]}
          >
            Ambedkar University
          </Text>

          <Text style={styles.portalText}>
            PARENT PORTAL
          </Text>
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.muted },
          ]}
        >
          MAIN MENU
        </Text>

        <MenuItem
          label="Dashboard"
          icon="grid-outline"
          active={activeRoute === 'index'}
          colors={colors}
          onPress={() => navigate('index')}
        />

        <MenuItem
          label="Ward Profile"
          icon="person-outline"
          active={activeRoute === 'profile'}
          colors={colors}
          onPress={() => navigate('profile')}
        />

        <MenuItem
          label="Fees & Payments"
          icon="card-outline"
          active={activeRoute === 'fees'}
          colors={colors}
          onPress={() => navigate('fees')}
        />

        <MenuItem
          label="Attendance"
          icon="calendar-outline"
          active={activeRoute === 'attendance'}
          colors={colors}
          onPress={() => navigate('attendance')}
        />

        <MenuItem
          label="Academic Results"
          icon="bar-chart-outline"
          active={activeRoute === 'results'}
          colors={colors}
          onPress={() => navigate('results')}
        />

        <MenuItem
          label="Campus Notices"
          icon="notifications-outline"
          active={activeRoute === 'notices'}
          colors={colors}
          onPress={() => navigate('notices')}
        />

        <MenuItem
          label="Settings"
          icon="settings-outline"
          active={activeRoute === 'settings'}
          colors={colors}
          onPress={() => navigate('settings')}
        />
      </View>

      <View style={styles.bottomSection}>
        <Pressable
          style={styles.bottomItem}
          onPress={toggleTheme}
        >
          <Ionicons
            name={
              isDark
                ? 'sunny-outline'
                : 'moon-outline'
            }
            size={20}
            color={
              isDark
                ? '#FBBF24'
                : colors.muted
            }
          />

          <Text
            style={[
              styles.bottomText,
              { color: colors.text },
            ]}
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.bottomItem}
          onPress={async () => {
            await removeItem('authToken');
            await removeItem('authUser');
            router.replace('/');
          }}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#EF4444"
          />

          <Text
            style={[
              styles.bottomText,
              { color: '#EF4444' },
            ]}
          >
            Logout
          </Text>
        </Pressable>

        <View
          style={[
            styles.securitySection,
            { borderTopColor: colors.border },
          ]}
        >
          <View style={styles.statusDot} />

          <Text
            style={[
              styles.securityText,
              { color: colors.muted },
            ]}
          >
            Secure institutional access
          </Text>
        </View>
      </View>
    </View>
  );
}

type MenuItemProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  colors: {
    background: string;
    text: string;
    muted: string;
    border: string;
    activeBackground: string;
    activeText: string;
  };
  onPress: () => void;
};

function MenuItem({
  label,
  icon,
  active = false,
  colors,
  onPress,
}: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.menuItem,
        active && {
          backgroundColor:
            colors.activeBackground,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={19}
        color={
          active
            ? colors.activeText
            : colors.muted
        }
      />

      <Text
        style={[
          styles.menuText,
          {
            color: active
              ? colors.activeText
              : colors.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function ParentLayout() {
  const { isDark } = useAppTheme();

  return (
    <Drawer
      drawerContent={(props) => (
        <ParentDrawerContent {...props} />
      )}
      screenOptions={{
        headerShown: true,

        headerTitleAlign: 'left',

        headerStyle: {
          backgroundColor: isDark
            ? '#0F172A'
            : '#FFFFFF',
        },

        headerTintColor: isDark
          ? '#F8FAFC'
          : '#0F172A',

        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '800',
        },

        drawerStyle: {
          width: 280,
          backgroundColor: isDark
            ? '#0F172A'
            : '#FFFFFF',
        },

        drawerType: 'front',

        swipeEnabled: true,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Dashboard',
          drawerItemStyle: {
            display: 'none',
          },
        }}
      />

      <Drawer.Screen
        name="profile"
        options={{
          title: 'Ward Profile',
          drawerItemStyle: {
            display: 'none',
          },
        }}
      />

      <Drawer.Screen
        name="fees"
        options={{
          title: 'Fees & Payments',
          drawerItemStyle: {
            display: 'none',
          },
        }}
      />

      <Drawer.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          drawerItemStyle: {
            display: 'none',
          },
        }}
      />

      <Drawer.Screen
        name="results"
        options={{
          title: 'Academic Results',
          drawerItemStyle: {
            display: 'none',
          },
        }}
      />

      <Drawer.Screen
        name="notices"
        options={{
          title: 'Campus Notices',
          drawerItemStyle: {
            display: 'none',
          },
        }}
      />

      <Drawer.Screen
        name="settings"
        options={{
          title: 'Settings',
          drawerItemStyle: {
            display: 'none',
          },
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    paddingTop: 50,
  },

  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomWidth: 1,
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },

  brandText: {
    marginLeft: 12,
  },

  universityName: {
    fontSize: 12,
    fontWeight: '800',
  },

  portalText: {
    marginTop: 4,
    color: '#2563EB',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  menuSection: {
    flex: 1,
    paddingTop: 22,
    paddingHorizontal: 14,
  },

  sectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginHorizontal: 10,
    marginBottom: 12,
  },

  menuItem: {
    height: 46,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 5,
  },

  menuText: {
    marginLeft: 14,
    fontSize: 14,
    fontWeight: '600',
  },

  bottomSection: {
    paddingHorizontal: 14,
  },

  bottomItem: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 14,
  },

  bottomText: {
    fontSize: 14,
    fontWeight: '600',
  },

  securitySection: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingVertical: 18,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },

  securityText: {
    fontSize: 9,
  },
});