import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiPost, ApiError } from '../api/client';
import { AppIcon } from '../components/AppIcon';
import type { ModuleProps } from '../navigation/types';
import { colors } from '../theme';
import { useLayout } from '../layout';

// ── Types ──────────────────────────────────────────────────────

type Rol = 'kullanici' | 'asistan';

type Mesaj = {
  id: number;
  rol: Rol;
  metin: string;
};

type OnayGerekli = {
  fonksiyon: string;
  parametreler: Record<string, unknown>;
};

type SecimSecenek = {
  deger: string;
  etiket: string;
  bilgi?: string | null;
};

type SecimGerekli = {
  baslik?: string | null;
  secenekler: SecimSecenek[];
  parametreler: Record<string, unknown>;
};

type AsistanYanit = {
  success: boolean;
  yanit?: string;
  onay_gerekli?: OnayGerekli | null;
  secim_gerekli?: SecimGerekli | null;
};

// ── Hızlı işlemler ─────────────────────────────────────────────

const HIZLI_ISLEMLER = [
  { etiket: 'Bugünkü randevularım',        mesaj: 'bugünkü randevularımı listele' },
  { etiket: 'Bu haftanın özeti',           mesaj: 'bu haftanın randevu özeti' },
  { etiket: 'Yarın müsait saatler',        mesaj: 'yarın boş saatlerimi göster' },
  { etiket: 'Takvimi kapat / izin al',     mesaj: 'takvimi kapatmak istiyorum' },
  { etiket: 'Randevu onayla / iptal et',   mesaj: 'bugünkü randevularımı listele, durumunu güncellemek isteyeceğim' },
  { etiket: 'Bekleme listesi',             mesaj: 'bekleme listemde kimler var' },
  { etiket: 'Hizmetlerimi listele',        mesaj: 'hizmetlerimi listele' },
  { etiket: 'Profilime SEO önerisi',       mesaj: 'profilimi SEO açısından incele ve önerilerde bulun' },
] as const;

// ── Ana ekran ──────────────────────────────────────────────────

let _id = 0;
function nextId() { return ++_id; }

export function AsistanScreen({ onBack }: ModuleProps) {
  const L = useLayout();
  const scrollRef = useRef<ScrollView>(null);

  const [mesajlar, setMesajlar] = useState<Mesaj[]>([
    { id: nextId(), rol: 'asistan', metin: 'Merhaba! Size nasıl yardımcı olabilirim?' },
  ]);
  const [gecmis, setGecmis] = useState<{ rol: Rol; mesaj: string }[]>([]);
  const [input, setInput] = useState('');
  const [gonderiyor, setGonderiyor] = useState(false);
  const [onay, setOnay] = useState<OnayGerekli | null>(null);
  const [secim, setSecim] = useState<SecimGerekli | null>(null);
  const [hizliGosterildi, setHizliGosterildi] = useState(false);

  const scrolla = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  function ekle(rol: Rol, metin: string) {
    setMesajlar((prev) => [...prev, { id: nextId(), rol, metin }]);
    scrolla();
  }

  const gonder = useCallback(
    async (metin: string, payload?: Record<string, unknown>) => {
      if (gonderiyor) return;
      setGonderiyor(true);
      setOnay(null);
      setSecim(null);

      const body = payload ?? { mesaj: metin, gecmis: gecmis.slice(-10) };
      try {
        const res = await apiPost<AsistanYanit>('/doctor/asistan/mesaj', body as Record<string, unknown>);
        const yanit = res.data?.yanit ?? 'Yanıt alınamadı.';
        setGecmis((prev) => [
          ...prev,
          { rol: 'kullanici', mesaj: metin },
          { rol: 'asistan', mesaj: yanit },
        ]);
        ekle('asistan', yanit);

        if (res.data?.secim_gerekli) {
          setSecim(res.data.secim_gerekli);
        } else if (res.data?.onay_gerekli) {
          setOnay(res.data.onay_gerekli);
        }
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Bağlantı hatası. Lütfen tekrar deneyin.';
        ekle('asistan', msg);
      } finally {
        setGonderiyor(false);
        scrolla();
      }
    },
    [gecmis, gonderiyor, scrolla],
  );

  function handleGonder() {
    const metin = input.trim();
    if (!metin || gonderiyor) return;
    setInput('');
    ekle('kullanici', metin);
    void gonder(metin);
  }

  function handleHizliIslem(item: (typeof HIZLI_ISLEMLER)[number]) {
    setHizliGosterildi(true);
    ekle('kullanici', item.mesaj);
    void gonder(item.mesaj);
  }

  async function handleOnayEvet() {
    if (!onay) return;
    const snap = onay;
    setOnay(null);
    ekle('kullanici', 'Evet, onayla');
    await gonder('', { onay: snap });
  }

  function handleOnayHayir() {
    setOnay(null);
    ekle('asistan', 'İşlem iptal edildi.');
  }

  async function handleSecim(s: SecimSecenek, parametreler: Record<string, unknown>) {
    setSecim(null);
    ekle('kullanici', s.etiket);
    if (s.deger === 'vazgec') {
      ekle('asistan', 'İptal edildi.');
      return;
    }
    await gonder('', { secim: s.deger, secim_parametreler: parametreler });
  }

  const bottomPad = L.scrollBottom + 16;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: L.safeTop + 4 }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={onBack}
          hitSlop={10}
        >
          <AppIcon name="chevronLeft" size={20} color="#0F172A" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Dijital Asistan</Text>
          <Text style={styles.headerSub}>AI destekli randevu yönetimi</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.mesajlarContainer, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mesajlar.map((m) => (
          <View
            key={m.id}
            style={[styles.mesaj, m.rol === 'kullanici' ? styles.mesajKullanici : styles.mesajAsistan]}
          >
            <Text
              style={[styles.balon, m.rol === 'kullanici' ? styles.balonKullanici : styles.balonAsistan]}
            >
              {m.metin}
            </Text>
          </View>
        ))}

        {/* Loading dots */}
        {gonderiyor ? (
          <View style={styles.mesajAsistan}>
            <View style={[styles.balon, styles.balonAsistan, { paddingVertical: 12 }]}>
              <ActivityIndicator size="small" color={colors.brand.orange} />
            </View>
          </View>
        ) : null}

        {/* Confirmation box */}
        {onay ? (
          <View style={styles.onayKutu}>
            <Text style={styles.onayMetin}>Bu işlemi onaylıyor musunuz?</Text>
            <View style={styles.onayButonlar}>
              <Pressable
                style={({ pressed }) => [styles.onayEvet, pressed && { opacity: 0.8 }]}
                onPress={() => void handleOnayEvet()}
              >
                <Text style={styles.onayEvetText}>Evet, onayla</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.onayHayir, pressed && { opacity: 0.8 }]}
                onPress={handleOnayHayir}
              >
                <Text style={styles.onayHayirText}>İptal</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Selection card */}
        {secim ? (
          <View style={styles.secimKutu}>
            {secim.baslik ? <Text style={styles.secimBaslik}>{secim.baslik}</Text> : null}
            {secim.secenekler.map((s) => (
              <View key={s.deger}>
                <Pressable
                  style={({ pressed }) => [styles.secimBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => void handleSecim(s, secim.parametreler)}
                >
                  <Text style={styles.secimBtnText}>{s.etiket}</Text>
                </Pressable>
                {s.bilgi ? <Text style={styles.secimBilgi}>{s.bilgi}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Quick actions (first open, until dismissed) */}
        {!hizliGosterildi && !gonderiyor ? (
          <View style={styles.hizliKutu}>
            <Text style={styles.hizliBaslik}>Hızlı işlemler</Text>
            {HIZLI_ISLEMLER.map((item) => (
              <Pressable
                key={item.etiket}
                style={({ pressed }) => [styles.hizliBtn, pressed && { opacity: 0.75 }]}
                onPress={() => handleHizliIslem(item)}
              >
                <Text style={styles.hizliBtnText}>{item.etiket}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Input */}
      <View style={[styles.girisAlani, { paddingBottom: Math.max(L.safeBottom, 8) + 4 }]}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Mesajınızı yazın…"
          placeholderTextColor="#94A3B8"
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleGonder}
        />
        <Pressable
          style={({ pressed }) => [
            styles.gonderBtn,
            (!input.trim() || gonderiyor) && styles.gonderBtnDisabled,
            pressed && { opacity: 0.8 },
          ]}
          disabled={!input.trim() || gonderiyor}
          onPress={handleGonder}
        >
          <AppIcon name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const ORANGE = '#C96A2B';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#0F172A', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { color: '#64748B', fontSize: 11, marginTop: 1 },
  headerRight: { width: 36 },

  mesajlarContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },

  mesaj: { maxWidth: '85%', alignSelf: 'flex-start' },
  mesajKullanici: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  mesajAsistan: { alignSelf: 'flex-start', alignItems: 'flex-start' },

  balon: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 14,
    fontSize: 14,
    lineHeight: 20,
  },
  balonKullanici: {
    backgroundColor: ORANGE,
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  balonAsistan: {
    backgroundColor: '#F1F5F9',
    color: '#0F172A',
    borderBottomLeftRadius: 4,
  },

  onayKutu: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  onayMetin: { color: '#92400E', fontSize: 13 },
  onayButonlar: { flexDirection: 'row', gap: 8 },
  onayEvet: {
    flex: 1,
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  onayEvetText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  onayHayir: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  onayHayirText: { color: '#374151', fontSize: 13, fontWeight: '600' },

  secimKutu: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '95%',
  },
  secimBaslik: { color: '#92400E', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  secimBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  secimBtnText: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  secimBilgi: { color: '#78716C', fontSize: 11, marginTop: 2, paddingHorizontal: 2 },

  hizliKutu: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '95%',
  },
  hizliBaslik: { color: '#9CA3AF', fontSize: 11, marginBottom: 2 },
  hizliBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  hizliBtnText: { color: '#374151', fontSize: 13 },

  girisAlani: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.08)',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 100,
    lineHeight: 20,
  },
  gonderBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gonderBtnDisabled: { opacity: 0.4 },
});
