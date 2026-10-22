import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '@/services/api';
import { getItem } from '@/services/storage';

// Downloads a protected file (for example a payment receipt) and opens the share sheet so it can be saved or sent.
export async function downloadAndShare(apiPath: string, filename: string) {
  try {
    const token = await getItem('authToken');
    if (Platform.OS === 'web') {
      Alert.alert('Download', 'Receipts can be downloaded from the mobile app or the website.');
      return;
    }
    const target = `${FileSystem.cacheDirectory}${filename}`;
    const res = await FileSystem.downloadAsync(`${API_BASE_URL}/api${apiPath}`, target, { headers: { Authorization: `Bearer ${token}`, 'X-Client': 'mobile' } });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: filename });
    else Alert.alert('Saved', `Saved to ${res.uri}`);
  } catch {
    Alert.alert('Download failed', 'The file could not be downloaded. Please try again.');
  }
}
