import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Button, Card, TextField, SelectField, VideoCallModal } from './src/components';
import { AppIcon } from './src/components/AppIcon';
import { TabBar, type TabId } from './src/components/TabBar';
import { LegalLinks } from './src/components/LegalLinks';
import { DateField, TimeField } from './src/components/DateTimeFields';
import {
  API_URL,
  apiGet,
  apiPost,
  flushMutationQueue,
  getAuthRole,
  subscribeOffline,
  tokenStore,
} from './src/api/client';
import { ScreenId } from './src/navigation/types';
import { AuthFlows, AuthMode } from './src/screens/AuthFlows';
import { MODULE_SCREENS } from './src/screens/Modules';
import {
  isOnboardingDone,
  OnboardingScreen,
} from './src/screens/Onboarding';
import { StaffApp, StaffUser } from './src/screens/StaffApp';
import {
  addNotificationResponseListener,
  registerForPushNotifications,
  registerForPushNotificationsDetailed,
} from './src/services/push';
import { applyPendingPackageAfterAuth, loginPurchasesUser } from './src/services/iap';
import { colors } from './src/theme';
import { useLayout } from './src/layout';

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
  const L = useLayout();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [loginRole, setLoginRole] = useState<'doctor' | 'staff'>('doctor');
  const [isRestoring, setIsRestoring] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const completeIntro = useCallback(() => setIntroComplete(true), []);

  useEffect(() => {
    if (!introComplete || isRestoring) return;
    // Gerçek oturum varsa tanıtım yok
    if (doctor || staff) {
      setShowOnboarding(false);
      setOnboardingReady(true);
      return;
    }
    void (async () => {
      try {
        const done = await isOnboardingDone();
        // Misafir + tur bitmemiş → tanıtım (Başla / Zaten hesabım var)
        setShowOnboarding(!done);
      } catch {
        setShowOnboarding(true);
      } finally {
        setOnboardingReady(true);
      }
    })();
  }, [introComplete, isRestoring, doctor, staff]);

  /** Phone OS notification tray push (not in-app list). Silent if already OK. */
  const ensurePhonePush = useCallback(async (showAlert = false) => {
    const r = await registerForPushNotificationsDetailed();
    if (r.ok) return;
    if (!showAlert) return;
    if (r.reason === 'permission') {
      Alert.alert(
        'Bildirim izni',
        'Telefon ekranında randevu bildirimi için Ayarlar → Uygulamalar → Randevu Ajandam Doktor → Bildirimler’i açın.',
      );
      return;
    }
    if (r.reason === 'token_failed' || r.reason === 'api_failed') {
      Alert.alert(
        'Mobil bildirim kurulumu',
        r.detail ??
          'Push token alınamadı. Android için Expo’da FCM (Firebase) kimlik bilgisi gerekir; sonra yeni APK build alın.',
      );
    }
  }, []);

  const applyPendingPackage = useCallback(async (doktorId?: number | null) => {
    try {
      if (doktorId) {
        void loginPurchasesUser(doktorId);
      }
      const result = await applyPendingPackageAfterAuth(async (path, body) => {
        return apiPost(path, body ?? {});
      }, doktorId);
      if (!result.applied || result.action === 'none') {
        return;
      }
      if (result.action === 'free_activated') {
        Alert.alert('Paket aktif', result.message ?? 'Ücretsiz paket aktifleştirildi.');
        return;
      }
      if (result.action === 'klinik_preference') {
        Alert.alert('Klinik paket tercihi', result.message ?? '');
        return;
      }
      if (result.action === 'open_packages' || result.action === 'preferred_saved') {
        // WelcomeScreen mounts after login — request packages screen via AsyncStorage flag
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.setItem('randevuajandam.nav.after.login', 'packages');
        } catch {
          /* ignore */
        }
        Alert.alert('Paket seçiminiz', result.message ?? 'Paketler ekranından devam edin.', [
          { text: 'Tamam' },
        ]);
        return;
      }
      if (result.action === 'error' && result.message) {
        Alert.alert('Paket', result.message);
      }
    } catch {
      /* non-blocking */
    }
  }, []);

  const handleRegistered = useCallback(
    async (token: string, doktor: Doctor) => {
      await tokenStore.set(token, 'doctor');
      setStaff(null);
      setDoctor(doktor);
      setAuthMode('login');
      void ensurePhonePush(true);
      void applyPendingPackage(doktor.id);
    },
    [applyPendingPackage, ensurePhonePush],
  );

  useEffect(() => {
    void restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const role = await getAuthRole();
      const token = await tokenStore.get();

      // Kayıtlı oturum yok → misafir (tanıtım / giriş). Eski token kalıntısını temizle.
      if (!token) {
        await tokenStore.clearAll();
        setDoctor(null);
        setStaff(null);
        return;
      }

      if (role === 'staff') {
        try {
          const response = await fetch(`${API_URL}/staff/auth/me`, {
            headers: { Authorization: `Bearer ${token}`, 'X-Personel-Token': token },
          });
          const payload = await response.json().catch(() => ({}));
          if (response.ok && payload.success && payload.data?.id) {
            setStaff(payload.data as StaffUser);
            setDoctor(null);
            void ensurePhonePush(false);
            return;
          }
          // Only clear on explicit auth failure (401/403), not network/JSON glitches
          if (response.status === 401 || response.status === 403) {
            await tokenStore.clearAll();
            setStaff(null);
            setDoctor(null);
          }
          return;
        } catch {
          // Network offline — keep token, stay logged-out UI only for this session attempt
          return;
        }
      }

      // role doctor veya eski kurulum (role yok ama doctor token var)
      try {
        const response = await fetch(`${API_URL}/doctor/auth/me`, {
          headers: { Authorization: `Bearer ${token}`, 'X-Doktor-Token': token },
        });
        const payload = await response.json().catch(() => ({}));

        if (response.ok && payload.success && payload.data?.id && payload.data?.e_posta) {
          setDoctor(payload.data as Doctor);
          setStaff(null);
          void ensurePhonePush(false);
          return;
        }
        if (response.status === 401 || response.status === 403) {
          await tokenStore.clearAll();
          setDoctor(null);
          setStaff(null);
        }
      } catch {
        // Offline: do not wipe SecureStore tokens
      }
    } catch {
      // Unexpected — do not clear session on generic errors
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
      if (loginRole === 'staff') {
        const response = await fetch(`${API_URL}/staff/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            e_posta: email.trim().toLowerCase(),
            sifre: password,
            device: `Randevu Ajandam Personel (${Platform.OS})`,
          }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success || !payload.data?.token || !payload.data?.personel) {
          setErrorMessage(payload.message ?? 'Personel girişi yapılamadı.');
          return;
        }
        await tokenStore.set(payload.data.token, 'staff');
        setStaff(payload.data.personel as StaffUser);
        setDoctor(null);
        setPassword('');
        void ensurePhonePush(true);
        return;
      }

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
        if (!payload.data.challenge_token) {
          setErrorMessage('Doğrulama oturumu başlatılamadı.');
          return;
        }
        setTwoFactorToken(payload.data.challenge_token);
        setTwoFactorCode('');
        setPassword('');
        return;
      }
      if (!payload.data.token || !payload.data.doktor) {
        setErrorMessage('Oturum başlatılamadı. Lütfen tekrar deneyin.');
        return;
      }

      await tokenStore.set(payload.data.token, 'doctor');
      setDoctor(payload.data.doktor);
      setStaff(null);
      setPassword('');
      setTwoFactorToken(null);
      void ensurePhonePush(true);
      void applyPendingPackage(payload.data.doktor.id);
    } catch {
      setErrorMessage('Sunucuya ulaşılamadı. İnternet bağlantınızı ve uygulama ayarını kontrol edin.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyTwoFactor() {
    if (!twoFactorToken) {
      return;
    }
    if (twoFactorCode.trim().length < 6) {
      setErrorMessage('Authenticator veya yedek kodunuzu girin.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_URL}/doctor/auth/two-factor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          challenge_token: twoFactorToken,
          code: twoFactorCode.trim(),
        }),
      });
      const payload = (await response.json()) as LoginResponse;
      if (!response.ok || !payload.success || !payload.data?.token || !payload.data.doktor) {
        setErrorMessage(payload.message ?? 'Doğrulama kodu hatalı.');
        return;
      }
      await tokenStore.set(payload.data.token, 'doctor');
      setDoctor(payload.data.doktor);
      setStaff(null);
      setTwoFactorToken(null);
      setTwoFactorCode('');
      void ensurePhonePush(true);
      void applyPendingPackage(payload.data.doktor.id);
    } catch {
      setErrorMessage('Sunucuya ulaşılamadı.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    const token = await tokenStore.get();
    const role = await getAuthRole();
    try {
      if (token) {
        const path = role === 'staff' ? '/staff/auth/logout' : '/doctor/auth/logout';
        await fetch(`${API_URL}${path}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            ...(role === 'staff' ? { 'X-Personel-Token': token } : {}),
          },
        });
      }
    } finally {
      await tokenStore.clearAll();
      setDoctor(null);
      setStaff(null);
      // Çıkış sonrası misafir: tanıtım bitmişse login, bitmemişse tur
      try {
        const done = await isOnboardingDone();
        setShowOnboarding(!done);
      } catch {
        setShowOnboarding(true);
      }
    }
  }

  if (!introComplete) {
    return <IntroScreen onComplete={completeIntro} />;
  }

  if (isRestoring) {
    return <LoadingScreen />;
  }

  // Logged-in users skip onboarding tour
  if (staff) {
    return (
      <StaffApp
        staff={staff}
        onStaffUpdated={setStaff}
        onSignOut={signOut}
      />
    );
  }

  if (doctor) {
    return <WelcomeScreen doctor={doctor} onSignOut={signOut} />;
  }

  if (!onboardingReady) {
    return <LoadingScreen />;
  }

  if (showOnboarding) {
    return (
      <OnboardingScreen
        onFinish={(mode) => {
          setShowOnboarding(false);
          setLoginRole('doctor');
          if (mode === 'register') {
            setAuthMode('register');
          } else if (mode === 'packages') {
            // Kullanıcı paket linkine gitti; girişe dönsün
            setAuthMode('login');
          } else {
            setAuthMode('login');
          }
        }}
      />
    );
  }

  const heroTitle =
    twoFactorToken
      ? 'Doğrulama'
      : authMode === 'forgot'
        ? 'Şifre sıfırlama'
        : authMode === 'register'
          ? 'Hekim kayıt'
          : authMode === 'reset'
            ? 'Yeni şifre'
            : 'İyi çalışmalar.';
  const heroDesc =
    twoFactorToken
      ? 'Authenticator uygulamanızdaki 6 haneli kodu veya yedek kodunuzu girin.'
      : authMode === 'login'
        ? 'Takviminiz, hastalarınız ve kliniğiniz avucunuzda.'
        : 'Tüm adımlar uygulama içinde tamamlanır; site sayfası açılmaz.';

  return (
    <View style={[styles.safeArea, { paddingTop: L.safeTop }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: L.footerPad + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.authTop}>
            <View style={styles.brandRow}>
              <View style={styles.logoShell}>
                <Image
                  source={require('./assets/logo.png')}
                  style={styles.logoImage}
                  accessibilityLabel="Randevu Ajandam"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.brandName}>Randevu Ajandam</Text>
                <Text style={styles.brandSubtitle}>HEKİM PANELİ</Text>
              </View>
            </View>
            <Text style={styles.welcome}>{heroTitle}</Text>
            <Text style={styles.heroDescription}>{heroDesc}</Text>
          </View>

          {authMode !== 'login' && !twoFactorToken && loginRole === 'doctor' ? (
            <AuthFlows mode={authMode} onChangeMode={setAuthMode} onRegistered={handleRegistered} />
          ) : (
            <Card style={styles.formCard} elevated>
              {twoFactorToken ? (
                <>
                  <View style={styles.authBadge}>
                    <Text style={styles.authBadgeTxt}>2FA</Text>
                  </View>
                  <Text style={styles.formTitle}>İki adımlı doğrulama</Text>
                  <Text style={styles.formDescription}>Authenticator uygulamanızdaki kodu girin.</Text>
                  <TextField
                    autoCapitalize="none"
                    keyboardType="default"
                    label="Doğrulama kodu"
                    onChangeText={setTwoFactorCode}
                    onSubmitEditing={verifyTwoFactor}
                    placeholder="123456 veya yedek kod"
                    value={twoFactorCode}
                  />
                  {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                  <Button
                    disabled={isSubmitting}
                    label="Doğrula ve giriş yap"
                    loading={isSubmitting}
                    onPress={verifyTwoFactor}
                    style={styles.signInButton}
                  />
                  <Pressable
                    onPress={() => {
                      setTwoFactorToken(null);
                      setTwoFactorCode('');
                      setErrorMessage(null);
                    }}
                  >
                    <Text style={styles.forgotPassword}>Geri dön</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.loginRoleRow}>
                    <Pressable
                      style={[styles.loginRoleBtn, loginRole === 'doctor' && styles.loginRoleBtnOn]}
                      onPress={() => {
                        setLoginRole('doctor');
                        setErrorMessage(null);
                        setAuthMode('login');
                      }}
                    >
                      <Text style={[styles.loginRoleText, loginRole === 'doctor' && styles.loginRoleTextOn]}>
                        Hekim
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.loginRoleBtn, loginRole === 'staff' && styles.loginRoleBtnOn]}
                      onPress={() => {
                        setLoginRole('staff');
                        setErrorMessage(null);
                        setAuthMode('login');
                        setTwoFactorToken(null);
                      }}
                    >
                      <Text style={[styles.loginRoleText, loginRole === 'staff' && styles.loginRoleTextOn]}>
                        Personel
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={styles.formTitle}>
                    {loginRole === 'staff' ? 'Personel girişi' : 'Hoş geldiniz'}
                  </Text>
                  <Text style={styles.formDescription}>
                    {loginRole === 'staff'
                      ? 'Klinik sekreter / resepsiyon hesabınızla giriş yapın.'
                      : 'E-posta ve şifrenizle hekim paneline güvenle erişin.'}
                  </Text>

                  <TextField
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    label="E-posta"
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
                    label={loginRole === 'staff' ? 'Personel paneline gir' : 'Giriş yap'}
                    loading={isSubmitting}
                    onPress={signIn}
                    style={styles.signInButton}
                  />

                  {loginRole === 'doctor' ? (
                    <View style={styles.authLinks}>
                      <Pressable onPress={() => setAuthMode('forgot')} hitSlop={8}>
                        <Text style={styles.forgotPassword}>Şifremi unuttum</Text>
                      </Pressable>
                      <View style={styles.authDivider} />
                      <Pressable onPress={() => setAuthMode('register')} hitSlop={8}>
                        <Text style={styles.registerLink}>Hekim olarak kayıt ol</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={[styles.forgotPassword, { marginTop: 16 }]}>
                      Personel hesabı klinik yöneticiniz tarafından oluşturulur.
                    </Text>
                  )}
                </>
              )}
            </Card>
          )}

          <Text style={styles.footerText}>Kliniğiniz her zaman yanınızda.</Text>
          <LegalLinks tone="light" showKvkk style={{ marginBottom: 12, marginTop: 4 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const L = useLayout();
  const sceneOpacity = useSharedValue(0);
  const sceneScale = useSharedValue(1.04);

  // Ambient radial glow pulse behind the logo mark.
  const glowPulse = useSharedValue(0);

  // Initial entrance of the logo mark.
  const logoEntranceScale = useSharedValue(0.55);
  const logoEntranceOpacity = useSharedValue(0);

  // Continuous "breathing" loop once the logo has landed.
  const logoBreath = useSharedValue(0);

  // Diagonal shimmer sweep across the logo, looping.
  const shimmerX = useSharedValue(-1);

  // Rising sparkle particles.
  const particle1 = useSharedValue(0);
  const particle2 = useSharedValue(0);
  const particle3 = useSharedValue(0);

  const brandOffset = useSharedValue(14);
  const brandOpacity = useSharedValue(0);
  const headlineOffset = useSharedValue(22);
  const headlineOpacity = useSharedValue(0);
  const labelOffset = useSharedValue(14);
  const labelOpacity = useSharedValue(0);

  const trackOpacity = useSharedValue(0);
  const trackSweep = useSharedValue(0);

  useEffect(() => {
    let finished = false;
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      onComplete();
    };

    // Hard fallback: worklet callbacks can fail in Expo Go / emulator.
    // Never leave the user stuck on the splash screen.
    const failsafe = setTimeout(finish, 3200);

    sceneOpacity.value = withSequence(
      withTiming(1, { duration: 420 }),
      withDelay(
        2380,
        withTiming(0, { duration: 420 }, (done) => {
          if (done) {
            runOnJS(finish)();
          }
        }),
      ),
    );
    sceneScale.value = withSequence(
      withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }),
      withDelay(2180, withTiming(1.04, { duration: 420, easing: Easing.in(Easing.cubic) })),
    );

    glowPulse.value = withDelay(120, withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }), -1, true));

    logoEntranceOpacity.value = withDelay(120, withTiming(1, { duration: 420 }));
    logoEntranceScale.value = withDelay(120, withSpring(1, { damping: 11, stiffness: 140 }, (finished) => {
      if (finished) {
        logoBreath.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
      }
    }));

    shimmerX.value = withDelay(700, withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.cubic) }), -1, false));

    particle1.value = withDelay(500, withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.ease) }), -1, false));
    particle2.value = withDelay(1200, withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false));
    particle3.value = withDelay(1900, withRepeat(withTiming(1, { duration: 2900, easing: Easing.out(Easing.ease) }), -1, false));

    brandOpacity.value = withDelay(440, withTiming(1, { duration: 420 }));
    brandOffset.value = withDelay(440, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));

    headlineOpacity.value = withDelay(580, withTiming(1, { duration: 480 }));
    headlineOffset.value = withDelay(580, withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) }));

    labelOpacity.value = withDelay(780, withTiming(1, { duration: 420 }));
    labelOffset.value = withDelay(780, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));

    trackOpacity.value = withDelay(960, withTiming(1, { duration: 320 }));
    trackSweep.value = withDelay(1040, withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.cubic) }), -1, false));

    return () => clearTimeout(failsafe);
  }, [
    brandOffset,
    brandOpacity,
    glowPulse,
    headlineOffset,
    headlineOpacity,
    labelOffset,
    labelOpacity,
    logoBreath,
    logoEntranceOpacity,
    logoEntranceScale,
    onComplete,
    particle1,
    particle2,
    particle3,
    sceneOpacity,
    sceneScale,
    shimmerX,
    trackOpacity,
    trackSweep,
  ]);

  const sceneStyle = useAnimatedStyle(() => ({
    opacity: sceneOpacity.value,
    transform: [{ scale: sceneScale.value }],
  }));

  const glowOuterStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0.16, 0.32]),
    transform: [{ scale: interpolate(glowPulse.value, [0, 1], [1, 1.22]) }],
  }));
  const glowInnerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0.26, 0.48]),
    transform: [{ scale: interpolate(glowPulse.value, [0, 1], [1, 1.12]) }],
  }));

  const logoMarkStyle = useAnimatedStyle(() => {
    const breathScale = interpolate(logoBreath.value, [0, 1], [1, 1.035]);
    const breathLift = interpolate(logoBreath.value, [0, 1], [0, -3]);
    return {
      opacity: logoEntranceOpacity.value,
      transform: [{ scale: logoEntranceScale.value * breathScale }, { translateY: breathLift }],
    };
  });

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerX.value, [-1, 1], [-130, 130]) }, { rotate: '18deg' }],
  }));

  // Hooks must stay at component top-level (not inside a helper).
  const particle1Style = useAnimatedStyle(() => ({
    opacity: interpolate(particle1.value, [0, 0.25, 0.75, 1], [0, 0.9, 0.35, 0]),
    transform: [
      { translateY: interpolate(particle1.value, [0, 1], [16, -34]) },
      { translateX: interpolate(particle1.value, [0, 1], [0, -14]) },
      { scale: interpolate(particle1.value, [0, 1], [0.3, 1.15]) },
      { rotate: `${interpolate(particle1.value, [0, 1], [0, 55])}deg` },
    ],
  }));
  const particle2Style = useAnimatedStyle(() => ({
    opacity: interpolate(particle2.value, [0, 0.25, 0.75, 1], [0, 0.9, 0.35, 0]),
    transform: [
      { translateY: interpolate(particle2.value, [0, 1], [16, -34]) },
      { translateX: interpolate(particle2.value, [0, 1], [0, 10]) },
      { scale: interpolate(particle2.value, [0, 1], [0.3, 1.15]) },
      { rotate: `${interpolate(particle2.value, [0, 1], [0, 55])}deg` },
    ],
  }));
  const particle3Style = useAnimatedStyle(() => ({
    opacity: interpolate(particle3.value, [0, 0.25, 0.75, 1], [0, 0.9, 0.35, 0]),
    transform: [
      { translateY: interpolate(particle3.value, [0, 1], [16, -34]) },
      { translateX: interpolate(particle3.value, [0, 1], [0, -20]) },
      { scale: interpolate(particle3.value, [0, 1], [0.3, 1.15]) },
      { rotate: `${interpolate(particle3.value, [0, 1], [0, 55])}deg` },
    ],
  }));

  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ translateY: brandOffset.value }],
  }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineOffset.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ translateY: labelOffset.value }],
  }));

  const trackStyle = useAnimatedStyle(() => ({ opacity: trackOpacity.value }));
  const trackHighlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(trackSweep.value, [0, 1], [-70, 200]) }],
  }));

  return (
    <Pressable style={styles.introScreen} onPress={onComplete}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.introScene, sceneStyle]} pointerEvents="none">
        <LinearGradient
          colors={['#F4F6F9', '#EEF2F7', '#FFFFFF']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.introGlowTop} />
        <View style={styles.introGlowBottom} />

        <View style={styles.introCenter}>
          <View style={styles.introMarkStack}>
            <Animated.View style={[styles.introAmbientGlowOuter, glowOuterStyle]} />
            <Animated.View style={[styles.introAmbientGlowInner, glowInnerStyle]} />

            <Animated.View style={[styles.introParticle, styles.introParticle1, particle1Style]} />
            <Animated.View style={[styles.introParticle, styles.introParticle2, particle2Style]} />
            <Animated.View style={[styles.introParticle, styles.introParticle3, particle3Style]} />

            <Animated.View style={[styles.introLogoMark, logoMarkStyle]}>
              <Image
                source={require('./assets/logo.png')}
                style={styles.introLogoImage}
                accessibilityLabel="Randevu Ajandam"
              />
              <View style={styles.introShimmerClip}>
                <Animated.View style={[styles.introShimmerBand, shimmerStyle]}>
                  <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.85)', 'transparent']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </View>
            </Animated.View>
          </View>

          <View style={styles.introCopy}>
            <Animated.Text style={[styles.introBrand, brandStyle]}>Randevu Ajandam</Animated.Text>
            <Animated.Text style={[styles.introHeadline, headlineStyle]}>Kliniğiniz,{'\n'}sizinle.</Animated.Text>
            <Animated.Text style={[styles.introLabel, labelStyle]}>DOKTOR UYGULAMASI</Animated.Text>
          </View>
        </View>

        <Animated.View style={[styles.introTrack, trackStyle, { bottom: L.footerPad + 28 }]}>
          <Animated.View style={[styles.introTrackHighlight, trackHighlightStyle]} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator color="#EE7D31" size="large" />
    </View>
  );
}

type AppointmentStatus = 'beklemede' | 'onaylandi' | 'tamamlandi' | 'iptal';

type Appointment = {
  id: number;
  tarih: string;
  saat: string;
  bitis_saat?: string | null;
  sure?: number;
  durum: AppointmentStatus;
  gorusme_tipi: string | null;
  hasta_id?: number | null;
  hasta_adi: string;
  telefon: string | null;
  e_posta?: string | null;
  hizmet_id?: number | null;
  hizmet: string | null;
  not: string | null;
  hekim_notu: string | null;
  online_mi?: boolean;
  join_url?: string | null;
  join_app_url?: string | null;
  can_join?: boolean;
  platform_join_url?: string | null;
};

type PatientOption = {
  id: number;
  ad: string;
  soyad: string;
  telefon: string | null;
  e_posta?: string | null;
};

type ServiceOption = {
  id: number;
  ad: string;
  sure: number;
  fiyat?: number | null;
  aktif_mi: boolean;
};

const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  beklemede: 'Bekliyor',
  onaylandi: 'Onaylandı',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal',
};

const APPOINTMENT_STATUS_COLOR: Record<AppointmentStatus, string> = {
  beklemede: '#C96A2B',
  onaylandi: '#4DBD8C',
  tamamlandi: '#7CA6E0',
  iptal: '#E0687A',
};

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTH_LABELS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await tokenStore.get();
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function weeklyDates(selectedDate: string): string[] {
  const selected = dateFromKey(selectedDate);
  const mondayOffset = (selected.getDay() + 6) % 7;
  const monday = new Date(selected);
  monday.setDate(selected.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toDateKey(date);
  });
}

/** 6-week grid (Mon-start) covering the month of selectedDate. */
function monthGridDates(selectedDate: string): string[] {
  const selected = dateFromKey(selectedDate);
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toDateKey(d);
  });
}

function formatTime(value: string | null | undefined): string {
  if (!value) {
    return '--:--';
  }
  return value.slice(0, 5);
}

function sortAppointments(list: Appointment[]): Appointment[] {
  return [...list].sort((a, b) => {
    const dateCmp = (a.tarih || '').localeCompare(b.tarih || '');
    if (dateCmp !== 0) {
      return dateCmp;
    }
    return formatTime(a.saat).localeCompare(formatTime(b.saat));
  });
}

function WelcomeScreen({ doctor, onSignOut }: { doctor: Doctor; onSignOut: () => Promise<void> }) {
  const L = useLayout();
  const title = [doctor.unvan, doctor.ad_soyad].filter(Boolean).join(' ');
  const specialty = doctor.branslar.join(' · ') || doctor.uzmanlik_alani || 'Doktor paneli';
  const todayKey = toDateKey(new Date());
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => subscribeOffline(setIsOffline), []);

  useEffect(() => {
    void flushMutationQueue();
    const id = setInterval(() => {
      void flushMutationQueue();
    }, 20000);
    return () => clearInterval(id);
  }, []);

  const [screen, setScreen] = useState<ScreenId>('overview');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [deepLinkPending, setDeepLinkPending] = useState<string | null>(null);
  const isCalendar = screen === 'calendar';
  const isOverview = screen === 'overview';
  const isQuickClose = screen === 'quickClose';
  const isProfileTab = (
    screen === 'profile'
    || screen === 'password'
    || screen === 'twoFactor'
    || screen === 'about'
    || screen === 'website'
    || screen === 'packages'
  );
  const isMenuTab = screen === 'menu';
  const isCoreHome = isOverview || isCalendar;
  const ModuleScreen = !isCoreHome ? MODULE_SCREENS[screen] : undefined;

  // Onboarding paid package → open packages screen after login
  useEffect(() => {
    void (async () => {
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const next = await AsyncStorage.getItem('randevuajandam.nav.after.login');
        if (next === 'packages') {
          await AsyncStorage.removeItem('randevuajandam.nav.after.login');
          setScreen('packages');
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Notification tap → navigate (data.screen / appointment_id)
  useEffect(() => {
    return addNotificationResponseListener((data) => {
      const s = String(data.screen ?? data.url ?? '').toLowerCase();
      if (s.includes('package') || s.includes('paket')) {
        setScreen('packages');
      } else if (s.includes('request') || s.includes('talep')) {
        setScreen('requests');
      } else if (s.includes('patient') || s.includes('hasta')) {
        setScreen('patients');
      } else if (s.includes('notif')) {
        setScreen('notifications');
      } else if (s.includes('calendar') || s.includes('takvim') || s.includes('appointment') || s.includes('randevu')) {
        setScreen('calendar');
        const apptId = Number(data.appointment_id ?? data.id);
        if (apptId) {
          setDeepLinkPending(String(apptId));
        }
      } else if (data.appointment_id) {
        setScreen('calendar');
        setDeepLinkPending(String(data.appointment_id));
      } else {
        setScreen('notifications');
      }
    });
  }, []);

  const handleModuleBack = useCallback(() => {
    if (
      screen === 'menu'
      || screen === 'profile'
      || screen === 'notifications'
      || screen === 'quickClose'
    ) {
      setScreen('overview');
      return;
    }
    if (isProfileTab) {
      setScreen('profile');
      return;
    }
    setScreen('menu');
  }, [isProfileTab, screen]);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week');
  const [weekAppointments, setWeekAppointments] = useState<Appointment[]>([]);
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [detailTarget, setDetailTarget] = useState<Appointment | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<{
    toplam_randevu?: number;
    kayitli_hasta?: number;
    bekleyen_talep?: number;
    bugun_randevu?: number;
    bugun_tamamlanan?: number;
    bugun_iptal?: number;
    hafta_randevu?: number;
    bekleme_listesi?: number;
    bekleyen_davet?: number;
    yorum_bekleyen?: number;
    randevuya_acik_mi?: boolean;
    sonraki_randevu?: Appointment | null;
    paket?: { id?: number; ad?: string | null } | null;
    klinik?: { id?: number; ad?: string | null; rol?: string | null } | null;
  } | null>(null);
  const [pendingInvites, setPendingInvites] = useState<
    { id: number; klinik: string; son_kullanma?: string }[]
  >([]);

  const weekDates = weeklyDates(selectedDate);
  const monthDates = monthGridDates(selectedDate);
  const rangeStart = calendarMode === 'month' ? monthDates[0] : weekDates[0];
  const rangeEnd = calendarMode === 'month' ? monthDates[41] : weekDates[6];
  const weekStart = rangeStart;
  const weekEnd = rangeEnd;
  const selectedCalendarDate = dateFromKey(selectedDate);

  const dayAppointments = sortAppointments(
    weekAppointments.filter((item) => item.tarih === selectedDate),
  );
  const overviewList = sortAppointments(
    todayAppointments.filter((item) => ['beklemede', 'onaylandi', 'tamamlandi'].includes(item.durum)),
  );
  const pendingCount = todayAppointments.filter((item) => item.durum === 'beklemede').length;
  const activeCount = todayAppointments.filter((item) => ['beklemede', 'onaylandi'].includes(item.durum)).length;
  const dayActiveCount = dayAppointments.filter((item) => ['beklemede', 'onaylandi'].includes(item.durum)).length;
  const todayConfirmed = todayAppointments.filter((item) => item.durum === 'onaylandi').length;
  const todayCompleted = todayAppointments.filter((item) => item.durum === 'tamamlandi').length;
  const todayCancelled = todayAppointments.filter((item) => item.durum === 'iptal').length;
  const bookingOpen = dashboardStats?.randevuya_acik_mi !== false;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  })();

  const todayDateLabel = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const nextAppointment =
    dashboardStats?.sonraki_randevu ??
    sortAppointments(
      todayAppointments.filter((item) => {
        if (!['beklemede', 'onaylandi'].includes(item.durum)) return false;
        const now = new Date();
        const [hh, mm] = (item.saat || '00:00').split(':').map(Number);
        const t = new Date();
        t.setHours(hh || 0, mm || 0, 0, 0);
        return t >= now;
      }),
    )[0] ??
    null;

  const weekStripDates = weeklyDates(todayKey);
  const weekMaxCount = Math.max(1, ...weekStripDates.map((d) => dayCounts[d] ?? 0));
  const weekTotalFromCounts = weekStripDates.reduce((sum, d) => sum + (dayCounts[d] ?? 0), 0);

  const loadToday = useCallback(async () => {
    try {
      const payload = await apiGet<Appointment[]>('/doctor/appointments', { tarih: todayKey });
      if (payload.success) {
        setTodayAppointments((payload.data as Appointment[]) ?? []);
      }
    } catch {
      // Overview stats fail softly; calendar has its own error surface.
    }
  }, [todayKey]);

  const loadDashboard = useCallback(async () => {
    try {
      const payload = await apiGet<{
        toplam_randevu?: number;
        kayitli_hasta?: number;
        bekleyen_talep?: number;
        bugun_randevu?: number;
        bugun_tamamlanan?: number;
        bugun_iptal?: number;
        hafta_randevu?: number;
        bekleme_listesi?: number;
        bekleyen_davet?: number;
        yorum_bekleyen?: number;
        randevuya_acik_mi?: boolean;
        sonraki_randevu?: Appointment | null;
        paket?: { id?: number; ad?: string | null } | null;
        klinik?: { id?: number; ad?: string | null; rol?: string | null } | null;
      }>('/doctor/dashboard');
      if (payload.success) {
        setDashboardStats(payload.data ?? null);
      }
    } catch {
      // soft fail
    }
  }, []);

  const loadInvites = useCallback(async () => {
    try {
      const payload = await apiGet<any[]>('/doctor/clinic/invites');
      if (payload.success) {
        setPendingInvites(payload.data ?? []);
      }
    } catch {
      // soft fail
    }
  }, []);

  const loadUnreadNotifications = useCallback(async () => {
    try {
      const payload = await apiGet<{ unread?: number }>('/doctor/notifications');
      if (payload.success) {
        setUnreadNotifications(Number(payload.data?.unread ?? 0));
      }
    } catch {
      // soft fail
    }
  }, []);

  const loadCalendar = useCallback(async (start: string, end: string, showSpinner = true) => {
    if (showSpinner) {
      setIsLoading(true);
    }
    setLoadError(null);
    try {
      const payload = await apiGet<{ appointments: Appointment[]; day_counts: Record<string, number> }>(
        '/doctor/calendar',
        { start, end },
      );
      if (payload.success && payload.data) {
        setWeekAppointments(payload.data.appointments as Appointment[]);
        setDayCounts(payload.data.day_counts ?? {});
        if (payload.fromCache) {
          setLoadError('Cevrimdisi: takvim onbelleginden gosteriliyor.');
        }
      } else {
        setLoadError(payload.message ?? 'Takvim yüklenemedi.');
      }
    } catch {
      setLoadError('Sunucuya ulasilamadi. Baglantinizi kontrol edin.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refreshAll = useCallback(async (showSpinner = false) => {
    await Promise.all([
      loadCalendar(weekStart, weekEnd, showSpinner),
      loadToday(),
      loadDashboard(),
      loadInvites(),
      loadUnreadNotifications(),
    ]);
  }, [loadCalendar, loadDashboard, loadInvites, loadToday, loadUnreadNotifications, weekEnd, weekStart]);

  useEffect(() => {
    if (screen === 'overview' || screen === 'notifications') {
      void loadUnreadNotifications();
    }
  }, [screen, loadUnreadNotifications]);

  useEffect(() => {
    void loadToday();
    void loadDashboard();
    void loadInvites();
  }, [loadToday, loadDashboard, loadInvites]);

  useEffect(() => {
    void loadCalendar(weekStart, weekEnd, true);
  }, [loadCalendar, weekStart, weekEnd]);

  // Deep links: randevuajandam-doktor://calendar | menu | appointment/123 | patients | packages | ...
  useEffect(() => {
    function handleUrl(url: string | null) {
      if (!url) return;
      try {
        const normalized = url.replace(/^randevuajandam-doktor:\/\//, '').replace(/^\//, '');
        const [path, idPart] = normalized.split('/');
        if (path === 'calendar' || path === 'takvim') {
          setScreen('calendar');
        } else if (path === 'menu') {
          setScreen('menu');
        } else if (path === 'patients' || path === 'hastalar') {
          setScreen('patients');
        } else if (path === 'requests' || path === 'talepler') {
          setScreen('requests');
        } else if (path === 'finance' || path === 'finans') {
          setScreen('finance');
        } else if (path === 'clinic' || path === 'klinik') {
          setScreen('clinic');
        } else if (path === 'packages' || path === 'paket') {
          setScreen('packages');
        } else if (path === 'notifications' || path === 'bildirim') {
          setScreen('notifications');
        } else if (path === 'appointment' || path === 'randevu') {
          setScreen('calendar');
          const apptId = Number(idPart);
          if (apptId) {
            setDeepLinkPending(String(apptId));
          }
        } else if (path === 'create' || path === 'yeni') {
          setScreen('calendar');
          setCreateOpen(true);
        }
      } catch {
        // ignore bad urls
      }
    }
    void Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!deepLinkPending || weekAppointments.length === 0) return;
    const found = weekAppointments.find((a) => String(a.id) === deepLinkPending);
    if (found) {
      setDetailTarget(found);
      setSelectedDate(found.tarih);
      setDeepLinkPending(null);
    }
  }, [deepLinkPending, weekAppointments]);

  async function updateStatus(id: number, durum: AppointmentStatus) {
    setUpdatingId(id);
    setActionMessage(null);
    try {
      const response = await fetch(`${API_URL}/doctor/appointments/${id}/status`, {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ durum }),
      });
      const payload = await response.json();
      if (response.ok && payload.success) {
        await refreshAll(false);
      } else {
        setActionMessage(payload.message ?? 'Durum güncellenemedi.');
      }
    } catch {
      setActionMessage('Durum güncellenirken bağlantı hatası oluştu.');
    } finally {
      setUpdatingId(null);
    }
  }

  function changeWeek(offset: number) {
    const next = new Date(selectedCalendarDate);
    if (calendarMode === 'month') {
      next.setMonth(selectedCalendarDate.getMonth() + offset);
      next.setDate(1);
    } else {
      next.setDate(selectedCalendarDate.getDate() + offset * 7);
    }
    setSelectedDate(toDateKey(next));
  }

  async function exportIcal() {
    try {
      const response = await fetch(`${API_URL}/doctor/calendar/ical?json=1`, {
        headers: await authHeaders(),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setActionMessage(payload.message ?? 'iCal alınamadı.');
        return;
      }
      const content = (payload.data?.content as string) || '';
      const filename = (payload.data?.filename as string) || 'randevular.ics';
      const count = payload.data?.count ?? 0;
      setActionMessage(`iCal hazır (${count} etkinlik). Paylaşım menüsü açılıyor…`);
      try {
        await Share.share({
          title: filename,
          message: content.length > 12000 ? `${content.slice(0, 12000)}\n…` : content,
        });
      } catch {
        const subject = encodeURIComponent(filename);
        const body = encodeURIComponent(content.slice(0, 1800));
        void Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
      }
    } catch {
      setActionMessage('iCal dışa aktarımında hata oluştu.');
    }
  }

  const listToRender = isOverview ? overviewList : dayAppointments;

  const activeTab: TabId = isOverview
    ? 'overview'
    : isCalendar
      ? 'calendar'
      : isQuickClose
        ? 'quickClose'
        : isProfileTab
          ? 'profile'
          : isMenuTab
            ? 'menu'
            : 'menu';

  const bottomNav = (
    <TabBar
      active={activeTab}
      onChange={(tab) => {
        if (tab === 'overview') setScreen('overview');
        else if (tab === 'calendar') setScreen('calendar');
        else if (tab === 'quickClose') setScreen('quickClose');
        else if (tab === 'menu') setScreen('menu');
        else setScreen('profile');
      }}
    />
  );

  if (ModuleScreen) {
    return (
      <View style={styles.dashboard}>
        <View style={styles.moduleBody}>
          <ModuleScreen
            onBack={handleModuleBack}
            onNavigate={(next) => setScreen(next === 'calendar' ? 'calendar' : next)}
            onSignOut={onSignOut}
          />
        </View>
        {bottomNav}
      </View>
    );
  }

  return (
    <View style={styles.dashboard}>
      <StatusBar style="dark" />
      {isOffline ? (
        <Pressable
          style={styles.offlineBanner}
          onPress={() => {
            void flushMutationQueue().then((n) => {
              if (n > 0) setActionMessage(`${n} bekleyen işlem gönderildi.`);
            });
          }}
        >
          <Text style={styles.offlineBannerText}>
            Çevrimdışı — önbellek / kuyruk aktif · Dokunarak senkronize et
          </Text>
        </Pressable>
      ) : null}
      <View
        style={[
          styles.dashboardHeader,
          {
            paddingTop: Math.max(L.safeTop - 2, L.safeTop * 0.85),
            paddingHorizontal: L.padX,
            paddingBottom: 6,
          },
        ]}
      >
        <View style={styles.dashboardIdentity}>
          <View style={styles.dashboardLogoShell}>
            <Image
              source={require('./assets/logo.png')}
              style={styles.dashboardLogo}
              accessibilityLabel="Randevu Ajandam"
            />
          </View>
          <View style={{ flexShrink: 1, justifyContent: 'center' }}>
            <Text style={styles.dashboardIdentityTitle} numberOfLines={1}>
              {isOverview ? 'Bugün' : isCalendar ? 'Takvim' : 'Panel'}
            </Text>
            <Text style={styles.dashboardIdentitySubtitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
        <Pressable
          style={styles.headerNotifyBtn}
          onPress={() => setScreen('notifications')}
          accessibilityLabel="Bildirimler"
          hitSlop={10}
        >
          <AppIcon name="bell" size={20} color="#0F172A" />
          {unreadNotifications > 0 ? (
            <View
              style={[
                styles.headerNotifyBadge,
                unreadNotifications > 9 && styles.headerNotifyBadgeWide,
              ]}
            >
              <Text style={styles.headerNotifyBadgeText} numberOfLines={1}>
                {unreadNotifications > 99 ? '99+' : String(unreadNotifications)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        style={styles.dashboardContent}
        contentContainerStyle={[
          styles.dashboardScrollContent,
          { paddingHorizontal: L.padX, paddingBottom: L.scrollBottom },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              void refreshAll(false);
            }}
            tintColor="#F58A45"
          />
        }
      >
          <>
            <View style={styles.dashboardHero}>
              <Text style={styles.dashboardEyebrow}>
                {isOverview ? greeting : 'Plan'}
              </Text>
              <Text style={styles.dashboardTitle}>
                {isOverview ? todayDateLabel : 'Randevu takvimi'}
              </Text>
              <Text style={styles.dashboardSpecialty}>
                {isOverview
                  ? specialty || 'Bugünkü programınız'
                  : 'Gün ve hafta görünümü'}
              </Text>
              {isOverview ? (
                <View style={styles.heroMetaRow}>
                  <View style={[styles.heroStatusPill, bookingOpen ? styles.heroStatusOpen : styles.heroStatusClosed]}>
                    <View style={[styles.heroStatusDot, bookingOpen ? styles.heroStatusDotOpen : styles.heroStatusDotClosed]} />
                    <Text style={styles.heroStatusText}>
                      {bookingOpen ? 'Alım açık' : 'Alım kapalı'}
                    </Text>
                  </View>
                  {(dashboardStats?.hafta_randevu ?? weekTotalFromCounts) > 0 ? (
                    <Text style={styles.heroMetaHint}>
                      Bu hafta {dashboardStats?.hafta_randevu ?? weekTotalFromCounts}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            {isOverview && (
              <>
                {pendingInvites.length > 0 ? (
                  <View style={styles.inlineNotice}>
                    <Text style={styles.inlineNoticeText}>
                      {pendingInvites.length} klinik davetiniz var
                    </Text>
                    {pendingInvites.map((inv) => (
                      <View key={inv.id} style={{ marginTop: 10 }}>
                        <Text style={{ color: '#102133', fontWeight: '700' }}>{inv.klinik}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <Pressable
                            style={[styles.retryButton, { backgroundColor: 'rgba(77,189,140,0.2)' }]}
                            onPress={() => {
                              void (async () => {
                                try {
                                  const token = await tokenStore.get();
                                  const res = await fetch(`${API_URL}/doctor/clinic/invites/${inv.id}/accept`, {
                                    method: 'POST',
                                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                                  });
                                  const payload = await res.json();
                                  if (!res.ok || !payload.success) {
                                    setActionMessage(payload.message ?? 'Davet kabul edilemedi.');
                                    return;
                                  }
                                  setActionMessage('Kliniğe katıldınız.');
                                  await refreshAll(false);
                                } catch {
                                  setActionMessage('Bağlantı hatası.');
                                }
                              })();
                            }}
                          >
                            <Text style={styles.retryButtonText}>Kabul et</Text>
                          </Pressable>
                          <Pressable
                            style={styles.retryButton}
                            onPress={() => {
                              void (async () => {
                                try {
                                  const token = await tokenStore.get();
                                  await fetch(`${API_URL}/doctor/clinic/invites/${inv.id}/reject`, {
                                    method: 'POST',
                                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                                  });
                                  await loadInvites();
                                } catch {
                                  //
                                }
                              })();
                            }}
                          >
                            <Text style={styles.retryButtonText}>Reddet</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                {nextAppointment ? (
                  <Pressable
                    style={styles.nextApptCard}
                    onPress={() => {
                      setSelectedDate(nextAppointment.tarih || todayKey);
                      setScreen('calendar');
                      setDetailTarget(nextAppointment);
                    }}
                  >
                    <View style={styles.nextApptTop}>
                      <Text style={styles.nextApptEyebrow}>SIRADAKİ RANDEVU</Text>
                      <View
                        style={[
                          styles.nextApptStatus,
                          { backgroundColor: `${APPOINTMENT_STATUS_COLOR[nextAppointment.durum]}22` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.nextApptStatusText,
                            { color: APPOINTMENT_STATUS_COLOR[nextAppointment.durum] },
                          ]}
                        >
                          {APPOINTMENT_STATUS_LABEL[nextAppointment.durum]}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.nextApptTime}>
                      {formatTime(nextAppointment.saat)}
                      {nextAppointment.bitis_saat ? ` – ${formatTime(nextAppointment.bitis_saat)}` : ''}
                      {nextAppointment.tarih && nextAppointment.tarih !== todayKey
                        ? ` · ${(nextAppointment.tarih || '').split('-').reverse().join('.')}`
                        : ' · Bugün'}
                    </Text>
                    <Text style={styles.nextApptPatient}>{nextAppointment.hasta_adi || 'Hasta'}</Text>
                    {nextAppointment.hizmet ? (
                      <Text style={styles.nextApptService}>{nextAppointment.hizmet}</Text>
                    ) : null}
                    <Text style={styles.nextApptCta}>Detay ve işlemler →</Text>
                  </Pressable>
                ) : (
                  <View style={styles.nextApptEmpty}>
                    <Text style={styles.nextApptEmptyTitle}>Sıradaki randevu yok</Text>
                    <Text style={styles.nextApptEmptyText}>
                      Bugün için kalan aktif randevunuz bulunmuyor. Yeni randevu ekleyebilir veya talepleri kontrol edebilirsiniz.
                    </Text>
                    <View style={styles.nextApptEmptyActions}>
                      <Pressable
                        style={styles.retryButton}
                        onPress={() => {
                          setSelectedDate(todayKey);
                          setCreateOpen(true);
                          setScreen('calendar');
                        }}
                      >
                        <Text style={styles.retryButtonText}>＋ Randevu ekle</Text>
                      </Pressable>
                      <Pressable onPress={() => setScreen('requests')}>
                        <Text style={styles.quickSectionLink}>Taleplere bak</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                <View style={styles.statGrid}>
                  <View style={styles.statRow}>
                    <Pressable style={styles.statCard} onPress={() => setScreen('calendar')}>
                      <Text style={styles.statIcon}>▦</Text>
                      <Text style={styles.statValue}>{dashboardStats?.bugun_randevu ?? activeCount}</Text>
                      <Text style={styles.statLabel}>Bugün aktif</Text>
                      <Text style={styles.statHint}>
                        {todayConfirmed} onaylı · {dashboardStats?.bugun_tamamlanan ?? todayCompleted} tamam
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.statCard, styles.statCardAccent]}
                      onPress={() => setScreen('requests')}
                    >
                      <Text style={styles.statIcon}>◷</Text>
                      <Text style={styles.statValue}>{dashboardStats?.bekleyen_talep ?? pendingCount}</Text>
                      <Text style={styles.statLabel}>Bekleyen talep</Text>
                      <Text style={styles.statHint}>Onay için dokunun</Text>
                    </Pressable>
                  </View>
                  <View style={styles.statRow}>
                    <Pressable style={styles.statCard} onPress={() => setScreen('patients')}>
                      <Text style={styles.statIcon}>♙</Text>
                      <Text style={styles.statValue}>{dashboardStats?.kayitli_hasta ?? '—'}</Text>
                      <Text style={styles.statLabel}>Kayıtlı hasta</Text>
                      <Text style={styles.statHint}>Hasta listesi</Text>
                    </Pressable>
                    <Pressable style={styles.statCard} onPress={() => setScreen('waitlist')}>
                      <Text style={styles.statIcon}>◉</Text>
                      <Text style={styles.statValue}>{dashboardStats?.bekleme_listesi ?? '—'}</Text>
                      <Text style={styles.statLabel}>Bekleme listesi</Text>
                      <Text style={styles.statHint}>Boş slot doldur</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.todayBreakdownCard}>
                  <Text style={styles.todayBreakdownTitle}>Bugünün durumu</Text>
                  <View style={styles.todayBreakdownRow}>
                    {[
                      { label: 'Bekliyor', value: pendingCount, color: APPOINTMENT_STATUS_COLOR.beklemede },
                      { label: 'Onaylı', value: todayConfirmed, color: APPOINTMENT_STATUS_COLOR.onaylandi },
                      {
                        label: 'Tamam',
                        value: dashboardStats?.bugun_tamamlanan ?? todayCompleted,
                        color: APPOINTMENT_STATUS_COLOR.tamamlandi,
                      },
                      {
                        label: 'İptal',
                        value: dashboardStats?.bugun_iptal ?? todayCancelled,
                        color: APPOINTMENT_STATUS_COLOR.iptal,
                      },
                    ].map((item) => (
                      <View key={item.label} style={styles.todayBreakdownItem}>
                        <Text style={[styles.todayBreakdownValue, { color: item.color }]}>{item.value}</Text>
                        <Text style={styles.todayBreakdownLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.weekActivityCard}>
                  <View style={styles.weekActivityHeader}>
                    <View>
                      <Text style={styles.weekActivityTitle}>Haftalık yoğunluk</Text>
                      <Text style={styles.weekActivitySubtitle}>
                        Toplam {dashboardStats?.hafta_randevu ?? weekTotalFromCounts} randevu
                      </Text>
                    </View>
                    <Pressable onPress={() => setScreen('calendar')}>
                      <Text style={styles.quickSectionLink}>Takvim</Text>
                    </Pressable>
                  </View>
                  <View style={styles.weekActivityBars}>
                    {weekStripDates.map((dateKey, index) => {
                      const count = dayCounts[dateKey] ?? 0;
                      const height = count > 0 ? Math.max(10, Math.round((count / weekMaxCount) * 52)) : 4;
                      const isToday = dateKey === todayKey;
                      return (
                        <Pressable
                          key={dateKey}
                          style={styles.weekActivityCol}
                          onPress={() => {
                            setSelectedDate(dateKey);
                            setScreen('calendar');
                          }}
                        >
                          <View
                            style={[
                              styles.weekActivityBar,
                              { height },
                              isToday && styles.weekActivityBarToday,
                              count > 0 && styles.weekActivityBarFilled,
                            ]}
                          />
                          <Text style={[styles.weekActivityDay, isToday && styles.weekActivityDayToday]}>
                            {WEEKDAY_LABELS[index]}
                          </Text>
                          <Text style={styles.weekActivityCount}>{count > 0 ? count : '·'}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.bookingToggleCard}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.statLabel}>Randevu alımı</Text>
                    <Text style={[styles.statValue, { fontSize: 15, marginTop: 2 }]}>
                      {bookingOpen ? 'Açık' : 'Kapalı'}
                    </Text>
                    {dashboardStats?.paket?.ad ? (
                      <Text style={[styles.statLabel, { marginTop: 6 }]}>Paket: {dashboardStats.paket.ad}</Text>
                    ) : null}
                    {dashboardStats?.klinik?.ad ? (
                      <Text style={[styles.statLabel, { marginTop: 4 }]}>
                        Klinik: {dashboardStats.klinik.ad}
                        {dashboardStats.klinik.rol ? ` · ${dashboardStats.klinik.rol}` : ''}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 10 }}>
                    <Pressable
                      style={[styles.retryButton, { minWidth: 88 }]}
                      onPress={() => {
                        void (async () => {
                          try {
                            const open = dashboardStats?.randevuya_acik_mi !== false;
                            const getRes = await fetch(`${API_URL}/doctor/appointment-settings`, {
                              headers: await authHeaders(),
                            });
                            const getPayload = await getRes.json();
                            if (!getRes.ok || !getPayload.success || !getPayload.data) {
                              setActionMessage(getPayload.message ?? 'Ayarlar alınamadı.');
                              return;
                            }
                            const current = getPayload.data as Record<string, unknown>;
                            const putRes = await fetch(`${API_URL}/doctor/appointment-settings`, {
                              method: 'PUT',
                              headers: await authHeaders({ 'Content-Type': 'application/json' }),
                              body: JSON.stringify({ ...current, aktif_mi: !open }),
                            });
                            const putPayload = await putRes.json();
                            if (!putRes.ok || !putPayload.success) {
                              setActionMessage(putPayload.message ?? 'Güncellenemedi.');
                              return;
                            }
                            setDashboardStats((prev) =>
                              prev ? { ...prev, randevuya_acik_mi: !open } : prev,
                            );
                            setActionMessage(!open ? 'Randevu alımı açıldı.' : 'Randevu alımı kapatıldı.');
                          } catch {
                            setActionMessage('Bağlantı hatası.');
                          }
                        })();
                      }}
                    >
                      <Text style={styles.retryButtonText}>{bookingOpen ? 'Kapat' : 'Aç'}</Text>
                    </Pressable>
                    <Pressable onPress={() => setScreen('settings')}>
                      <Text style={styles.quickSectionLink}>Ayarlar</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.quickSectionHeader}>
                  <Text style={styles.quickSectionTitle}>Hızlı işlemler</Text>
                  <Pressable onPress={() => setScreen('menu')}>
                    <Text style={styles.quickSectionLink}>Tüm menü</Text>
                  </Pressable>
                </View>
                <View style={styles.quickActionGrid}>
                  <Pressable style={styles.quickAction} onPress={() => setScreen('calendar')}>
                    <Text style={styles.quickActionIcon}>▦</Text>
                    <Text style={styles.quickActionTitle}>Takvimim</Text>
                    <Text style={styles.quickActionText}>Randevuları yönet</Text>
                  </Pressable>
                  <Pressable style={styles.quickAction} onPress={() => setScreen('requests')}>
                    <View style={styles.quickActionTop}>
                      <Text style={styles.quickActionIcon}>◷</Text>
                      {(dashboardStats?.bekleyen_talep ?? pendingCount) > 0 ? (
                        <View style={styles.quickBadge}>
                          <Text style={styles.quickBadgeText}>
                            {dashboardStats?.bekleyen_talep ?? pendingCount}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.quickActionTitle}>Talepler</Text>
                    <Text style={styles.quickActionText}>Onay bekleyenler</Text>
                  </Pressable>
                </View>
                <View style={styles.quickActionGrid}>
                  <Pressable
                    style={styles.quickAction}
                    onPress={() => {
                      setSelectedDate(todayKey);
                      setCreateOpen(true);
                      setScreen('calendar');
                    }}
                  >
                    <Text style={styles.quickActionIcon}>＋</Text>
                    <Text style={styles.quickActionTitle}>Yeni randevu</Text>
                    <Text style={styles.quickActionText}>Manuel ekle</Text>
                  </Pressable>
                  <Pressable style={styles.quickAction} onPress={() => setScreen('patients')}>
                    <Text style={styles.quickActionIcon}>♙</Text>
                    <Text style={styles.quickActionTitle}>Hastalar</Text>
                    <Text style={styles.quickActionText}>
                      {dashboardStats?.kayitli_hasta != null
                        ? `${dashboardStats.kayitli_hasta} kayıt`
                        : 'Kayıtlar'}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.quickActionGrid}>
                  <Pressable style={styles.quickAction} onPress={() => setScreen('waitlist')}>
                    <View style={styles.quickActionTop}>
                      <Text style={styles.quickActionIcon}>◉</Text>
                      {(dashboardStats?.bekleme_listesi ?? 0) > 0 ? (
                        <View style={styles.quickBadge}>
                          <Text style={styles.quickBadgeText}>{dashboardStats?.bekleme_listesi}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.quickActionTitle}>Bekleme</Text>
                    <Text style={styles.quickActionText}>Listeyi yönet</Text>
                  </Pressable>
                  <Pressable style={styles.quickAction} onPress={() => setScreen('finance')}>
                    <Text style={styles.quickActionIcon}>₺</Text>
                    <Text style={styles.quickActionTitle}>Finans</Text>
                    <Text style={styles.quickActionText}>Gelir / gider</Text>
                  </Pressable>
                </View>
                {(dashboardStats?.yorum_bekleyen ?? 0) > 0 ? (
                  <Pressable style={styles.insightBanner} onPress={() => setScreen('reviews')}>
                    <Text style={styles.insightBannerText}>
                      {dashboardStats?.yorum_bekleyen} yorum onay bekliyor · İncele →
                    </Text>
                  </Pressable>
                ) : null}

                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Bugünün programı</Text>
                    <Text style={styles.sectionSubtitle}>
                      {activeCount
                        ? `${activeCount} aktif · ${dashboardStats?.bugun_tamamlanan ?? todayCompleted} tamamlandı`
                        : 'Programınız şu an müsait'}
                    </Text>
                  </View>
                  <Pressable onPress={() => setScreen('calendar')}>
                    <Text style={styles.quickSectionLink}>Takvim</Text>
                  </Pressable>
                </View>
              </>
            )}

            {isCalendar && (
              <>
                {/* Premium calendar chrome */}
                <View style={styles.calHero}>
                  <View style={styles.calHeroTop}>
                    <Pressable style={styles.calNavBtn} onPress={() => changeWeek(-1)} hitSlop={8}>
                      <Text style={styles.calNavBtnText}>‹</Text>
                    </Pressable>
                    <View style={styles.calHeroTitleWrap}>
                      <Text style={styles.calHeroMonth}>
                        {MONTH_LABELS[selectedCalendarDate.getMonth()]}
                      </Text>
                      <Text style={styles.calHeroYear}>{selectedCalendarDate.getFullYear()}</Text>
                    </View>
                    <Pressable style={styles.calNavBtn} onPress={() => changeWeek(1)} hitSlop={8}>
                      <Text style={styles.calNavBtnText}>›</Text>
                    </Pressable>
                  </View>

                  <View style={styles.calModeSeg}>
                    <Pressable
                      style={[styles.calModeBtn, calendarMode === 'week' && styles.calModeBtnOn]}
                      onPress={() => setCalendarMode('week')}
                    >
                      <Text style={[styles.calModeTxt, calendarMode === 'week' && styles.calModeTxtOn]}>
                        Hafta
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.calModeBtn, calendarMode === 'month' && styles.calModeBtnOn]}
                      onPress={() => setCalendarMode('month')}
                    >
                      <Text style={[styles.calModeTxt, calendarMode === 'month' && styles.calModeTxtOn]}>
                        Ay
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.calChipRow}>
                    <Pressable
                      style={[styles.calChip, selectedDate === todayKey && styles.calChipOn]}
                      onPress={() => setSelectedDate(todayKey)}
                    >
                      <Text style={[styles.calChipTxt, selectedDate === todayKey && styles.calChipTxtOn]}>
                        Bugün
                      </Text>
                    </Pressable>
                    <Pressable style={styles.calChip} onPress={() => void exportIcal()}>
                      <Text style={styles.calChipTxt}>iCal</Text>
                    </Pressable>
                    <Pressable
                      style={styles.calChip}
                      onPress={() => {
                        Alert.alert('Randevu periyodu', 'Slot süresi (dk)', [
                          ...([15, 20, 30, 45, 60] as const).map((p) => ({
                            text: `${p} dk`,
                            onPress: () => {
                              void (async () => {
                                try {
                                  const getRes = await fetch(`${API_URL}/doctor/appointment-settings`, {
                                    headers: await authHeaders(),
                                  });
                                  const getPayload = await getRes.json();
                                  if (!getRes.ok || !getPayload.success || !getPayload.data) {
                                    setActionMessage(getPayload.message ?? 'Ayarlar alınamadı.');
                                    return;
                                  }
                                  const putRes = await fetch(`${API_URL}/doctor/appointment-settings`, {
                                    method: 'PUT',
                                    headers: await authHeaders({ 'Content-Type': 'application/json' }),
                                    body: JSON.stringify({
                                      ...getPayload.data,
                                      randevu_periyodu: p,
                                    }),
                                  });
                                  const putPayload = await putRes.json();
                                  if (!putRes.ok || !putPayload.success) {
                                    setActionMessage(putPayload.message ?? 'Periyot güncellenemedi.');
                                    return;
                                  }
                                  setActionMessage(`Randevu periyodu ${p} dk olarak ayarlandı.`);
                                } catch {
                                  setActionMessage('Bağlantı hatası.');
                                }
                              })();
                            },
                          })),
                          { text: 'Vazgeç', style: 'cancel' as const },
                        ]);
                      }}
                    >
                      <Text style={styles.calChipTxt}>Periyot</Text>
                    </Pressable>
                  </View>
                </View>

                {calendarMode === 'week' ? (
                  <View style={styles.weekStrip}>
                    {weekDates.map((dateKey, index) => {
                      const date = dateFromKey(dateKey);
                      const isSelected = dateKey === selectedDate;
                      const isToday = dateKey === todayKey;
                      const count = dayCounts[dateKey] ?? 0;
                      return (
                        <Pressable
                          key={dateKey}
                          style={[
                            styles.weekDay,
                            isToday && !isSelected && styles.weekDayToday,
                            isSelected && styles.weekDaySelected,
                          ]}
                          onPress={() => setSelectedDate(dateKey)}
                        >
                          <Text style={[styles.weekDayLabel, isSelected && styles.weekDayLabelSelected]}>
                            {WEEKDAY_LABELS[index]}
                          </Text>
                          <Text style={[styles.weekDayNumber, isSelected && styles.weekDayNumberSelected]}>
                            {date.getDate()}
                          </Text>
                          {count > 0 ? (
                            <View style={[styles.weekDayBadge, isSelected && styles.weekDayBadgeOn]}>
                              <Text style={[styles.weekDayBadgeTxt, isSelected && styles.weekDayBadgeTxtOn]}>
                                {count > 9 ? '9+' : count}
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.weekDayDotSpacer} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.monthGrid}>
                    <View style={styles.monthHeaderRow}>
                      {WEEKDAY_LABELS.map((d) => (
                        <Text key={d} style={styles.monthHeaderCell}>
                          {d}
                        </Text>
                      ))}
                    </View>
                    {Array.from({ length: 6 }, (_, row) => (
                      <View key={row} style={styles.monthRow}>
                        {monthDates.slice(row * 7, row * 7 + 7).map((dateKey) => {
                          const date = dateFromKey(dateKey);
                          const inMonth = date.getMonth() === selectedCalendarDate.getMonth();
                          const isSelected = dateKey === selectedDate;
                          const isToday = dateKey === todayKey;
                          const count = dayCounts[dateKey] ?? 0;
                          return (
                            <Pressable
                              key={dateKey}
                              style={[
                                styles.monthCell,
                                isToday && !isSelected && styles.monthCellToday,
                                isSelected && styles.monthCellSelected,
                                !inMonth && styles.monthCellMuted,
                              ]}
                              onPress={() => setSelectedDate(dateKey)}
                            >
                              <Text
                                style={[
                                  styles.monthCellText,
                                  isSelected && styles.monthCellTextSelected,
                                  isToday && !isSelected && styles.monthCellTextToday,
                                ]}
                              >
                                {date.getDate()}
                              </Text>
                              {count > 0 ? (
                                <View style={[styles.monthCountPill, isSelected && styles.monthCountPillOn]}>
                                  <Text
                                    style={[styles.monthCountTxt, isSelected && styles.monthCountTxtOn]}
                                  >
                                    {count}
                                  </Text>
                                </View>
                              ) : (
                                <View style={styles.monthCountSpacer} />
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.calendarAgendaHeader}>
                  <View style={styles.calendarAgendaCopy}>
                    <Text style={styles.calendarAgendaTitle}>
                      {selectedDate === todayKey
                        ? 'Bugün'
                        : selectedCalendarDate.toLocaleDateString('tr-TR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'short',
                          })}
                    </Text>
                    <Text style={styles.calendarAgendaSubtitle}>
                      {dayAppointments.length === 0
                        ? 'Randevu yok'
                        : `${dayAppointments.length} randevu · ${dayActiveCount} aktif`}
                    </Text>
                  </View>
                  <Pressable style={styles.addAppointmentButton} onPress={() => setCreateOpen(true)}>
                    <Text style={styles.addAppointmentButtonText}>+ Ekle</Text>
                  </Pressable>
                </View>
              </>
            )}

            {actionMessage ? (
              <View style={styles.inlineNotice}>
                <Text style={styles.inlineNoticeText}>{actionMessage}</Text>
              </View>
            ) : null}

            {isLoading && isCalendar ? (
              <ActivityIndicator color="#F58A45" style={styles.appointmentsLoading} />
            ) : loadError && isCalendar ? (
              <View style={styles.comingSoonCard}>
                <Text style={styles.comingSoonTitle}>Bir sorun oluştu</Text>
                <Text style={styles.comingSoonText}>{loadError}</Text>
                <Pressable style={styles.retryButton} onPress={() => void refreshAll(true)}>
                  <Text style={styles.retryButtonText}>Tekrar dene</Text>
                </Pressable>
              </View>
            ) : listToRender.length === 0 ? (
              <View style={isCalendar ? styles.calEmpty : styles.comingSoonCard}>
                <Text style={isCalendar ? styles.calEmptyIcon : undefined}>{isCalendar ? '📅' : null}</Text>
                <Text style={isCalendar ? styles.calEmptyTitle : styles.comingSoonTitle}>Randevu yok</Text>
                <Text style={isCalendar ? styles.calEmptyText : styles.comingSoonText}>
                  {isOverview
                    ? 'Bugün için planlanmış bir randevunuz bulunmuyor.'
                    : selectedDate === todayKey
                      ? 'Bugün için planlanmış randevu yok. Yeni ekleyebilirsiniz.'
                      : 'Bu gün için planlanmış randevu yok.'}
                </Text>
                {isCalendar ? (
                  <Pressable style={styles.calEmptyBtn} onPress={() => setCreateOpen(true)}>
                    <Text style={styles.calEmptyBtnTxt}>Yeni randevu</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : isCalendar ? (
              <View style={styles.timeline}>
                {listToRender.map((appointment, idx) => (
                  <TimelineAppointmentRow
                    key={appointment.id}
                    appointment={appointment}
                    isLast={idx === listToRender.length - 1}
                    busy={updatingId === appointment.id}
                    onUpdateStatus={(durum) => void updateStatus(appointment.id, durum)}
                    onReschedule={() => setRescheduleTarget(appointment)}
                    onOpenDetail={() => setDetailTarget(appointment)}
                  />
                ))}
              </View>
            ) : (
              listToRender.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  busy={updatingId === appointment.id}
                  compact={false}
                  onUpdateStatus={(durum) => void updateStatus(appointment.id, durum)}
                  onReschedule={() => setRescheduleTarget(appointment)}
                  onOpenDetail={() => {
                    if (isOverview) {
                      setScreen('calendar');
                      setSelectedDate(appointment.tarih);
                    }
                    setDetailTarget(appointment);
                  }}
                />
              ))
            )}
          </>
      </ScrollView>

      {bottomNav}

      <CreateAppointmentModal
        visible={createOpen}
        defaultDate={selectedDate}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
          setActionMessage('Randevu oluşturuldu.');
          await refreshAll(false);
        }}
      />

      <RescheduleAppointmentModal
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSaved={async (dateKey) => {
          setRescheduleTarget(null);
          setSelectedDate(dateKey);
          setActionMessage('Randevu saati güncellendi.');
          await refreshAll(false);
        }}
      />

      <AppointmentDetailModal
        appointment={detailTarget}
        onClose={() => setDetailTarget(null)}
        onChanged={async () => {
          setDetailTarget(null);
          await refreshAll(false);
        }}
        onReschedule={(a) => {
          setDetailTarget(null);
          setRescheduleTarget(a);
        }}
      />
    </View>
  );
}

/** Takvim gün listesi — ince timeline satırı */
function TimelineAppointmentRow({
  appointment,
  isLast,
  busy,
  onUpdateStatus,
  onReschedule,
  onOpenDetail,
}: {
  appointment: Appointment;
  isLast: boolean;
  busy: boolean;
  onUpdateStatus: (durum: AppointmentStatus) => void;
  onReschedule: () => void;
  onOpenDetail: () => void;
}) {
  const statusColor = APPOINTMENT_STATUS_COLOR[appointment.durum];
  const timeStart = formatTime(appointment.saat);
  const timeEnd = appointment.bitis_saat ? formatTime(appointment.bitis_saat) : null;
  const online = appointment.gorusme_tipi === 'online' || appointment.online_mi;
  const showQuick =
    appointment.durum === 'beklemede' || appointment.durum === 'onaylandi';

  return (
    <View style={styles.tlRow}>
      <View style={styles.tlRail}>
        <Text style={styles.tlTime}>{timeStart}</Text>
        {timeEnd ? <Text style={styles.tlTimeEnd}>{timeEnd}</Text> : null}
        <View style={[styles.tlDot, { backgroundColor: statusColor }]} />
        {!isLast ? <View style={styles.tlLine} /> : null}
      </View>
      <Pressable
        style={[styles.tlCard, busy && { opacity: 0.65 }]}
        onPress={onOpenDetail}
        onLongPress={onReschedule}
        delayLongPress={350}
      >
        <View style={styles.tlCardTop}>
          <Text style={styles.tlPatient} numberOfLines={1}>
            {appointment.hasta_adi || 'Hasta'}
          </Text>
          <View style={[styles.tlStatus, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[styles.tlStatusTxt, { color: statusColor }]}>
              {APPOINTMENT_STATUS_LABEL[appointment.durum]}
            </Text>
          </View>
        </View>
        <View style={styles.tlMetaRow}>
          {appointment.hizmet ? (
            <Text style={styles.tlMeta} numberOfLines={1}>
              {appointment.hizmet}
            </Text>
          ) : null}
          {online ? <Text style={styles.tlOnline}>Online</Text> : null}
        </View>
        {showQuick ? (
          <View style={styles.tlActions}>
            {appointment.durum === 'beklemede' ? (
              <Pressable
                disabled={busy}
                style={[styles.tlAct, styles.tlActOk]}
                onPress={() => onUpdateStatus('onaylandi')}
              >
                <Text style={[styles.tlActTxt, { color: '#2E9E5B' }]}>Onayla</Text>
              </Pressable>
            ) : null}
            <Pressable disabled={busy} style={styles.tlAct} onPress={onReschedule}>
              <Text style={styles.tlActTxt}>Ertele</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              style={styles.tlAct}
              onPress={() => onUpdateStatus('tamamlandi')}
            >
              <Text style={styles.tlActTxt}>Tamam</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              style={[styles.tlAct, styles.tlActDanger]}
              onPress={() => onUpdateStatus('iptal')}
            >
              <Text style={[styles.tlActTxt, { color: '#C13C2C' }]}>İptal</Text>
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

function AppointmentCard({
  appointment,
  busy,
  compact,
  onUpdateStatus,
  onReschedule,
  onOpenDetail,
}: {
  appointment: Appointment;
  busy: boolean;
  compact?: boolean;
  onUpdateStatus: (durum: AppointmentStatus) => void;
  onReschedule: () => void;
  onOpenDetail?: () => void;
}) {
  const timeLabel = appointment.bitis_saat
    ? `${formatTime(appointment.saat)} – ${formatTime(appointment.bitis_saat)}`
    : formatTime(appointment.saat);
  const dateLabel = (appointment.tarih || '').split('-').reverse().join('.');
  const statusColor = APPOINTMENT_STATUS_COLOR[appointment.durum];

  return (
    <Pressable
      style={[styles.appointmentCard, { borderLeftColor: statusColor, borderLeftWidth: 3 }]}
      onPress={onOpenDetail}
      onLongPress={onReschedule}
      delayLongPress={380}
    >
      <View style={styles.appointmentCardHeader}>
        <Text style={styles.appointmentTime}>
          {timeLabel} · {dateLabel}
        </Text>
        <View style={[styles.appointmentStatusPill, { backgroundColor: `${statusColor}22` }]}>
          <Text style={[styles.appointmentStatusText, { color: statusColor }]}>
            {APPOINTMENT_STATUS_LABEL[appointment.durum]}
          </Text>
        </View>
      </View>
      <Text style={styles.appointmentPatient}>{appointment.hasta_adi || 'Hasta'}</Text>
      {appointment.hizmet ? <Text style={styles.appointmentService}>{appointment.hizmet}</Text> : null}
      {appointment.gorusme_tipi === 'online' || appointment.online_mi ? (
        <Text style={styles.appointmentMeta}>Online görüşme</Text>
      ) : null}
      {appointment.telefon ? <Text style={styles.appointmentPhone}>{appointment.telefon}</Text> : null}

      {!compact && (appointment.durum === 'beklemede' || appointment.durum === 'onaylandi') ? (
        <View style={styles.appointmentActions}>
          {appointment.durum === 'beklemede' ? (
            <Pressable
              disabled={busy}
              style={[styles.appointmentActionButton, styles.appointmentActionConfirm]}
              onPress={() => onUpdateStatus('onaylandi')}
            >
              <Text style={styles.appointmentActionText}>Onayla</Text>
            </Pressable>
          ) : null}
          <Pressable
            disabled={busy}
            style={[styles.appointmentActionButton, styles.appointmentActionReschedule]}
            onPress={onReschedule}
          >
            <Text style={styles.appointmentActionText}>Ertele</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            style={[styles.appointmentActionButton, styles.appointmentActionComplete]}
            onPress={() => onUpdateStatus('tamamlandi')}
          >
            <Text style={styles.appointmentActionText}>Tamam</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            style={[styles.appointmentActionButton, styles.appointmentActionCancel]}
            onPress={() => onUpdateStatus('iptal')}
          >
            <Text style={styles.appointmentActionText}>İptal</Text>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

function AppointmentDetailModal({
  appointment,
  onClose,
  onChanged,
  onReschedule,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onReschedule: (a: Appointment) => void;
}) {
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [hekimNotu, setHekimNotu] = useState('');
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [hizmetId, setHizmetId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoCallOpen, setVideoCallOpen] = useState(false);

  useEffect(() => {
    if (!appointment) {
      setDetail(null);
      return;
    }
    setDetail(appointment);
    setHekimNotu(appointment.hekim_notu || '');
    setHizmetId(appointment.hizmet_id ?? null);
    setError(null);
    void (async () => {
      try {
        const [dRes, sRes] = await Promise.all([
          fetch(`${API_URL}/doctor/appointments/${appointment.id}`, { headers: await authHeaders() }),
          fetch(`${API_URL}/doctor/services`, { headers: await authHeaders() }),
        ]);
        const dPayload = await dRes.json();
        const sPayload = await sRes.json();
        if (dRes.ok && dPayload.success) {
          setDetail(dPayload.data as Appointment);
          setHekimNotu(dPayload.data.hekim_notu || '');
          setHizmetId(dPayload.data.hizmet_id ?? null);
        }
        if (sRes.ok && sPayload.success) {
          setServices((sPayload.data as ServiceOption[]).filter((s) => s.aktif_mi));
        }
      } catch {
        // keep list payload
      }
    })();
  }, [appointment]);

  async function saveNotes() {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/doctor/appointments/${detail.id}`, {
        method: 'PUT',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          hekim_notu: hekimNotu,
          hizmet_id: hizmetId,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload.message ?? 'Kaydedilemedi.');
        return;
      }
      setDetail(payload.data as Appointment);
      await onChanged();
    } catch {
      setError('Sunucuya ulaşılamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(durum: AppointmentStatus) {
    if (!detail) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/doctor/appointments/${detail.id}/status`, {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ durum, hekim_notu: hekimNotu }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload.message ?? 'Durum güncellenemedi.');
        return;
      }
      await onChanged();
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!detail) return;
    Alert.alert('Randevuyu sil', 'Bu randevu silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              const response = await fetch(`${API_URL}/doctor/appointments/${detail.id}`, {
                method: 'DELETE',
                headers: await authHeaders(),
              });
              const payload = await response.json();
              if (!response.ok || !payload.success) {
                setError(payload.message ?? 'Silinemedi.');
                return;
              }
              await onChanged();
            } catch {
              setError('Bağlantı hatası.');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  return (
    <Modal visible={!!appointment} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Randevu detayı</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.modalClose}>Kapat</Text>
            </Pressable>
          </View>
          {detail ? (
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalLabel}>Hasta</Text>
              <Text style={styles.appointmentPatient}>{detail.hasta_adi}</Text>
              {detail.telefon ? <Text style={styles.appointmentPhone}>{detail.telefon}</Text> : null}
              {detail.e_posta ? <Text style={styles.appointmentPhone}>{detail.e_posta}</Text> : null}
              <View style={styles.appointmentActions}>
                {detail.telefon ? (
                  <>
                    <Pressable
                      style={[styles.appointmentActionButton, styles.appointmentActionConfirm]}
                      onPress={() => {
                        const p = (detail.telefon || '').replace(/[^\d+]/g, '');
                        if (p) void Linking.openURL(`tel:${p}`);
                      }}
                    >
                      <Text style={styles.appointmentActionText}>Ara</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.appointmentActionButton, styles.appointmentActionReschedule]}
                      onPress={() => {
                        const p = (detail.telefon || '').replace(/[^\d+]/g, '');
                        if (p) void Linking.openURL(`sms:${p}`);
                      }}
                    >
                      <Text style={styles.appointmentActionText}>SMS</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>

              <Text style={styles.modalLabel}>Zaman</Text>
              <Text style={styles.appointmentService}>
                {detail.tarih} · {formatTime(detail.saat)}
                {detail.bitis_saat ? ` – ${formatTime(detail.bitis_saat)}` : ''}
              </Text>
              <Text style={styles.appointmentMeta}>{APPOINTMENT_STATUS_LABEL[detail.durum]}</Text>

              {(detail.online_mi || detail.gorusme_tipi === 'online') ? (
                <>
                  <Text style={[styles.appointmentMeta, { marginTop: 10 }]}>
                    Online görüşme — uygulama içinde kamera ve mikrofon ile bağlanırsınız. Hasta kendi linkinden katılır.
                  </Text>
                  {detail.durum === 'onaylandi' ? (
                    <Pressable
                      style={[styles.modalPrimaryButton, { marginTop: 14 }]}
                      onPress={() => setVideoCallOpen(true)}
                    >
                      <Text style={styles.modalPrimaryButtonText}>📹 Görüşmeye katıl</Text>
                    </Pressable>
                  ) : (
                    <Text style={[styles.appointmentMeta, { marginTop: 8 }]}>
                      Görüşme odası randevu onaylandıktan sonra açılır.
                    </Text>
                  )}
                  {detail.platform_join_url ? (
                    <Pressable
                      style={[styles.modalPrimaryButton, { marginTop: 10, backgroundColor: '#FFFFFF' }]}
                      onPress={() => {
                        const url = detail.platform_join_url!;
                        void (async () => {
                          try {
                            await Share.share({
                              message: `Online görüşme linkiniz:\n${url}`,
                              url,
                              title: 'Hasta görüşme linki',
                            });
                          } catch {
                            Alert.alert('Hasta linki', url);
                          }
                        })();
                      }}
                    >
                      <Text style={[styles.modalPrimaryButtonText, { color: '#7A8B9C' }]}>
                        Hasta linkini paylaş
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              ) : null}

              <SelectField
                label="Hizmet"
                placeholder="Hizmet seçin…"
                options={services.map((svc) => ({
                  label: svc.ad,
                  value: svc.id,
                  subtitle: `${svc.sure} dk`,
                }))}
                value={hizmetId}
                onChange={setHizmetId}
                searchable={services.length > 6}
              />

              <Text style={styles.modalLabel}>Hekim notu</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={hekimNotu}
                onChangeText={setHekimNotu}
                multiline
                placeholder="Not ekleyin"
                placeholderTextColor="#6B7F93"
              />
              {detail.not ? (
                <>
                  <Text style={styles.modalLabel}>Danışan notu</Text>
                  <Text style={styles.appointmentService}>{detail.not}</Text>
                </>
              ) : null}

              {error ? <Text style={styles.modalError}>{error}</Text> : null}

              <Pressable
                style={[styles.modalPrimaryButton, busy && styles.modalPrimaryButtonDisabled]}
                disabled={busy}
                onPress={() => void saveNotes()}
              >
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalPrimaryButtonText}>Notu kaydet</Text>}
              </Pressable>

              <View style={styles.appointmentActions}>
                {detail.durum === 'beklemede' ? (
                  <Pressable style={[styles.appointmentActionButton, styles.appointmentActionConfirm]} disabled={busy} onPress={() => void setStatus('onaylandi')}>
                    <Text style={styles.appointmentActionText}>Onayla</Text>
                  </Pressable>
                ) : null}
                <Pressable style={[styles.appointmentActionButton, styles.appointmentActionReschedule]} disabled={busy} onPress={() => onReschedule(detail)}>
                  <Text style={styles.appointmentActionText}>Ertele</Text>
                </Pressable>
                <Pressable style={[styles.appointmentActionButton, styles.appointmentActionComplete]} disabled={busy} onPress={() => void setStatus('tamamlandi')}>
                  <Text style={styles.appointmentActionText}>Tamam</Text>
                </Pressable>
                <Pressable style={[styles.appointmentActionButton, styles.appointmentActionCancel]} disabled={busy} onPress={() => void setStatus('iptal')}>
                  <Text style={styles.appointmentActionText}>İptal</Text>
                </Pressable>
              </View>
              <Pressable style={[styles.menuSignOut, { marginTop: 16 }]} disabled={busy} onPress={() => void remove()}>
                <Text style={styles.menuSignOutText}>Randevuyu sil</Text>
              </Pressable>
            </ScrollView>
          ) : null}
        </View>
      </View>

      <VideoCallModal
        visible={videoCallOpen}
        appointmentId={detail?.id ?? appointment?.id ?? null}
        onClose={() => setVideoCallOpen(false)}
      />
    </Modal>
  );
}

function CreateAppointmentModal({
  visible,
  defaultDate,
  onClose,
  onCreated,
}: {
  visible: boolean;
  defaultDate: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [tarih, setTarih] = useState(defaultDate);
  const [saat, setSaat] = useState('09:00');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [patientQuery, setPatientQuery] = useState('');
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [gorusmeTipi, setGorusmeTipi] = useState<'yuz_yuze' | 'online'>('yuz_yuze');
  const [note, setNote] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setTarih(defaultDate);
    setSaat('09:00');
    setAvailableSlots([]);
    setPatientQuery('');
    setPatients([]);
    setSelectedPatient(null);
    setShowNewPatient(false);
    setNewPatientName('');
    setNewPatientPhone('');
    setNewPatientEmail('');
    setSelectedServiceId(null);
    setGorusmeTipi('yuz_yuze');
    setNote('');
    setHasSearched(false);
    setFormError(null);

    void (async () => {
      try {
        const response = await fetch(`${API_URL}/doctor/services`, {
          headers: await authHeaders(),
        });
        const payload = await response.json();
        if (response.ok && payload.success) {
          const list = (payload.data as ServiceOption[]).filter((item) => item.aktif_mi);
          setServices(list);
          if (list[0]) {
            setSelectedServiceId(list[0].id);
          }
        }
      } catch {
        // handled on submit if services empty
      }
    })();
  }, [visible, defaultDate]);

  useEffect(() => {
    if (!visible || !/^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
      return;
    }
    void (async () => {
      try {
        const response = await fetch(
          `${API_URL}/doctor/slots?tarih=${encodeURIComponent(tarih)}`,
          { headers: await authHeaders() },
        );
        const payload = await response.json();
        if (response.ok && payload.success) {
          const slots = ((payload.data?.slots as { saat: string }[]) || []).map((s) => s.saat);
          setAvailableSlots(slots);
          if (slots.length > 0 && !slots.includes(saat)) {
            setSaat(slots[0]);
          }
        } else {
          setAvailableSlots([]);
        }
      } catch {
        setAvailableSlots([]);
      }
    })();
  }, [visible, tarih]);

  useEffect(() => {
    if (!visible || showNewPatient || selectedPatient) {
      return;
    }
    if (patientQuery.trim().length < 2) {
      setPatients([]);
      setHasSearched(false);
      return;
    }

    const handle = setTimeout(() => {
      void (async () => {
        setIsSearching(true);
        try {
          const response = await fetch(
            `${API_URL}/doctor/patients?q=${encodeURIComponent(patientQuery.trim())}`,
            { headers: await authHeaders() },
          );
          const payload = await response.json();
          if (response.ok && payload.success) {
            setPatients(payload.data as PatientOption[]);
            setHasSearched(true);
          }
        } catch {
          // soft fail
        } finally {
          setIsSearching(false);
        }
      })();
    }, 300);

    return () => clearTimeout(handle);
  }, [patientQuery, visible, showNewPatient, selectedPatient]);

  function openNewPatientForm(prefillName = '') {
    setShowNewPatient(true);
    setSelectedPatient(null);
    setPatients([]);
    setNewPatientName(prefillName || patientQuery.trim());
    setFormError(null);
  }

  async function createPatient(): Promise<PatientOption | null> {
    if (!newPatientName.trim()) {
      setFormError('Danışan ad soyad bilgisini girin.');
      return null;
    }
    if (!newPatientPhone.trim()) {
      setFormError('Telefon numarası zorunludur.');
      return null;
    }

    setIsCreatingPatient(true);
    setFormError(null);
    try {
      const response = await fetch(`${API_URL}/doctor/patients`, {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ad_soyad: newPatientName.trim(),
          telefon: newPatientPhone.trim(),
          e_posta: newPatientEmail.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data) {
        setFormError(payload.message ?? 'Danışan eklenemedi.');
        return null;
      }

      const created = payload.data as PatientOption;
      setSelectedPatient(created);
      setPatientQuery(`${created.ad} ${created.soyad}`.trim());
      setShowNewPatient(false);
      setPatients([]);
      return created;
    } catch {
      setFormError('Danışan eklenirken sunucuya ulaşılamadı.');
      return null;
    } finally {
      setIsCreatingPatient(false);
    }
  }

  async function submit() {
    if (!selectedServiceId) {
      setFormError('Lütfen bir hizmet seçin.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
      setFormError('Tarih formatı YYYY-AA-GG olmalıdır.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(saat)) {
      setFormError('Saat formatı SS:DD olmalıdır.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      let patient = selectedPatient;
      if (!patient && showNewPatient) {
        patient = await createPatient();
        if (!patient) {
          return;
        }
      }
      if (!patient) {
        setFormError('Lütfen bir danışan seçin veya yeni danışan ekleyin.');
        return;
      }

      const response = await fetch(`${API_URL}/doctor/appointments`, {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          danisan_id: patient.id,
          hizmet_id: selectedServiceId,
          tarih,
          saat,
          aciklama: note || null,
          gorusme_tipi: gorusmeTipi,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setFormError(payload.message ?? 'Randevu oluşturulamadı.');
        return;
      }
      await onCreated();
    } catch {
      setFormError('Sunucuya ulaşılamadı.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalSheetWrap}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni randevu</Text>
              <Pressable onPress={onClose}>
                <Text style={styles.modalClose}>Kapat</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalBody}>
              <Text style={styles.modalLabel}>Tarih (YYYY-AA-GG)</Text>
              <TextInput style={styles.modalInput} value={tarih} onChangeText={setTarih} autoCapitalize="none" />

              {availableSlots.length > 0 ? (
                <SelectField
                  label="Boş slotlar"
                  placeholder="Saat seçin…"
                  options={availableSlots.map((slot) => ({ label: slot, value: slot }))}
                  value={saat || null}
                  onChange={setSaat}
                  searchable={availableSlots.length > 8}
                />
              ) : (
                <Text style={styles.appointmentMeta}>Bu gün için boş slot yok veya gün kapalı. Saati elle girin.</Text>
              )}
              <Text style={styles.modalLabel}>Saat (SS:DD) — manuel</Text>
              <TextInput style={styles.modalInput} value={saat} onChangeText={setSaat} autoCapitalize="none" />

              <View style={styles.modalLabelRow}>
                <Text style={styles.modalLabelInline}>Danışan</Text>
                <Pressable
                  onPress={() => {
                    if (showNewPatient) {
                      setShowNewPatient(false);
                      setFormError(null);
                    } else {
                      openNewPatientForm();
                    }
                  }}
                >
                  <Text style={styles.modalLink}>
                    {showNewPatient ? 'Kayıtlı ara' : '+ Yeni danışan'}
                  </Text>
                </Pressable>
              </View>

              {showNewPatient ? (
                <View style={styles.newPatientBox}>
                  <Text style={styles.modalHint}>
                    Kayıtlı danışan yoksa ad, telefon ile yeni kayıt oluşturun. E-posta isteğe bağlıdır.
                  </Text>
                  <Text style={styles.modalLabel}>Ad Soyad</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newPatientName}
                    onChangeText={setNewPatientName}
                    placeholder="Örn. Ayşe Yılmaz"
                    placeholderTextColor="#6B7F93"
                  />
                  <Text style={styles.modalLabel}>Telefon</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newPatientPhone}
                    onChangeText={setNewPatientPhone}
                    keyboardType="phone-pad"
                    placeholder="05xx xxx xx xx"
                    placeholderTextColor="#6B7F93"
                  />
                  <Text style={styles.modalLabel}>E-posta (opsiyonel)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newPatientEmail}
                    onChangeText={setNewPatientEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="ornek@mail.com"
                    placeholderTextColor="#6B7F93"
                  />
                  <Pressable
                    style={[styles.secondaryButton, isCreatingPatient && styles.modalPrimaryButtonDisabled]}
                    disabled={isCreatingPatient || isSaving}
                    onPress={() => void createPatient()}
                  >
                    {isCreatingPatient ? (
                      <ActivityIndicator color="#C96A2B" />
                    ) : (
                      <Text style={styles.secondaryButtonText}>Danışanı kaydet ve seç</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.modalInput}
                    value={patientQuery}
                    onChangeText={(value) => {
                      setPatientQuery(value);
                      setSelectedPatient(null);
                    }}
                    placeholder="Ad, telefon veya e-posta ile ara"
                    placeholderTextColor="#6B7F93"
                  />
                  {isSearching ? <ActivityIndicator color="#F58A45" style={{ marginTop: 8 }} /> : null}
                  {selectedPatient ? (
                    <View style={styles.selectedChip}>
                      <Text style={styles.selectedChipText}>
                        {selectedPatient.ad} {selectedPatient.soyad}
                        {selectedPatient.telefon ? ` · ${selectedPatient.telefon}` : ''}
                      </Text>
                      <Pressable
                        onPress={() => {
                          setSelectedPatient(null);
                          setPatientQuery('');
                        }}
                      >
                        <Text style={styles.selectedChipClear}>Değiştir</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      {patients.length > 0 ? (
                        <SelectField
                          label="Sonuçlardan seç"
                          placeholder="Danışan seçin…"
                          searchable
                          options={patients.map((patient) => ({
                            label: `${patient.ad} ${patient.soyad}`,
                            value: patient.id,
                            subtitle: patient.telefon || patient.e_posta || undefined,
                          }))}
                          value={null}
                          onChange={(id) => {
                            const patient = patients.find((p) => p.id === id);
                            if (!patient) return;
                            setSelectedPatient(patient);
                            setPatientQuery(`${patient.ad} ${patient.soyad}`);
                            setPatients([]);
                          }}
                        />
                      ) : null}
                      {hasSearched && patients.length === 0 && patientQuery.trim().length >= 2 ? (
                        <View style={styles.emptySearchBox}>
                          <Text style={styles.modalHint}>Eşleşen danışan bulunamadı.</Text>
                          <Pressable style={styles.secondaryButton} onPress={() => openNewPatientForm(patientQuery)}>
                            <Text style={styles.secondaryButtonText}>“{patientQuery.trim()}” olarak ekle</Text>
                          </Pressable>
                        </View>
                      ) : null}
                      {!hasSearched && !selectedPatient ? (
                        <Pressable style={styles.inlineAddLink} onPress={() => openNewPatientForm()}>
                          <Text style={styles.modalLink}>Danışan listede yok mu? Yeni ekle</Text>
                        </Pressable>
                      ) : null}
                    </>
                  )}
                </>
              )}

              {services.length === 0 ? (
                <>
                  <Text style={styles.modalLabel}>Hizmet</Text>
                  <Text style={styles.modalHint}>Aktif hizmet bulunamadı. Önce web panelinden hizmet ekleyin.</Text>
                </>
              ) : (
                <SelectField
                  label="Hizmet"
                  placeholder="Hizmet seçin…"
                  options={services.map((service) => ({
                    label: service.ad,
                    value: service.id,
                    subtitle: `${service.sure} dk`,
                  }))}
                  value={selectedServiceId}
                  onChange={setSelectedServiceId}
                  searchable={services.length > 6}
                />
              )}

              <SelectField
                label="Görüşme tipi"
                placeholder="Seçin…"
                options={[
                  { label: 'Yüz yüze', value: 'yuz_yuze' },
                  { label: 'Online', value: 'online' },
                ]}
                value={gorusmeTipi}
                onChange={setGorusmeTipi}
              />

              <Text style={styles.modalLabel}>Not (opsiyonel)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={note}
                onChangeText={setNote}
                multiline
                placeholder="Hekim notu veya açıklama"
                placeholderTextColor="#6B7F93"
              />

              {formError ? <Text style={styles.modalError}>{formError}</Text> : null}

              <Pressable
                style={[styles.modalPrimaryButton, isSaving && styles.modalPrimaryButtonDisabled]}
                disabled={isSaving}
                onPress={() => void submit()}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryButtonText}>Randevuyu kaydet</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function RescheduleAppointmentModal({
  appointment,
  onClose,
  onSaved,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onSaved: (dateKey: string) => Promise<void>;
}) {
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointment) {
      return;
    }
    setTarih(appointment.tarih);
    setSaat(formatTime(appointment.saat));
    setFormError(null);
  }, [appointment]);

  useEffect(() => {
    if (!appointment || !/^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
      return;
    }
    void (async () => {
      try {
        const response = await fetch(
          `${API_URL}/doctor/slots?tarih=${encodeURIComponent(tarih)}`,
          { headers: await authHeaders() },
        );
        const payload = await response.json();
        if (response.ok && payload.success) {
          const list = ((payload.data?.slots as { saat: string }[]) || []).map((s) => s.saat);
          // Keep current appointment slot selectable when rescheduling same day
          const current = formatTime(appointment.saat);
          if (current && !list.includes(current) && tarih === appointment.tarih) {
            list.unshift(current);
          }
          setSlots(list);
        } else {
          setSlots([]);
        }
      } catch {
        setSlots([]);
      }
    })();
  }, [appointment, tarih]);

  async function submit() {
    if (!appointment) {
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih) || !/^\d{2}:\d{2}$/.test(saat)) {
      setFormError('Tarih YYYY-AA-GG ve saat SS:DD formatında olmalı.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${API_URL}/doctor/appointments/${appointment.id}/reschedule`, {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ tarih, saat }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setFormError(payload.message ?? 'Randevu ertelenemedi.');
        return;
      }
      await onSaved(tarih);
    } catch {
      setFormError('Sunucuya ulaşılamadı.');
    } finally {
      setIsSaving(false);
    }
  }

  function shiftDate(base: string, days: number): string {
    const d = new Date(`${base}T12:00:00`);
    if (Number.isNaN(d.getTime())) return base;
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const today = toDateKey(new Date());
  const quickDates = appointment
    ? [
        { label: 'Bugün', value: today },
        { label: 'Yarın', value: shiftDate(today, 1) },
        { label: '+3 gün', value: shiftDate(today, 3) },
        { label: '+1 hafta', value: shiftDate(today, 7) },
        { label: 'Aynı gün', value: appointment.tarih },
      ]
    : [];

  return (
    <Modal visible={!!appointment} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Randevuyu ertele / taşı</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.modalClose}>Kapat</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalHint}>
              {appointment?.hasta_adi} · {appointment ? APPOINTMENT_STATUS_LABEL[appointment.durum] : ''}
              {appointment ? `\nMevcut: ${appointment.tarih} ${formatTime(appointment.saat)}` : ''}
            </Text>
            <Text style={styles.modalLabel}>Hızlı tarih</Text>
            <View style={styles.quickChipRow}>
              {quickDates.map((q) => (
                <Pressable
                  key={q.label}
                  style={[styles.quickChip, tarih === q.value && styles.quickChipOn]}
                  onPress={() => setTarih(q.value)}
                >
                  <Text style={[styles.quickChipText, tarih === q.value && styles.quickChipTextOn]}>{q.label}</Text>
                </Pressable>
              ))}
            </View>
            <DateField label="Yeni tarih" value={tarih} onChange={setTarih} />
            {slots.length > 0 ? (
              <SelectField
                label="Boş slotlar (sürükle-bırak yerine hızlı seçim)"
                placeholder="Saat seçin…"
                options={slots.map((slot) => ({ label: slot, value: slot }))}
                value={saat || null}
                onChange={setSaat}
                searchable={slots.length > 8}
              />
            ) : (
              <Text style={styles.appointmentMeta}>Slot yok / gün kapalı — saati elle seçin.</Text>
            )}
            <TimeField label="Yeni saat" value={saat} onChange={setSaat} />
            {formError ? <Text style={styles.modalError}>{formError}</Text> : null}
            <Pressable
              style={[styles.modalPrimaryButton, isSaving && styles.modalPrimaryButtonDisabled]}
              disabled={isSaving}
              onPress={() => void submit()}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalPrimaryButtonText}>Yeni saate taşı</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#F4F6F9' },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F9' },
  introScreen: { flex: 1, overflow: 'hidden', backgroundColor: '#F4F6F9' },
  introScene: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  introGlowTop: { position: 'absolute', top: -190, right: -130, width: 420, height: 420, borderRadius: 210, backgroundColor: colors.brand.orangeGlow, opacity: 0.16 },
  introGlowBottom: { position: 'absolute', bottom: -170, left: -125, width: 380, height: 380, borderRadius: 190, borderWidth: 60, borderColor: colors.navy[600], opacity: 0.35 },
  introCenter: { alignItems: 'center', paddingHorizontal: 36 },
  introMarkStack: { width: 108, height: 108, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  introAmbientGlowOuter: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.brand.orangeGlow,
  },
  introAmbientGlowInner: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.brand.orangeGlow,
  },
  introParticle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.orangeSoft,
  },
  introParticle1: { top: 20, left: 24 },
  introParticle2: { top: 44, right: 18, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#F3D4B8' },
  introParticle3: { bottom: 30, left: 34, width: 7, height: 7, borderRadius: 3.5 },
  introLogoMark: {
    width: 72,
    height: 72,
    borderRadius: 30,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.brand.orangeGlow,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  introLogoImage: { width: 52, height: 52, resizeMode: 'contain' },
  introShimmerClip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 30, overflow: 'hidden', pointerEvents: 'none' },
  introShimmerBand: {
    position: 'absolute',
    top: -60,
    bottom: -60,
    width: 46,
  },
  introCopy: { alignItems: 'center' },
  introBrand: { color: '#6D7D8E', fontSize: 13, fontWeight: '600', letterSpacing: 0.2, textAlign: 'center' },
  introHeadline: { color: '#102133', fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 10, textAlign: 'center' },
  introLabel: { color: '#F2A26F', fontSize: 10, fontWeight: '700', letterSpacing: 1.6, marginTop: 10, textAlign: 'center' },
  introTrack: {
    position: 'absolute',
    bottom: 74,
    alignSelf: 'center',
    width: 200,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(16,33,51,0.08)',
    overflow: 'hidden',
  },
  introTrackHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 70,
    borderRadius: 2,
    backgroundColor: colors.brand.orangeGlow,
  },
  scrollContent: { flexGrow: 1, backgroundColor: '#F4F6F9' },
  authTop: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoShell: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EDF3',
    shadowColor: '#102133',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  logoImage: { width: 28, height: 28, resizeMode: 'contain' },
  brandName: { color: '#102133', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  brandSubtitle: { color: '#C96A2B', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 },
  welcome: {
    color: '#102133',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 14,
  },
  heroDescription: {
    color: '#6D7D8E',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 320,
  },
  formCard: {
    marginHorizontal: 18,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E1E6ED',
  },
  authBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  authBadgeTxt: { color: '#C96A2B', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  loginRoleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
    backgroundColor: '#EEF2F7',
    borderRadius: 12,
    padding: 4,
  },
  loginRoleBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginRoleBtnOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#102133',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  loginRoleText: { color: '#6D7D8E', fontSize: 13, fontWeight: '600' },
  loginRoleTextOn: { color: '#102133' },
  formTitle: { color: '#102133', fontSize: 16, fontWeight: '700', letterSpacing: -0.25 },
  formDescription: { color: '#6D7D8E', fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 6 },
  signInButton: { marginTop: 8 },
  errorMessage: { color: '#C13C2C', fontSize: 13, lineHeight: 19, marginTop: 10 },
  authLinks: { marginTop: 6, alignItems: 'center', gap: 0 },
  authDivider: {
    width: 28,
    height: 1,
    backgroundColor: '#E1E6ED',
    marginVertical: 10,
  },
  forgotPassword: { color: '#6D7D8E', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  registerLink: { color: '#C96A2B', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  footerText: {
    color: '#95A2B5',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 8,
    marginBottom: 6,
    lineHeight: 17,
  },
  dashboard: { flex: 1, backgroundColor: '#F2F4F7' },
  moduleBody: { flex: 1 },
  offlineBanner: {
    backgroundColor: 'rgba(238,125,49,0.14)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(238,125,49,0.35)',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  offlineBannerText: { color: '#C96A2B', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  dashboardHeader: {
    zIndex: 20,
    borderBottomWidth: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    minHeight: 44,
  },
  dashboardIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  dashboardLogoShell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 0,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dashboardLogo: { width: 24, height: 24, resizeMode: 'contain' },
  dashboardIdentityTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.35,
    lineHeight: 21,
  },
  dashboardIdentitySubtitle: {
    color: '#64748B',
    fontSize: 12,
    letterSpacing: -0.1,
    fontWeight: '500',
    marginTop: 1,
    lineHeight: 15,
  },
  dashboardAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardAvatarText: { color: '#F8B789', fontSize: 12, fontWeight: '700' },
  headerNotifyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerNotifyIcon: {
    fontSize: 15,
    lineHeight: 18,
    textAlign: 'center',
  },
  headerNotifyBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#EE7D31',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  headerNotifyBadgeWide: {
    minWidth: 20,
    paddingHorizontal: 4,
  },
  headerNotifyBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
    textAlign: 'center',
    includeFontPadding: false,
    marginTop: Platform.OS === 'android' ? 0 : 0.5,
  },
  dashboardContent: { flex: 1, minHeight: 0, paddingTop: 2 },
  dashboardHero: { paddingHorizontal: 2, paddingVertical: 8, overflow: 'hidden' },
  dashboardHeroGlow: { display: 'none' },
  dashboardEyebrow: { color: '#64748B', fontSize: 13, fontWeight: '600', letterSpacing: -0.1, textTransform: 'capitalize' },
  dashboardTitle: { color: '#0F172A', fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7, marginTop: 2 },
  dashboardSpecialty: { color: '#64748B', fontSize: 15, lineHeight: 20, marginTop: 4, fontWeight: '400' },
  heroMetaRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 0,
  },
  heroStatusOpen: { backgroundColor: '#E6F6ED', borderColor: 'transparent' },
  heroStatusClosed: { backgroundColor: '#FEF2F2', borderColor: 'transparent' },
  heroStatusDot: { width: 7, height: 7, borderRadius: 4 },
  heroStatusDotOpen: { backgroundColor: '#1F9D55' },
  heroStatusDotClosed: { backgroundColor: '#DC2626' },
  heroStatusText: { color: '#0F172A', fontSize: 12, fontWeight: '600' },
  heroMetaHint: { color: '#64748B', fontSize: 13, fontWeight: '500' },
  nextApptCard: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  nextApptTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextApptEyebrow: { color: '#C96A2B', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  nextApptStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  nextApptStatusText: { fontSize: 11, fontWeight: '800' },
  nextApptTime: { color: '#102133', fontSize: 18, fontWeight: '700', marginTop: 6, letterSpacing: -0.3 },
  nextApptPatient: { color: '#102133', fontSize: 14, fontWeight: '600', marginTop: 4 },
  nextApptService: { color: '#8A98A8', fontSize: 13, marginTop: 4 },
  nextApptCta: { color: '#C96A2B', fontSize: 12, fontWeight: '800', marginTop: 14 },
  nextApptEmpty: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  nextApptEmptyTitle: { color: '#102133', fontSize: 13, fontWeight: '800' },
  nextApptEmptyText: { color: '#7A8B9C', fontSize: 13, lineHeight: 19, marginTop: 8 },
  nextApptEmptyActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  statGrid: { gap: 12, marginTop: 6 },
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E6ED',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
  },
  statCardAccent: { borderColor: 'rgba(245,138,69,0.4)', backgroundColor: '#FFF7ED' },
  statIcon: { color: '#C96A2B', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  statValue: { color: '#102133', fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  statLabel: { color: '#8A98A8', fontSize: 12, marginTop: 4, fontWeight: '600' },
  statHint: { color: '#6F8499', fontSize: 11, marginTop: 8, fontWeight: '600' },
  todayBreakdownCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  todayBreakdownTitle: { color: '#102133', fontSize: 14, fontWeight: '800', marginBottom: 12 },
  todayBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  todayBreakdownItem: { flex: 1, alignItems: 'center' },
  todayBreakdownValue: { fontSize: 16, fontWeight: '700' },
  todayBreakdownLabel: { color: '#7A8B9C', fontSize: 11, marginTop: 4, fontWeight: '600' },
  weekActivityCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  weekActivityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  weekActivityTitle: { color: '#102133', fontSize: 14, fontWeight: '800' },
  weekActivitySubtitle: { color: '#7A8B9C', fontSize: 12, marginTop: 3 },
  weekActivityBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6, gap: 4 },
  weekActivityCol: { flex: 1, alignItems: 'center' },
  weekActivityBar: {
    width: '62%',
    maxWidth: 22,
    minHeight: 4,
    borderRadius: 8,
    backgroundColor: '#E8EDF3',
  },
  weekActivityBarFilled: { backgroundColor: 'rgba(245,138,69,0.55)' },
  weekActivityBarToday: { backgroundColor: '#F58A45' },
  weekActivityDay: { color: '#8093A7', fontSize: 10, fontWeight: '700', marginTop: 8 },
  weekActivityDayToday: { color: '#C96A2B' },
  weekActivityCount: { color: '#6F8499', fontSize: 10, marginTop: 2, fontWeight: '600' },
  bookingToggleCard: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E6ED',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
  },
  quickSectionHeader: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickSectionTitle: { color: '#102133', fontSize: 15, fontWeight: '700' },
  quickSectionLink: { color: '#C96A2B', fontSize: 13, fontWeight: '800' },
  quickActionGrid: { flexDirection: 'row', gap: 12, marginTop: 14 },
  quickAction: { flex: 1, borderWidth: 1, borderColor: '#E1E6ED', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15 },
  quickActionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickActionIcon: { color: '#C96A2B', fontSize: 18, fontWeight: '600' },
  quickActionTitle: { color: '#102133', fontSize: 14, fontWeight: '800', marginTop: 12 },
  quickActionText: { color: '#7A8B9C', fontSize: 11, marginTop: 4 },
  quickBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#F58A45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  insightBanner: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,166,224,0.35)',
    backgroundColor: 'rgba(124,166,224,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  insightBannerText: { color: '#1E4A7A', fontSize: 13, fontWeight: '700' },
  sectionHeader: { marginTop: 16, marginBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionTitle: { color: '#102133', fontSize: 15, fontWeight: '700' },
  sectionSubtitle: { color: '#7A8B9C', fontSize: 12, marginTop: 4 },
  comingSoonCard: { borderWidth: 1, borderColor: '#E1E6ED', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginTop: 6 },
  comingSoonTitle: { color: '#102133', fontSize: 14, fontWeight: '800' },
  comingSoonText: { color: '#6D7D8E', fontSize: 14, lineHeight: 17, marginTop: 9 },
  dashboardScrollContent: { flexGrow: 1 },
  appointmentsLoading: { marginTop: 40 },
  /* ── Calendar redesign ── */
  calHero: {
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  calHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F4F6F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavBtnText: { color: '#102133', fontSize: 22, fontWeight: '300', marginTop: -2 },
  calHeroTitleWrap: { alignItems: 'center' },
  calHeroMonth: {
    color: '#102133',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  calHeroYear: { color: '#8A98A8', fontSize: 12, fontWeight: '600', marginTop: 1 },
  calModeSeg: {
    marginTop: 12,
    flexDirection: 'row',
    backgroundColor: '#F0F3F7',
    borderRadius: 10,
    padding: 3,
  },
  calModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  calModeBtnOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#102133',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  calModeTxt: { color: '#6D7D8E', fontSize: 13, fontWeight: '600' },
  calModeTxtOn: { color: '#102133', fontWeight: '700' },
  calChipRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F4F6F9',
    borderWidth: 1,
    borderColor: '#E8EDF3',
  },
  calChipOn: {
    backgroundColor: 'rgba(238,125,49,0.12)',
    borderColor: 'rgba(238,125,49,0.35)',
  },
  calChipTxt: { color: '#5A6B7D', fontSize: 12, fontWeight: '600' },
  calChipTxtOn: { color: '#C96A2B' },
  weekStrip: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF3',
  },
  monthGrid: {
    marginTop: 2,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF3',
  },
  monthHeaderRow: { flexDirection: 'row', marginBottom: 4 },
  monthHeaderCell: {
    flex: 1,
    textAlign: 'center',
    color: '#95A2B5',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  monthRow: { flexDirection: 'row' },
  monthCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    margin: 1,
    minHeight: 44,
  },
  monthCellToday: {
    backgroundColor: 'rgba(46,158,91,0.08)',
  },
  monthCellSelected: { backgroundColor: '#EE7D31' },
  monthCellMuted: { opacity: 0.32 },
  monthCellText: { color: '#102133', fontSize: 13, fontWeight: '600' },
  monthCellTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  monthCellTextToday: { color: '#2E9E5B', fontWeight: '700' },
  monthCountPill: {
    marginTop: 2,
    minWidth: 16,
    height: 14,
    paddingHorizontal: 4,
    borderRadius: 7,
    backgroundColor: 'rgba(238,125,49,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCountPillOn: { backgroundColor: 'rgba(255,255,255,0.28)' },
  monthCountTxt: { color: '#C96A2B', fontSize: 9, fontWeight: '700' },
  monthCountTxtOn: { color: '#FFFFFF' },
  monthCountSpacer: { height: 14, marginTop: 2 },
  weekDay: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 6,
  },
  weekDayToday: {
    backgroundColor: 'rgba(46,158,91,0.08)',
  },
  weekDaySelected: { backgroundColor: '#EE7D31' },
  weekDayLabel: { color: '#95A2B5', fontSize: 10, fontWeight: '700' },
  weekDayLabelSelected: { color: 'rgba(255,255,255,0.9)' },
  weekDayNumber: { color: '#102133', fontSize: 16, fontWeight: '700', marginTop: 2 },
  weekDayNumberSelected: { color: '#FFFFFF' },
  weekDayBadge: {
    marginTop: 4,
    minWidth: 18,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(238,125,49,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayBadgeOn: { backgroundColor: 'rgba(255,255,255,0.28)' },
  weekDayBadgeTxt: { color: '#C96A2B', fontSize: 10, fontWeight: '700' },
  weekDayBadgeTxtOn: { color: '#FFFFFF' },
  weekDayDotSpacer: { height: 16, marginTop: 4 },
  calendarAgendaHeader: {
    marginTop: 14,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  calendarAgendaCopy: { flex: 1 },
  calendarAgendaTitle: {
    color: '#102133',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: -0.2,
  },
  calendarAgendaSubtitle: { color: '#8A98A8', fontSize: 12, marginTop: 2, fontWeight: '500' },
  addAppointmentButton: {
    borderRadius: 10,
    backgroundColor: '#EE7D31',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addAppointmentButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  /* Timeline agenda */
  timeline: { marginTop: 4, marginBottom: 8 },
  tlRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 72 },
  tlRail: {
    width: 52,
    alignItems: 'center',
    paddingTop: 2,
  },
  tlTime: { color: '#102133', fontSize: 12, fontWeight: '700', letterSpacing: -0.2 },
  tlTimeEnd: { color: '#95A2B5', fontSize: 10, fontWeight: '500', marginTop: 1 },
  tlDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#F4F6F9',
  },
  tlLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E8EDF3',
    marginTop: 4,
    marginBottom: 0,
    minHeight: 20,
  },
  tlCard: {
    flex: 1,
    marginLeft: 4,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tlCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tlPatient: { flex: 1, color: '#102133', fontSize: 14, fontWeight: '700' },
  tlStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tlStatusTxt: { fontSize: 10, fontWeight: '700' },
  tlMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  tlMeta: { flex: 1, color: '#6D7D8E', fontSize: 12, fontWeight: '500' },
  tlOnline: {
    color: '#2E9E5B',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(46,158,91,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tlActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tlAct: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F4F6F9',
  },
  tlActOk: { backgroundColor: 'rgba(46,158,91,0.12)' },
  tlActDanger: { backgroundColor: 'rgba(193,60,44,0.08)' },
  tlActTxt: { color: '#39495B', fontSize: 11, fontWeight: '600' },
  calEmpty: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
  },
  calEmptyIcon: { fontSize: 28, marginBottom: 8 },
  calEmptyTitle: { color: '#102133', fontSize: 15, fontWeight: '700' },
  calEmptyText: {
    color: '#6D7D8E',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  calEmptyBtn: {
    marginTop: 14,
    backgroundColor: '#EE7D31',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  calEmptyBtnTxt: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  inlineNotice: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,138,69,0.35)',
    backgroundColor: 'rgba(245,138,69,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inlineNoticeText: { color: '#C96A2B', fontSize: 13, fontWeight: '700' },
  retryButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: 'rgba(245,138,69,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: { color: '#C96A2B', fontSize: 13, fontWeight: '800' },
  appointmentCard: {
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
  },
  appointmentCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appointmentTime: { color: '#C96A2B', fontSize: 13, fontWeight: '800', letterSpacing: 0.4, flexShrink: 1 },
  appointmentStatusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  appointmentStatusText: { fontSize: 12, fontWeight: '800' },
  appointmentPatient: { color: '#102133', fontSize: 15, fontWeight: '700', marginTop: 6 },
  appointmentService: { color: '#6D7D8E', fontSize: 14, marginTop: 4 },
  appointmentMeta: { color: '#2E9E5B', fontSize: 12, fontWeight: '700', marginTop: 4 },
  appointmentPhone: { color: '#7F8FA0', fontSize: 13, marginTop: 4 },
  appointmentActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  appointmentActionButton: { minWidth: '22%', flexGrow: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  appointmentActionConfirm: { backgroundColor: 'rgba(77,189,140,0.18)' },
  appointmentActionReschedule: { backgroundColor: 'rgba(243,162,107,0.18)' },
  appointmentActionComplete: { backgroundColor: 'rgba(124,166,224,0.18)' },
  appointmentActionCancel: { backgroundColor: 'rgba(224,104,122,0.18)' },
  appointmentActionText: { color: '#102133', fontSize: 12, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 51, 0.42)',
    justifyContent: 'flex-end',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) + 8 : 20,
  },
  modalSheetWrap: { maxHeight: '92%' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF3',
  },
  modalTitle: { color: '#102133', fontSize: 15, fontWeight: '700' },
  modalClose: { color: '#C96A2B', fontSize: 14, fontWeight: '800' },
  modalBody: {
    paddingHorizontal: 12,
    paddingTop: 14,
    // Android system nav — extra space for sheet actions
    paddingBottom: Platform.OS === 'ios' ? 36 : 48,
  },
  modalLabel: { color: '#8A98A8', fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  modalHint: { color: '#7A8B9C', fontSize: 13, lineHeight: 19, marginBottom: 8 },
  quickChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
  },
  quickChipOn: { borderColor: '#F58A45', backgroundColor: 'rgba(245,138,69,0.16)' },
  quickChipText: { color: '#7A8B9C', fontSize: 12, fontWeight: '700' },
  quickChipTextOn: { color: '#C96A2B' },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    color: '#102133',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
  },
  modalTextArea: { minHeight: 88, textAlignVertical: 'top' },
  modalError: { color: '#C13C2C', fontSize: 13, marginTop: 12, lineHeight: 18 },
  modalPrimaryButton: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#F58A45',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonDisabled: { opacity: 0.7 },
  modalPrimaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  optionRow: {
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  optionRowSelected: { borderColor: '#F58A45', backgroundColor: 'rgba(245,138,69,0.12)' },
  optionTitle: { color: '#102133', fontSize: 14, fontWeight: '700' },
  optionSubtitle: { color: '#7A8B9C', fontSize: 12, marginTop: 3 },
  selectedChip: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(77,189,140,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(77,189,140,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectedChipText: { color: '#2E9E5B', fontSize: 13, fontWeight: '700', flex: 1 },
  selectedChipClear: { color: '#C96A2B', fontSize: 12, fontWeight: '800' },
  modalLabelRow: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalLabelInline: { color: '#8A98A8', fontSize: 12, fontWeight: '700' },
  modalLink: { color: '#C96A2B', fontSize: 12, fontWeight: '800' },
  newPatientBox: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingBottom: 14,
    paddingTop: 4,
  },
  emptySearchBox: { marginTop: 10 },
  inlineAddLink: { marginTop: 12, alignSelf: 'flex-start' },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,138,69,0.45)',
    backgroundColor: 'rgba(245,138,69,0.12)',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryButtonText: { color: '#C96A2B', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  segmentRow: { flexDirection: 'row', gap: 10 },
  segmentButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentButtonActive: { borderColor: '#F58A45', backgroundColor: 'rgba(245,138,69,0.14)' },
  segmentButtonText: { color: '#7A8B9C', fontSize: 13, fontWeight: '700' },
  segmentButtonTextActive: { color: '#C96A2B' },
  bottomNavWrap: {
    backgroundColor: 'transparent',
    zIndex: 40,
    elevation: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    marginBottom: 0,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    minHeight: 48,
    minWidth: 0,
  },
  bottomNavIconShell: {
    width: 36,
    height: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavIconShellActive: {
    backgroundColor: 'rgba(245,138,69,0.16)',
  },
  bottomNavIconShellDanger: {
    backgroundColor: 'rgba(193,60,44,0.12)',
  },
  bottomNavIcon: { color: '#8093A7', fontSize: 16, lineHeight: 20 },
  bottomNavIconActive: { color: '#F58A45' },
  bottomNavIconDanger: { color: '#C13C2C' },
  bottomNavLabel: { color: '#8093A7', fontSize: 10, fontWeight: '700' },
  bottomNavLabelActive: { color: '#102133' },
  profileNavIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  profileNavIconActive: {},
  profileNavHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8093A7',
    marginBottom: 1.5,
  },
  profileNavHeadActive: { backgroundColor: '#F58A45' },
  profileNavBody: {
    width: 14,
    height: 7,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#8093A7',
  },
  profileNavBodyActive: { backgroundColor: '#F58A45' },
  menuBack: { marginTop: 7, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 2 },
  menuBackText: { color: '#C96A2B', fontSize: 17, fontWeight: '400' },
  menuTitle: { color: '#0F172A', fontSize: 28, fontWeight: '700', letterSpacing: -0.7, marginTop: 4 },
  menuDescription: { color: '#64748B', fontSize: 14, lineHeight: 19, marginTop: 4 },
  menuGroup: { marginTop: 18 },
  menuGroupTitle: { color: '#64748B', fontSize: 13, fontWeight: '600', letterSpacing: -0.1, marginBottom: 8, marginLeft: 12, textTransform: 'none' },
  menuCard: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  menuItem: { minHeight: 56, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  menuItemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(15,23,42,0.08)' },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,138,69,0.12)' },
  menuIcon: { color: '#C96A2B', fontSize: 15, fontWeight: '700' },
  menuItemCopy: { flex: 1, marginLeft: 12 },
  menuItemTitle: { color: '#0F172A', fontSize: 16, fontWeight: '500', letterSpacing: -0.2 },
  menuItemDescription: { color: '#64748B', fontSize: 13, marginTop: 2 },
  menuChevron: { color: '#94A3B8', fontSize: 20, fontWeight: '300' },
  menuSignOut: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 18,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 0,
    backgroundColor: '#FEF2F2',
  },
  menuSignOutText: { color: '#DC2626', fontSize: 16, fontWeight: '600' },
});
