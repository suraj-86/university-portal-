import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import api from '../../services/api';
import { setItem } from '../../services/storage';

export default function HomeScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert(
        'Login required',
        'Please enter username and password.'
      );
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        '/login',
        {
          username: username.trim(),
          password,
        },
        {
          headers: {
            'X-Client': 'mobile',
          },
        }
      );

      const { token, user } = response.data;

      if (!token) {
        throw new Error(
          'Login succeeded but no JWT token was returned.'
        );
      }

      await setItem('authToken', token);

      setUser(user);
      setLoggedIn(true);

      console.log('LOGIN SUCCESS:', response.data);
      console.log('TOKEN STORED');
    } catch (error: any) {
      console.log(
        'LOGIN ERROR:',
        error.response?.data || error.message
      );

      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Invalid username or password.';

      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  if (loggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <View style={styles.logoSmall}>
            <Text style={styles.logoText}>U</Text>
          </View>

          <Text style={styles.brandSmall}>
            UNIVERSITY PORTAL
          </Text>

          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>

          <Text style={styles.successTitle}>
            Welcome back
          </Text>

          <Text style={styles.successText}>
            Login successful
          </Text>

          {user && (
            <>
              <Text style={styles.userName}>
                {user.full_name || user.username}
              </Text>

              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {user.role}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.backgroundGlow} />

      <View style={styles.loginCard}>

        {/* Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>U</Text>
          </View>

          <View>
            <Text style={styles.universityName}>
              Babasaheb Bhimrao
            </Text>

            <Text style={styles.universityName}>
              Ambedkar University
            </Text>
          </View>
        </View>

        <Text style={styles.portalLabel}>
          UNIVERSITY PORTAL
        </Text>

        <Text style={styles.title}>
          Welcome back.
        </Text>

        <Text style={styles.subtitle}>
          Sign in to access your university services.
        </Text>

        {/* Username */}
        <View style={styles.field}>
          <Text style={styles.label}>
            USERNAME
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            placeholderTextColor="#7f8aa3"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={styles.label}>
            PASSWORD
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#7f8aa3"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        {/* Login */}
        <TouchableOpacity
          style={[
            styles.loginButton,
            loading && styles.loginButtonDisabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginButtonText}>
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.secureText}>
          Authorized university users only
        </Text>

        <View style={styles.securityRow}>
          <View style={styles.securityDot} />

          <Text style={styles.securityText}>
            Secure institutional access
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050817',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    overflow: 'hidden',
  },

  backgroundGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#123b9c',
    opacity: 0.12,
    top: -130,
    left: -120,
  },

  loginCard: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#101525',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#202a42',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },

  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 34,
  },

  logo: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#1764ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  logoSmall: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1764ff',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },

  logoText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },

  universityName: {
    color: '#f4f7ff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },

  brandSmall: {
    color: '#4d9cff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 28,
  },

  portalLabel: {
    color: '#4d9cff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 8,
  },

  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 8,
  },

  subtitle: {
    color: '#8995ad',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 28,
  },

  field: {
    marginBottom: 18,
  },

  label: {
    color: '#aab5cc',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  input: {
    height: 54,
    backgroundColor: '#edf3ff',
    borderRadius: 11,
    paddingHorizontal: 16,
    color: '#101525',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#d8e3f8',
  },

  loginButton: {
    height: 54,
    backgroundColor: '#1764ff',
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 5,
  },

  loginButtonDisabled: {
    opacity: 0.65,
  },

  loginButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  secureText: {
    color: '#66728b',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 16,
  },

  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
  },

  securityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#18d7a0',
    marginRight: 8,
  },

  securityText: {
    color: '#66728b',
    fontSize: 10,
  },

  successCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#101525',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#202a42',
    padding: 30,
    alignItems: 'center',
  },

  successIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#123d31',
    borderWidth: 1,
    borderColor: '#18d7a0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  successIconText: {
    color: '#18d7a0',
    fontSize: 26,
    fontWeight: '800',
  },

  successTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },

  successText: {
    color: '#8d9ab2',
    fontSize: 14,
    marginBottom: 22,
  },

  userName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },

  roleBadge: {
    backgroundColor: '#182b52',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },

  roleText: {
    color: '#70a7ff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});