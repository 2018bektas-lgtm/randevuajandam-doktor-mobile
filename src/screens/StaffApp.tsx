import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client';
import { SelectField } from '../components/SelectField';
import { DateField, TimeField } from '../components/DateTimeFields';
import { useLayout } from '../layout';

export type StaffUser = {
  id: number;
  ad_soyad: string;
  e_posta: string;
  telefon?: string | null;
  rol?: string | null;
  sifre_degistirildi_mi?: boolean;
  yetkiler?: {
    randevu?: boolean;
    hasta?: boolean;
    odeme?: boolean;
    finans?: boolean;
  };
  klinik?: { id: number; ad: string } | null;
};

type DoctorOpt = { id: number; ad_soyad: string; unvan?: string | null };
type Appt = {
  id: number;
  tarih: string;
  saat: string;
  durum: string;
  not?: string | null;
  hasta_id?: number;
  hasta_adi?: string;
  hasta_telefon?: string | null;
  doktor_id?: number;
  doktor_adi?: string;
  hizmet_id?: number;
  hizmet?: string | null;
};
type Patient = {
  id: number;
  ad_soyad: string;
  ad?: string;
  soyad?: string;
  e_posta?: string;
  telefon?: string | null;
};
type Payment = {
  id: number;
  tutar: number;
  odenen_tutar: number;
  odeme_yontemi: string;
  durum: string;
  aciklama?: string | null;
  odeme_tarihi?: string | null;
  doktor_adi?: string;
  hasta_adi?: string;
};

type Tab = 'panel' | 'randevu' | 'talepler' | 'hastalar' | 'odemeler';

const DURUM_LABEL: Record<string, string> = {
  beklemede: 'Beklemede',
  onaylandi: 'Onaylı',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal',
};

function errMsg(e: unknown, fb = 'Hata oluştu.'): string {
  return e instanceof Error && e.message ? e.message : fb;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Props = {
  staff: StaffUser;
  onStaffUpdated: (s: StaffUser) => void;
  onSignOut: () => void | Promise<void>;
};

export function StaffApp({ staff, onStaffUpdated, onSignOut }: Props) {
  const L = useLayout();
  const yetki = staff.yetkiler ?? { randevu: true, hasta: true, odeme: false };
  const needsPassword = staff.sifre_degistirildi_mi === false;

  const tabs = useMemo(() => {
    // Max 5 items; short labels so bar stays readable on small phones
    const t: { id: Tab; label: string; icon: string }[] = [{ id: 'panel', label: 'Panel', icon: '⌂' }];
    if (yetki.randevu !== false) {
      t.push({ id: 'randevu', label: 'Randevu', icon: '▦' });
      t.push({ id: 'talepler', label: 'Talep', icon: '◷' });
    }
    if (yetki.hasta !== false) t.push({ id: 'hastalar', label: 'Hasta', icon: '☺' });
    if (yetki.odeme) t.push({ id: 'odemeler', label: 'Ödeme', icon: '₺' });
    return t;
  }, [yetki.hasta, yetki.odeme, yetki.randevu]);

  const [tab, setTab] = useState<Tab>('panel');

  useEffect(() => {
    if (!tabs.find((t) => t.id === tab)) setTab('panel');
  }, [tabs, tab]);

  if (needsPassword) {
    return (
      <ForcePasswordScreen
        onDone={(s) => onStaffUpdated(s)}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <View style={st.safe}>
      <StatusBar style="dark" />
      <View
        style={[
          st.header,
          {
            paddingTop: L.safeTop,
            paddingHorizontal: L.padX,
            paddingBottom: L.space.sm,
          },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
          <Text style={[st.headerEyebrow, { fontSize: L.font.xs }]}>
            PERSONEL · {(staff.rol || 'görevli').toUpperCase()}
          </Text>
          <Text style={[st.headerTitle, { fontSize: L.font.lg }]} numberOfLines={1}>
            {staff.ad_soyad}
          </Text>
          <Text style={[st.headerSub, { fontSize: L.font.sm }]} numberOfLines={1}>
            {staff.klinik?.ad || 'Klinik'}
          </Text>
        </View>
        <Pressable style={st.logoutBtn} onPress={() => void onSignOut()} hitSlop={12}>
          <Text style={st.logoutText}>Çıkış</Text>
        </Pressable>
      </View>

      <View style={st.body}>
        {tab === 'panel' ? <StaffDashboard onGo={setTab} yetki={yetki} /> : null}
        {tab === 'randevu' && yetki.randevu !== false ? <StaffAppointments /> : null}
        {tab === 'talepler' && yetki.randevu !== false ? <StaffRequests /> : null}
        {tab === 'hastalar' && yetki.hasta !== false ? <StaffPatients /> : null}
        {tab === 'odemeler' && yetki.odeme ? <StaffPayments /> : null}
      </View>

      <View style={[st.tabBarWrap, { paddingBottom: L.footerPad, paddingHorizontal: L.padX - 6 }]}>
        <View style={[st.tabBar, { minHeight: L.btnHeight + 4 }]}>
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                style={st.tabItem}
                onPress={() => setTab(t.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t.label}
              >
                <View style={[st.tabIconShell, active && st.tabIconShellOn]}>
                  <Text style={[st.tabIcon, active && st.tabIconOn]}>{t.icon}</Text>
                </View>
                <Text
                  style={[st.tabLabel, { fontSize: L.font.xs }, active && st.tabLabelOn]}
                  numberOfLines={1}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function ForcePasswordScreen({
  onDone,
  onSignOut,
}: {
  onDone: (s: StaffUser) => void;
  onSignOut: () => void | Promise<void>;
}) {
  const L = useLayout();
  const [sifre, setSifre] = useState('');
  const [sifre2, setSifre2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (sifre.length < 8) {
      setErr('Şifre en az 8 karakter olmalı.');
      return;
    }
    if (sifre !== sifre2) {
      setErr('Şifreler uyuşmuyor.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiPut<StaffUser>('/staff/auth/password', {
        sifre,
        sifre_confirmation: sifre2,
      });
      if (res.data) onDone(res.data);
      else Alert.alert('Tamam', res.message ?? 'Şifre güncellendi.');
    } catch (e) {
      setErr(errMsg(e, 'Şifre güncellenemedi.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={st.safe}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{
          padding: L.padX,
          paddingTop: L.safeTop + 36,
          paddingBottom: L.footerPad + 24,
        }}
      >
        <Text style={st.forceTitle}>Yeni şifre belirleyin</Text>
        <Text style={st.forceDesc}>
          İlk girişte güvenlik için şifrenizi değiştirmeniz zorunludur. Ardından personel paneline geçersiniz.
        </Text>
        <Text style={st.label}>Yeni şifre</Text>
        <TextInput style={st.input} secureTextEntry value={sifre} onChangeText={setSifre} placeholderTextColor="#6B7F93" />
        <Text style={st.label}>Şifre tekrar</Text>
        <TextInput style={st.input} secureTextEntry value={sifre2} onChangeText={setSifre2} placeholderTextColor="#6B7F93" />
        {err ? <Text style={st.error}>{err}</Text> : null}
        <Pressable style={[st.primaryBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => void submit()}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={st.primaryBtnText}>Kaydet ve devam et</Text>}
        </Pressable>
        <Pressable style={{ marginTop: 18 }} onPress={() => void onSignOut()}>
          <Text style={st.link}>Çıkış yap</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function StaffDashboard({
  onGo,
  yetki,
}: {
  onGo: (t: Tab) => void;
  yetki: StaffUser['yetkiler'];
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    bugun_randevu?: number;
    bekleyen_talep?: number;
    hasta_sayisi?: number;
    hekim_sayisi?: number;
    sonraki_randevu?: Appt | null;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<typeof data>('/staff/dashboard');
      setData(res.data ?? null);
    } catch (e) {
      Alert.alert('Hata', errMsg(e, 'Panel yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <View style={st.center}>
        <ActivityIndicator color="#F58A45" />
      </View>
    );
  }

  const cards = [
    { k: 'bugun', label: 'Bugün randevu', v: data?.bugun_randevu ?? 0, go: yetki?.randevu !== false ? ('randevu' as Tab) : null },
    { k: 'talep', label: 'Bekleyen talep', v: data?.bekleyen_talep ?? 0, go: yetki?.randevu !== false ? ('talepler' as Tab) : null },
    { k: 'hasta', label: 'Hasta havuzu', v: data?.hasta_sayisi ?? 0, go: yetki?.hasta !== false ? ('hastalar' as Tab) : null },
    { k: 'hekim', label: 'Hekim', v: data?.hekim_sayisi ?? 0, go: null },
  ];

  return (
    <ScrollView
      contentContainerStyle={st.scroll}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#F58A45" />}
    >
      <Text style={st.sectionTitle}>Klinik özeti</Text>
      <View style={st.grid}>
        {cards.map((c) => (
          <Pressable
            key={c.k}
            style={st.statCard}
            onPress={() => (c.go ? onGo(c.go) : undefined)}
            disabled={!c.go}
          >
            <Text style={st.statValue}>{c.v}</Text>
            <Text style={st.statLabel}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      {data?.sonraki_randevu ? (
        <View style={st.card}>
          <Text style={st.cardTitle}>Sıradaki randevu</Text>
          <Text style={st.cardBody}>
            {data.sonraki_randevu.hasta_adi} · {data.sonraki_randevu.tarih} {data.sonraki_randevu.saat}
          </Text>
          <Text style={st.meta}>
            {data.sonraki_randevu.doktor_adi} · {data.sonraki_randevu.hizmet || 'Hizmet'} ·{' '}
            {DURUM_LABEL[data.sonraki_randevu.durum] || data.sonraki_randevu.durum}
          </Text>
        </View>
      ) : (
        <View style={st.card}>
          <Text style={st.cardTitle}>Sıradaki randevu</Text>
          <Text style={st.meta}>Yaklaşan randevu yok.</Text>
        </View>
      )}

      <Text style={[st.sectionTitle, { marginTop: 18 }]}>Hızlı işlemler</Text>
      {yetki?.randevu !== false ? (
        <Pressable style={st.quickRow} onPress={() => onGo('randevu')}>
          <Text style={st.quickText}>▦  Randevu takvimi / oluştur</Text>
        </Pressable>
      ) : null}
      {yetki?.randevu !== false ? (
        <Pressable style={st.quickRow} onPress={() => onGo('talepler')}>
          <Text style={st.quickText}>◷  Bekleyen talepleri onayla</Text>
        </Pressable>
      ) : null}
      {yetki?.hasta !== false ? (
        <Pressable style={st.quickRow} onPress={() => onGo('hastalar')}>
          <Text style={st.quickText}>☺  Hasta havuzu</Text>
        </Pressable>
      ) : null}
      {yetki?.odeme ? (
        <Pressable style={st.quickRow} onPress={() => onGo('odemeler')}>
          <Text style={st.quickText}>₺  Ödeme al</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function StaffAppointments() {
  const [doctors, setDoctors] = useState<DoctorOpt[]>([]);
  const [doktorId, setDoktorId] = useState<number | null>(null);
  const [tarih, setTarih] = useState(todayKey());
  const [items, setItems] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const loadDoctors = useCallback(async () => {
    try {
      const res = await apiGet<DoctorOpt[]>('/staff/doctors');
      const list = res.data ?? [];
      setDoctors(list);
      if (!doktorId && list[0]) setDoktorId(list[0].id);
    } catch (e) {
      Alert.alert('Hata', errMsg(e));
    }
  }, [doktorId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<Appt[]>('/staff/appointments', {
        doktor_id: doktorId || undefined,
        tarih,
      });
      setItems(res.data ?? []);
    } catch (e) {
      Alert.alert('Hata', errMsg(e, 'Randevular yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [doktorId, tarih]);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setDurum(id: number, durum: string) {
    try {
      await apiPut(`/staff/appointments/${id}`, { durum });
      await load();
    } catch (e) {
      Alert.alert('Hata', errMsg(e));
    }
  }

  async function cancel(id: number) {
    Alert.alert('İptal', 'Randevu iptal edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiPost(`/staff/appointments/${id}/cancel`);
              await load();
            } catch (e) {
              Alert.alert('Hata', errMsg(e));
            }
          })();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#F58A45" />}
      >
        {doctors.length > 1 ? (
          <SelectField
            label={`Hekim (${doctors.length} klinik hekimi)`}
            options={doctors.map((d) => ({ label: d.ad_soyad, value: d.id }))}
            value={doktorId}
            onChange={setDoktorId}
          />
        ) : doctors.length === 1 ? (
          <View style={[st.card, { marginTop: 0 }]}>
            <Text style={st.meta}>Hekim</Text>
            <Text style={st.cardTitle}>{doctors[0].ad_soyad}</Text>
          </View>
        ) : (
          <Text style={st.meta}>Kliniğe bağlı aktif hekim yok.</Text>
        )}
        <DateField label="Tarih" value={tarih} onChange={setTarih} />
        <Pressable
          style={[st.primaryBtn, { marginTop: 12 }, (!doktorId || doctors.length === 0) && { opacity: 0.5 }]}
          disabled={!doktorId || doctors.length === 0}
          onPress={() => setCreateOpen(true)}
        >
          <Text style={st.primaryBtnText}>+ Yeni randevu</Text>
        </Pressable>

        {items.length === 0 && !loading ? (
          <Text style={[st.meta, { marginTop: 20, textAlign: 'center' }]}>Bu günde randevu yok.</Text>
        ) : (
          items.map((a) => (
            <View key={a.id} style={st.card}>
              <View style={st.rowBetween}>
                <Text style={st.cardTitle}>{a.saat} · {a.hasta_adi}</Text>
                <Text style={st.pill}>{DURUM_LABEL[a.durum] || a.durum}</Text>
              </View>
              <Text style={st.meta}>{a.doktor_adi} · {a.hizmet || '—'}</Text>
              {a.hasta_telefon ? <Text style={st.meta}>{a.hasta_telefon}</Text> : null}
              <View style={st.actionRow}>
                {a.durum === 'beklemede' ? (
                  <Pressable style={st.chipOk} onPress={() => void setDurum(a.id, 'onaylandi')}>
                    <Text style={st.chipOkText}>Onayla</Text>
                  </Pressable>
                ) : null}
                {a.durum === 'onaylandi' ? (
                  <Pressable style={st.chipOk} onPress={() => void setDurum(a.id, 'tamamlandi')}>
                    <Text style={st.chipOkText}>Tamamla</Text>
                  </Pressable>
                ) : null}
                {a.durum !== 'iptal' ? (
                  <Pressable style={st.chipDanger} onPress={() => void cancel(a.id)}>
                    <Text style={st.chipDangerText}>İptal</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <CreateAppointmentModal
        visible={createOpen}
        doctors={doctors}
        defaultDoktorId={doktorId}
        defaultTarih={tarih}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void load();
        }}
      />
    </View>
  );
}

function CreateAppointmentModal({
  visible,
  doctors,
  defaultDoktorId,
  defaultTarih,
  onClose,
  onCreated,
}: {
  visible: boolean;
  doctors: DoctorOpt[];
  defaultDoktorId: number | null;
  defaultTarih: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [doktorId, setDoktorId] = useState<number | null>(defaultDoktorId);
  const [tarih, setTarih] = useState(defaultTarih);
  const [saat, setSaat] = useState('09:00');
  const [hizmetId, setHizmetId] = useState<number | null>(null);
  const [hastaId, setHastaId] = useState<number | null>(null);
  const [hizmetler, setHizmetler] = useState<{ id: number; ad: string }[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [q, setQ] = useState('');
  const [not, setNot] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setDoktorId(defaultDoktorId);
      setTarih(defaultTarih);
    }
  }, [visible, defaultDoktorId, defaultTarih]);

  useEffect(() => {
    if (!visible || !doktorId) return;
    void (async () => {
      try {
        const res = await apiGet<{ hizmetler: { id: number; ad: string }[]; slots: string[] }>('/staff/doctor-meta', {
          doktor_id: doktorId,
          tarih,
        });
        setHizmetler(res.data?.hizmetler ?? []);
        setSlots(res.data?.slots ?? []);
        if (res.data?.hizmetler?.[0] && !hizmetId) setHizmetId(res.data.hizmetler[0].id);
      } catch {
        setHizmetler([]);
        setSlots([]);
      }
    })();
  }, [visible, doktorId, tarih, hizmetId]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await apiGet<Patient[]>('/staff/patients', { q: q || undefined });
          setPatients(res.data ?? []);
        } catch {
          setPatients([]);
        }
      })();
    }, 300);
    return () => clearTimeout(t);
  }, [q, visible]);

  async function submit() {
    if (!doktorId || !hastaId || !hizmetId || !tarih || !saat) {
      Alert.alert('Eksik', 'Hekim, hasta, hizmet, tarih ve saat gerekli.');
      return;
    }
    setBusy(true);
    try {
      await apiPost('/staff/appointments', {
        doktor_id: doktorId,
        hasta_id: hastaId,
        hizmet_id: hizmetId,
        tarih,
        saat,
        not: not || null,
      });
      Alert.alert('Tamam', 'Randevu oluşturuldu.');
      onCreated();
    } catch (e) {
      Alert.alert('Hata', errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <View style={st.modalSheet}>
          <View style={st.rowBetween}>
            <Text style={st.cardTitle}>Yeni randevu</Text>
            <Pressable onPress={onClose}><Text style={st.link}>Kapat</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {doctors.length > 1 ? (
              <SelectField
                label={`Hekim (${doctors.length})`}
                options={doctors.map((d) => ({ label: d.ad_soyad, value: d.id }))}
                value={doktorId}
                onChange={setDoktorId}
              />
            ) : doctors[0] ? (
              <View style={[st.card, { marginTop: 8 }]}>
                <Text style={st.meta}>Hekim</Text>
                <Text style={st.cardTitle}>{doctors[0].ad_soyad}</Text>
              </View>
            ) : null}
            <DateField label="Tarih" value={tarih} onChange={setTarih} />
            {slots.length > 0 ? (
              <SelectField
                label="Boş saatler"
                options={slots.map((s) => ({ label: s, value: s }))}
                value={saat}
                onChange={setSaat}
              />
            ) : (
              <TimeField label="Saat" value={saat} onChange={setSaat} />
            )}
            <SelectField
              label="Hizmet"
              options={hizmetler.map((h) => ({ label: h.ad, value: h.id }))}
              value={hizmetId}
              onChange={setHizmetId}
            />
            <Text style={st.label}>Hasta ara</Text>
            <TextInput style={st.input} value={q} onChangeText={setQ} placeholder="Ad, telefon…" placeholderTextColor="#6B7F93" />
            <SelectField
              label="Hasta"
              options={patients.map((p) => ({ label: `${p.ad_soyad} ${p.telefon || ''}`.trim(), value: p.id }))}
              value={hastaId}
              onChange={setHastaId}
              searchable
            />
            <Text style={st.label}>Not</Text>
            <TextInput style={[st.input, { minHeight: 64 }]} value={not} onChangeText={setNot} multiline placeholderTextColor="#6B7F93" />
            <Pressable style={[st.primaryBtn, { marginVertical: 16 }, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => void submit()}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={st.primaryBtnText}>Kaydet</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StaffRequests() {
  const [items, setItems] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<Appt[]>('/staff/requests');
      setItems(res.data ?? []);
    } catch (e) {
      Alert.alert('Hata', errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: number) {
    try {
      await apiPost(`/staff/requests/${id}/approve`);
      await load();
    } catch (e) {
      Alert.alert('Hata', errMsg(e));
    }
  }
  async function reject(id: number) {
    try {
      await apiPost(`/staff/requests/${id}/reject`);
      await load();
    } catch (e) {
      Alert.alert('Hata', errMsg(e));
    }
  }

  return (
    <ScrollView
      contentContainerStyle={st.scroll}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#F58A45" />}
    >
      <Text style={st.sectionTitle}>Bekleyen talepler</Text>
      {items.length === 0 && !loading ? (
        <Text style={[st.meta, { textAlign: 'center', marginTop: 24 }]}>Bekleyen talep yok.</Text>
      ) : (
        items.map((a) => (
          <View key={a.id} style={st.card}>
            <Text style={st.cardTitle}>{a.hasta_adi}</Text>
            <Text style={st.meta}>{a.tarih} {a.saat} · {a.doktor_adi}</Text>
            <Text style={st.meta}>{a.hizmet || '—'}</Text>
            <View style={st.actionRow}>
              <Pressable style={st.chipOk} onPress={() => void approve(a.id)}>
                <Text style={st.chipOkText}>Onayla</Text>
              </Pressable>
              <Pressable style={st.chipDanger} onPress={() => void reject(a.id)}>
                <Text style={st.chipDangerText}>Reddet</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function StaffPatients() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<{ hasta: Patient; randevular: Appt[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<Patient[]>('/staff/patients', { q: q || undefined });
      setItems(res.data ?? []);
    } catch (e) {
      Alert.alert('Hata', errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  async function openDetail(id: number) {
    try {
      const res = await apiGet<{ hasta: Patient; randevular: Appt[] }>(`/staff/patients/${id}`);
      setDetail(res.data ?? null);
    } catch (e) {
      Alert.alert('Hata', errMsg(e));
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#F58A45" />}
      >
        <Text style={st.label}>Ara</Text>
        <TextInput style={st.input} value={q} onChangeText={setQ} placeholder="Ad, e-posta, telefon" placeholderTextColor="#6B7F93" />
        <Pressable style={[st.primaryBtn, { marginTop: 12 }]} onPress={() => setAddOpen(true)}>
          <Text style={st.primaryBtnText}>+ Hasta ekle</Text>
        </Pressable>
        {items.map((p) => (
          <Pressable key={p.id} style={st.card} onPress={() => void openDetail(p.id)}>
            <Text style={st.cardTitle}>{p.ad_soyad}</Text>
            <Text style={st.meta}>{p.telefon || '—'} · {p.e_posta || '—'}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <AddPatientModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          void load();
        }}
      />

      <Modal visible={!!detail} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
        <View style={st.modalOverlay}>
          <View style={st.modalSheet}>
            <View style={st.rowBetween}>
              <Text style={st.cardTitle}>{detail?.hasta.ad_soyad}</Text>
              <Pressable onPress={() => setDetail(null)}><Text style={st.link}>Kapat</Text></Pressable>
            </View>
            <Text style={st.meta}>{detail?.hasta.telefon} · {detail?.hasta.e_posta}</Text>
            <Text style={[st.sectionTitle, { marginTop: 14 }]}>Klinik randevuları</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {(detail?.randevular || []).map((a) => (
                <View key={a.id} style={[st.card, { marginTop: 8 }]}>
                  <Text style={st.meta}>{a.tarih} {a.saat} · {a.doktor_adi}</Text>
                  <Text style={st.meta}>{DURUM_LABEL[a.durum] || a.durum} · {a.hizmet || '—'}</Text>
                </View>
              ))}
              {(detail?.randevular || []).length === 0 ? <Text style={st.meta}>Kayıt yok.</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AddPatientModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [adSoyad, setAdSoyad] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!adSoyad.trim() || !email.trim() || !tel.trim()) {
      Alert.alert('Eksik', 'Ad soyad, e-posta ve telefon zorunlu.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost('/staff/patients', {
        ad_soyad: adSoyad.trim(),
        e_posta: email.trim(),
        telefon: tel.trim(),
      });
      Alert.alert('Tamam', res.message ?? 'Hasta eklendi.');
      setAdSoyad('');
      setEmail('');
      setTel('');
      onCreated();
    } catch (e) {
      Alert.alert('Hata', errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <View style={st.modalSheet}>
          <View style={st.rowBetween}>
            <Text style={st.cardTitle}>Hasta ekle</Text>
            <Pressable onPress={onClose}><Text style={st.link}>Kapat</Text></Pressable>
          </View>
          <Text style={st.label}>Ad soyad</Text>
          <TextInput style={st.input} value={adSoyad} onChangeText={setAdSoyad} placeholderTextColor="#6B7F93" />
          <Text style={st.label}>E-posta</Text>
          <TextInput style={st.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#6B7F93" />
          <Text style={st.label}>Telefon</Text>
          <TextInput style={st.input} value={tel} onChangeText={setTel} keyboardType="phone-pad" placeholderTextColor="#6B7F93" />
          <Pressable style={[st.primaryBtn, { marginTop: 16 }, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => void submit()}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={st.primaryBtnText}>Kaydet</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function StaffPayments() {
  const [tarih, setTarih] = useState(todayKey());
  const [items, setItems] = useState<Payment[]>([]);
  const [toplam, setToplam] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [doctors, setDoctors] = useState<DoctorOpt[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ items: Payment[]; toplam_gelir: number }>('/staff/payments', { tarih });
      setItems(res.data?.items ?? []);
      setToplam(res.data?.toplam_gelir ?? 0);
    } catch (e) {
      Alert.alert('Hata', errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [tarih]);

  useEffect(() => {
    void load();
    void (async () => {
      try {
        const res = await apiGet<DoctorOpt[]>('/staff/doctors');
        setDoctors(res.data ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, [load]);

  async function remove(id: number) {
    Alert.alert('İptal', 'Ödeme kaydı iptal edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiDelete(`/staff/payments/${id}`);
              await load();
            } catch (e) {
              Alert.alert('Hata', errMsg(e));
            }
          })();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#F58A45" />}
      >
        <DateField label="Tarih" value={tarih} onChange={setTarih} />
        <View style={[st.card, { borderColor: 'rgba(245,138,69,0.45)' }]}>
          <Text style={st.meta}>Günlük toplam</Text>
          <Text style={st.statValue}>{toplam.toLocaleString('tr-TR')} ₺</Text>
        </View>
        <Pressable style={st.primaryBtn} onPress={() => setAddOpen(true)}>
          <Text style={st.primaryBtnText}>+ Ödeme al</Text>
        </Pressable>
        {items.map((p) => (
          <View key={p.id} style={st.card}>
            <View style={st.rowBetween}>
              <Text style={st.cardTitle}>{p.hasta_adi || 'Hasta'}</Text>
              <Text style={st.pill}>{p.odenen_tutar} ₺</Text>
            </View>
            <Text style={st.meta}>{p.doktor_adi} · {p.odeme_yontemi} · {p.durum}</Text>
            {p.aciklama ? <Text style={st.meta}>{p.aciklama}</Text> : null}
            {p.durum !== 'iptal' ? (
              <Pressable style={[st.chipDanger, { marginTop: 10, alignSelf: 'flex-start' }]} onPress={() => void remove(p.id)}>
                <Text style={st.chipDangerText}>İptal et</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <AddPaymentModal
        visible={addOpen}
        doctors={doctors}
        defaultTarih={tarih}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          void load();
        }}
      />
    </View>
  );
}

function AddPaymentModal({
  visible,
  doctors,
  defaultTarih,
  onClose,
  onCreated,
}: {
  visible: boolean;
  doctors: DoctorOpt[];
  defaultTarih: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [doktorId, setDoktorId] = useState<number | null>(doctors[0]?.id ?? null);
  const [hastaId, setHastaId] = useState<number | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [q, setQ] = useState('');
  const [tutar, setTutar] = useState('');
  const [yontem, setYontem] = useState('nakit');
  const [tarih, setTarih] = useState(defaultTarih);
  const [aciklama, setAciklama] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setTarih(defaultTarih);
      if (!doktorId && doctors[0]) setDoktorId(doctors[0].id);
    }
  }, [visible, defaultTarih, doctors, doktorId]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await apiGet<Patient[]>('/staff/patients', { q: q || undefined });
          setPatients(res.data ?? []);
        } catch {
          setPatients([]);
        }
      })();
    }, 300);
    return () => clearTimeout(t);
  }, [q, visible]);

  async function submit() {
    if (!doktorId || !hastaId || !tutar) {
      Alert.alert('Eksik', 'Hekim, hasta ve tutar gerekli.');
      return;
    }
    setBusy(true);
    try {
      await apiPost('/staff/payments', {
        doktor_id: doktorId,
        hasta_id: hastaId,
        tutar: Number(tutar),
        odeme_yontemi: yontem,
        odeme_tarihi: tarih,
        aciklama: aciklama || null,
      });
      Alert.alert('Tamam', 'Ödeme kaydedildi.');
      onCreated();
    } catch (e) {
      Alert.alert('Hata', errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <View style={st.modalSheet}>
          <View style={st.rowBetween}>
            <Text style={st.cardTitle}>Ödeme al</Text>
            <Pressable onPress={onClose}><Text style={st.link}>Kapat</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <SelectField
              label="Hekim"
              options={doctors.map((d) => ({ label: d.ad_soyad, value: d.id }))}
              value={doktorId}
              onChange={setDoktorId}
            />
            <Text style={st.label}>Hasta ara</Text>
            <TextInput style={st.input} value={q} onChangeText={setQ} placeholderTextColor="#6B7F93" />
            <SelectField
              label="Hasta"
              options={patients.map((p) => ({ label: p.ad_soyad, value: p.id }))}
              value={hastaId}
              onChange={setHastaId}
              searchable
            />
            <Text style={st.label}>Tutar (₺)</Text>
            <TextInput style={st.input} value={tutar} onChangeText={setTutar} keyboardType="decimal-pad" placeholderTextColor="#6B7F93" />
            <SelectField
              label="Yöntem"
              options={[
                { label: 'Nakit', value: 'nakit' },
                { label: 'Kredi kartı', value: 'kredi_karti' },
                { label: 'Havale', value: 'havale' },
                { label: 'Online', value: 'online' },
              ]}
              value={yontem}
              onChange={setYontem}
            />
            <DateField label="Ödeme tarihi" value={tarih} onChange={setTarih} />
            <Text style={st.label}>Açıklama</Text>
            <TextInput style={st.input} value={aciklama} onChangeText={setAciklama} placeholderTextColor="#6B7F93" />
            <Pressable style={[st.primaryBtn, { marginVertical: 16 }, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => void submit()}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={st.primaryBtnText}>Kaydet</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E6ED',
    backgroundColor: '#F4F6F9',
    zIndex: 20,
  },
  headerEyebrow: { color: '#C96A2B', fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: '#102133', fontWeight: '700', marginTop: 2 },
  headerSub: { color: '#7A8B9C', marginTop: 2 },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(245,138,69,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,138,69,0.35)',
    minHeight: 40,
    justifyContent: 'center',
  },
  logoutText: { color: '#C96A2B', fontWeight: '800', fontSize: 12 },
  body: { flex: 1, minHeight: 0 },
  tabBarWrap: {
    backgroundColor: '#F4F6F9',
    paddingTop: 6,
    zIndex: 30,
    elevation: 12,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6ED',
    marginBottom: 4,
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    minWidth: 0,
    minHeight: 44,
  },
  tabIconShell: {
    width: 36,
    height: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconShellOn: {
    backgroundColor: 'rgba(245,138,69,0.16)',
  },
  tabIcon: { color: '#8093A7', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  tabIconOn: { color: '#F58A45' },
  tabLabel: {
    color: '#8093A7',
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: '100%',
  },
  tabLabelOn: { color: '#102133' },
  scroll: { padding: 12, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#102133', fontSize: 13, fontWeight: '800', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    padding: 14,
  },
  statValue: { color: '#102133', fontSize: 14, fontWeight: '800' },
  statLabel: { color: '#7A8B9C', fontSize: 12, marginTop: 4 },
  card: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    padding: 14,
  },
  cardTitle: { color: '#102133', fontSize: 15, fontWeight: '800' },
  cardBody: { color: '#6D7D8E', fontSize: 14, marginTop: 6 },
  meta: { color: '#7A8B9C', fontSize: 12, marginTop: 4 },
  label: { color: '#7A8B9C', fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#102133',
    fontSize: 14,
  },
  primaryBtn: { backgroundColor: '#EE7D31', borderRadius: 12, minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  quickRow: {
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(245,138,69,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,138,69,0.28)',
  },
  quickText: { color: '#C96A2B', fontWeight: '700', fontSize: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pill: {
    color: '#C96A2B',
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: 'rgba(245,138,69,0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chipOk: {
    backgroundColor: 'rgba(77,189,140,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipOkText: { color: '#2E9E5B', fontWeight: '800', fontSize: 12 },
  chipDanger: {
    backgroundColor: 'rgba(224,104,122,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipDangerText: { color: '#C13C2C', fontWeight: '800', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E1E6ED',
  },
  link: { color: '#C96A2B', fontWeight: '700' },
  error: { color: '#C13C2C', marginTop: 10, fontSize: 13 },
  forceTitle: { color: '#102133', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  forceDesc: { color: '#6D7D8E', fontSize: 13, lineHeight: 18, marginBottom: 6 },
});
