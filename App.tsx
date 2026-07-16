import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Badge, Button, Card, TextField } from './src/components';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8003/api/mobile/v1';
const SITE_URL = API_URL.replace(/\/api\/mobile\/v1$/, '');
const TOKEN_KEY = 'randevuajandam.doctor.token';

type Doctor = {
  id: number;
  ad_soyad: string;
  unvan: string | null;
  e_posta: string;
  profil_resmi: string | null;
  uzmanlik_alani: string | null;
  branslar: string[];
};

type LoginResponse = {
  success: boolean;
  message?: string;
  data?: {
    requires_two_factor: boolean;
    challenge_token?: string;
    token?: string;
    doktor?: Doctor;
  };
};

export default function App() {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const completeIntro = useCallback(() => setIntroComplete(true), []);

  useEffect(() => {
    void restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        return;
      }

      const response = await fetch(`${API_URL}/doctor/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();

      if (response.ok && payload.success) {
        setDoctor(payload.data as Doctor);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } finally {
      setIsRestoring(false);
    }
  }

  async function signIn() {
    if (!email.trim() || !password) {
      setErrorMessage('E-posta adresinizi ve şifrenizi girin.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_URL}/doctor/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          e_posta: email.trim().toLowerCase(),
          sifre: password,
          device: `Randevu Ajandam Doktor (${Platform.OS})`,
        }),
      });
      const payload = (await response.json()) as LoginResponse;

      if (!response.ok || !payload.success || !payload.data) {
        setErrorMessage(payload.message ?? 'Giriş yapılamadı. Lütfen tekrar deneyin.');
        return;
      }
      if (payload.data.requires_two_factor) {
        setErrorMessage('İki aşamalı doğrulama ekranı bir sonraki adımda eklenecek.');
        return;
      }
      if (!payload.data.token || !payload.data.doktor) {
        setErrorMessage('Oturum başlatılamadı. Lütfen tekrar deneyin.');
        return;
      }

      await SecureStore.setItemAsync(TOKEN_KEY, payload.data.token);
      setDoctor(payload.data.doktor);
      setPassword('');
    } catch {
      setErrorMessage('Sunucuya ulaşılamadı. İnternet bağlantınızı ve uygulama ayarını kontrol edin.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    try {
      if (token) {
        await fetch(`${API_URL}/doctor/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setDoctor(null);
    }
  }

  if (!introComplete) {
    return <IntroScreen onComplete={completeIntro} />;
  }

  if (isRestoring) {
    return <LoadingScreen />;
  }

  if (doctor) {
    return <WelcomeScreen doctor={doctor} onSignOut={signOut} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.heroOrbOne} />
            <View style={styles.heroOrbTwo} />
            <View style={styles.brandRow}>
              <View style={styles.logoShell}>
                <Image
                  source={{ uri: `${SITE_URL}/assets/images/logo.png` }}
                  style={styles.logoImage}
                  accessibilityLabel="Randevu Ajandam"
                />
              </View>
              <View>
                <Text style={styles.brandName}>Randevu Ajandam</Text>
                <Text style={styles.brandSubtitle}>DOKTOR UYGULAMASI</Text>
              </View>
            </View>
            <Text style={styles.welcome}>İyi çalışmalar.</Text>
            <Text style={styles.heroDescription}>
              Takviminiz, hastalarınız ve kliniğiniz avucunuzda.
            </Text>
          </View>

          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>Hesabınıza giriş yapın</Text>
            <Text style={styles.formDescription}>Doktor panelinize güvenle erişin.</Text>

            <TextField
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="E-posta adresi"
              onChangeText={setEmail}
              placeholder="ornek@klinigim.com"
              textContentType="username"
              value={email}
            />

            <TextField
              autoComplete="current-password"
              label="Şifre"
              onChangeText={setPassword}
              onSubmitEditing={signIn}
              placeholder="Şifrenizi girin"
              secureToggle
              textContentType="password"
              value={password}
            />

            {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

            <Button
              disabled={isSubmitting}
              label="Giriş yap"
              loading={isSubmitting}
              onPress={signIn}
              style={styles.signInButton}
            />

            <Pressable onPress={() => void Linking.openURL(`${SITE_URL}/sifremi-unuttum`)}>
              <Text style={styles.forgotPassword}>Şifremi unuttum</Text>
            </Pressable>
          </Card>

          <Text style={styles.footerText}>Randevu Ajandam ile kliniğiniz her zaman yanınızda.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const sceneOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.68);
  const logoRotation = useSharedValue(-18);
  const copyOffset = useSharedValue(18);
  const copyOpacity = useSharedValue(0);
  const firstCardOffset = useSharedValue(160);
  const secondCardOffset = useSharedValue(180);
  const thirdCardOffset = useSharedValue(200);

  useEffect(() => {
    sceneOpacity.value = withTiming(1, { duration: 360 });
    logoScale.value = withSpring(1, { damping: 13, stiffness: 125 });
    logoRotation.value = withSpring(0, { damping: 14, stiffness: 105 });
    copyOpacity.value = withDelay(280, withTiming(1, { duration: 440 }));
    copyOffset.value = withDelay(280, withTiming(0, { duration: 440, easing: Easing.out(Easing.cubic) }));
    firstCardOffset.value = withDelay(680, withSpring(0, { damping: 14, stiffness: 100 }));
    secondCardOffset.value = withDelay(830, withSpring(0, { damping: 14, stiffness: 100 }));
    thirdCardOffset.value = withDelay(980, withSpring(0, { damping: 14, stiffness: 100 }));
    sceneOpacity.value = withDelay(
      2800,
      withTiming(0, { duration: 360 }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      }),
    );
  }, [
    copyOffset,
    copyOpacity,
    firstCardOffset,
    logoRotation,
    logoScale,
    onComplete,
    sceneOpacity,
    secondCardOffset,
    thirdCardOffset,
  ]);

  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }, { rotate: `${logoRotation.value}deg` }],
  }));
  const copyStyle = useAnimatedStyle(() => ({
    opacity: copyOpacity.value,
    transform: [{ translateY: copyOffset.value }],
  }));
  const firstCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: firstCardOffset.value }, { rotate: '-5deg' }],
  }));
  const secondCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: secondCardOffset.value }, { rotate: '2deg' }],
  }));
  const thirdCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: thirdCardOffset.value }, { rotate: '7deg' }],
  }));

  return (
    <View style={styles.introScreen}>
      <StatusBar style="light" />
      <Animated.View style={[styles.introScene, sceneStyle]}>
        <View style={styles.introGlowTop} />
        <View style={styles.introGlowBottom} />
        <Animated.View style={[styles.introLogo, logoStyle]}>
          <Text style={styles.introLogoRa}>rA</Text>
          <View style={styles.introLogoDot} />
        </Animated.View>
        <Animated.View style={[styles.introCopy, copyStyle]}>
          <Text style={styles.introBrand}>Randevu Ajandam</Text>
          <Text style={styles.introHeadline}>Kliniğiniz,{'\n'}sizinle.</Text>
          <Text style={styles.introLabel}>DOKTOR UYGULAMASI</Text>
        </Animated.View>
        <View style={styles.introCards}>
          <Animated.View style={[styles.introAppointment, styles.introAppointmentBack, thirdCardStyle]}>
            <Text style={styles.appointmentTime}>11:15</Text>
            <View style={styles.appointmentGhost} />
          </Animated.View>
          <Animated.View style={[styles.introAppointment, styles.introAppointmentMiddle, secondCardStyle]}>
            <Text style={styles.appointmentTime}>10:00</Text>
            <Text style={styles.appointmentMuted}>Kontrol randevusu</Text>
          </Animated.View>
          <Animated.View style={[styles.introAppointment, styles.introAppointmentFront, firstCardStyle]}>
            <View>
              <Text style={styles.appointmentTime}>09:30</Text>
              <Text style={styles.appointmentPatient}>Yeni randevu</Text>
            </View>
            <Badge label="Bugün" variant="warning" />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator color="#EE7D31" size="large" />
    </View>
  );
}

function WelcomeScreen({ doctor, onSignOut }: { doctor: Doctor; onSignOut: () => Promise<void> }) {
  const title = [doctor.unvan, doctor.ad_soyad].filter(Boolean).join(' ');
  const specialty = doctor.branslar.join(' · ') || doctor.uzmanlik_alani || 'Doktor paneli';

  return (
    <SafeAreaView style={styles.dashboard}>
      <StatusBar style="light" />
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardBrand}>rA</Text>
        <Pressable onPress={() => void onSignOut()}>
          <Text style={styles.signOut}>Çıkış</Text>
        </Pressable>
      </View>
      <View style={styles.dashboardContent}>
        <Text style={styles.dashboardEyebrow}>DOKTOR PANELİ</Text>
        <Text style={styles.dashboardTitle}>Hoş geldiniz,{'\n'}{title}</Text>
        <Text style={styles.dashboardSpecialty}>{specialty}</Text>
        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonTitle}>Paneliniz hazırlanıyor</Text>
          <Text style={styles.comingSoonText}>
            Sıradaki adımda takviminiz, randevularınız ve hasta kayıtlarınız burada olacak.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#0D1B2A' },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D1B2A' },
  introScreen: { flex: 1, overflow: 'hidden', backgroundColor: '#07121F' },
  introScene: { flex: 1, overflow: 'hidden', paddingHorizontal: 30, paddingTop: 72 },
  introGlowTop: { position: 'absolute', top: -190, right: -130, width: 400, height: 400, borderRadius: 200, backgroundColor: '#F0782C', opacity: 0.25 },
  introGlowBottom: { position: 'absolute', bottom: -170, left: -125, width: 370, height: 370, borderRadius: 185, borderWidth: 62, borderColor: '#29445D', opacity: 0.47 },
  introLogo: { width: 62, height: 62, borderRadius: 21, backgroundColor: '#F0782C', alignItems: 'center', justifyContent: 'center', shadowColor: '#F0782C', shadowOpacity: 0.42, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 9 },
  introLogoRa: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -4, paddingRight: 4, fontStyle: 'italic' },
  introLogoDot: { position: 'absolute', top: 14, left: 16, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  introCopy: { marginTop: 42 },
  introBrand: { color: '#B6C4D2', fontSize: 15, fontWeight: '700', letterSpacing: -0.1 },
  introHeadline: { color: '#FFFFFF', fontSize: 42, lineHeight: 48, fontWeight: '800', letterSpacing: -1.7, marginTop: 13 },
  introLabel: { color: '#F2A26F', fontSize: 10, fontWeight: '800', letterSpacing: 2.1, marginTop: 19 },
  introCards: { position: 'absolute', left: 30, right: 30, bottom: 68, height: 230 },
  introAppointment: { position: 'absolute', left: 0, right: 0, minHeight: 90, borderRadius: 21, paddingHorizontal: 20, justifyContent: 'center' },
  introAppointmentBack: { bottom: 92, backgroundColor: '#163149', opacity: 0.62 },
  introAppointmentMiddle: { bottom: 46, backgroundColor: '#1D3C56', opacity: 0.82 },
  introAppointmentFront: { bottom: 0, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 10 },
  appointmentTime: { color: '#F59A5F', fontSize: 14, fontWeight: '800' },
  appointmentPatient: { color: '#1A2B3A', fontSize: 17, fontWeight: '800', marginTop: 3 },
  appointmentMuted: { color: '#BFCBD6', fontSize: 14, marginTop: 4 },
  appointmentGhost: { width: 96, height: 8, borderRadius: 4, backgroundColor: '#32506A', marginTop: 8 },
  scrollContent: { flexGrow: 1, backgroundColor: '#F7F8FC' },
  hero: { minHeight: 320, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 38, backgroundColor: '#0D1B2A', overflow: 'hidden' },
  heroOrbOne: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#EE7D31', opacity: 0.17, top: -125, right: -60 },
  heroOrbTwo: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 30, borderColor: '#FFFFFF', opacity: 0.04, bottom: -72, left: -44 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoShell: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImage: { width: 39, height: 39, resizeMode: 'contain' },
  brandName: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  brandSubtitle: { color: '#F3A26B', fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginTop: 2 },
  welcome: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -1.1, marginTop: 62 },
  heroDescription: { maxWidth: 280, color: '#BEC9D7', fontSize: 16, lineHeight: 24, marginTop: 12 },
  formCard: { marginHorizontal: 20, marginTop: -28 },
  formTitle: { color: '#102133', fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  formDescription: { color: '#6D7D8E', fontSize: 14, marginTop: 7, marginBottom: 26 },
  signInButton: { marginTop: 25 },
  errorMessage: { color: '#C13C2C', fontSize: 13, lineHeight: 19, marginTop: 12 },
  forgotPassword: { color: '#53667A', fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 22 },
  footerText: { color: '#7F8C9B', fontSize: 12, textAlign: 'center', paddingHorizontal: 35, marginTop: 25, marginBottom: 28, lineHeight: 18 },
  dashboard: { flex: 1, backgroundColor: '#0D1B2A' },
  dashboardHeader: { paddingHorizontal: 24, paddingTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dashboardBrand: { color: '#F58A45', fontSize: 28, fontWeight: '900', fontStyle: 'italic' },
  signOut: { color: '#D7DFE9', fontSize: 14, fontWeight: '700' },
  dashboardContent: { flex: 1, paddingHorizontal: 28, paddingTop: 75 },
  dashboardEyebrow: { color: '#F3A26B', fontSize: 11, fontWeight: '800', letterSpacing: 1.7 },
  dashboardTitle: { color: '#FFFFFF', fontSize: 31, lineHeight: 39, fontWeight: '800', letterSpacing: -0.9, marginTop: 13 },
  dashboardSpecialty: { color: '#B7C4D3', fontSize: 15, lineHeight: 22, marginTop: 13 },
  comingSoonCard: { borderWidth: 1, borderColor: '#2B4055', backgroundColor: '#14283B', borderRadius: 22, padding: 22, marginTop: 44 },
  comingSoonTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  comingSoonText: { color: '#B7C4D3', fontSize: 14, lineHeight: 21, marginTop: 9 },
});
