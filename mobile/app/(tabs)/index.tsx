import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';

import api from '../../services/api';
import { setItem } from '../../services/storage';

export default function HomeScreen() {
  const [status, setStatus] = useState('Testing authentication...');

  useEffect(() => {
    const testAuthentication = async () => {
      try {
        const loginResponse = await api.post(
          '/login',
          {
            username: 'adminpatrika',
            password: 'patrika123',
          },
          {
            headers: {
              'X-Client': 'mobile',
            },
          }
        );

        console.log('LOGIN SUCCESS:', loginResponse.data);

        const token = loginResponse.data.token;

        if (!token) {
          throw new Error(
            'Login succeeded but no JWT token was returned.'
          );
        }

        await setItem('authToken', token);

        console.log('TOKEN STORED');

        const dashboardResponse = await api.get(
          '/admin/dashboard-stats'
        );

        console.log(
          'DASHBOARD SUCCESS:',
          dashboardResponse.data
        );

        setStatus('Authentication + API successful ✅');
      } catch (error: any) {
        console.log(
          'AUTH/API ERROR:',
          error.response?.data || error.message
        );

        setStatus('Authentication/API failed ❌');
      }
    };

    testAuthentication();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>University Portal</Text>

      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },

  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  status: {
    color: '#fff',
    fontSize: 16,
  },
});