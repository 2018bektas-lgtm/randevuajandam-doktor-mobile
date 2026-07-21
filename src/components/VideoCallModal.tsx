import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import { API_URL, apiGet } from '../api/client';
import { buildMeetingRoomHtml } from './meetingRoomHtml';

const TOKEN_KEY = 'randevuajandam.doctor.token';

type MeetingData = {
  can_join?: boolean;
  role?: 'hekim' | 'hasta';
  display_name?: string;
  room?: string;
  host_peer_id?: string;
  ice_servers?: Array<Record<string, unknown>>;
  peerjs?: {
    host?: string;
    port?: number;
    path?: string;
    secure?: boolean;
    key?: string;
  };
  signal_url?: string;
  window?: { baslangic?: string; bitis?: string } | null;
  hasta_adi?: string;
  tarih?: string;
  saat?: string;
  message?: string;
};

type Props = {
  appointmentId: number | null;
  visible: boolean;
  onClose: () => void;
};

async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

/**
 * In-app video call using local WebRTC room HTML + mobile signal API.
 * Does not load website pages (/hekim/gorusme/...).
 */
export function VideoCallModal({ appointmentId, visible, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [meta, setMeta] = useState<MeetingData | null>(null);
  const [baseUrl, setBaseUrl] = useState('https://randevuajandam.com');

  const load = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    setError(null);
    setHtml(null);
    try {
      const token = await readToken();
      if (!token) {
        setError('Oturum bulunamadı. Tekrar giriş yapın.');
        return;
      }
      const res = await apiGet<MeetingData>(`/doctor/appointments/${appointmentId}/meeting`);
      if (!res.success || !res.data) {
        setError(res.message ?? 'Görüşme oturumu alınamadı.');
        return;
      }
      const data = res.data;
      setMeta(data);
      if (!data.can_join) {
        const win = data.window;
        const range =
          win?.baslangic && win?.bitis
            ? `\nPencere: ${new Date(win.baslangic).toLocaleString('tr-TR')} – ${new Date(win.bitis).toLocaleString('tr-TR')}`
            : '';
        setError(
          (res.message ?? 'Görüşme odası henüz açık değil.') +
            range +
            '\n\nRandevu saatine 15 dk kala – 2 saat sonrası aralığında katılabilirsiniz.',
        );
        return;
      }

      const hostPeerId =
        data.host_peer_id ||
        String(data.room || `ra${appointmentId}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);
      const signalUrl =
        data.signal_url ||
        `${API_URL}/doctor/appointments/${appointmentId}/meeting/signal`;

      // Secure context / same-site base for getUserMedia + fetch
      try {
        const u = new URL(API_URL);
        setBaseUrl(`${u.protocol}//${u.host}`);
      } catch {
        setBaseUrl('https://randevuajandam.com');
      }

      const roomHtml = buildMeetingRoomHtml({
        role: data.role || 'hekim',
        displayName: data.display_name || 'Hekim',
        hostPeerId,
        iceServers: data.ice_servers || [{ urls: 'stun:stun.l.google.com:19302' }],
        peerjs: data.peerjs || {
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          key: 'peerjs',
        },
        signalUrl,
        accessToken: token,
        hastaAdi: data.hasta_adi,
        metaLine: [data.tarih, data.saat].filter(Boolean).join(' · '),
      });
      setHtml(roomHtml);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (visible && appointmentId) {
      void load();
    } else {
      setHtml(null);
      setError(null);
      setMeta(null);
      setLoading(false);
    }
  }, [visible, appointmentId, load]);

  const title = useMemo(() => {
    if (!meta) return 'Online görüşme';
    const bits = [meta.hasta_adi, meta.saat].filter(Boolean);
    return bits.length ? bits.join(' · ') : 'Online görüşme';
  }, [meta]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>UYGULAMA İÇİ GÖRÜŞME</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Text style={styles.closeBtnText}>Kapat</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#F58A45" size="large" />
            <Text style={styles.centerText}>Görüşme odası hazırlanıyor…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>Katılınamıyor</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => void load()}>
              <Text style={styles.retryBtnText}>Tekrar dene</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Geri dön</Text>
            </Pressable>
          </View>
        ) : html ? (
          <WebView
            source={{ html, baseUrl }}
            style={styles.webview}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grant"
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            originWhitelist={['*']}
            mixedContentMode="always"
            setSupportMultipleWindows={false}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webLoading}>
                <ActivityIndicator color="#F58A45" />
              </View>
            )}
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.centerText}>Görüşme odası oluşturulamadı.</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0F1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2F42',
    backgroundColor: '#F4F6F9',
  },
  headerEyebrow: {
    color: '#C96A2B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  headerTitle: {
    color: '#102133',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(245,138,69,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,138,69,0.35)',
  },
  closeBtnText: { color: '#C96A2B', fontWeight: '800', fontSize: 13 },
  webview: { flex: 1, backgroundColor: '#0A0F1A' },
  webLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0F1A',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  centerText: { color: '#7A8B9C', marginTop: 14, fontSize: 14, textAlign: 'center' },
  errorTitle: { color: '#102133', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  errorBody: { color: '#8A98A8', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  retryBtn: {
    marginTop: 22,
    backgroundColor: '#F58A45',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryBtnText: { color: '#1A2B3C', fontWeight: '800', fontSize: 14 },
  secondaryBtn: { marginTop: 12, padding: 12 },
  secondaryBtnText: { color: '#C96A2B', fontWeight: '700' },
});
