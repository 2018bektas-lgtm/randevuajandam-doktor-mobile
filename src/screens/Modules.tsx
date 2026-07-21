import { ComponentType, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiDelete, apiGet, apiPost, apiPut, apiUpload, SITE_URL } from '../api/client';
import { DateField, TimeField } from '../components/DateTimeFields';
import { SelectField } from '../components/SelectField';
import { RichTextEditor } from '../components/RichTextEditor';

import type { ModuleProps, ScreenId } from '../navigation/types';
import { AppIcon } from '../components/AppIcon';
import {
  EmptyContent,
  HeaderIconButton,
  ListRow,
  SearchField,
  SoftAction,
  StatusChip,
} from '../components/ContentUI';
import {
  MenuScreen as PolishedMenuScreen,
  ProfileChrome,
  ProfileHeroCard,
  ProfileLinkGroup,
} from './MenuProfile';
import { ReferralScreen } from './Referral';
import { ScreenShell } from '../ui/Screen';
import { moduleStyles as s } from '../ui/styles';

// --- Shared helpers ---

function errMessage(e: unknown, fallback = 'Bir hata oluştu.'): string {
  if (e instanceof Error && e.message) {
    return e.message;
  }
  return fallback;
}

function DnsStepsCard({ steps }: { steps?: { adim: number; baslik: string; aciklama: string }[] | null }) {
  if (!steps || steps.length === 0) return null;
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>DNS / Hostinger adımları</Text>
      <Text style={s.hint}>Domaini yönlendirmek için sırayla uygulayın.</Text>
      {steps.map((step) => (
        <View key={step.adim} style={{ marginTop: 10 }}>
          <Text style={s.cardMeta}>
            {step.adim}. {step.baslik}
          </Text>
          <Text style={s.cardBody}>{step.aciklama}</Text>
        </View>
      ))}
    </View>
  );
}

function alertError(e: unknown, fallback?: string) {
  const msg = errMessage(e, fallback);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(msg);
    return;
  }
  Alert.alert('Hata', msg);
}

/** Web'de Alert.alert butonları güvenilir değil — confirm kullan. */
function confirmDestructive(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

function openPhone(phone: string | null | undefined) {
  const p = (phone || '').replace(/[^\d+]/g, '');
  if (!p) {
    Alert.alert('Telefon yok', 'Kayıtlı numara bulunamadı.');
    return;
  }
  void Linking.openURL(`tel:${p}`);
}

function openSms(phone: string | null | undefined) {
  const p = (phone || '').replace(/[^\d+]/g, '');
  if (!p) {
    Alert.alert('Telefon yok', 'Kayıtlı numara bulunamadı.');
    return;
  }
  void Linking.openURL(`sms:${p}`);
}

function openEmail(email: string | null | undefined) {
  if (!email) {
    Alert.alert('E-posta yok', 'Kayıtlı e-posta bulunamadı.');
    return;
  }
  void Linking.openURL(`mailto:${email}`);
}

function pickImageSource(): Promise<'library' | 'camera' | null> {
  return new Promise((resolve) => {
    Alert.alert('Görsel seç', 'Kaynak seçin', [
      { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(null) },
      { text: 'Galeri', onPress: () => resolve('library') },
      { text: 'Kamera', onPress: () => resolve('camera') },
    ]);
  });
}

async function launchImagePicker(source: 'library' | 'camera') {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Kamera erişimi için izin verin.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    return result.assets[0];
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('İzin gerekli', 'Galeri erişimi için izin verin.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0];
}

function money(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toFixed(0)} ₺`;
  }
}

function timeSlice(value: string | null | undefined): string {
  if (!value) {
    return '09:00';
  }
  return String(value).slice(0, 5);
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  try {
    const d = new Date(iso);
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type FormModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  submitting?: boolean;
  error?: string | null;
};

function FormModal({
  visible,
  title,
  onClose,
  children,
  onSubmit,
  submitLabel = 'Kaydet',
  submitting = false,
  error,
}: FormModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ maxHeight: '92%' }}
        >
          <View style={s.modalSheet}>
            <View style={s.modalGrabber} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={10} style={s.modalCloseBtn}>
                <AppIcon name="close" size={20} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.modalBody}>
              {children}
              {error ? <Text style={s.errorText}>{error}</Text> : null}
              {onSubmit ? (
                <Pressable
                  style={[s.primaryButton, { marginTop: 20 }, submitting && s.primaryButtonDisabled]}
                  onPress={onSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={s.primaryButtonText}>{submitLabel}</Text>
                  )}
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function EmptyState({
  title,
  text,
  icon = 'document',
}: {
  title: string;
  text: string;
  icon?: import('../components/AppIcon').AppIconName;
}) {
  return <EmptyContent icon={icon} title={title} text={text} />;
}

function useModuleList<T>(loader: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (spinner = true) => {
      if (spinner) {
        setLoading(true);
      }
      try {
        const data = await loader();
        setItems(data);
      } catch (e) {
        alertError(e, 'Veriler yüklenemedi.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loader],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  return {
    items,
    setItems,
    loading,
    refreshing,
    setRefreshing,
    reload: load,
    onRefresh: () => {
      setRefreshing(true);
      void load(false);
    },
  };
}

// â”€â”€ Requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type RequestItem = {
  id: number;
  tarih: string;
  saat: string;
  durum: string;
  hasta_adi: string;
  telefon: string | null;
  hizmet: string | null;
  not: string | null;
  gorusme_tipi: string | null;
};

export function RequestsScreen({ onBack }: ModuleProps) {
  const loader = useCallback(async () => {
    const res = await apiGet<RequestItem[]>('/doctor/requests');
    return res.data ?? [];
  }, []);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function setStatus(id: number, durum: 'onaylandi' | 'iptal') {
    setBusyId(id);
    try {
      await apiPost(`/doctor/appointments/${id}/status`, { durum });
      await reload(false);
    } catch (e) {
      alertError(e, 'Durum güncellenemedi.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScreenShell
      title="Randevu Talepleri"
      subtitle="Onay bekleyen randevu başvuruları."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {items.length === 0 ? (
        <EmptyState
          icon="requests"
          title="Bekleyen talep yok"
          text="Yeni randevu talepleri burada listelenir."
        />
      ) : (
        items.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={s.contentIconBadge}>
                  <AppIcon name="people" size={18} color="#EE7D31" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{item.hasta_adi || 'Danışan'}</Text>
                  <Text style={s.cardMeta}>
                    {item.tarih} · {timeSlice(item.saat)}
                    {item.hizmet ? ` · ${item.hizmet}` : ''}
                  </Text>
                </View>
              </View>
              <StatusChip label="Bekliyor" tone="warning" />
            </View>
            {item.telefon ? (
              <Pressable style={s.inlineContact} onPress={() => openPhone(item.telefon)}>
                <AppIcon name="call" size={14} color="#64748B" />
                <Text style={s.cardMeta}>{item.telefon}</Text>
              </Pressable>
            ) : null}
            {item.not ? <Text style={s.cardBody}>{item.not}</Text> : null}
            <View style={s.actions}>
              <Pressable
                style={[s.actionBtn, s.actionBtnSuccess]}
                disabled={busyId === item.id}
                onPress={() => void setStatus(item.id, 'onaylandi')}
              >
                <AppIcon name="check" size={16} color="#1F9D55" />
                <Text style={[s.actionBtnText, s.actionBtnSuccessText]}>
                  {busyId === item.id ? '…' : 'Onayla'}
                </Text>
              </Pressable>
              <Pressable
                style={[s.actionBtn, s.actionBtnDanger]}
                disabled={busyId === item.id}
                onPress={() => void setStatus(item.id, 'iptal')}
              >
                <AppIcon name="close" size={16} color="#DC2626" />
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Reddet</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScreenShell>
  );
}

// â”€â”€ Waitlist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type WaitlistItem = {
  id: number;
  ad: string;
  soyad: string;
  telefon: string | null;
  e_posta: string | null;
  durum: string;
  tercih_tarih: string | null;
  tercih_saat: string | null;
  not: string | null;
  hizmet: string | null;
};

const WAITLIST_LABEL: Record<string, string> = {
  beklemede: 'Beklemede',
  bildirildi: 'Bildirildi',
  randevu_alindi: 'Randevu alındı',
  iptal: 'İptal',
};

export function WaitlistScreen({ onBack }: ModuleProps) {
  const [filter, setFilter] = useState<'aktif' | 'beklemede' | 'bildirildi'>('aktif');
  const loader = useCallback(async () => {
    const res = await apiGet<WaitlistItem[]>('/doctor/waitlist', { durum: filter });
    return res.data ?? [];
  }, [filter]);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function changeStatus(id: number, durum: string) {
    setBusyId(id);
    try {
      await apiPost(`/doctor/waitlist/${id}/status`, { durum });
      await reload(false);
    } catch (e) {
      alertError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function notify(id: number) {
    setBusyId(id);
    try {
      await apiPost(`/doctor/waitlist/${id}/notify`);
      Alert.alert('Tamam', 'Danışan bilgilendirildi.');
      await reload(false);
    } catch (e) {
      alertError(e);
    } finally {
      setBusyId(null);
    }
  }

  function remove(id: number) {
    Alert.alert('Kaydı sil', 'Bu bekleme listesi kaydı silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusyId(id);
            try {
              await apiDelete(`/doctor/waitlist/${id}`);
              await reload(false);
            } catch (e) {
              alertError(e);
            } finally {
              setBusyId(null);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenShell
      title="Bekleme Listesi"
      subtitle="Boşalan randevular için bekleyen danışanlar."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <SelectField
        label="Filtre"
        options={[
          { label: 'Aktif', value: 'aktif' },
          { label: 'Bekleyen', value: 'beklemede' },
          { label: 'Bildirilen', value: 'bildirildi' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {items.length === 0 ? (
        <EmptyState title="Kayıt yok" text="Seçili filtrede bekleme listesi kaydı bulunamadı." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>
                {item.ad} {item.soyad}
              </Text>
              <View style={s.pill}>
                <Text style={s.pillText}>{WAITLIST_LABEL[item.durum] ?? item.durum}</Text>
              </View>
            </View>
            <Text style={s.cardMeta}>
              {item.telefon || 'Telefon yok'}
              {item.hizmet ? ` · ${item.hizmet}` : ''}
            </Text>
            {(item.tercih_tarih || item.tercih_saat) && (
              <Text style={s.cardMeta}>
                Tercih: {item.tercih_tarih ?? '—'} {item.tercih_saat ? timeSlice(item.tercih_saat) : ''}
              </Text>
            )}
            {item.not ? <Text style={s.cardBody}>{item.not}</Text> : null}
            <View style={s.actions}>
              {item.durum === 'beklemede' ? (
                <Pressable
                  style={[s.actionBtn, s.actionBtnSuccess]}
                  disabled={busyId === item.id}
                  onPress={() => void notify(item.id)}
                >
                  <Text style={[s.actionBtnText, s.actionBtnSuccessText]}>Bildir</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={s.actionBtn}
                disabled={busyId === item.id}
                onPress={() => void changeStatus(item.id, 'randevu_alindi')}
              >
                <Text style={s.actionBtnText}>Randevu alındı</Text>
              </Pressable>
              <Pressable
                style={[s.actionBtn, s.actionBtnMuted]}
                disabled={busyId === item.id}
                onPress={() => void changeStatus(item.id, 'iptal')}
              >
                <Text style={[s.actionBtnText, s.actionBtnMutedText]}>İptal</Text>
              </Pressable>
              <Pressable
                style={[s.actionBtn, s.actionBtnDanger]}
                disabled={busyId === item.id}
                onPress={() => remove(item.id)}
              >
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScreenShell>
  );
}

// â”€â”€ Patients â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type PatientItem = {
  id: number;
  ad: string;
  soyad: string;
  telefon: string | null;
  e_posta?: string | null;
  randevu_sayisi?: number;
};

export function PatientsScreen({ onBack }: ModuleProps) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const loader = useCallback(async () => {
    const res = await apiGet<PatientItem[]>('/doctor/patients', {
      q: search || undefined,
      page,
      per_page: 20,
    });
    const meta = res.meta as { last_page?: number; total?: number } | undefined;
    setLastPage(Number(meta?.last_page) || 1);
    setTotal(Number(meta?.total) || (res.data?.length ?? 0));
    return res.data ?? [];
  }, [search, page]);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adSoyad, setAdSoyad] = useState('');
  const [telefon, setTelefon] = useState('');
  const [ePosta, setEPosta] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editAd, setEditAd] = useState('');
  const [editSoyad, setEditSoyad] = useState('');
  const [editTel, setEditTel] = useState('');
  const [editMail, setEditMail] = useState('');

  async function openDetail(id: number) {
    setDetailLoading(true);
    try {
      const res = await apiGet<any>(`/doctor/patients/${id}`);
      setDetail(res.data);
    } catch (e) {
      alertError(e, 'Hasta detayı yüklenemedi.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function createPatient() {
    if (!adSoyad.trim() || !telefon.trim()) {
      setFormError('Ad soyad ve telefon zorunludur.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiPost('/doctor/patients', {
        ad_soyad: adSoyad.trim(),
        telefon: telefon.trim(),
        e_posta: ePosta.trim() || null,
      });
      setModalOpen(false);
      setAdSoyad('');
      setTelefon('');
      setEPosta('');
      await reload(false);
    } catch (e) {
      setFormError(errMessage(e, 'Danışan eklenemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function savePatientEdit() {
    if (!detail?.id) return;
    setSubmitting(true);
    try {
      const res = await apiPut<any>(`/doctor/patients/${detail.id}`, {
        ad: editAd.trim(),
        soyad: editSoyad.trim(),
        telefon: editTel.trim() || null,
        e_posta: editMail.trim() || null,
      });
      setDetail({ ...detail, ...res.data });
      setEditOpen(false);
      await reload(false);
      Alert.alert('Tamam', 'Danışan güncellendi.');
    } catch (e) {
      alertError(e, 'Güncellenemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (detail) {
    return (
      <ScreenShell
        title={`${detail.ad ?? ''} ${detail.soyad ?? ''}`.trim() || 'Hasta'}
        subtitle={detail.telefon || detail.e_posta || 'Detay ve randevu geçmişi'}
        onBack={() => setDetail(null)}
        loading={detailLoading}
        rightAction={
          <Pressable
            onPress={() => {
              setEditAd(detail.ad || '');
              setEditSoyad(detail.soyad || '');
              setEditTel(detail.telefon || '');
              setEditMail(detail.e_posta || '');
              setEditOpen(true);
            }}
          >
            <Text style={s.modalClose}>Düzenle</Text>
          </Pressable>
        }
      >
        <View style={s.card}>
          <Text style={s.cardTitle}>İletişim</Text>
          <Text style={s.cardBody}>{detail.telefon || 'Telefon yok'}</Text>
          {detail.e_posta ? <Text style={s.cardMeta}>{detail.e_posta}</Text> : null}
          <View style={s.actions}>
            <Pressable style={[s.actionBtn, s.actionBtnSuccess]} onPress={() => openPhone(detail.telefon)}>
              <Text style={[s.actionBtnText, s.actionBtnSuccessText]}>Ara</Text>
            </Pressable>
            <Pressable style={s.actionBtn} onPress={() => openSms(detail.telefon)}>
              <Text style={s.actionBtnText}>SMS</Text>
            </Pressable>
            <Pressable style={[s.actionBtn, s.actionBtnMuted]} onPress={() => openEmail(detail.e_posta)}>
              <Text style={[s.actionBtnText, s.actionBtnMutedText]}>E-posta</Text>
            </Pressable>
            <Pressable
              style={[s.actionBtn, s.actionBtnDanger]}
              onPress={() => {
                Alert.alert('Danışanı kaldır', 'Listeden kaldırılsın / pasifleştirilsin mi?', [
                  { text: 'Vazgeç', style: 'cancel' },
                  {
                    text: 'Kaldır',
                    style: 'destructive',
                    onPress: () => {
                      void apiDelete(`/doctor/patients/${detail.id}`)
                        .then(async () => {
                          setDetail(null);
                          await reload(false);
                          Alert.alert('Tamam', 'Danışan listeden kaldırıldı.');
                        })
                        .catch(alertError);
                    },
                  },
                ]);
              }}
            >
              <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Kaldır</Text>
            </Pressable>
          </View>
        </View>
        <FormModal
          visible={editOpen}
          title="Danışanı düzenle"
          onClose={() => setEditOpen(false)}
          onSubmit={() => void savePatientEdit()}
          submitting={submitting}
        >
          <Text style={s.label}>Ad</Text>
          <TextInput style={s.input} value={editAd} onChangeText={setEditAd} placeholderTextColor="#6B7F93" />
          <Text style={s.label}>Soyad</Text>
          <TextInput style={s.input} value={editSoyad} onChangeText={setEditSoyad} placeholderTextColor="#6B7F93" />
          <Text style={s.label}>Telefon</Text>
          <TextInput style={s.input} value={editTel} onChangeText={setEditTel} keyboardType="phone-pad" placeholderTextColor="#6B7F93" />
          <Text style={s.label}>E-posta</Text>
          <TextInput style={s.input} value={editMail} onChangeText={setEditMail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#6B7F93" />
        </FormModal>
        <Text style={s.sectionTitle}>Randevu geçmişi</Text>
        {(detail.randevular || []).length === 0 ? (
          <EmptyState title="Randevu yok" text="Bu danışanla randevu kaydı bulunamadı." />
        ) : (
          (detail.randevular as any[]).map((r) => (
            <View key={r.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>
                  {r.tarih} · {String(r.saat || '').slice(0, 5)}
                </Text>
                <View style={s.pill}>
                  <Text style={s.pillText}>{r.durum}</Text>
                </View>
              </View>
              {r.hizmet ? <Text style={s.cardMeta}>{r.hizmet}</Text> : null}
              {r.hekim_notu ? <Text style={s.cardBody}>Not: {r.hekim_notu}</Text> : null}
            </View>
          ))
        )}
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Hasta Kayıtları"
      subtitle="Danışanlarınızı arayın ve yeni kayıt ekleyin."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={<HeaderIconButton name="plus" onPress={() => setModalOpen(true)} />}
    >
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Ad, telefon veya e-posta ara…"
        onSubmit={() => {
          setPage(1);
          setSearch(query.trim());
        }}
      />
      <View style={{ marginTop: 10 }}>
        <SoftAction
          label="Ara"
          icon="search"
          onPress={() => {
            setPage(1);
            setSearch(query.trim());
          }}
        />
      </View>
      {total > 0 ? (
        <Text style={s.hint}>
          Toplam {total} · Sayfa {page}/{lastPage}
        </Text>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon="people"
          title="Danışan bulunamadı"
          text="Arama kriterinizi değiştirin veya yeni danışan ekleyin."
        />
      ) : (
        items.map((p) => (
          <ListRow
            key={p.id}
            icon="people"
            title={`${p.ad} ${p.soyad}`.trim()}
            subtitle={p.telefon || p.e_posta || 'İletişim yok'}
            meta={
              typeof p.randevu_sayisi === 'number'
                ? `${p.randevu_sayisi} randevu`
                : 'Detay için dokunun'
            }
            onPress={() => void openDetail(p.id)}
          />
        ))
      )}

      {lastPage > 1 ? (
        <View style={s.actions}>
          <SoftAction
            label="Önceki"
            icon="chevronLeft"
            tone="neutral"
            disabled={page <= 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
          />
          <SoftAction
            label="Sonraki"
            icon="chevronRight"
            tone="neutral"
            disabled={page >= lastPage}
            onPress={() => setPage((p) => Math.min(lastPage, p + 1))}
          />
        </View>
      ) : null}

      <FormModal
        visible={modalOpen}
        title="Yeni danışan"
        onClose={() => setModalOpen(false)}
        onSubmit={() => void createPatient()}
        submitLabel="Danışan ekle"
        submitting={submitting}
        error={formError}
      >
        <Text style={s.label}>Ad Soyad</Text>
        <TextInput style={s.input} value={adSoyad} onChangeText={setAdSoyad} placeholderTextColor="#6B7F93" placeholder="Örn. Ayşe Yılmaz" />
        <Text style={s.label}>Telefon</Text>
        <TextInput style={s.input} value={telefon} onChangeText={setTelefon} keyboardType="phone-pad" placeholderTextColor="#6B7F93" placeholder="05xx xxx xx xx" />
        <Text style={s.label}>E-posta (isteğe bağlı)</Text>
        <TextInput style={s.input} value={ePosta} onChangeText={setEPosta} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#6B7F93" />
      </FormModal>
    </ScreenShell>
  );
}

// â”€â”€ Services â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ServiceItem = {
  id: number;
  ad: string;
  aciklama?: string | null;
  sure: number;
  fiyat?: number | null;
  aktif_mi: boolean;
  meta_baslik?: string | null;
  meta_aciklama?: string | null;
  meta_anahtar_kelimeler?: string | null;
};

export function ServicesScreen({ onBack }: ModuleProps) {
  const loader = useCallback(async () => {
    const res = await apiGet<ServiceItem[]>('/doctor/services');
    return res.data ?? [];
  }, []);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [ad, setAd] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [sure, setSure] = useState('30');
  const [fiyat, setFiyat] = useState('');
  const [aktif, setAktif] = useState(true);
  const [metaBaslik, setMetaBaslik] = useState('');
  const [metaAciklama, setMetaAciklama] = useState('');
  const [metaKw, setMetaKw] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditId(null);
    setAd('');
    setAciklama('');
    setSure('30');
    setFiyat('');
    setAktif(true);
    setMetaBaslik('');
    setMetaAciklama('');
    setMetaKw('');
    setImageUri(null);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item: ServiceItem) {
    setEditId(item.id);
    setAd(item.ad);
    setAciklama((item.aciklama ?? '').replace(/<[^>]+>/g, ''));
    setSure(String(item.sure ?? 30));
    setFiyat(item.fiyat != null ? String(item.fiyat) : '');
    setAktif(!!item.aktif_mi);
    setMetaBaslik(item.meta_baslik || '');
    setMetaAciklama(item.meta_aciklama || '');
    setMetaKw(item.meta_anahtar_kelimeler || '');
    setImageUri(null);
    setFormError(null);
    setModalOpen(true);
  }

  async function save() {
    if (!ad.trim()) {
      setFormError('Hizmet adı zorunludur.');
      return;
    }
    const sureNum = parseInt(sure, 10);
    if (!sureNum || sureNum < 1) {
      setFormError('Süre en az 1 dakika olmalıdır.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (imageUri) {
        const form = new FormData();
        form.append('ad', ad.trim());
        if (aciklama.trim()) form.append('aciklama', aciklama.trim());
        form.append('sure', String(sureNum));
        if (fiyat.trim()) form.append('fiyat', fiyat.trim());
        form.append('aktif_mi', aktif ? '1' : '0');
        if (metaBaslik.trim()) form.append('meta_baslik', metaBaslik.trim());
        if (metaAciklama.trim()) form.append('meta_aciklama', metaAciklama.trim());
        if (metaKw.trim()) form.append('meta_anahtar_kelimeler', metaKw.trim());
        form.append('resim', {
          uri: imageUri,
          name: `hizmet_${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as unknown as Blob);
        if (editId) await apiUpload(`/doctor/services/${editId}`, form, 'PUT');
        else await apiUpload('/doctor/services', form);
      } else {
        const body = {
          ad: ad.trim(),
          aciklama: aciklama.trim() || null,
          sure: sureNum,
          fiyat: fiyat.trim() === '' ? null : Number(fiyat),
          aktif_mi: aktif,
          meta_baslik: metaBaslik.trim() || null,
          meta_aciklama: metaAciklama.trim() || null,
          meta_anahtar_kelimeler: metaKw.trim() || null,
        };
        if (editId) await apiPut(`/doctor/services/${editId}`, body);
        else await apiPost('/doctor/services', body);
      }
      setModalOpen(false);
      setImageUri(null);
      await reload(false);
    } catch (e) {
      setFormError(errMessage(e, 'Hizmet kaydedilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  function remove(id: number) {
    Alert.alert('Hizmeti sil', 'Bu hizmet kalıcı olarak silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiDelete(`/doctor/services/${id}`);
              await reload(false);
            } catch (e) {
              alertError(e);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenShell
      title="Hizmet ve Tedaviler"
      subtitle="Süre, fiyat ve aktiflik durumunu yönetin."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable onPress={openCreate}>
          <Text style={s.modalClose}>+ Ekle</Text>
        </Pressable>
      }
    >
      {items.length === 0 ? (
        <EmptyState title="Hizmet yok" text="İlk hizmetinizi ekleyerek randevu almaya başlayın." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>{item.ad}</Text>
              <View style={[s.pill, item.aktif_mi ? s.pillSuccess : s.pillMuted]}>
                <Text style={[s.pillText, item.aktif_mi ? s.pillSuccessText : s.pillMutedText]}>
                  {item.aktif_mi ? 'Aktif' : 'Pasif'}
                </Text>
              </View>
            </View>
            <Text style={s.cardMeta}>
              {item.sure} dk
              {item.fiyat != null ? ` · ${money(item.fiyat)}` : ''}
            </Text>
            {item.aciklama ? <Text style={s.cardBody}>{item.aciklama}</Text> : null}
            <View style={s.actions}>
              <Pressable style={s.actionBtn} onPress={() => openEdit(item)}>
                <Text style={s.actionBtnText}>Düzenle</Text>
              </Pressable>
              <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={() => remove(item.id)}>
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <FormModal
        visible={modalOpen}
        title={editId ? 'Hizmeti düzenle' : 'Yeni hizmet'}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void save()}
        submitting={submitting}
        error={formError}
      >
        <Text style={s.label}>Hizmet adı</Text>
        <TextInput style={s.input} value={ad} onChangeText={setAd} placeholderTextColor="#6B7F93" />
        <RichTextEditor
          label="Açıklama"
          value={aciklama}
          onChange={setAciklama}
          minHeight={110}
          placeholder="Hizmet açıklaması — kalın, liste, başlık ekleyebilirsiniz"
        />
        <Text style={s.label}>Süre (dakika)</Text>
        <TextInput style={s.input} value={sure} onChangeText={setSure} keyboardType="number-pad" placeholderTextColor="#6B7F93" />
        <Text style={s.label}>Fiyat (₺)</Text>
        <TextInput style={s.input} value={fiyat} onChangeText={setFiyat} keyboardType="decimal-pad" placeholderTextColor="#6B7F93" />
        <Pressable
          style={[s.secondaryButton, { marginTop: 8 }]}
          onPress={() =>
            void (async () => {
              const src = await pickImageSource();
              if (!src) return;
              const asset = await launchImagePicker(src);
              if (asset) setImageUri(asset.uri);
            })()
          }
        >
          <Text style={s.secondaryButtonText}>{imageUri ? 'Görsel seçildi' : 'Hizmet görseli seç'}</Text>
        </Pressable>
        <Text style={s.label}>SEO başlık</Text>
        <TextInput style={s.input} value={metaBaslik} onChangeText={setMetaBaslik} placeholderTextColor="#6B7F93" />
        <Text style={s.label}>SEO açıklama</Text>
        <TextInput style={s.input} value={metaAciklama} onChangeText={setMetaAciklama} placeholderTextColor="#6B7F93" />
        <Text style={s.label}>SEO anahtar kelimeler</Text>
        <TextInput style={s.input} value={metaKw} onChangeText={setMetaKw} placeholderTextColor="#6B7F93" />
        <View style={s.switchRow}>
          <Text style={s.switchLabel}>Aktif</Text>
          <Switch
            value={aktif}
            onValueChange={setAktif}
            trackColor={{ false: '#E1E6ED', true: 'rgba(245,138,69,0.55)' }}
            thumbColor={aktif ? '#F58A45' : '#7A8B9C'}
          />
        </View>
      </FormModal>
    </ScreenShell>
  );
}

// â”€â”€ Working hours â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DAY_LABELS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

type WorkingHour = {
  id: number;
  gun: number;
  aktif_mi: boolean;
  mesai_baslangic: string;
  mesai_bitis: string;
  ogle_arasi_aktif_mi: boolean;
  ogle_baslangic: string | null;
  ogle_bitis: string | null;
};

export function WorkingHoursScreen({ onBack }: ModuleProps) {
  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (spinner = true) => {
    if (spinner) {
      setLoading(true);
    }
    try {
      const res = await apiGet<WorkingHour[]>('/doctor/working-hours');
      const list = (res.data ?? []).map((h) => ({
        ...h,
        mesai_baslangic: timeSlice(h.mesai_baslangic),
        mesai_bitis: timeSlice(h.mesai_bitis),
        ogle_baslangic: h.ogle_baslangic ? timeSlice(h.ogle_baslangic) : '12:00',
        ogle_bitis: h.ogle_bitis ? timeSlice(h.ogle_bitis) : '13:00',
      }));
      setHours(list);
    } catch (e) {
      alertError(e, 'Çalışma saatleri yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  function updateHour(id: number, patch: Partial<WorkingHour>) {
    setHours((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await apiPut('/doctor/working-hours', {
        hours: hours.map((h) => ({
          id: h.id,
          aktif_mi: !!h.aktif_mi,
          mesai_baslangic: timeSlice(h.mesai_baslangic),
          mesai_bitis: timeSlice(h.mesai_bitis),
          ogle_arasi_aktif_mi: !!h.ogle_arasi_aktif_mi,
          ogle_baslangic: h.ogle_arasi_aktif_mi ? timeSlice(h.ogle_baslangic) : null,
          ogle_bitis: h.ogle_arasi_aktif_mi ? timeSlice(h.ogle_bitis) : null,
        })),
      });
      setMessage('Çalışma saatleri güncellendi.');
      await load(false);
    } catch (e) {
      alertError(e, 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell
      title="Çalışma Saatleri"
      subtitle="Haftalık mesai ve öğle arası planınız."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load(false);
      }}
    >
      {hours.map((h) => (
        <View key={h.id} style={s.dayCard}>
          <View style={s.cardHeader}>
            <Text style={s.dayTitle}>{DAY_LABELS[(h.gun - 1 + 7) % 7] ?? `Gün ${h.gun}`}</Text>
            <Switch
              value={!!h.aktif_mi}
              onValueChange={(v) => updateHour(h.id, { aktif_mi: v })}
              trackColor={{ false: '#E1E6ED', true: 'rgba(245,138,69,0.55)' }}
              thumbColor={h.aktif_mi ? '#F58A45' : '#7A8B9C'}
            />
          </View>
          {h.aktif_mi ? (
            <>
              <TimeField
                label="Başlangıç"
                value={timeSlice(h.mesai_baslangic)}
                onChange={(v) => updateHour(h.id, { mesai_baslangic: v })}
              />
              <TimeField
                label="Bitiş"
                value={timeSlice(h.mesai_bitis)}
                onChange={(v) => updateHour(h.id, { mesai_bitis: v })}
              />
              <View style={s.switchRow}>
                <Text style={s.switchLabel}>Öğle arası</Text>
                <Switch
                  value={!!h.ogle_arasi_aktif_mi}
                  onValueChange={(v) => updateHour(h.id, { ogle_arasi_aktif_mi: v })}
                  trackColor={{ false: '#E1E6ED', true: 'rgba(245,138,69,0.55)' }}
                  thumbColor={h.ogle_arasi_aktif_mi ? '#F58A45' : '#7A8B9C'}
                />
              </View>
              {h.ogle_arasi_aktif_mi ? (
                <>
                  <TimeField
                    label="Öğle başlangıç"
                    value={timeSlice(h.ogle_baslangic)}
                    onChange={(v) => updateHour(h.id, { ogle_baslangic: v })}
                  />
                  <TimeField
                    label="Öğle bitiş"
                    value={timeSlice(h.ogle_bitis)}
                    onChange={(v) => updateHour(h.id, { ogle_bitis: v })}
                  />
                </>
              ) : null}
            </>
          ) : (
            <Text style={s.hint}>Bu gün kapalı.</Text>
          )}
        </View>
      ))}

      {message ? <Text style={s.successText}>{message}</Text> : null}
      <Pressable
        style={[s.primaryButton, { marginTop: 20 }, saving && s.primaryButtonDisabled]}
        onPress={() => void save()}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={s.primaryButtonText}>Saatleri kaydet</Text>
        )}
      </Pressable>
    </ScreenShell>
  );
}

// â”€â”€ Appointment settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type AppointmentSettings = {
  aktif_mi: boolean;
  randevu_onay_tipi: 'manuel' | 'otomatik';
  en_erken_randevu_saati: number;
  en_gec_randevu_gunu: number;
  randevu_periyodu: number;
  randevu_iptal_aktif_mi: boolean;
  iptal_saat_limiti: number;
  gunluk_maksimum_randevu: number;
  email_bildirimleri: boolean;
  sms_bildirimleri: boolean;
};

export function SettingsScreen({ onBack }: ModuleProps) {
  const [form, setForm] = useState<AppointmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<AppointmentSettings>('/doctor/appointment-settings');
      if (res.data) {
        setForm(res.data);
      }
    } catch (e) {
      alertError(e, 'Ayarlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patch<K extends keyof AppointmentSettings>(key: K, value: AppointmentSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!form) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await apiPut('/doctor/appointment-settings', {
        aktif_mi: !!form.aktif_mi,
        randevu_onay_tipi: form.randevu_onay_tipi,
        en_erken_randevu_saati: Number(form.en_erken_randevu_saati),
        en_gec_randevu_gunu: Number(form.en_gec_randevu_gunu),
        randevu_periyodu: Number(form.randevu_periyodu),
        randevu_iptal_aktif_mi: !!form.randevu_iptal_aktif_mi,
        iptal_saat_limiti: Number(form.iptal_saat_limiti),
        gunluk_maksimum_randevu: Number(form.gunluk_maksimum_randevu),
        email_bildirimleri: !!form.email_bildirimleri,
        sms_bildirimleri: !!form.sms_bildirimleri,
      });
      setMessage('Randevu ayarları güncellendi.');
    } catch (e) {
      alertError(e, 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell title="Randevu Ayarları" subtitle="Onay tipi, periyot ve bildirimler." onBack={onBack} loading={loading}>
      {form ? (
        <>
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Online randevu açık</Text>
            <Switch
              value={!!form.aktif_mi}
              onValueChange={(v) => patch('aktif_mi', v)}
              trackColor={{ false: '#E1E6ED', true: 'rgba(245,138,69,0.55)' }}
              thumbColor={form.aktif_mi ? '#F58A45' : '#7A8B9C'}
            />
          </View>

          <SelectField
            label="Onay tipi"
            options={[
              { label: 'Manuel', value: 'manuel' },
              { label: 'Otomatik', value: 'otomatik' },
            ]}
            value={form.randevu_onay_tipi}
            onChange={(v) => patch('randevu_onay_tipi', v)}
          />

          <SelectField
            label="Randevu periyodu (dk)"
            options={[15, 20, 30, 45, 60].map((p) => ({ label: `${p} dk`, value: p }))}
            value={form.randevu_periyodu}
            onChange={(v) => patch('randevu_periyodu', v)}
          />

          <Text style={s.label}>En erken randevu (saat)</Text>
          <TextInput
            style={s.input}
            value={String(form.en_erken_randevu_saati)}
            onChangeText={(v) => patch('en_erken_randevu_saati', Number(v) || 0)}
            keyboardType="number-pad"
            placeholderTextColor="#6B7F93"
          />
          <Text style={s.label}>En geç randevu (gün)</Text>
          <TextInput
            style={s.input}
            value={String(form.en_gec_randevu_gunu)}
            onChangeText={(v) => patch('en_gec_randevu_gunu', Number(v) || 1)}
            keyboardType="number-pad"
            placeholderTextColor="#6B7F93"
          />
          <Text style={s.label}>Günlük maksimum randevu (0 = sınırsız)</Text>
          <TextInput
            style={s.input}
            value={String(form.gunluk_maksimum_randevu)}
            onChangeText={(v) => patch('gunluk_maksimum_randevu', Number(v) || 0)}
            keyboardType="number-pad"
            placeholderTextColor="#6B7F93"
          />

          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Danışan iptali açık</Text>
            <Switch
              value={!!form.randevu_iptal_aktif_mi}
              onValueChange={(v) => patch('randevu_iptal_aktif_mi', v)}
              trackColor={{ false: '#E1E6ED', true: 'rgba(245,138,69,0.55)' }}
              thumbColor={form.randevu_iptal_aktif_mi ? '#F58A45' : '#7A8B9C'}
            />
          </View>
          <Text style={s.label}>İptal saat limiti</Text>
          <TextInput
            style={s.input}
            value={String(form.iptal_saat_limiti)}
            onChangeText={(v) => patch('iptal_saat_limiti', Number(v) || 0)}
            keyboardType="number-pad"
            placeholderTextColor="#6B7F93"
          />

          <View style={s.switchRow}>
            <Text style={s.switchLabel}>E-posta bildirimleri</Text>
            <Switch
              value={!!form.email_bildirimleri}
              onValueChange={(v) => patch('email_bildirimleri', v)}
              trackColor={{ false: '#E1E6ED', true: 'rgba(245,138,69,0.55)' }}
              thumbColor={form.email_bildirimleri ? '#F58A45' : '#7A8B9C'}
            />
          </View>
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>SMS bildirimleri</Text>
            <Switch
              value={!!form.sms_bildirimleri}
              onValueChange={(v) => patch('sms_bildirimleri', v)}
              trackColor={{ false: '#E1E6ED', true: 'rgba(245,138,69,0.55)' }}
              thumbColor={form.sms_bildirimleri ? '#F58A45' : '#7A8B9C'}
            />
          </View>

          {message ? <Text style={s.successText}>{message}</Text> : null}
          <Pressable
            style={[s.primaryButton, { marginTop: 20 }, saving && s.primaryButtonDisabled]}
            onPress={() => void save()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={s.primaryButtonText}>Ayarları kaydet</Text>
            )}
          </Pressable>
        </>
      ) : null}
    </ScreenShell>
  );
}

// â”€â”€ Leaves â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type LeaveItem = {
  id: number;
  baslangic: string;
  bitis: string;
  aciklama: string | null;
};

export function LeavesScreen({ onBack }: ModuleProps) {
  const loader = useCallback(async () => {
    const res = await apiGet<LeaveItem[]>('/doctor/leaves');
    return res.data ?? [];
  }, []);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [modalOpen, setModalOpen] = useState(false);
  const [baslangicTarih, setBaslangicTarih] = useState(todayKey());
  const [baslangicSaat, setBaslangicSaat] = useState('09:00');
  const [bitisTarih, setBitisTarih] = useState(todayKey());
  const [bitisSaat, setBitisSaat] = useState('17:00');
  const [aciklama, setAciklama] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [qcDate, setQcDate] = useState(todayKey());
  const [qcSlots, setQcSlots] = useState<any[]>([]);
  const [qcSelected, setQcSelected] = useState<string[]>([]);
  const [qcLoading, setQcLoading] = useState(false);
  const [qcMsg, setQcMsg] = useState<string | null>(null);

  async function loadQuickClose(date: string) {
    setQcLoading(true);
    setQcMsg(null);
    try {
      const res = await apiGet<any>('/doctor/quick-close/slots', { tarih: date });
      const slots = res.data?.slots ?? [];
      setQcSlots(slots);
      setQcSelected(
        slots.filter((sl: any) => sl.kapali_mi && !sl.ogle_mi && !sl.dolu_mu).map((sl: any) => sl.saat_string),
      );
      if (res.data?.aktif_mi === false) {
        setQcMsg(res.data?.mesaj || 'Bu gün kapalı.');
      }
    } catch (e) {
      alertError(e, 'Slotlar yüklenemedi.');
    } finally {
      setQcLoading(false);
    }
  }

  useEffect(() => {
    void loadQuickClose(qcDate);
  }, [qcDate]);

  async function saveQuickClose() {
    setQcLoading(true);
    try {
      await apiPost('/doctor/quick-close', { tarih: qcDate, saatler: qcSelected });
      await loadQuickClose(qcDate);
      await reload(false);
      Alert.alert('Tamam', 'Saat dilimleri güncellendi.');
    } catch (e) {
      alertError(e);
    } finally {
      setQcLoading(false);
    }
  }

  async function createLeave() {
    setSubmitting(true);
    setFormError(null);
    try {
      await apiPost('/doctor/leaves', {
        baslangic_tarih: baslangicTarih,
        baslangic_saat: baslangicSaat,
        bitis_tarih: bitisTarih,
        bitis_saat: bitisSaat,
        aciklama: aciklama.trim() || null,
      });
      setModalOpen(false);
      setAciklama('');
      await reload(false);
    } catch (e) {
      setFormError(errMessage(e, 'İzin eklenemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  function remove(id: number) {
    Alert.alert('İzni sil', 'Bu izin kaydı silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiDelete(`/doctor/leaves/${id}`);
              await reload(false);
            } catch (e) {
              alertError(e);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenShell
      title="İzin / Tatil"
      subtitle="Uzun izinler ve günlük hızlı kapatma."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable onPress={() => setModalOpen(true)}>
          <Text style={s.modalClose}>+ Ekle</Text>
        </Pressable>
      }
    >
      <Text style={s.sectionTitle}>Hızlı randevu kapatma</Text>
      <Text style={s.hint}>Güne göre slot seçin; dolu ve öğle arası slotlar kilitlenemez.</Text>
      <DateField label="Tarih" value={qcDate} onChange={setQcDate} />
      {qcLoading ? <ActivityIndicator color="#F58A45" style={{ marginTop: 12 }} /> : null}
      {qcMsg ? <Text style={s.hint}>{qcMsg}</Text> : null}
      <SelectField
        label="Kapatılacak saatler"
        placeholder="Saat seçin…"
        multiple
        searchable
        value={qcSelected}
        onChange={setQcSelected}
        options={qcSlots.map((sl) => ({
          label: sl.saat_string,
          value: sl.saat_string,
          subtitle: sl.dolu_mu ? 'Dolu' : sl.ogle_mi ? 'Öğle' : sl.kapali_mi ? 'Kapalı' : 'Müsait',
          disabled: !!sl.ogle_mi || !!sl.dolu_mu,
        }))}
      />
      <Pressable
        style={[s.primaryButton, { marginTop: 12 }, qcLoading && s.primaryButtonDisabled]}
        disabled={qcLoading}
        onPress={() => void saveQuickClose()}
      >
        <Text style={s.primaryButtonText}>Seçili slotları kaydet</Text>
      </Pressable>

      <Text style={s.sectionTitle}>İzin kayıtları</Text>
      {items.length === 0 ? (
        <EmptyState title="İzin kaydı yok" text="Tatil veya müsait olmadığınız günleri buradan ekleyin." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={s.card}>
            <Text style={s.cardTitle}>{formatDateTime(item.baslangic)}</Text>
            <Text style={s.cardMeta}>→ {formatDateTime(item.bitis)}</Text>
            {item.aciklama ? <Text style={s.cardBody}>{item.aciklama}</Text> : null}
            <View style={s.actions}>
              <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={() => remove(item.id)}>
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <FormModal
        visible={modalOpen}
        title="Yeni izin"
        onClose={() => setModalOpen(false)}
        onSubmit={() => void createLeave()}
        submitLabel="İzin ekle"
        submitting={submitting}
        error={formError}
      >
        <DateField label="Başlangıç tarihi" value={baslangicTarih} onChange={setBaslangicTarih} />
        <TimeField label="Başlangıç saati" value={baslangicSaat} onChange={setBaslangicSaat} />
        <DateField label="Bitiş tarihi" value={bitisTarih} onChange={setBitisTarih} />
        <TimeField label="Bitiş saati" value={bitisSaat} onChange={setBitisSaat} />
        <Text style={s.label}>Açıklama</Text>
        <TextInput style={[s.input, s.textArea]} value={aciklama} onChangeText={setAciklama} multiline placeholderTextColor="#6B7F93" />
      </FormModal>
    </ScreenShell>
  );
}

// â”€â”€ Blogs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type BlogItem = {
  id: number;
  baslik: string;
  icerik: string;
  aktif_mi: boolean;
  created_at?: string;
};

export function BlogsScreen({ onBack }: ModuleProps) {
  const loader = useCallback(async () => {
    const res = await apiGet<BlogItem[]>('/doctor/blogs');
    return res.data ?? [];
  }, []);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [baslik, setBaslik] = useState('');
  const [icerik, setIcerik] = useState('');
  const [metaBaslik, setMetaBaslik] = useState('');
  const [metaAciklama, setMetaAciklama] = useState('');
  const [metaKw, setMetaKw] = useState('');
  const [aktif, setAktif] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  function openCreate() {
    setEditId(null);
    setBaslik('');
    setIcerik('');
    setMetaBaslik('');
    setMetaAciklama('');
    setMetaKw('');
    setAktif(true);
    setImageUri(null);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item: BlogItem) {
    setEditId(item.id);
    setBaslik(item.baslik);
    setIcerik(item.icerik?.replace(/<[^>]+>/g, '') || '');
    setMetaBaslik((item as any).meta_baslik || '');
    setMetaAciklama((item as any).meta_aciklama || '');
    setMetaKw((item as any).meta_anahtar_kelimeler || '');
    setAktif(!!item.aktif_mi);
    setImageUri(null);
    setFormError(null);
    setModalOpen(true);
  }

  async function pickBlogImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin gerekli', 'Galeri erişimi için izin verin.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      alertError(e, 'Görsel seçilemedi.');
    }
  }

  async function saveBlog() {
    if (!baslik.trim() || !icerik.trim()) {
      setFormError('Başlık ve içerik zorunludur.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (imageUri) {
        const form = new FormData();
        form.append('baslik', baslik.trim());
        form.append('icerik', icerik.trim());
        form.append('aktif_mi', aktif ? '1' : '0');
        if (metaBaslik.trim()) form.append('meta_baslik', metaBaslik.trim());
        if (metaAciklama.trim()) form.append('meta_aciklama', metaAciklama.trim());
        if (metaKw.trim()) form.append('meta_anahtar_kelimeler', metaKw.trim());
        form.append('resim', {
          uri: imageUri,
          name: `blog_${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as unknown as Blob);
        if (editId) {
          await apiUpload(`/doctor/blogs/${editId}`, form, 'PUT');
        } else {
          await apiUpload('/doctor/blogs', form);
        }
      } else if (editId) {
        await apiPut(`/doctor/blogs/${editId}`, {
          baslik: baslik.trim(),
          icerik: icerik.trim(),
          aktif_mi: aktif,
          meta_baslik: metaBaslik.trim() || null,
          meta_aciklama: metaAciklama.trim() || null,
          meta_anahtar_kelimeler: metaKw.trim() || null,
        });
      } else {
        await apiPost('/doctor/blogs', {
          baslik: baslik.trim(),
          icerik: icerik.trim(),
          aktif_mi: aktif,
          meta_baslik: metaBaslik.trim() || null,
          meta_aciklama: metaAciklama.trim() || null,
          meta_anahtar_kelimeler: metaKw.trim() || null,
        });
      }
      setModalOpen(false);
      setBaslik('');
      setIcerik('');
      setImageUri(null);
      setEditId(null);
      await reload(false);
    } catch (e) {
      setFormError(errMessage(e, 'Blog kaydedilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  function remove(id: number) {
    Alert.alert('Blogu sil', 'Bu yazı silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiDelete(`/doctor/blogs/${id}`);
              await reload(false);
            } catch (e) {
              alertError(e);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenShell
      title="Blog Yazılarım"
      subtitle="Yayınlarınızı mobil üzerinden yönetin."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable onPress={openCreate}>
          <Text style={s.modalClose}>+ Ekle</Text>
        </Pressable>
      }
    >
      {items.length === 0 ? (
        <EmptyState title="Blog yazısı yok" text="İlk yazınızı ekleyerek başlayın." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>{item.baslik}</Text>
              <View style={[s.pill, item.aktif_mi ? s.pillSuccess : s.pillMuted]}>
                <Text style={[s.pillText, item.aktif_mi ? s.pillSuccessText : s.pillMutedText]}>
                  {item.aktif_mi ? 'Yayında' : 'Taslak'}
                </Text>
              </View>
            </View>
            <Text style={s.cardBody} numberOfLines={3}>
              {item.icerik?.replace(/<[^>]+>/g, '')}
            </Text>
            <View style={s.actions}>
              <Pressable style={s.actionBtn} onPress={() => openEdit(item)}>
                <Text style={s.actionBtnText}>Düzenle</Text>
              </Pressable>
              <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={() => remove(item.id)}>
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <FormModal
        visible={modalOpen}
        title={editId ? 'Blog düzenle' : 'Yeni blog yazısı'}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void saveBlog()}
        submitting={submitting}
        error={formError}
      >
        <Text style={s.label}>Başlık</Text>
        <TextInput style={s.input} value={baslik} onChangeText={setBaslik} placeholderTextColor="#6B7F93" />
        <RichTextEditor
          label="İçerik"
          value={icerik}
          onChange={setIcerik}
          minHeight={150}
          placeholder="Blog yazısı — kalın, başlık, liste ve link ekleyebilirsiniz"
        />
        <Text style={s.label}>SEO başlık</Text>
        <TextInput style={s.input} value={metaBaslik} onChangeText={setMetaBaslik} placeholderTextColor="#6B7F93" />
        <Text style={s.label}>SEO açıklama</Text>
        <TextInput style={s.input} value={metaAciklama} onChangeText={setMetaAciklama} placeholderTextColor="#6B7F93" />
        <Text style={s.label}>SEO anahtar kelimeler</Text>
        <TextInput style={s.input} value={metaKw} onChangeText={setMetaKw} placeholderTextColor="#6B7F93" />
        <View style={s.switchRow}>
          <Text style={s.switchLabel}>Yayında</Text>
          <Switch value={aktif} onValueChange={setAktif} trackColor={{ true: '#F58A45' }} />
        </View>
        <Pressable style={[s.secondaryButton, { marginTop: 12 }]} onPress={() => void pickBlogImage()}>
          <Text style={s.secondaryButtonText}>{imageUri ? 'Görsel seçildi · değiştir' : 'Kapak görseli seç'}</Text>
        </Pressable>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: '100%', height: 140, borderRadius: 12, marginTop: 10 }} />
        ) : null}
      </FormModal>
    </ScreenShell>
  );
}

// â”€â”€ Reviews â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ReviewItem = {
  id: number;
  puan: number;
  yorum: string;
  doktor_yaniti: string | null;
  onay_durumu: string;
  hasta_adi: string;
  hizmet: string | null;
};

export function ReviewsScreen({ onBack }: ModuleProps) {
  const [filter, setFilter] = useState<'' | 'beklemede' | 'onaylandi' | 'reddedildi'>('');
  const [meta, setMeta] = useState<{ toplam?: number; beklemede?: number; onaylandi?: number } | null>(null);
  const loader = useCallback(async () => {
    const res = await apiGet<ReviewItem[]>('/doctor/reviews', filter ? { durum: filter } : undefined);
    if (res.meta) {
      setMeta(res.meta as { toplam?: number; beklemede?: number; onaylandi?: number });
    }
    return res.data ?? [];
  }, [filter]);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [replyId, setReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function sendReply() {
    if (!replyId) {
      return;
    }
    if (replyText.trim().length < 5) {
      setFormError('Yanıt en az 5 karakter olmalıdır.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiPost(`/doctor/reviews/${replyId}/reply`, { doktor_yaniti: replyText.trim() });
      setReplyId(null);
      setReplyText('');
      await reload(false);
    } catch (e) {
      setFormError(errMessage(e, 'Yanıt kaydedilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: number, onay_durumu: 'beklemede' | 'onaylandi' | 'reddedildi') {
    try {
      await apiPost(`/doctor/reviews/${id}/status`, { onay_durumu });
      await reload(false);
    } catch (e) {
      alertError(e);
    }
  }

  function removeReview(id: number) {
    Alert.alert('Yorumu sil', 'Bu yorum kalıcı olarak silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiDelete(`/doctor/reviews/${id}`);
              await reload(false);
            } catch (e) {
              alertError(e);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenShell
      title="Hasta Yorumları"
      subtitle="Yorumları inceleyin, onaylayın ve yanıtlayın."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <SelectField
        label="Filtre"
        options={[
          { label: `Tümü${meta?.toplam != null ? ` (${meta.toplam})` : ''}`, value: '' },
          { label: `Bekleyen${meta?.beklemede != null ? ` (${meta.beklemede})` : ''}`, value: 'beklemede' },
          { label: 'Onaylı', value: 'onaylandi' },
          { label: 'Red', value: 'reddedildi' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {items.length === 0 ? (
        <EmptyState title="Yorum yok" text="Danışan yorumları burada listelenir." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>{item.hasta_adi || 'Danışan'}</Text>
              <View style={s.pill}>
                <Text style={s.pillText}>{item.onay_durumu || '—'}</Text>
              </View>
            </View>
            <Text style={s.cardMeta}>{'★'.repeat(Math.max(1, Math.min(5, item.puan || 0)))}</Text>
            {item.hizmet ? <Text style={s.cardMeta}>{item.hizmet}</Text> : null}
            <Text style={s.cardBody}>{item.yorum}</Text>
            {item.doktor_yaniti ? (
              <Text style={[s.cardBody, { color: '#2E9E5B' }]}>Yanıtınız: {item.doktor_yaniti}</Text>
            ) : null}
            <View style={s.actions}>
              {item.onay_durumu !== 'onaylandi' ? (
                <Pressable style={[s.actionBtn, s.actionBtnSuccess]} onPress={() => void setStatus(item.id, 'onaylandi')}>
                  <Text style={[s.actionBtnText, s.actionBtnSuccessText]}>Onayla</Text>
                </Pressable>
              ) : null}
              {item.onay_durumu !== 'reddedildi' ? (
                <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={() => void setStatus(item.id, 'reddedildi')}>
                  <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Reddet</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={s.actionBtn}
                onPress={() => {
                  setReplyId(item.id);
                  setReplyText(item.doktor_yaniti ?? '');
                  setFormError(null);
                }}
              >
                <Text style={s.actionBtnText}>{item.doktor_yaniti ? 'Yanıtı düzenle' : 'Yanıtla'}</Text>
              </Pressable>
              <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={() => removeReview(item.id)}>
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <FormModal
        visible={replyId != null}
        title="Yorum yanıtı"
        onClose={() => setReplyId(null)}
        onSubmit={() => void sendReply()}
        submitLabel="Yanıtı kaydet"
        submitting={submitting}
        error={formError}
      >
        <Text style={s.label}>Yanıtınız</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={replyText}
          onChangeText={setReplyText}
          multiline
          placeholderTextColor="#6B7F93"
        />
      </FormModal>
    </ScreenShell>
  );
}

// â”€â”€ Gallery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type GalleryItem = {
  id: number;
  resim_yolu: string;
  baslik: string | null;
  sira: number;
};

export function GalleryScreen({ onBack }: ModuleProps) {
  const loader = useCallback(async () => {
    const res = await apiGet<GalleryItem[]>('/doctor/gallery');
    return res.data ?? [];
  }, []);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [uploading, setUploading] = useState(false);
  const [baslik, setBaslik] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  async function pickAndUpload() {
    try {
      const source = await pickImageSource();
      if (!source) return;
      const asset = await launchImagePicker(source);
      if (!asset) return;
      setUploading(true);
      const form = new FormData();
      const name = asset.fileName || `galeri_${Date.now()}.jpg`;
      const type = asset.mimeType || 'image/jpeg';
      form.append('resim', {
        uri: asset.uri,
        name,
        type,
      } as unknown as Blob);
      if (baslik.trim()) {
        form.append('baslik', baslik.trim());
      }
      await apiUpload('/doctor/gallery', form);
      setBaslik('');
      await reload(false);
      Alert.alert('Tamam', 'Fotoğraf yüklendi.');
    } catch (e) {
      alertError(e, 'Yükleme başarısız.');
    } finally {
      setUploading(false);
    }
  }

  async function saveTitle() {
    if (!editId) return;
    try {
      await apiPut(`/doctor/gallery/${editId}`, { baslik: editTitle.trim() || null });
      setEditId(null);
      await reload(false);
    } catch (e) {
      alertError(e);
    }
  }

  async function moveItem(id: number, dir: -1 | 1) {
    const sorted = [...items].sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
    const idx = sorted.findIndex((x) => x.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sorted.length) return;
    const next = [...sorted];
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    try {
      await apiPost('/doctor/gallery/reorder', { ids: next.map((x) => x.id) });
      await reload(false);
    } catch (e) {
      alertError(e);
    }
  }

  function remove(id: number) {
    Alert.alert('Fotoğrafı sil', 'Bu galeri öğesi silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiDelete(`/doctor/gallery/${id}`);
              await reload(false);
            } catch (e) {
              alertError(e);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenShell
      title="Fotoğraf Galerisi"
      subtitle="Profil galerinizdeki görseller."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable style={s.secondaryButton} disabled={uploading} onPress={() => void pickAndUpload()}>
          <Text style={s.secondaryButtonText}>{uploading ? '…' : '+ Yükle'}</Text>
        </Pressable>
      }
    >
      <Text style={s.label}>Başlık (opsiyonel)</Text>
      <TextInput style={s.input} value={baslik} onChangeText={setBaslik} placeholder="Örn. Muayenehane" placeholderTextColor="#6B7F93" />
      <Pressable
        style={[s.primaryButton, { marginTop: 12 }, uploading && s.primaryButtonDisabled]}
        disabled={uploading}
        onPress={() => void pickAndUpload()}
      >
        {uploading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryButtonText}>Fotoğraf ekle (galeri/kamera)</Text>}
      </Pressable>
      {items.length === 0 ? (
        <EmptyState title="Galeri boş" text="Henüz fotoğraf eklenmemiş." />
      ) : (
        items.map((item) => {
          const uri = item.resim_yolu
            ? item.resim_yolu.startsWith('http')
              ? item.resim_yolu
              : `${SITE_URL}/${item.resim_yolu.replace(/^\//, '')}`
            : null;
          return (
            <View key={item.id} style={s.card}>
              {uri ? (
                <Image source={{ uri }} style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 10 }} resizeMode="cover" />
              ) : null}
              <Text style={s.cardTitle}>{item.baslik || `Fotoğraf #${item.id}`}</Text>
              <View style={s.actions}>
                <Pressable style={s.actionBtn} onPress={() => void moveItem(item.id, -1)}>
                  <Text style={s.actionBtnText}>↑</Text>
                </Pressable>
                <Pressable style={s.actionBtn} onPress={() => void moveItem(item.id, 1)}>
                  <Text style={s.actionBtnText}>↓</Text>
                </Pressable>
                <Pressable
                  style={s.actionBtn}
                  onPress={() => {
                    setEditId(item.id);
                    setEditTitle(item.baslik || '');
                  }}
                >
                  <Text style={s.actionBtnText}>Başlık</Text>
                </Pressable>
                <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={() => remove(item.id)}>
                  <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
      <FormModal
        visible={editId != null}
        title="Başlığı düzenle"
        onClose={() => setEditId(null)}
        onSubmit={() => void saveTitle()}
        submitLabel="Kaydet"
      >
        <Text style={s.label}>Başlık</Text>
        <TextInput style={s.input} value={editTitle} onChangeText={setEditTitle} placeholderTextColor="#6B7F93" />
      </FormModal>
    </ScreenShell>
  );
}

// â”€â”€ Finance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type FinanceOverview = {
  bu_ay_gelir: number;
  bu_ay_gider: number;
  bu_ay_net: number;
  toplam_borc: number;
};

export function FinanceScreen({ onBack, onNavigate }: ModuleProps) {
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportText, setReportText] = useState<string | null>(null);

  const load = useCallback(async (spinner = true) => {
    if (spinner) {
      setLoading(true);
    }
    try {
      const res = await apiGet<FinanceOverview>('/doctor/finance/overview');
      setData(res.data ?? null);
    } catch (e) {
      alertError(e, 'Finans özeti yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  async function loadReport() {
    try {
      const res = await apiGet<{ rapor_metni: string }>('/doctor/finance/report');
      setReportText(res.data?.rapor_metni ?? null);
    } catch (e) {
      alertError(e, 'Rapor alınamadı.');
    }
  }

  const links: { id: ScreenId; title: string; meta: string }[] = [
    { id: 'financeIncomes', title: 'Gelirler', meta: 'Ödeme ve gelir kayıtları' },
    { id: 'financeExpenses', title: 'Giderler', meta: 'Klinik giderleri' },
    { id: 'financeCategories', title: 'Kategoriler', meta: 'Gelir / gider kategorileri' },
    { id: 'financeBalances', title: 'Hasta bakiyeleri', meta: 'Açık bakiyeler' },
  ];

  return (
    <ScreenShell
      title="Finans"
      subtitle="Bu ayın özeti ve finans modülleri."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load(false);
      }}
    >
      {data ? (
        <View style={s.statGrid}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{money(data.bu_ay_gelir)}</Text>
            <Text style={s.statLabel}>Bu ay gelir</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{money(data.bu_ay_gider)}</Text>
            <Text style={s.statLabel}>Bu ay gider</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{money(data.bu_ay_net)}</Text>
            <Text style={s.statLabel}>Net</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{money(data.toplam_borc)}</Text>
            <Text style={s.statLabel}>Toplam borç</Text>
          </View>
        </View>
      ) : null}
      <View style={s.actions}>
        <Pressable style={[s.secondaryButton, { flex: 1 }]} onPress={() => void loadReport()}>
          <Text style={s.secondaryButtonText}>Rapor metni</Text>
        </Pressable>
        <Pressable
          style={[s.secondaryButton, { flex: 1 }]}
          onPress={() => {
            void (async () => {
              try {
                const res = await apiGet<{ filename: string; pdf_base64: string }>(
                  '/doctor/finance/report.pdf',
                  { base64: 1 },
                );
                const b64 = res.data?.pdf_base64;
                if (!b64) {
                  Alert.alert('Hata', 'PDF içeriği alınamadı.');
                  return;
                }
                // Web: open data URL; native: share via mailto with note + keep base64 length limited messaging
                if (Platform.OS === 'web') {
                  const a = document.createElement('a');
                  a.href = ['data:application/', 'pdf', ';base64,', b64].join('');
                  a.download = res.data?.filename || 'finans-raporu.pdf';
                  a.click();
                } else {
                  Alert.alert(
                    'PDF hazır',
                    `${res.data?.filename || 'finans-raporu.pdf'} oluşturuldu (${Math.round(b64.length / 1024)} KB). Web panelinden de indirebilirsiniz.`,
                  );
                }
              } catch (e) {
                alertError(e, 'PDF alınamadı.');
              }
            })();
          }}
        >
          <Text style={s.secondaryButtonText}>PDF al</Text>
        </Pressable>
      </View>
      {reportText ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>Rapor özeti</Text>
          <Text style={s.cardBody} selectable>
            {reportText}
          </Text>
          <Pressable
            style={[s.actionBtn, { marginTop: 10 }]}
            onPress={() => void Linking.openURL(`mailto:?subject=Finans%20Raporu&body=${encodeURIComponent(reportText)}`)}
          >
            <Text style={s.actionBtnText}>E-posta ile paylaş</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={s.sectionTitle}>Modüller</Text>
      {links.map((link) => (
        <Pressable key={link.id} style={s.navLinkCard} onPress={() => onNavigate(link.id)}>
          <View>
            <Text style={s.navLinkTitle}>{link.title}</Text>
            <Text style={s.navLinkMeta}>{link.meta}</Text>
          </View>
          <Text style={s.menuChevron}>›</Text>
        </Pressable>
      ))}
    </ScreenShell>
  );
}

type IncomeItem = {
  id: number;
  tutar: number;
  odenen_tutar: number;
  durum: string;
  odeme_tarihi: string;
  hasta_adi: string | null;
  hizmet: string | null;
  aciklama: string | null;
  kalemler?: { id: number; tutar: number; tarih: string; odeme_yontemi: string }[];
};

export function FinanceIncomesScreen({ onBack }: ModuleProps) {
  const [filterBas, setFilterBas] = useState(todayKey().slice(0, 8) + '01');
  const [filterBit, setFilterBit] = useState(todayKey());
  const loader = useCallback(async () => {
    const res = await apiGet<IncomeItem[]>('/doctor/finance/incomes', {
      baslangic: filterBas || undefined,
      bitis: filterBit || undefined,
    });
    return res.data ?? [];
  }, [filterBas, filterBit]);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState<IncomeItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTutar, setEditTutar] = useState('');
  const [editTarih, setEditTarih] = useState(todayKey());
  const [editAciklama, setEditAciklama] = useState('');
  const [tutar, setTutar] = useState('');
  const [odemeTarihi, setOdemeTarihi] = useState(todayKey());
  const [ilkOdeme, setIlkOdeme] = useState('');
  const [yontem, setYontem] = useState<'nakit' | 'kredi_karti' | 'havale' | 'online'>('nakit');
  const [aciklama, setAciklama] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [kalemTutar, setKalemTutar] = useState('');
  const [kalemTarih, setKalemTarih] = useState(todayKey());
  const [kalemYontem, setKalemYontem] = useState<'nakit' | 'kredi_karti' | 'havale' | 'online'>('nakit');

  async function openDetail(id: number) {
    try {
      const res = await apiGet<IncomeItem>(`/doctor/finance/incomes/${id}`);
      setDetail(res.data ?? null);
    } catch (e) {
      alertError(e);
    }
  }

  async function addKalem() {
    if (!detail) return;
    const amount = Number(kalemTutar);
    if (!amount || amount <= 0) {
      Alert.alert('Eksik', 'Geçerli tutar girin.');
      return;
    }
    try {
      const res = await apiPost<IncomeItem>(`/doctor/finance/incomes/${detail.id}/items`, {
        tutar: amount,
        tarih: kalemTarih,
        odeme_yontemi: kalemYontem,
      });
      setDetail(res.data ?? null);
      setKalemTutar('');
      await reload(false);
    } catch (e) {
      alertError(e);
    }
  }

  async function createIncome() {
    const amount = Number(tutar);
    if (!amount || amount <= 0) {
      setFormError('Geçerli bir tutar girin.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiPost('/doctor/finance/incomes', {
        tutar: amount,
        odeme_tarihi: odemeTarihi,
        ilk_odeme_tutar: Number(ilkOdeme) || 0,
        ilk_odeme_yontemi: yontem,
        aciklama: aciklama.trim() || null,
      });
      setModalOpen(false);
      setTutar('');
      setIlkOdeme('');
      setAciklama('');
      await reload(false);
    } catch (e) {
      setFormError(errMessage(e, 'Gelir eklenemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  function remove(id: number) {
    Alert.alert('Geliri sil', 'Bu gelir kaydı silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiDelete(`/doctor/finance/incomes/${id}`);
              await reload(false);
            } catch (e) {
              alertError(e);
            }
          })();
        },
      },
    ]);
  }

  if (detail) {
    return (
      <ScreenShell
        title="Gelir detayı"
        subtitle={`${money(detail.tutar)} · ${detail.durum}`}
        onBack={() => setDetail(null)}
        rightAction={
          <Pressable
            onPress={() => {
              setEditTutar(String(detail.tutar));
              setEditTarih(String(detail.odeme_tarihi).slice(0, 10));
              setEditAciklama(detail.aciklama || '');
              setEditOpen(true);
            }}
          >
            <Text style={s.modalClose}>Düzenle</Text>
          </Pressable>
        }
      >
        <View style={s.card}>
          <Text style={s.cardTitle}>{detail.hasta_adi || detail.hizmet || 'Gelir'}</Text>
          <Text style={s.cardMeta}>{detail.odeme_tarihi}</Text>
          <Text style={s.cardBody}>Toplam {money(detail.tutar)} · Ödenen {money(detail.odenen_tutar)}</Text>
          {detail.aciklama ? <Text style={s.cardMeta}>{detail.aciklama}</Text> : null}
        </View>
        <FormModal
          visible={editOpen}
          title="Geliri düzenle"
          onClose={() => setEditOpen(false)}
          onSubmit={() => {
            void (async () => {
              try {
                const res = await apiPut<IncomeItem>(`/doctor/finance/incomes/${detail.id}`, {
                  tutar: Number(editTutar),
                  odeme_tarihi: editTarih,
                  aciklama: editAciklama.trim() || null,
                });
                setDetail(res.data ?? detail);
                setEditOpen(false);
                await reload(false);
              } catch (e) {
                alertError(e);
              }
            })();
          }}
        >
          <Text style={s.label}>Tutar</Text>
          <TextInput style={s.input} value={editTutar} onChangeText={setEditTutar} keyboardType="decimal-pad" />
          <DateField label="Ödeme tarihi" value={editTarih} onChange={setEditTarih} />
          <Text style={s.label}>Açıklama</Text>
          <TextInput style={[s.input, s.textArea]} value={editAciklama} onChangeText={setEditAciklama} multiline />
        </FormModal>
        <Text style={s.sectionTitle}>Ödeme kalemleri</Text>
        {(detail.kalemler || []).map((k) => (
          <View key={k.id} style={s.card}>
            <Text style={s.cardTitle}>{money(k.tutar)}</Text>
            <Text style={s.cardMeta}>{k.tarih} · {k.odeme_yontemi}</Text>
            <Pressable
              style={[s.actionBtn, s.actionBtnDanger, { marginTop: 8 }]}
              onPress={() =>
                void apiDelete(`/doctor/finance/incomes/${detail.id}/items/${k.id}`)
                  .then((res) => {
                    setDetail((res.data as IncomeItem) ?? detail);
                    return reload(false);
                  })
                  .catch(alertError)
              }
            >
              <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Kalemi sil</Text>
            </Pressable>
          </View>
        ))}
        <View style={s.card}>
          <Text style={s.cardTitle}>Kalem ekle</Text>
          <Text style={s.label}>Tutar</Text>
          <TextInput style={s.input} value={kalemTutar} onChangeText={setKalemTutar} keyboardType="decimal-pad" />
          <DateField label="Tarih" value={kalemTarih} onChange={setKalemTarih} />
          <SelectField
            label="Yöntem"
            options={[
              { label: 'Nakit', value: 'nakit' },
              { label: 'Kredi kartı', value: 'kredi_karti' },
              { label: 'Havale', value: 'havale' },
              { label: 'Online', value: 'online' },
            ]}
            value={kalemYontem}
            onChange={setKalemYontem}
          />
          <Pressable style={[s.primaryButton, { marginTop: 12 }]} onPress={() => void addKalem()}>
            <Text style={s.primaryButtonText}>Kalemi kaydet</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Gelirler"
      subtitle="Ödeme ve gelir kayıtlarınız."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable onPress={() => setModalOpen(true)}>
          <Text style={s.modalClose}>+ Ekle</Text>
        </Pressable>
      }
    >
      <View style={s.card}>
        <Text style={s.cardTitle}>Tarih filtresi</Text>
        <DateField label="Başlangıç" value={filterBas} onChange={setFilterBas} />
        <DateField label="Bitis" value={filterBit} onChange={setFilterBit} />
        <Pressable style={[s.secondaryButton, { marginTop: 8 }]} onPress={() => void reload(false)}>
          <Text style={s.secondaryButtonText}>Filtrele</Text>
        </Pressable>
      </View>
      {items.length === 0 ? (
        <EmptyState title="Gelir yok" text="Henüz gelir kaydı eklenmemiş." />
      ) : (
        items.map((item) => (
          <Pressable key={item.id} style={s.card} onPress={() => void openDetail(item.id)}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>{money(item.tutar)}</Text>
              <View style={s.pill}>
                <Text style={s.pillText}>{item.durum}</Text>
              </View>
            </View>
            <Text style={s.cardMeta}>
              {item.odeme_tarihi}
              {item.hasta_adi ? ` · ${item.hasta_adi}` : ''}
            </Text>
            <Text style={s.cardMeta}>Ödenen: {money(item.odenen_tutar)} · detay için dokunun</Text>
            {item.aciklama ? <Text style={s.cardBody}>{item.aciklama}</Text> : null}
            <View style={s.actions}>
              <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={() => remove(item.id)}>
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
              </Pressable>
            </View>
          </Pressable>
        ))
      )}

      <FormModal
        visible={modalOpen}
        title="Yeni gelir"
        onClose={() => setModalOpen(false)}
        onSubmit={() => void createIncome()}
        submitting={submitting}
        error={formError}
      >
        <Text style={s.label}>Tutar (₺)</Text>
        <TextInput style={s.input} value={tutar} onChangeText={setTutar} keyboardType="decimal-pad" placeholderTextColor="#6B7F93" />
        <DateField label="Ödeme tarihi" value={odemeTarihi} onChange={setOdemeTarihi} />
        <Text style={s.label}>İlk ödeme tutarı</Text>
        <TextInput style={s.input} value={ilkOdeme} onChangeText={setIlkOdeme} keyboardType="decimal-pad" placeholderTextColor="#6B7F93" />
        <SelectField
          label="Ödeme yöntemi"
          options={[
            { label: 'Nakit', value: 'nakit' },
            { label: 'Kart', value: 'kredi_karti' },
            { label: 'Havale', value: 'havale' },
            { label: 'Online', value: 'online' },
          ]}
          value={yontem}
          onChange={setYontem}
        />
        <Text style={s.label}>Açıklama</Text>
        <TextInput style={[s.input, s.textArea]} value={aciklama} onChangeText={setAciklama} multiline placeholderTextColor="#6B7F93" />
      </FormModal>
    </ScreenShell>
  );
}

type ExpenseItem = {
  id: number;
  tutar: number;
  tarih: string;
  kategori: string;
  aciklama: string | null;
};

export function FinanceExpensesScreen({ onBack }: ModuleProps) {
  const [filterBas, setFilterBas] = useState(todayKey().slice(0, 8) + '01');
  const [filterBit, setFilterBit] = useState(todayKey());
  const loader = useCallback(async () => {
    const res = await apiGet<ExpenseItem[]>('/doctor/finance/expenses', {
      baslangic: filterBas || undefined,
      bitis: filterBit || undefined,
    });
    return res.data ?? [];
  }, [filterBas, filterBit]);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [modalOpen, setModalOpen] = useState(false);
  const [tutar, setTutar] = useState('');
  const [tarih, setTarih] = useState(todayKey());
  const [kategori, setKategori] = useState('Genel');
  const [aciklama, setAciklama] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [belgeUri, setBelgeUri] = useState<string | null>(null);

  async function createExpense() {
    const amount = Number(tutar);
    if (!amount || amount <= 0) {
      setFormError('Geçerli bir tutar girin.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (belgeUri) {
        const form = new FormData();
        form.append('tutar', String(amount));
        form.append('tarih', tarih);
        form.append('kategori', kategori.trim() || 'Genel');
        if (aciklama.trim()) form.append('aciklama', aciklama.trim());
        form.append('belge', {
          uri: belgeUri,
          name: `belge_${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as unknown as Blob);
        if (editId) await apiUpload(`/doctor/finance/expenses/${editId}`, form, 'PUT');
        else await apiUpload('/doctor/finance/expenses', form);
      } else {
        const body = {
          tutar: amount,
          tarih,
          kategori: kategori.trim() || 'Genel',
          aciklama: aciklama.trim() || null,
        };
        if (editId) await apiPut(`/doctor/finance/expenses/${editId}`, body);
        else await apiPost('/doctor/finance/expenses', body);
      }
      setModalOpen(false);
      setEditId(null);
      setTutar('');
      setAciklama('');
      setBelgeUri(null);
      await reload(false);
    } catch (e) {
      setFormError(errMessage(e, 'Gider kaydedilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  function remove(id: number) {
    Alert.alert('Gideri sil', 'Bu gider kaydı silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiDelete(`/doctor/finance/expenses/${id}`);
              await reload(false);
            } catch (e) {
              alertError(e);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenShell
      title="Giderler"
      subtitle="Klinik ve işletme giderleri."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable onPress={() => setModalOpen(true)}>
          <Text style={s.modalClose}>+ Ekle</Text>
        </Pressable>
      }
    >
      <View style={s.card}>
        <Text style={s.cardTitle}>Tarih filtresi</Text>
        <DateField label="Başlangıç" value={filterBas} onChange={setFilterBas} />
        <DateField label="Bitis" value={filterBit} onChange={setFilterBit} />
        <Pressable style={[s.secondaryButton, { marginTop: 8 }]} onPress={() => void reload(false)}>
          <Text style={s.secondaryButtonText}>Filtrele</Text>
        </Pressable>
      </View>
      {items.length === 0 ? (
        <EmptyState title="Gider yok" text="Henüz gider kaydı eklenmemiş." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>{money(item.tutar)}</Text>
              <View style={s.pill}>
                <Text style={s.pillText}>{item.kategori}</Text>
              </View>
            </View>
            <Text style={s.cardMeta}>{String(item.tarih).slice(0, 10)}</Text>
            {item.aciklama ? <Text style={s.cardBody}>{item.aciklama}</Text> : null}
            <View style={s.actions}>
              <Pressable
                style={s.actionBtn}
                onPress={() => {
                  setEditId(item.id);
                  setTutar(String(item.tutar));
                  setTarih(String(item.tarih).slice(0, 10));
                  setKategori(item.kategori || 'Genel');
                  setAciklama(item.aciklama || '');
                  setBelgeUri(null);
                  setModalOpen(true);
                }}
              >
                <Text style={s.actionBtnText}>Düzenle</Text>
              </Pressable>
              <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={() => remove(item.id)}>
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <FormModal
        visible={modalOpen}
        title={editId ? 'Gideri düzenle' : 'Yeni gider'}
        onClose={() => {
          setModalOpen(false);
          setEditId(null);
        }}
        onSubmit={() => void createExpense()}
        submitting={submitting}
        error={formError}
      >
        <Text style={s.label}>Tutar (₺)</Text>
        <TextInput style={s.input} value={tutar} onChangeText={setTutar} keyboardType="decimal-pad" placeholderTextColor="#6B7F93" />
        <DateField label="Tarih" value={tarih} onChange={setTarih} />
        <Text style={s.label}>Kategori</Text>
        <TextInput style={s.input} value={kategori} onChangeText={setKategori} placeholderTextColor="#6B7F93" />
        <Text style={s.label}>Açıklama</Text>
        <TextInput style={[s.input, s.textArea]} value={aciklama} onChangeText={setAciklama} multiline placeholderTextColor="#6B7F93" />
        <Pressable
          style={[s.secondaryButton, { marginTop: 8 }]}
          onPress={() =>
            void (async () => {
              const src = await pickImageSource();
              if (!src) return;
              const asset = await launchImagePicker(src);
              if (asset) setBelgeUri(asset.uri);
            })()
          }
        >
          <Text style={s.secondaryButtonText}>{belgeUri ? 'Belge seçildi' : 'Fiş / belge ekle'}</Text>
        </Pressable>
      </FormModal>
    </ScreenShell>
  );
}

type CategoryItem = {
  id: number;
  ad: string;
  tur: 'gelir' | 'gider' | string;
  aktif?: boolean;
};

export function FinanceCategoriesScreen({ onBack }: ModuleProps) {
  const loader = useCallback(async () => {
    const res = await apiGet<CategoryItem[]>('/doctor/finance/categories');
    return res.data ?? [];
  }, []);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [ad, setAd] = useState('');
  const [tur, setTur] = useState<'gelir' | 'gider'>('gelir');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditId(null);
    setAd('');
    setTur('gelir');
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item: CategoryItem) {
    setEditId(item.id);
    setAd(item.ad);
    setTur(item.tur === 'gider' ? 'gider' : 'gelir');
    setFormError(null);
    setModalOpen(true);
  }

  async function saveCategory() {
    if (!ad.trim()) {
      setFormError('Kategori adı zorunludur.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editId) {
        await apiPut(`/doctor/finance/categories/${editId}`, { ad: ad.trim(), tur, aktif: true });
      } else {
        await apiPost('/doctor/finance/categories', { ad: ad.trim(), tur, aktif: true });
      }
      setModalOpen(false);
      setAd('');
      setEditId(null);
      await reload(false);
    } catch (e) {
      setFormError(errMessage(e, editId ? 'Kategori güncellenemedi.' : 'Kategori eklenemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  function remove(id: number) {
    Alert.alert('Kategoriyi sil', 'Bu kategori silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiDelete(`/doctor/finance/categories/${id}`);
              await reload(false);
            } catch (e) {
              alertError(e);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenShell
      title="Finans Kategorileri"
      subtitle="Gelir ve gider kategorileri."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable onPress={openCreate}>
          <Text style={s.modalClose}>+ Ekle</Text>
        </Pressable>
      }
    >
      {items.length === 0 ? (
        <EmptyState title="Kategori yok" text="Finans kategorilerinizi buradan ekleyin." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>{item.ad}</Text>
              <View style={s.pill}>
                <Text style={s.pillText}>{item.tur === 'gider' ? 'Gider' : 'Gelir'}</Text>
              </View>
            </View>
            <Text style={s.cardMeta}>{item.aktif === false ? 'Pasif' : 'Aktif'}</Text>
            <View style={s.actions}>
              <Pressable style={s.actionBtn} onPress={() => openEdit(item)}>
                <Text style={s.actionBtnText}>Düzenle</Text>
              </Pressable>
              <Pressable
                style={s.actionBtn}
                onPress={() =>
                  void apiPost(`/doctor/finance/categories/${item.id}/toggle`)
                    .then(() => reload(false))
                    .catch(alertError)
                }
              >
                <Text style={s.actionBtnText}>{item.aktif === false ? 'Aktif et' : 'Pasif et'}</Text>
              </Pressable>
              <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={() => remove(item.id)}>
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <FormModal
        visible={modalOpen}
        title={editId ? 'Kategori düzenle' : 'Yeni kategori'}
        onClose={() => {
          setModalOpen(false);
          setEditId(null);
        }}
        onSubmit={() => void saveCategory()}
        submitting={submitting}
        error={formError}
      >
        <Text style={s.label}>Ad</Text>
        <TextInput style={s.input} value={ad} onChangeText={setAd} placeholderTextColor="#6B7F93" />
        <SelectField
          label="Tür"
          options={[
            { label: 'Gelir', value: 'gelir' },
            { label: 'Gider', value: 'gider' },
          ]}
          value={tur}
          onChange={setTur}
        />
      </FormModal>
    </ScreenShell>
  );
}

type BalanceItem = {
  hasta_id: number;
  hasta_adi: string;
  telefon: string | null;
  bakiye: number;
  kayit_sayisi: number;
};

/** Bridge selected patient id between balances list → account screen */
let financeHastaId: number | null = null;
export function setFinanceHastaId(id: number | null) {
  financeHastaId = id;
}
export function getFinanceHastaId() {
  return financeHastaId;
}

export function FinanceBalancesScreen({ onBack, onNavigate }: ModuleProps) {
  const loader = useCallback(async () => {
    const res = await apiGet<BalanceItem[]>('/doctor/finance/balances');
    return res.data ?? [];
  }, []);
  const { items, loading, refreshing, onRefresh } = useModuleList(loader);

  return (
    <ScreenShell
      title="Hasta Bakiyeleri"
      subtitle="Açık bakiyesi olan danışanlar — hesaba dokunun."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {items.length === 0 ? (
        <EmptyState title="Açık bakiye yok" text="Bekleyen veya kısmi ödemeli kayıt bulunmuyor." />
      ) : (
        items.map((item) => (
          <Pressable
            key={item.hasta_id}
            style={s.card}
            onPress={() => {
              setFinanceHastaId(item.hasta_id);
              onNavigate('financePatientAccount');
            }}
          >
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>{item.hasta_adi}</Text>
              <Text style={[s.cardTitle, { flex: 0, color: '#C96A2B' }]}>{money(item.bakiye)}</Text>
            </View>
            <Text style={s.cardMeta}>
              {item.telefon || 'Telefon yok'} · {item.kayit_sayisi} kayıt · Hesabı aç ›
            </Text>
          </Pressable>
        ))
      )}
    </ScreenShell>
  );
}

type PatientAccountData = {
  hasta: { id: number; ad_soyad: string; telefon?: string | null; e_posta?: string | null };
  ozet: {
    toplam_borc: number;
    toplam_odenen: number;
    kalan_bakiye: number;
    fatura_sayisi?: number;
    acik_fatura_sayisi?: number;
  };
  faturalar: {
    id: number;
    tutar: number;
    odenen_tutar: number;
    kalan?: number;
    durum: string;
    odeme_tarihi?: string;
    aciklama?: string | null;
    hizmet?: string | null;
    kalemler?: { id: number; tutar: number; tarih: string; odeme_yontemi: string; not?: string | null }[];
  }[];
  acik_faturalar: { id: number; tutar: number; odenen_tutar: number; kalan?: number; hizmet?: string | null; aciklama?: string | null }[];
};

export function FinancePatientAccountScreen({ onBack }: ModuleProps) {
  const hastaId = getFinanceHastaId();
  const [data, setData] = useState<PatientAccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [debtOpen, setDebtOpen] = useState(false);
  const [odemeId, setOdemeId] = useState<string | null>(null);
  const [tutar, setTutar] = useState('');
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));
  const [yontem, setYontem] = useState('nakit');
  const [not, setNot] = useState('');
  const [borcTutar, setBorcTutar] = useState('');
  const [borcAciklama, setBorcAciklama] = useState('');
  const [borcIlk, setBorcIlk] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (soft = false) => {
    if (!hastaId) {
      setLoading(false);
      return;
    }
    if (!soft) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await apiGet<PatientAccountData>(`/doctor/finance/patients/${hastaId}`);
      setData(res.data ?? null);
      const acik = res.data?.acik_faturalar ?? [];
      if (acik.length) {
        setOdemeId((prev) => prev ?? String(acik[0].id));
      }
    } catch (e) {
      alertError(e, 'Hesap yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hastaId]);

  useEffect(() => {
    void load(false);
  }, [load]);

  async function submitCollect() {
    if (!hastaId || !odemeId) {
      setFormError('Fatura seçin.');
      return;
    }
    const amount = parseFloat(tutar.replace(',', '.'));
    if (!amount || amount <= 0) {
      setFormError('Geçerli tutar girin.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiPost(`/doctor/finance/patients/${hastaId}/collect`, {
        odeme_id: Number(odemeId),
        tutar: amount,
        tarih,
        odeme_yontemi: yontem,
        not: not.trim() || undefined,
      });
      setCollectOpen(false);
      setTutar('');
      setNot('');
      await load(true);
      Alert.alert('Tamam', 'Tahsilat kaydedildi.');
    } catch (e) {
      setFormError(errMessage(e, 'Tahsilat kaydedilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDebt() {
    if (!hastaId) return;
    const amount = parseFloat(borcTutar.replace(',', '.'));
    if (!amount || amount <= 0) {
      setFormError('Geçerli borç tutarı girin.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiPost(`/doctor/finance/patients/${hastaId}/debt`, {
        tutar: amount,
        odeme_tarihi: tarih,
        aciklama: borcAciklama.trim() || undefined,
        ilk_odeme_tutar: parseFloat(borcIlk.replace(',', '.')) || 0,
        ilk_odeme_yontemi: yontem,
      });
      setDebtOpen(false);
      setBorcTutar('');
      setBorcAciklama('');
      setBorcIlk('0');
      await load(true);
      Alert.alert('Tamam', 'Borç kaydı oluşturuldu.');
    } catch (e) {
      setFormError(errMessage(e, 'Borç eklenemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!hastaId) {
    return (
      <ScreenShell title="Hasta hesabı" onBack={onBack}>
        <EmptyState title="Hasta seçilmedi" text="Bakiyeler listesinden bir hasta seçin." />
      </ScreenShell>
    );
  }

  const ozet = data?.ozet;
  const acik = data?.acik_faturalar ?? [];

  return (
    <ScreenShell
      title={data?.hasta.ad_soyad ?? 'Hasta hesabı'}
      subtitle={
        data
          ? `${data.hasta.telefon || 'Tel yok'} · Kalan ${money(ozet?.kalan_bakiye ?? 0)}`
          : 'Yükleniyor…'
      }
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      {data ? (
        <>
          <View style={[s.card, { flexDirection: 'row', gap: 8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.hint}>Borç</Text>
              <Text style={s.cardTitle}>{money(ozet?.toplam_borc ?? 0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.hint}>Ödenen</Text>
              <Text style={[s.cardTitle, { color: '#34D399' }]}>{money(ozet?.toplam_odenen ?? 0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.hint}>Kalan</Text>
              <Text style={[s.cardTitle, { color: '#C96A2B' }]}>{money(ozet?.kalan_bakiye ?? 0)}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <Pressable
              style={[s.primaryButton, { flex: 1, opacity: acik.length ? 1 : 0.5 }]}
              disabled={!acik.length}
              onPress={() => {
                setFormError(null);
                if (acik[0]) setOdemeId(String(acik[0].id));
                setCollectOpen(true);
              }}
            >
              <Text style={s.primaryButtonText}>Tahsilat al</Text>
            </Pressable>
            <Pressable
              style={[s.secondaryButton, { flex: 1 }]}
              onPress={() => {
                setFormError(null);
                setDebtOpen(true);
              }}
            >
              <Text style={s.secondaryButtonText}>Borç ekle</Text>
            </Pressable>
          </View>

          {(data.faturalar ?? []).map((f) => (
            <View key={f.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>{f.hizmet || f.aciklama || `Fatura #${f.id}`}</Text>
                <View style={s.pill}>
                  <Text style={s.pillText}>{f.durum}</Text>
                </View>
              </View>
              <Text style={s.cardMeta}>
                {f.odeme_tarihi || '—'} · Borç {money(f.tutar)} · Ödenen {money(f.odenen_tutar)} · Kalan{' '}
                {money(f.kalan ?? Math.max(0, f.tutar - f.odenen_tutar))}
              </Text>
              {(f.kalemler ?? []).map((k) => (
                <Text key={k.id} style={[s.cardBody, { marginTop: 4 }]}>
                  · {k.tarih} {k.odeme_yontemi} {money(k.tutar)}
                  {k.not ? ` — ${k.not}` : ''}
                </Text>
              ))}
            </View>
          ))}
          {(data.faturalar ?? []).length === 0 ? (
            <EmptyState title="Hareket yok" text="Bu hastaya henüz borç/tahsilat yazılmamış." />
          ) : null}
        </>
      ) : null}

      <FormModal
        visible={collectOpen}
        title="Tahsilat al"
        onClose={() => setCollectOpen(false)}
        onSubmit={() => void submitCollect()}
        submitting={submitting}
        error={formError}
        submitLabel="Kaydet"
      >
        <SelectField
          label="Açık fatura"
          placeholder="Seçin"
          value={odemeId}
          onChange={(v) => setOdemeId(String(v))}
          options={acik.map((f) => ({
            value: String(f.id),
            label: `#${f.id} ${f.hizmet || f.aciklama || 'Fatura'} · kalan ${money(f.kalan ?? f.tutar - f.odenen_tutar)}`,
          }))}
        />
        <Text style={s.label}>Tutar</Text>
        <TextInput style={s.input} keyboardType="decimal-pad" value={tutar} onChangeText={setTutar} placeholder="0.00" placeholderTextColor="#6B7F93" />
        <DateField label="Tarih" value={tarih} onChange={setTarih} />
        <SelectField
          label="Yöntem"
          value={yontem}
          onChange={(v) => setYontem(String(v || 'nakit'))}
          options={[
            { value: 'nakit', label: 'Nakit' },
            { value: 'kredi_karti', label: 'Kredi kartı' },
            { value: 'havale', label: 'Havale' },
            { value: 'online', label: 'Online' },
          ]}
        />
        <Text style={s.label}>Not</Text>
        <TextInput style={s.input} value={not} onChangeText={setNot} placeholderTextColor="#6B7F93" />
      </FormModal>

      <FormModal
        visible={debtOpen}
        title="Borç ekle"
        onClose={() => setDebtOpen(false)}
        onSubmit={() => void submitDebt()}
        submitting={submitting}
        error={formError}
        submitLabel="Oluştur"
      >
        <Text style={s.label}>Toplam tutar</Text>
        <TextInput style={s.input} keyboardType="decimal-pad" value={borcTutar} onChangeText={setBorcTutar} placeholderTextColor="#6B7F93" />
        <DateField label="Tarih" value={tarih} onChange={setTarih} />
        <Text style={s.label}>Açıklama</Text>
        <TextInput style={s.input} value={borcAciklama} onChangeText={setBorcAciklama} placeholderTextColor="#6B7F93" />
        <Text style={s.label}>İlk ödeme (opsiyonel)</Text>
        <TextInput style={s.input} keyboardType="decimal-pad" value={borcIlk} onChangeText={setBorcIlk} placeholderTextColor="#6B7F93" />
      </FormModal>
    </ScreenShell>
  );
}

// â”€â”€ FAQ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type FaqItem = {
  id: number;
  soru: string;
  cevap: string;
  sira?: number;
  aktif?: boolean;
};

export function FaqScreen({ onBack }: ModuleProps) {
  const loader = useCallback(async () => {
    const res = await apiGet<FaqItem[]>('/doctor/faqs');
    return res.data ?? [];
  }, []);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [soru, setSoru] = useState('');
  const [cevap, setCevap] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditId(null);
    setSoru('');
    setCevap('');
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item: FaqItem) {
    setEditId(item.id);
    setSoru(item.soru);
    setCevap(item.cevap);
    setFormError(null);
    setModalOpen(true);
  }

  async function save() {
    if (!soru.trim() || !cevap.trim()) {
      setFormError('Soru ve cevap zorunludur.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editId) {
        await apiPut(`/doctor/faqs/${editId}`, { soru: soru.trim(), cevap: cevap.trim() });
      } else {
        await apiPost('/doctor/faqs', { soru: soru.trim(), cevap: cevap.trim() });
      }
      setModalOpen(false);
      await reload(false);
    } catch (e) {
      setFormError(errMessage(e, 'SSS kaydedilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  function remove(id: number) {
    Alert.alert('SSS sil', 'Bu soru silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiDelete(`/doctor/faqs/${id}`);
              await reload(false);
            } catch (e) {
              alertError(e);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenShell
      title="Sıkça Sorulan Sorular"
      subtitle="Sitenizdeki SSS listesini yönetin."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable onPress={openCreate}>
          <Text style={s.modalClose}>+ Ekle</Text>
        </Pressable>
      }
    >
      {items.length === 0 ? (
        <EmptyState title="SSS yok" text="İlk soruyu ekleyerek başlayın." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={s.card}>
            <Text style={s.cardTitle}>{item.soru}</Text>
            <Text style={s.cardBody} numberOfLines={4}>
              {item.cevap}
            </Text>
            <View style={s.actions}>
              <Pressable style={s.actionBtn} onPress={() => openEdit(item)}>
                <Text style={s.actionBtnText}>Düzenle</Text>
              </Pressable>
              <Pressable
                style={[s.actionBtn, s.actionBtnMuted]}
                onPress={() =>
                  void apiPost(`/doctor/faqs/${item.id}/toggle`)
                    .then(() => reload(false))
                    .catch(alertError)
                }
              >
                <Text style={[s.actionBtnText, s.actionBtnMutedText]}>
                  {item.aktif === false ? 'Aktifleştir' : 'Pasifleştir'}
                </Text>
              </Pressable>
              <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={() => remove(item.id)}>
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <FormModal
        visible={modalOpen}
        title={editId ? 'SSS düzenle' : 'Yeni SSS'}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void save()}
        submitting={submitting}
        error={formError}
      >
        <Text style={s.label}>Soru</Text>
        <TextInput style={s.input} value={soru} onChangeText={setSoru} placeholderTextColor="#6B7F93" />
        <Text style={s.label}>Cevap</Text>
        <TextInput style={[s.input, s.textArea]} value={cevap} onChangeText={setCevap} multiline placeholderTextColor="#6B7F93" />
      </FormModal>
    </ScreenShell>
  );
}

// â”€â”€ Education â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type EducationItem = {
  id: number;
  baslik: string;
  ozet?: string | null;
  icerik?: string | null;
  tip?: string | null;
  durum?: string | null;
  fiyat?: number | null;
  odeme_notu?: string | null;
  kontenjan?: number | null;
  baslangic_at?: string | null;
  bitis_at?: string | null;
  basvuru_bitis_at?: string | null;
  mekan?: string | null;
  online_url?: string | null;
  basvuru_acik_mi?: boolean;
  meta_baslik?: string | null;
  meta_aciklama?: string | null;
  meta_anahtar_kelimeler?: string | null;
  basvurular_count?: number;
  bekleyen_basvuru?: number;
};

type FormFieldDraft = {
  id?: number;
  etiket: string;
  tip: 'text' | 'textarea' | 'select' | 'number' | 'email' | 'tel' | 'checkbox';
  zorunlu_mu: boolean;
  secenekler: string;
  placeholder: string;
};

export function EducationScreen({ onBack, onNavigate }: ModuleProps) {
  const loader = useCallback(async () => {
    const res = await apiGet<EducationItem[]>('/doctor/educations');
    return res.data ?? [];
  }, []);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [baslik, setBaslik] = useState('');
  const [ozet, setOzet] = useState('');
  const [icerik, setIcerik] = useState('');
  const [fiyat, setFiyat] = useState('');
  const [odemeNotu, setOdemeNotu] = useState('');
  const [tip, setTip] = useState<'yuz_yuze' | 'online' | 'hibrit'>('yuz_yuze');
  const [kontenjan, setKontenjan] = useState('');
  const [baslangicAt, setBaslangicAt] = useState('');
  const [bitisAt, setBitisAt] = useState('');
  const [basvuruBitisAt, setBasvuruBitisAt] = useState('');
  const [mekan, setMekan] = useState('');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [kapakUri, setKapakUri] = useState<string | null>(null);
  const [durum, setDurum] = useState<'taslak' | 'yayinda' | 'arsiv'>('taslak');
  const [basvuruAcik, setBasvuruAcik] = useState(true);
  const [metaBaslik, setMetaBaslik] = useState('');
  const [metaAciklama, setMetaAciklama] = useState('');
  const [metaAnahtar, setMetaAnahtar] = useState('');
  const [formFields, setFormFields] = useState<FormFieldDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function resetEducationForm() {
    setBaslik('');
    setOzet('');
    setIcerik('');
    setFiyat('');
    setOdemeNotu('');
    setTip('yuz_yuze');
    setKontenjan('');
    setBaslangicAt('');
    setBitisAt('');
    setBasvuruBitisAt('');
    setMekan('');
    setOnlineUrl('');
    setKapakUri(null);
    setDurum('taslak');
    setBasvuruAcik(true);
    setMetaBaslik('');
    setMetaAciklama('');
    setMetaAnahtar('');
    setFormFields([]);
    setFormError(null);
  }

  function openCreate() {
    setEditId(null);
    resetEducationForm();
    setModalOpen(true);
  }

  function openEdit(item: EducationItem) {
    setEditId(item.id);
    setBaslik(item.baslik);
    setOzet(item.ozet || '');
    setIcerik((item.icerik || '').replace(/<[^>]+>/g, ''));
    setFiyat(item.fiyat != null ? String(item.fiyat) : '');
    setOdemeNotu(item.odeme_notu || '');
    setTip(((item.tip as any) || 'yuz_yuze') as 'yuz_yuze' | 'online' | 'hibrit');
    setKontenjan(item.kontenjan != null ? String(item.kontenjan) : '');
    setBaslangicAt(item.baslangic_at ? String(item.baslangic_at).slice(0, 10) : '');
    setBitisAt(item.bitis_at ? String(item.bitis_at).slice(0, 10) : '');
    setBasvuruBitisAt(item.basvuru_bitis_at ? String(item.basvuru_bitis_at).slice(0, 10) : '');
    setMekan(item.mekan || '');
    setOnlineUrl(item.online_url || '');
    setKapakUri(null);
    setDurum((item.durum as 'taslak' | 'yayinda' | 'arsiv') || 'taslak');
    setBasvuruAcik(item.basvuru_acik_mi !== false);
    setMetaBaslik(item.meta_baslik || '');
    setMetaAciklama(item.meta_aciklama || '');
    setMetaAnahtar(item.meta_anahtar_kelimeler || '');
    setFormFields([]);
    setFormError(null);
    setModalOpen(true);
    void apiGet<any[]>(`/doctor/educations/${item.id}/form-fields`)
      .then((r) => {
        setFormFields(
          (r.data ?? []).map((a: any) => ({
            id: a.id,
            etiket: a.etiket || '',
            tip: (a.tip || 'text') as FormFieldDraft['tip'],
            zorunlu_mu: !!a.zorunlu_mu,
            secenekler: Array.isArray(a.secenekler) ? a.secenekler.join(', ') : '',
            placeholder: a.placeholder || '',
          })),
        );
      })
      .catch(() => setFormFields([]));
  }

  async function saveEducation() {
    if (!baslik.trim()) {
      setFormError('Başlık zorunludur.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const body: Record<string, unknown> = {
        baslik: baslik.trim(),
        ozet: ozet.trim() || null,
        icerik: icerik.trim() || null,
        fiyat: fiyat.trim() === '' ? null : Number(fiyat),
        odeme_notu: odemeNotu.trim() || null,
        tip,
        durum,
        basvuru_acik_mi: basvuruAcik,
        kontenjan: kontenjan.trim() ? Number(kontenjan) : null,
        baslangic_at: baslangicAt || null,
        bitis_at: bitisAt || null,
        basvuru_bitis_at: basvuruBitisAt || null,
        mekan: mekan.trim() || null,
        online_url: onlineUrl.trim() || null,
        meta_baslik: metaBaslik.trim() || null,
        meta_aciklama: metaAciklama.trim() || null,
        meta_anahtar_kelimeler: metaAnahtar.trim() || null,
      };
      let educationId = editId;
      if (kapakUri) {
        const form = new FormData();
        Object.entries(body).forEach(([k, v]) => {
          if (v === null || v === undefined) return;
          form.append(k, String(v));
        });
        form.append('kapak', {
          uri: kapakUri,
          name: `egitim_${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as unknown as Blob);
        if (editId) await apiUpload(`/doctor/educations/${editId}`, form, 'PUT');
        else {
          const created = await apiUpload<EducationItem>('/doctor/educations', form);
          educationId = created.data?.id ?? null;
        }
      } else if (editId) {
        await apiPut(`/doctor/educations/${editId}`, body);
      } else {
        const created = await apiPost<EducationItem>('/doctor/educations', body);
        educationId = created.data?.id ?? null;
      }
      if (educationId != null) {
        await apiPut(`/doctor/educations/${educationId}/form-fields`, {
          alanlar: formFields
            .filter((f) => f.etiket.trim())
            .map((f) => ({
              id: f.id,
              etiket: f.etiket.trim(),
              tip: f.tip,
              zorunlu_mu: f.zorunlu_mu,
              secenekler: f.secenekler,
              placeholder: f.placeholder || null,
            })),
        });
      }
      setModalOpen(false);
      setEditId(null);
      resetEducationForm();
      await reload(false);
    } catch (e) {
      setFormError(errMessage(e, 'Eğitim kaydedilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  function remove(id: number) {
    Alert.alert('Eğitimi sil', 'Bu eğitim silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiDelete(`/doctor/educations/${id}`);
              await reload(false);
            } catch (e) {
              alertError(e);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenShell
      title="Eğitimler"
      subtitle="Kurs ve webinarlarınız."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable onPress={openCreate}>
          <Text style={s.modalClose}>+ Ekle</Text>
        </Pressable>
      }
    >
      <Pressable style={[s.secondaryButton, { marginTop: 8 }]} onPress={() => onNavigate('educationApps')}>
        <Text style={s.secondaryButtonText}>Başvuruları görüntüle</Text>
      </Pressable>

      {items.length === 0 ? (
        <EmptyState title="Eğitim yok" text="Yeni bir eğitim oluşturarak başlayın." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>{item.baslik}</Text>
              <View style={s.pill}>
                <Text style={s.pillText}>{item.durum || 'taslak'}</Text>
              </View>
            </View>
            {item.ozet ? <Text style={s.cardBody}>{item.ozet}</Text> : null}
            <Text style={s.cardMeta}>
              {item.fiyat != null ? money(item.fiyat) : 'Ücretsiz / belirtilmemiş'}
              {item.basvurular_count != null ? ` · ${item.basvurular_count} başvuru` : ''}
            </Text>
            <View style={s.actions}>
              <Pressable style={s.actionBtn} onPress={() => openEdit(item)}>
                <Text style={s.actionBtnText}>Düzenle</Text>
              </Pressable>
              <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={() => remove(item.id)}>
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <FormModal
        visible={modalOpen}
        title={editId ? 'Eğitim düzenle' : 'Yeni eğitim'}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void saveEducation()}
        submitting={submitting}
        error={formError}
      >
        <Text style={s.label}>Başlık</Text>
        <TextInput style={s.input} value={baslik} onChangeText={setBaslik} placeholderTextColor="#6B7F93" />
        <RichTextEditor
          label="Özet"
          value={ozet}
          onChange={setOzet}
          minHeight={90}
          placeholder="Kısa özet — liste ve vurgu ekleyebilirsiniz"
        />
        <RichTextEditor
          label="Detay içerik"
          value={icerik}
          onChange={setIcerik}
          minHeight={140}
          placeholder="Eğitim detayı (markdown: kalın, başlık, liste…)"
        />
        <SelectField
          label="Tip"
          options={[
            { label: 'Yüz yüze', value: 'yuz_yuze' },
            { label: 'Online', value: 'online' },
            { label: 'Hibrit', value: 'hibrit' },
          ]}
          value={tip}
          onChange={setTip}
        />
        <Text style={s.label}>Fiyat (₺)</Text>
        <TextInput style={s.input} value={fiyat} onChangeText={setFiyat} keyboardType="decimal-pad" placeholderTextColor="#6B7F93" />
        <Text style={s.label}>Ödeme notu</Text>
        <TextInput
          style={s.input}
          value={odemeNotu}
          onChangeText={setOdemeNotu}
          placeholder="Havale IBAN / ödeme açıklaması"
          placeholderTextColor="#6B7F93"
        />
        <Text style={s.label}>Kontenjan</Text>
        <TextInput style={s.input} value={kontenjan} onChangeText={setKontenjan} keyboardType="number-pad" placeholderTextColor="#6B7F93" />
        <DateField label="Başlangıç" value={baslangicAt} onChange={setBaslangicAt} />
        <DateField label="Bitiş" value={bitisAt} onChange={setBitisAt} />
        <DateField label="Başvuru bitiş" value={basvuruBitisAt} onChange={setBasvuruBitisAt} />
        <Text style={s.label}>Mekan</Text>
        <TextInput style={s.input} value={mekan} onChangeText={setMekan} placeholderTextColor="#6B7F93" />
        <Text style={s.label}>Online URL</Text>
        <TextInput style={s.input} value={onlineUrl} onChangeText={setOnlineUrl} autoCapitalize="none" placeholderTextColor="#6B7F93" />
        <Pressable
          style={[s.secondaryButton, { marginTop: 8 }]}
          onPress={() =>
            void (async () => {
              const src = await pickImageSource();
              if (!src) return;
              const asset = await launchImagePicker(src);
              if (asset) setKapakUri(asset.uri);
            })()
          }
        >
          <Text style={s.secondaryButtonText}>{kapakUri ? 'Kapak seçildi' : 'Kapak görseli'}</Text>
        </Pressable>
        <SelectField
          label="Durum"
          options={[
            { label: 'Taslak', value: 'taslak' },
            { label: 'Yayında', value: 'yayinda' },
            { label: 'Arşiv', value: 'arsiv' },
          ]}
          value={durum}
          onChange={setDurum}
        />
        <View style={s.switchRow}>
          <Text style={s.switchLabel}>Başvuru açık</Text>
          <Switch value={basvuruAcik} onValueChange={setBasvuruAcik} trackColor={{ true: '#F58A45' }} />
        </View>
        <Text style={[s.sectionTitle, { marginTop: 16 }]}>SEO / etiketler</Text>
        <Text style={s.hint}>Web sayfası başlığı, açıklama ve anahtar kelimeler (virgülle ayırın).</Text>
        <Text style={s.label}>Meta başlık</Text>
        <TextInput style={s.input} value={metaBaslik} onChangeText={setMetaBaslik} placeholderTextColor="#6B7F93" />
        <Text style={s.label}>Meta açıklama</Text>
        <TextInput style={[s.input, s.textArea]} value={metaAciklama} onChangeText={setMetaAciklama} multiline placeholderTextColor="#6B7F93" />
        <Text style={s.label}>Anahtar kelimeler (etiketler)</Text>
        <TextInput
          style={s.input}
          value={metaAnahtar}
          onChangeText={setMetaAnahtar}
          placeholder="implant, cerrahi, webinar"
          placeholderTextColor="#6B7F93"
        />
        <Text style={[s.sectionTitle, { marginTop: 16 }]}>Başvuru form alanları</Text>
        <Text style={s.hint}>Başvuru formunda sorulacak özel alanlar (metin, seçim vb.).</Text>
        {formFields.map((field, idx) => (
          <View key={field.id ?? `new-${idx}`} style={[s.card, { marginTop: 8 }]}>
            <Text style={s.label}>Etiket</Text>
            <TextInput
              style={s.input}
              value={field.etiket}
              onChangeText={(v) =>
                setFormFields((prev) => prev.map((f, i) => (i === idx ? { ...f, etiket: v } : f)))
              }
              placeholderTextColor="#6B7F93"
            />
            <SelectField
              label="Tip"
              options={[
                { label: 'Metin', value: 'text' },
                { label: 'Uzun metin', value: 'textarea' },
                { label: 'Seçim', value: 'select' },
                { label: 'Sayı', value: 'number' },
                { label: 'E-posta', value: 'email' },
                { label: 'Telefon', value: 'tel' },
              ]}
              value={field.tip}
              onChange={(t) =>
                setFormFields((prev) => prev.map((f, i) => (i === idx ? { ...f, tip: t } : f)))
              }
            />
            {field.tip === 'select' ? (
              <>
                <Text style={s.label}>Seçenekler (virgül veya satır)</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={field.secenekler}
                  onChangeText={(v) =>
                    setFormFields((prev) => prev.map((f, i) => (i === idx ? { ...f, secenekler: v } : f)))
                  }
                  multiline
                  placeholderTextColor="#6B7F93"
                />
              </>
            ) : null}
            <Text style={s.label}>Placeholder</Text>
            <TextInput
              style={s.input}
              value={field.placeholder}
              onChangeText={(v) =>
                setFormFields((prev) => prev.map((f, i) => (i === idx ? { ...f, placeholder: v } : f)))
              }
              placeholderTextColor="#6B7F93"
            />
            <View style={s.switchRow}>
              <Text style={s.switchLabel}>Zorunlu</Text>
              <Switch
                value={field.zorunlu_mu}
                onValueChange={(v) =>
                  setFormFields((prev) => prev.map((f, i) => (i === idx ? { ...f, zorunlu_mu: v } : f)))
                }
                trackColor={{ true: '#F58A45' }}
              />
            </View>
            <Pressable
              style={[s.actionBtn, s.actionBtnDanger, { marginTop: 8 }]}
              onPress={() => setFormFields((prev) => prev.filter((_, i) => i !== idx))}
            >
              <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Alanı kaldır</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          style={[s.secondaryButton, { marginTop: 10 }]}
          onPress={() =>
            setFormFields((prev) => [
              ...prev,
              { etiket: '', tip: 'text', zorunlu_mu: false, secenekler: '', placeholder: '' },
            ])
          }
        >
          <Text style={s.secondaryButtonText}>+ Form alani ekle</Text>
        </Pressable>
      </FormModal>
    </ScreenShell>
  );
}

type EducationAppItem = {
  id: number;
  egitim: string | null;
  ad: string;
  soyad: string;
  telefon: string | null;
  e_posta: string | null;
  durum: string;
  odeme_durumu?: string | null;
};

export function EducationAppsScreen({ onBack }: ModuleProps) {
  const [egitimFilter, setEgitimFilter] = useState<number | null>(null);
  const [egitimOptions, setEgitimOptions] = useState<{ id: number; baslik: string }[]>([]);
  const loader = useCallback(async () => {
    const res = await apiGet<EducationAppItem[]>('/doctor/education-applications', {
      egitim_id: egitimFilter || undefined,
    });
    return res.data ?? [];
  }, [egitimFilter]);
  const { items, loading, refreshing, onRefresh, reload } = useModuleList(loader);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [payId, setPayId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState('');

  useEffect(() => {
    void apiGet<any[]>('/doctor/educations')
      .then((r) =>
        setEgitimOptions(
          (r.data ?? []).map((e: any) => ({ id: e.id, baslik: e.baslik || `Eğitim #${e.id}` })),
        ),
      )
      .catch(() => setEgitimOptions([]));
  }, []);

  async function setStatus(id: number, durum: string) {
    setBusyId(id);
    try {
      await apiPost(`/doctor/education-applications/${id}/status`, { durum });
      await reload(false);
    } catch (e) {
      alertError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function markPaid() {
    if (!payId) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Eksik', 'Geçerli tutar girin.');
      return;
    }
    setBusyId(payId);
    try {
      await apiPost(`/doctor/education-applications/${payId}/payment`, {
        odenen_tutar: amount,
        odeme_yontemi: 'nakit',
      });
      setPayId(null);
      setPayAmount('');
      await reload(false);
      Alert.alert('Tamam', 'Ödeme kaydedildi.');
    } catch (e) {
      alertError(e);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScreenShell
      title="Eğitim Başvuruları"
      subtitle="Başvuruları onaylayın veya reddedin."
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {egitimOptions.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
          <SelectField
            label="Eğitim filtresi"
            placeholder="Tümü"
            searchable
            options={[
              { label: 'Tümü', value: 0 },
              ...egitimOptions.map((e) => ({ label: e.baslik, value: e.id })),
            ]}
            value={egitimFilter ?? 0}
            onChange={(v) => setEgitimFilter(v === 0 ? null : v)}
          />
        </ScrollView>
      ) : null}
      {items.length === 0 ? (
        <EmptyState title="Başvuru yok" text="Eğitim başvuruları burada listelenir." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>
                {item.ad} {item.soyad}
              </Text>
              <View style={s.pill}>
                <Text style={s.pillText}>{item.durum}</Text>
              </View>
            </View>
            <Text style={s.cardMeta}>{item.egitim || 'Eğitim'}</Text>
            {item.telefon ? <Text style={s.cardMeta}>{item.telefon}</Text> : null}
            {item.odeme_durumu ? <Text style={s.cardMeta}>Ödeme: {item.odeme_durumu}</Text> : null}
            <View style={s.actions}>
              <Pressable
                style={[s.actionBtn, s.actionBtnSuccess]}
                disabled={busyId === item.id}
                onPress={() => void setStatus(item.id, 'onaylandi')}
              >
                <Text style={[s.actionBtnText, s.actionBtnSuccessText]}>Onayla</Text>
              </Pressable>
              <Pressable
                style={[s.actionBtn, s.actionBtnDanger]}
                disabled={busyId === item.id}
                onPress={() => void setStatus(item.id, 'reddedildi')}
              >
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Reddet</Text>
              </Pressable>
              <Pressable
                style={[s.actionBtn, s.actionBtnMuted]}
                disabled={busyId === item.id}
                onPress={() => void setStatus(item.id, 'beklemede')}
              >
                <Text style={[s.actionBtnText, s.actionBtnMutedText]}>Beklet</Text>
              </Pressable>
              <Pressable
                style={s.actionBtn}
                disabled={busyId === item.id}
                onPress={() => {
                  setPayId(item.id);
                  setPayAmount('');
                }}
              >
                <Text style={s.actionBtnText}>Ödeme</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <FormModal
        visible={payId != null}
        title="Ödeme kaydet"
        onClose={() => setPayId(null)}
        onSubmit={() => void markPaid()}
        submitLabel="Kaydet"
        submitting={busyId === payId}
      >
        <Text style={s.label}>Ödenen tutar (₺)</Text>
        <TextInput
          style={s.input}
          value={payAmount}
          onChangeText={setPayAmount}
          keyboardType="decimal-pad"
          placeholderTextColor="#6B7F93"
        />
      </FormModal>
    </ScreenShell>
  );
}

// â”€â”€ Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ProfileData = {
  ad_soyad: string;
  unvan?: string | null;
  e_posta: string;
  telefon?: string | null;
  adres?: string | null;
  uzmanlik_alani?: string | null;
  profil_resmi?: string | null;
  il_id?: number | null;
  ilce_id?: number | null;
  il?: string | null;
  ilce?: string | null;
  enlem?: number | null;
  boylam?: number | null;
  sosyal?: {
    instagram?: string | null;
    facebook?: string | null;
    twitter?: string | null;
    linkedin?: string | null;
    youtube?: string | null;
    web_sitesi?: string | null;
  };
};

export function ProfileScreen({ onBack, onNavigate, onSignOut }: ModuleProps) {
  const [form, setForm] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);
  const [iller, setIller] = useState<{ id: number; ad: string }[]>([]);
  const [ilceler, setIlceler] = useState<{ id: number; ad: string }[]>([]);
  const [unvanlar, setUnvanlar] = useState<{ id: number; ad: string }[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<ProfileData>('/doctor/profile');
      setForm(res.data ?? null);
      setLocalPhoto(null);
      const meta = await apiGet<{
        iller: { id: number; ad: string }[];
        unvanlar?: { id: number; ad: string }[];
      }>('/doctor/meta');
      setIller(meta.data?.iller ?? []);
      setUnvanlar(meta.data?.unvanlar ?? []);
      if (res.data?.il_id) {
        const ilceRes = await apiGet<{ ilceler: { id: number; ad: string }[] }>('/doctor/meta', {
          il_id: res.data.il_id,
        });
        setIlceler(ilceRes.data?.ilceler ?? []);
      }
    } catch (e) {
      alertError(e, 'Profil yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSelectIl(ilId: number) {
    if (!form) return;
    setForm({ ...form, il_id: ilId, ilce_id: null });
    try {
      const ilceRes = await apiGet<{ ilceler: { id: number; ad: string }[] }>('/doctor/meta', { il_id: ilId });
      setIlceler(ilceRes.data?.ilceler ?? []);
    } catch {
      setIlceler([]);
    }
  }

  async function pickPhoto() {
    try {
      const source = await pickImageSource();
      if (!source) return;
      const asset = await launchImagePicker(source);
      if (asset) setLocalPhoto(asset.uri);
    } catch (e) {
      alertError(e, 'Fotoğraf seçilemedi.');
    }
  }

  async function save() {
    if (!form) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      if (localPhoto) {
        const body = new FormData();
        body.append('ad_soyad', form.ad_soyad);
        if (form.unvan) body.append('unvan', form.unvan);
        if (form.telefon) body.append('telefon', form.telefon);
        if (form.adres) body.append('adres', form.adres);
        if (form.uzmanlik_alani) body.append('uzmanlik_alani', form.uzmanlik_alani);
        if (form.il_id) body.append('il_id', String(form.il_id));
        if (form.ilce_id) body.append('ilce_id', String(form.ilce_id));
        if (form.enlem != null) body.append('enlem', String(form.enlem));
        if (form.boylam != null) body.append('boylam', String(form.boylam));
        body.append('instagram', form.sosyal?.instagram ?? '');
        body.append('facebook', form.sosyal?.facebook ?? '');
        body.append('twitter', form.sosyal?.twitter ?? '');
        body.append('linkedin', form.sosyal?.linkedin ?? '');
        body.append('youtube', form.sosyal?.youtube ?? '');
        body.append('web_sitesi', form.sosyal?.web_sitesi ?? '');
        body.append('profil_resmi', {
          uri: localPhoto,
          name: `profil_${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as unknown as Blob);
        const res = await apiUpload<ProfileData>('/doctor/profile', body, 'PUT');
        if (res.data) setForm(res.data);
      } else {
        const res = await apiPut<ProfileData>('/doctor/profile', {
          ad_soyad: form.ad_soyad,
          unvan: form.unvan ?? null,
          telefon: form.telefon ?? null,
          adres: form.adres ?? null,
          uzmanlik_alani: form.uzmanlik_alani ?? null,
          il_id: form.il_id ?? null,
          ilce_id: form.ilce_id ?? null,
          enlem: form.enlem ?? null,
          boylam: form.boylam ?? null,
          instagram: form.sosyal?.instagram ?? null,
          facebook: form.sosyal?.facebook ?? null,
          twitter: form.sosyal?.twitter ?? null,
          linkedin: form.sosyal?.linkedin ?? null,
          youtube: form.sosyal?.youtube ?? null,
          web_sitesi: form.sosyal?.web_sitesi ?? null,
        });
        if (res.data) setForm(res.data);
      }
      setLocalPhoto(null);
      setMessage('Profil güncellendi.');
    } catch (e) {
      alertError(e, 'Profil kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  const photoUri = localPhoto
    || (form?.profil_resmi
      ? form.profil_resmi.startsWith('http')
        ? form.profil_resmi
        : `${SITE_URL}/storage/${form.profil_resmi.replace(/^storage\//, '')}`
      : null);

  const securityLinks = [
    { icon: 'lock' as const, title: 'Şifre Değiştir', description: 'Hesap güvenliği', screen: 'password' as ScreenId, tint: '#EF4444' },
    { icon: 'lock' as const, title: 'İki Adımlı Doğrulama', description: 'Authenticator 2FA', screen: 'twoFactor' as ScreenId, tint: '#F59E0B' },
    { icon: 'bell' as const, title: 'Bildirimler', description: 'Push bildirimleri', screen: 'notifications' as ScreenId, tint: '#3B82F6' },
  ];
  const membershipLinks = [
    { icon: 'package' as const, title: 'Paket & Abonelik', description: 'Plan ve ödeme', screen: 'packages' as ScreenId, tint: '#EE7D31' },
    { icon: 'referral' as const, title: 'Referans programı', description: 'Davet & ödül', screen: 'referral' as ScreenId, tint: '#8B5CF6' },
  ];
  const publicLinks = [
    { icon: 'document' as const, title: 'Hakkımda', description: 'Biyografi ve branşlar', screen: 'about' as ScreenId, tint: '#10B981' },
    { icon: 'globe' as const, title: 'Web Sitesi', description: 'Domain ve vitrin', screen: 'website' as ScreenId, tint: '#0EA5E9' },
  ];

  return (
    <ProfileChrome onBack={onBack} loading={loading}>
      {form ? (
        <>
          <ProfileHeroCard
            photoUri={photoUri}
            name={[form.unvan, form.ad_soyad].filter(Boolean).join(' ')}
            email={form.e_posta}
            specialty={form.uzmanlik_alani}
            phone={form.telefon}
            onPickPhoto={() => void pickPhoto()}
          />

          <ProfileLinkGroup title="Güvenlik" items={securityLinks} onNavigate={onNavigate} />
          <ProfileLinkGroup title="Abonelik" items={membershipLinks} onNavigate={onNavigate} />
          <ProfileLinkGroup title="Herkese açık" items={publicLinks} onNavigate={onNavigate} />

          <Pressable
            style={[s.secondaryButton, { marginTop: 18, backgroundColor: '#FFFFFF', borderWidth: 0 }]}
            onPress={() => setShowDetails((v) => !v)}
          >
            <Text style={s.secondaryButtonText}>
              {showDetails ? 'Formu gizle' : 'Profil bilgilerini düzenle'}
            </Text>
          </Pressable>

          {showDetails ? (
            <>
          <Text style={[s.label, { marginTop: 16 }]}>Ad Soyad</Text>
          <TextInput
            style={s.input}
            value={form.ad_soyad}
            onChangeText={(v) => setForm({ ...form, ad_soyad: v })}
            placeholderTextColor="#6B7F93"
          />
          {unvanlar.length > 0 ? (
            <SelectField
              label="Unvan"
              placeholder="Unvan seçin…"
              searchable
              options={unvanlar.map((u) => ({ label: u.ad, value: u.ad }))}
              value={form.unvan ?? null}
              onChange={(v) => setForm({ ...form, unvan: v })}
            />
          ) : (
            <>
              <Text style={s.label}>Unvan</Text>
              <TextInput
                style={s.input}
                value={form.unvan ?? ''}
                onChangeText={(v) => setForm({ ...form, unvan: v })}
                placeholder="Örn. Prof. Dr."
                placeholderTextColor="#6B7F93"
              />
            </>
          )}
          {unvanlar.length > 0 ? (
            <Text style={s.hint}>Listede yoksa kaydetmeden önce web yönetiminden unvan eklenebilir; isterseniz serbest metin için listeden en yakınını seçin.</Text>
          ) : null}
          <Text style={s.label}>E-posta</Text>
          <TextInput style={[s.input, { opacity: 0.7 }]} value={form.e_posta} editable={false} />
          <SelectField
            label="İl"
            placeholder="İl seçin…"
            searchable
            options={iller.map((il) => ({ label: il.ad, value: il.id }))}
            value={form.il_id ?? null}
            onChange={(id) => void onSelectIl(id)}
          />
          {ilceler.length > 0 ? (
            <SelectField
              label="İlçe"
              placeholder="İlçe seçin…"
              searchable
              options={ilceler.map((ilce) => ({ label: ilce.ad, value: ilce.id }))}
              value={form.ilce_id ?? null}
              onChange={(id) => setForm({ ...form, ilce_id: id })}
            />
          ) : null}
          <Text style={s.label}>Enlem</Text>
          <TextInput
            style={s.input}
            value={form.enlem != null ? String(form.enlem) : ''}
            onChangeText={(v) => setForm({ ...form, enlem: v ? Number(v) : null })}
            keyboardType="decimal-pad"
            placeholderTextColor="#6B7F93"
          />
          <Text style={s.label}>Boylam</Text>
          <TextInput
            style={s.input}
            value={form.boylam != null ? String(form.boylam) : ''}
            onChangeText={(v) => setForm({ ...form, boylam: v ? Number(v) : null })}
            keyboardType="decimal-pad"
            placeholderTextColor="#6B7F93"
          />
          <Text style={s.label}>Telefon</Text>
          <TextInput
            style={s.input}
            value={form.telefon ?? ''}
            onChangeText={(v) => setForm({ ...form, telefon: v })}
            keyboardType="phone-pad"
            placeholderTextColor="#6B7F93"
          />
          <Text style={s.label}>Adres</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={form.adres ?? ''}
            onChangeText={(v) => setForm({ ...form, adres: v })}
            multiline
            placeholderTextColor="#6B7F93"
          />
          <Text style={s.label}>Uzmanlık alanı</Text>
          <TextInput
            style={s.input}
            value={form.uzmanlik_alani ?? ''}
            onChangeText={(v) => setForm({ ...form, uzmanlik_alani: v })}
            placeholderTextColor="#6B7F93"
          />
          <Text style={s.label}>Instagram</Text>
          <TextInput
            style={s.input}
            value={form.sosyal?.instagram ?? ''}
            onChangeText={(v) =>
              setForm({ ...form, sosyal: { ...form.sosyal, instagram: v } })
            }
            autoCapitalize="none"
            placeholderTextColor="#6B7F93"
          />
          <Text style={s.label}>Facebook</Text>
          <TextInput
            style={s.input}
            value={form.sosyal?.facebook ?? ''}
            onChangeText={(v) =>
              setForm({ ...form, sosyal: { ...form.sosyal, facebook: v } })
            }
            autoCapitalize="none"
            placeholderTextColor="#6B7F93"
          />
          <Text style={s.label}>Twitter / X</Text>
          <TextInput
            style={s.input}
            value={form.sosyal?.twitter ?? ''}
            onChangeText={(v) =>
              setForm({ ...form, sosyal: { ...form.sosyal, twitter: v } })
            }
            autoCapitalize="none"
            placeholderTextColor="#6B7F93"
          />
          <Text style={s.label}>LinkedIn</Text>
          <TextInput
            style={s.input}
            value={form.sosyal?.linkedin ?? ''}
            onChangeText={(v) =>
              setForm({ ...form, sosyal: { ...form.sosyal, linkedin: v } })
            }
            autoCapitalize="none"
            placeholderTextColor="#6B7F93"
          />
          <Text style={s.label}>YouTube</Text>
          <TextInput
            style={s.input}
            value={form.sosyal?.youtube ?? ''}
            onChangeText={(v) =>
              setForm({ ...form, sosyal: { ...form.sosyal, youtube: v } })
            }
            autoCapitalize="none"
            placeholderTextColor="#6B7F93"
          />
          <Text style={s.label}>Web sitesi</Text>
          <TextInput
            style={s.input}
            value={form.sosyal?.web_sitesi ?? ''}
            onChangeText={(v) =>
              setForm({ ...form, sosyal: { ...form.sosyal, web_sitesi: v } })
            }
            autoCapitalize="none"
            placeholderTextColor="#6B7F93"
          />
          {message ? <Text style={s.successText}>{message}</Text> : null}
          <Pressable
            style={[s.primaryButton, { marginTop: 20 }, saving && s.primaryButtonDisabled]}
            onPress={() => void save()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={s.primaryButtonText}>Profili kaydet</Text>
            )}
          </Pressable>
            </>
          ) : null}

          {onSignOut ? (
            <Pressable
              style={[s.menuSignOut, { marginTop: 22, marginBottom: 8 }]}
              onPress={() => {
                Alert.alert('Çıkış yap', 'Hesabınızdan çıkmak istiyor musunuz?', [
                  { text: 'Vazgeç', style: 'cancel' },
                  {
                    text: 'Çıkış yap',
                    style: 'destructive',
                    onPress: () => {
                      void onSignOut();
                    },
                  },
                ]);
              }}
            >
              <Text style={s.menuSignOutText}>Oturumu kapat</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </ProfileChrome>
  );
}

// â”€â”€ Password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function PasswordScreen({ onBack }: ModuleProps) {
  const [mevcut, setMevcut] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifre2, setSifre2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!mevcut || !sifre) {
      setError('Mevcut ve yeni şifre zorunludur.');
      return;
    }
    if (sifre.length < 8) {
      setError('Yeni şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (sifre !== sifre2) {
      setError('Yeni şifreler eşleşmiyor.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await apiPut('/doctor/password', {
        mevcut_sifre: mevcut,
        sifre,
        sifre_confirmation: sifre2,
      });
      setMevcut('');
      setSifre('');
      setSifre2('');
      setMessage('Şifreniz güncellendi.');
    } catch (e) {
      setError(errMessage(e, 'Şifre güncellenemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenShell title="Şifre Değiştir" subtitle="Hesap güvenliğiniz için güçlü bir şifre kullanın." onBack={onBack}>
      <Text style={s.label}>Mevcut şifre</Text>
      <TextInput
        style={s.input}
        value={mevcut}
        onChangeText={setMevcut}
        secureTextEntry
        placeholderTextColor="#6B7F93"
      />
      <Text style={s.label}>Yeni şifre</Text>
      <TextInput
        style={s.input}
        value={sifre}
        onChangeText={setSifre}
        secureTextEntry
        placeholderTextColor="#6B7F93"
      />
      <Text style={s.label}>Yeni şifre (tekrar)</Text>
      <TextInput
        style={s.input}
        value={sifre2}
        onChangeText={setSifre2}
        secureTextEntry
        placeholderTextColor="#6B7F93"
      />
      {error ? <Text style={s.errorText}>{error}</Text> : null}
      {message ? <Text style={s.successText}>{message}</Text> : null}
      <Pressable
        style={[s.primaryButton, { marginTop: 20 }, submitting && s.primaryButtonDisabled]}
        onPress={() => void save()}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={s.primaryButtonText}>Şifreyi güncelle</Text>
        )}
      </Pressable>
    </ScreenShell>
  );
}

// â”€â”€ About â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type BransOption = { id: number; ad: string };

type AboutData = {
  biyografi: string | null;
  mezuniyet: string[];
  klinik_adi: string | null;
  uzmanlik_alani: string | null;
  branslar: BransOption[];
  tum_branslar: BransOption[];
};

export function AboutScreen({ onBack }: ModuleProps) {
  const [data, setData] = useState<AboutData | null>(null);
  const [selectedBrans, setSelectedBrans] = useState<number[]>([]);
  const [mezuniyet, setMezuniyet] = useState<string[]>([]);
  const [mezuniyetDraft, setMezuniyetDraft] = useState('');
  const [biyografi, setBiyografi] = useState('');
  const [klinikAdi, setKlinikAdi] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<AboutData>('/doctor/about');
      if (res.data) {
        setData(res.data);
        setSelectedBrans((res.data.branslar ?? []).map((b) => b.id));
        setMezuniyet(Array.isArray(res.data.mezuniyet) ? res.data.mezuniyet.filter(Boolean) : []);
        setBiyografi(res.data.biyografi ?? '');
        setKlinikAdi(res.data.klinik_adi ?? '');
      }
    } catch (e) {
      alertError(e, 'Hakkımda bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const bransOptions = (data?.tum_branslar ?? []).map((b) => ({
    label: b.ad,
    value: b.id,
  }));

  const selectedBransLabels = (data?.tum_branslar ?? [])
    .filter((b) => selectedBrans.includes(b.id))
    .map((b) => b.ad);

  function addMezuniyet() {
    const v = mezuniyetDraft.trim();
    if (!v) return;
    if (mezuniyet.some((m) => m.toLocaleLowerCase('tr-TR') === v.toLocaleLowerCase('tr-TR'))) {
      Alert.alert('Uyarı', 'Bu mezuniyet zaten listede.');
      return;
    }
    setMezuniyet((prev) => [...prev, v]);
    setMezuniyetDraft('');
  }

  async function save() {
    if (selectedBrans.length < 1) {
      Alert.alert('Uyarı', 'En az bir branş seçmelisiniz.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiPut<AboutData>('/doctor/about', {
        branslar: selectedBrans,
        biyografi: biyografi,
        klinik_adi: klinikAdi.trim() || null,
        mezuniyet: mezuniyet.map((m) => m.trim()).filter(Boolean),
      });
      if (res.data) {
        setData(res.data);
        setSelectedBrans((res.data.branslar ?? []).map((b) => b.id));
        setMezuniyet(Array.isArray(res.data.mezuniyet) ? res.data.mezuniyet.filter(Boolean) : []);
      }
      setMessage('Hakkımda bilgileri güncellendi.');
    } catch (e) {
      alertError(e, 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell title="Hakkımda" subtitle="Biyografi, branş ve mezuniyet." onBack={onBack} loading={loading}>
      <Text style={s.label}>Klinik adı</Text>
      <TextInput
        style={s.input}
        value={klinikAdi}
        onChangeText={setKlinikAdi}
        placeholderTextColor="#6B7F93"
      />
      <RichTextEditor
        label="Biyografi"
        value={biyografi}
        onChange={setBiyografi}
        minHeight={140}
        placeholder="Hakkınızda metni…"
      />

      <Text style={s.sectionTitle}>Mezuniyet</Text>
      <Text style={s.hint}>Okul / program satırları ekleyin (ör. İstanbul Üni. Tıp Fakültesi).</Text>
      {mezuniyet.length === 0 ? (
        <Text style={[s.hint, { marginTop: 6 }]}>Henüz mezuniyet eklenmedi.</Text>
      ) : (
        mezuniyet.map((m, idx) => (
          <View key={`${m}-${idx}`} style={[s.card, { marginTop: 8 }]}>
            <View style={s.cardHeader}>
              <Text style={[s.cardTitle, { flex: 1 }]}>{m}</Text>
              <Pressable
                style={[s.actionBtn, s.actionBtnDanger]}
                onPress={() => setMezuniyet((prev) => prev.filter((_, i) => i !== idx))}
              >
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
      <Text style={s.label}>Yeni mezuniyet</Text>
      <TextInput
        style={s.input}
        value={mezuniyetDraft}
        onChangeText={setMezuniyetDraft}
        placeholder="Üniversite / program"
        placeholderTextColor="#6B7F93"
        onSubmitEditing={addMezuniyet}
      />
      <Pressable style={[s.secondaryButton, { marginTop: 8 }]} onPress={addMezuniyet}>
        <Text style={s.secondaryButtonText}>+ Mezuniyet ekle</Text>
      </Pressable>

      {bransOptions.length === 0 ? (
        <View style={[s.card, { marginTop: 12 }]}>
          <Text style={s.cardTitle}>Branş listesi yok</Text>
          <Text style={s.cardBody}>
            Sistemde tanımlı branş bulunamadı. Yönetim panelinden branş eklenmesi gerekir.
          </Text>
          <Pressable style={[s.secondaryButton, { marginTop: 10 }]} onPress={() => void load()}>
            <Text style={s.secondaryButtonText}>Yenile</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <SelectField
            label="Branşlar"
            placeholder="Branş seçin…"
            multiple
            searchable
            clearable
            options={bransOptions}
            value={selectedBrans}
            onChange={setSelectedBrans}
          />
          <Text style={s.hint}>
            {selectedBrans.length === 0
              ? 'En az bir branş seçmelisiniz.'
              : `Seçili (${selectedBrans.length}): ${selectedBransLabels.join(', ')}`}
          </Text>
        </>
      )}

      {message ? <Text style={s.successText}>{message}</Text> : null}
      <Pressable
        style={[s.primaryButton, { marginTop: 20 }, saving && s.primaryButtonDisabled]}
        onPress={() => void save()}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={s.primaryButtonText}>Kaydet</Text>
        )}
      </Pressable>
    </ScreenShell>
  );
}

// â”€â”€ Website â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type WebsiteData = {
  web_sitesi: string | null;
  platformda_listeleniyor_mu: boolean;
  can_hide_from_platform?: boolean;
  slug: string | null;
  panel_url: string;
  domain?: string | null;
  domain_durum?: string | null;
  api_key?: string | null;
  kurulu_mu?: boolean;
  dns_adimlari?: { adim: number; baslik: string; aciklama: string }[];
  dns_a_record?: string;
  dns_cname_target?: string;
};

export function WebsiteScreen({ onBack }: ModuleProps) {
  const [data, setData] = useState<WebsiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);
  const [secrets, setSecrets] = useState<{ api_key?: string; plain_api_secret?: string; webhook_url?: string } | null>(null);
  const [dnsSteps, setDnsSteps] = useState<{ adim: number; baslik: string; aciklama: string }[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<WebsiteData>('/doctor/website');
      setData(res.data ?? null);
      setDnsSteps(res.data?.dns_adimlari ?? null);
    } catch (e) {
      alertError(e, 'Web sitesi bilgisi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Açılamadı', 'Bağlantı açılamadı.');
    }
  }

  async function setupDomain() {
    if (!domain.trim()) {
      Alert.alert('Eksik', 'Alan adı girin (ör. doktoradi.com).');
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{
        domain: string;
        api_key: string;
        plain_api_secret: string;
        webhook_url: string;
        dns_adimlari?: { adim: number; baslik: string; aciklama: string }[];
      }>('/doctor/website/setup', { domain: domain.trim() });
      setSecrets({
        api_key: res.data?.api_key,
        plain_api_secret: res.data?.plain_api_secret,
        webhook_url: res.data?.webhook_url,
      });
      if (res.data?.dns_adimlari) setDnsSteps(res.data.dns_adimlari);
      await load();
      Alert.alert('Basarili', 'Alan adi kaydedildi. Secret key yalnizca bir kez gosterilir — kopyalayin.');
    } catch (e) {
      alertError(e, 'Kurulum başarısız.');
    } finally {
      setBusy(false);
    }
  }

  async function regenKey() {
    setBusy(true);
    try {
      const res = await apiPost<{ api_key: string; plain_api_secret: string }>('/doctor/website/api-key');
      setSecrets({
        api_key: res.data?.api_key,
        plain_api_secret: res.data?.plain_api_secret,
      });
      await load();
      Alert.alert('Tamam', 'Yeni API anahtarı oluşturuldu. Secret bir kez gösterilir.');
    } catch (e) {
      alertError(e, 'Anahtar yenilenemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function togglePlatform(visible: boolean) {
    setBusy(true);
    try {
      await apiPut('/doctor/website/platform-visibility', { platformda_gorunur: visible });
      await load();
    } catch (e) {
      alertError(e, 'Görünürlük güncellenemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenShell title="Web Sitesi" subtitle="Domain kurulumu, API ve görünürlük." onBack={onBack} loading={loading}>
      {data ? (
        <>
          <View style={s.card}>
            <Text style={s.cardTitle}>Kurulum durumu</Text>
            <Text style={s.cardBody}>{data.kurulu_mu ? `Aktif · ${data.domain}` : 'Henüz domain bağlanmamış'}</Text>
            {data.api_key ? <Text style={s.cardMeta}>API Key: {data.api_key}</Text> : null}
            {data.slug ? <Text style={s.cardMeta}>Slug: {data.slug}</Text> : null}
          </View>

          {!data.kurulu_mu ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Domain kur</Text>
              <Text style={s.hint}>Örn: doktoradi.com (https:// olmadan)</Text>
              <Text style={s.label}>Alan adı</Text>
              <TextInput style={s.input} value={domain} onChangeText={setDomain} autoCapitalize="none" placeholder="klinigim.com" placeholderTextColor="#6B7F93" />
              <Pressable style={[s.primaryButton, { marginTop: 14 }, busy && s.primaryButtonDisabled]} disabled={busy} onPress={() => void setupDomain()}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryButtonText}>Kurulumu tamamla</Text>}
              </Pressable>
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.cardTitle}>API anahtarı</Text>
              <Pressable style={[s.secondaryButton, { marginTop: 10 }]} disabled={busy} onPress={() => void regenKey()}>
                <Text style={s.secondaryButtonText}>Yeni API key üret</Text>
              </Pressable>
            </View>
          )}

          {data.can_hide_from_platform ? (
            <View style={s.card}>
              <View style={s.switchRow}>
                <Text style={s.switchLabel}>Platformda listelen</Text>
                <Switch
                  value={!!data.platformda_listeleniyor_mu}
                  onValueChange={(v) => void togglePlatform(v)}
                  trackColor={{ true: '#F58A45' }}
                  disabled={busy}
                />
              </View>
              <Text style={s.hint}>Kapalıysa ana site arama sonuçlarında görünmezsiniz.</Text>
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.cardTitle}>Platform görünürlüğü</Text>
              <Text style={s.cardBody}>
                {data.platformda_listeleniyor_mu ? 'Listeleniyor' : 'Gizli'} (özel web sitesi paketinde gizlenebilir)
              </Text>
            </View>
          )}

          {secrets ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Gizli bilgiler (bir kez)</Text>
              {secrets.api_key ? (
                <Text style={s.cardBody} selectable>
                  API Key: {secrets.api_key}
                </Text>
              ) : null}
              {secrets.plain_api_secret ? (
                <Text style={s.cardBody} selectable>
                  Secret: {secrets.plain_api_secret}
                </Text>
              ) : null}
              {secrets.webhook_url ? (
                <Text style={s.cardMeta} selectable>
                  Webhook: {secrets.webhook_url}
                </Text>
              ) : null}
            </View>
          ) : null}

          <DnsStepsCard steps={dnsSteps} />

          {data.domain || data.web_sitesi ? (
            <Pressable
              style={[s.primaryButton, { marginTop: 14 }]}
              onPress={() => {
                const host = data.domain || data.web_sitesi || '';
                void openUrl(host.startsWith('http') ? host : `https://${host}`);
              }}
            >
              <Text style={s.primaryButtonText}>Yayınlanan sitemi aç</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </ScreenShell>
  );
}

// â”€â”€ Two-factor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function TwoFactorScreen({ onBack }: ModuleProps) {
  const [status, setStatus] = useState<{ enabled: boolean; recovery_codes_count?: number } | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr_image_url: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ enabled: boolean; recovery_codes_count?: number }>('/doctor/two-factor');
      setStatus(res.data ?? null);
    } catch (e) {
      Alert.alert('Hata', errMessage(e, '2FA durumu yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function beginSetup() {
    setBusy(true);
    try {
      const res = await apiPost<{ secret: string; qr_image_url: string }>('/doctor/two-factor/setup');
      setSetup(res.data ?? null);
      setCode('');
      setRecoveryCodes(null);
    } catch (e) {
      Alert.alert('Hata', errMessage(e, 'Kurulum başlatılamadı.'));
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup() {
    if (code.trim().length < 6) {
      Alert.alert('Eksik', 'Authenticator kodunu girin.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{ recovery_codes: string[] }>('/doctor/two-factor/confirm', { code: code.trim() });
      setRecoveryCodes(res.data?.recovery_codes ?? []);
      setSetup(null);
      setCode('');
      await load();
      Alert.alert('Başarılı', 'İki adımlı doğrulama açıldı. Yedek kodları kaydedin.');
    } catch (e) {
      Alert.alert('Hata', errMessage(e, 'Kod doğrulanamadı.'));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!password || code.trim().length < 6) {
      Alert.alert('Eksik', 'Şifre ve doğrulama kodu gerekli.');
      return;
    }
    setBusy(true);
    try {
      await apiPost('/doctor/two-factor/disable', { sifre: password, code: code.trim() });
      setPassword('');
      setCode('');
      setRecoveryCodes(null);
      await load();
      Alert.alert('Tamam', '2FA kapatıldı.');
    } catch (e) {
      Alert.alert('Hata', errMessage(e, 'Kapatılamadı.'));
    } finally {
      setBusy(false);
    }
  }

  async function regenRecovery() {
    if (code.trim().length < 6) {
      Alert.alert('Eksik', 'Authenticator kodu gerekli.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{ recovery_codes: string[] }>('/doctor/two-factor/recovery', { code: code.trim() });
      setRecoveryCodes(res.data?.recovery_codes ?? []);
      setCode('');
      await load();
    } catch (e) {
      Alert.alert('Hata', errMessage(e, 'Yedek kodlar yenilenemedi.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenShell title="İki Adımlı Doğrulama" subtitle="Authenticator ile hesap güvenliği" onBack={onBack} loading={loading}>
      {status ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>{status.enabled ? '2FA açık' : '2FA kapalı'}</Text>
          <Text style={s.cardBody}>
            {status.enabled
              ? `Yedek kod sayısı: ${status.recovery_codes_count ?? 0}`
              : 'Hesabınızı authenticator uygulaması ile koruyun.'}
          </Text>
        </View>
      ) : null}

      {!status?.enabled && !setup ? (
        <Pressable style={[s.primaryButton, { marginTop: 16 }, busy && s.primaryButtonDisabled]} disabled={busy} onPress={() => void beginSetup()}>
          <Text style={s.primaryButtonText}>2FA kurulumuna başla</Text>
        </Pressable>
      ) : null}

      {setup ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>Authenticator kurulumu</Text>
          <Text style={s.hint}>QR kodu Google Authenticator / Authy ile tarayın veya gizli anahtarı elle girin.</Text>
          {setup.qr_image_url ? (
            <Image source={{ uri: setup.qr_image_url }} style={{ width: 180, height: 180, alignSelf: 'center', marginTop: 14, borderRadius: 12 }} />
          ) : null}
          <Text style={s.label}>Gizli anahtar</Text>
          <Text style={s.cardBody} selectable>
            {setup.secret}
          </Text>
          <Text style={s.label}>6 haneli kod</Text>
          <TextInput style={s.input} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={12} placeholder="123456" placeholderTextColor="#6B7F93" />
          <Pressable style={[s.primaryButton, { marginTop: 14 }, busy && s.primaryButtonDisabled]} disabled={busy} onPress={() => void confirmSetup()}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryButtonText}>Doğrula ve aç</Text>}
          </Pressable>
        </View>
      ) : null}

      {status?.enabled ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>Yönetim</Text>
          <Text style={s.label}>Authenticator / yedek kod</Text>
          <TextInput style={s.input} value={code} onChangeText={setCode} placeholder="Kod" placeholderTextColor="#6B7F93" />
          <Pressable style={[s.secondaryButton, { marginTop: 12 }]} disabled={busy} onPress={() => void regenRecovery()}>
            <Text style={s.secondaryButtonText}>Yedek kodları yenile</Text>
          </Pressable>
          <Text style={s.label}>Şifre (kapatmak için)</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry />
          <Pressable style={[s.actionBtn, s.actionBtnDanger, { marginTop: 12 }]} disabled={busy} onPress={() => void disable()}>
            <Text style={[s.actionBtnText, s.actionBtnDangerText]}>2FA kapat</Text>
          </Pressable>
        </View>
      ) : null}

      {recoveryCodes && recoveryCodes.length > 0 ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>Yedek kodlar (bir kez gösterilir)</Text>
          {recoveryCodes.map((c) => (
            <Text key={c} style={s.cardBody} selectable>
              {c}
            </Text>
          ))}
        </View>
      ) : null}
    </ScreenShell>
  );
}

// â”€â”€ Clinic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ClinicTab =
  | 'bilgi'
  | 'duyuru'
  | 'hastalar'
  | 'hekimler'
  | 'personel'
  | 'talepler'
  | 'takvim'
  | 'giderler'
  | 'finans'
  | 'hakedis'
  | 'rapor'
  | 'saatler'
  | 'ayarlar'
  | 'website';

export function ClinicScreen({ onBack }: ModuleProps) {
  const [data, setData] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctorsPack, setDoctorsPack] = useState<{ doktorlar: any[]; davetiyeler: any[] }>({ doktorlar: [], davetiyeler: [] });
  const [staff, setStaff] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedReq, setSelectedReq] = useState<number[]>([]);
  const [clinicAppts, setClinicAppts] = useState<any[]>([]);
  const [clinicExpenses, setClinicExpenses] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [settlementDoctors, setSettlementDoctors] = useState<{ id: number; ad_soyad: string }[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [website, setWebsite] = useState<any>(null);
  const [websiteSecret, setWebsiteSecret] = useState<string | null>(null);
  const [tab, setTab] = useState<ClinicTab>('bilgi');
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [staffForm, setStaffForm] = useState({ ad_soyad: '', e_posta: '', telefon: '', sifre: '', rol: 'sekreter' });
  const [editStaffId, setEditStaffId] = useState<number | null>(null);
  const [editStaffForm, setEditStaffForm] = useState({
    ad_soyad: '',
    e_posta: '',
    telefon: '',
    sifre: '',
    rol: 'sekreter' as string,
  });
  const [expForm, setExpForm] = useState({ tutar: '', tarih: '', kategori: 'diger', aciklama: '' });
  const [editExpId, setEditExpId] = useState<number | null>(null);
  const [expFilterBas, setExpFilterBas] = useState(todayKey().slice(0, 8) + '01');
  const [expFilterBit, setExpFilterBit] = useState(todayKey());
  const [expTotal, setExpTotal] = useState(0);
  const [patientNoteId, setPatientNoteId] = useState<number | null>(null);
  const [patientNoteText, setPatientNoteText] = useState('');
  const [settleForm, setSettleForm] = useState({
    doktor_id: '',
    donem_baslangic: '',
    donem_bitis: '',
    komisyon_orani: '20',
  });
  const [reportRange, setReportRange] = useState({
    baslangic: todayKey().slice(0, 8) + '01',
    bitis: todayKey(),
  });
  const [annForm, setAnnForm] = useState({ baslik: '', icerik: '', onem_derecesi: 'genel' as 'genel' | 'onemli' | 'acil' });
  const [domainInput, setDomainInput] = useState('');
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('09:00');
  const [busy, setBusy] = useState(false);
  const [clinicFinance, setClinicFinance] = useState<any>(null);
  const [doctorsHours, setDoctorsHours] = useState<any[]>([]);
  const [patientDetail, setPatientDetail] = useState<any>(null);
  const [annEditId, setAnnEditId] = useState<number | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);

  const isOwner = !!data?.sahip_mi;

  const defaultClinicHours = useMemo(
    () => ({
      pazartesi: { acilis: '09:00', kapanis: '18:00', kapali: false },
      sali: { acilis: '09:00', kapanis: '18:00', kapali: false },
      carsamba: { acilis: '09:00', kapanis: '18:00', kapali: false },
      persembe: { acilis: '09:00', kapanis: '18:00', kapali: false },
      cuma: { acilis: '09:00', kapanis: '18:00', kapali: false },
      cumartesi: { acilis: '09:00', kapanis: '13:00', kapali: false },
      pazar: { acilis: '09:00', kapanis: '18:00', kapali: true },
    }),
    [],
  );

  const gunLabels: Record<string, string> = {
    pazartesi: 'Pazartesi',
    sali: 'Salı',
    carsamba: 'Çarşamba',
    persembe: 'Perşembe',
    cuma: 'Cuma',
    cumartesi: 'Cumartesi',
    pazar: 'Pazar',
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<any>('/doctor/clinic');
      setData(res.data);
      if (res.data?.uye_mi) {
        const [a, p] = await Promise.all([
          apiGet<any[]>('/doctor/clinic/announcements'),
          apiGet<any[]>('/doctor/clinic/patients'),
        ]);
        setAnnouncements(a.data ?? []);
        setPatients(p.data ?? []);
      }
    } catch (e) {
      Alert.alert('Hata', errMessage(e, 'Klinik bilgisi yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.uye_mi) return;
    void (async () => {
      try {
        if (tab === 'hekimler') {
          const res = await apiGet<any>('/doctor/clinic/doctors');
          setDoctorsPack({
            doktorlar: res.data?.doktorlar ?? [],
            davetiyeler: res.data?.davetiyeler ?? [],
          });
        } else if (tab === 'personel') {
          const res = await apiGet<any[]>('/doctor/clinic/staff');
          setStaff(res.data ?? []);
        } else if (tab === 'talepler') {
          const res = await apiGet<any[]>('/doctor/clinic/requests');
          setRequests(res.data ?? []);
          setSelectedReq([]);
        } else if (tab === 'takvim') {
          const res = await apiGet<any>('/doctor/clinic/calendar');
          setClinicAppts(res.data?.appointments ?? []);
        } else if (tab === 'giderler') {
          const res = await apiGet<any[]>('/doctor/clinic/expenses', {
            baslangic: expFilterBas || undefined,
            bitis: expFilterBit || undefined,
          });
          setClinicExpenses(res.data ?? []);
          setExpTotal(Number((res.meta as any)?.toplam_tutar ?? 0));
        } else if (tab === 'hastalar') {
          const res = await apiGet<any[]>('/doctor/clinic/patients', q.trim() ? { q: q.trim() } : undefined);
          setPatients(res.data ?? []);
        } else if (tab === 'duyuru') {
          if (isOwner) {
            const res = await apiGet<any[]>('/doctor/clinic/announcements/admin');
            setAnnouncements(res.data ?? []);
          } else {
            const res = await apiGet<any[]>('/doctor/clinic/announcements');
            setAnnouncements(res.data ?? []);
          }
        } else if (tab === 'hakedis' && isOwner) {
          const res = await apiGet<any>('/doctor/clinic/settlements');
          setSettlements(res.data?.items ?? []);
          setSettlementDoctors(res.data?.doktorlar ?? []);
          if (!settleForm.doktor_id && res.data?.doktorlar?.[0]) {
            setSettleForm((f) => ({ ...f, doktor_id: String(res.data.doktorlar[0].id) }));
          }
        } else if (tab === 'finans' && isOwner) {
          const res = await apiGet<any>('/doctor/clinic/finance/overview');
          setClinicFinance(res.data);
        } else if (tab === 'saatler') {
          const res = await apiGet<any[]>('/doctor/clinic/doctors/working-hours');
          setDoctorsHours(res.data ?? []);
        } else if (tab === 'rapor' && isOwner) {
          const res = await apiGet<any>('/doctor/clinic/reports', reportRange);
          setReports(res.data);
        } else if (tab === 'ayarlar' && isOwner) {
          const res = await apiGet<any>('/doctor/clinic/settings');
          const raw = res.data ?? {};
          setSettings({
            ...raw,
            calisma_saatleri: raw.calisma_saatleri || defaultClinicHours,
          });
        } else if (tab === 'website' && isOwner) {
          const res = await apiGet<any>('/doctor/clinic/website');
          setWebsite(res.data);
        }
      } catch (e) {
        if (tab !== 'hastalar') alertError(e);
      }
    })();
  }, [tab, data?.uye_mi, isOwner]);

  useEffect(() => {
    if (!data?.uye_mi || tab !== 'hastalar') return;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await apiGet<any[]>('/doctor/clinic/patients', q.trim() ? { q: q.trim() } : undefined);
          setPatients(res.data ?? []);
        } catch {
          //
        }
      })();
    }, 300);
    return () => clearTimeout(t);
  }, [q, tab, data?.uye_mi]);

  async function leaveClinic() {
    Alert.alert('Klinikten ayrıl', 'Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Ayrıl',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiPost('/doctor/clinic/leave');
              await load();
              Alert.alert('Tamam', 'Klinikten ayrıldınız.');
            } catch (e) {
              alertError(e);
            }
          })();
        },
      },
    ]);
  }

  async function invite() {
    if (!inviteEmail.trim()) return;
    setBusy(true);
    try {
      await apiPost('/doctor/clinic/doctors/invite', { e_posta: inviteEmail.trim() });
      setInviteEmail('');
      const res = await apiGet<any>('/doctor/clinic/doctors');
      setDoctorsPack({ doktorlar: res.data?.doktorlar ?? [], davetiyeler: res.data?.davetiyeler ?? [] });
      Alert.alert('Tamam', 'Davetiye gönderildi.');
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  async function addStaff() {
    setBusy(true);
    try {
      await apiPost('/doctor/clinic/staff', staffForm);
      setStaffForm({ ad_soyad: '', e_posta: '', telefon: '', sifre: '', rol: 'sekreter' });
      const res = await apiGet<any[]>('/doctor/clinic/staff');
      setStaff(res.data ?? []);
      Alert.alert('Tamam', 'Personel eklendi.');
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  async function saveEditStaff() {
    if (!editStaffId) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        ad_soyad: editStaffForm.ad_soyad.trim(),
        e_posta: editStaffForm.e_posta.trim(),
        telefon: editStaffForm.telefon.trim() || null,
        rol: editStaffForm.rol,
      };
      if (editStaffForm.sifre.trim()) {
        body.sifre = editStaffForm.sifre.trim();
      }
      await apiPut(`/doctor/clinic/staff/${editStaffId}`, body);
      setEditStaffId(null);
      const res = await apiGet<any[]>('/doctor/clinic/staff');
      setStaff(res.data ?? []);
      Alert.alert('Tamam', 'Personel güncellendi.');
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  async function bulk(action: 'approve' | 'reject') {
    if (selectedReq.length === 0) {
      Alert.alert('Seçim yok', 'En az bir talep seçin.');
      return;
    }
    setBusy(true);
    try {
      const path = action === 'approve' ? '/doctor/clinic/requests/bulk-approve' : '/doctor/clinic/requests/bulk-reject';
      await apiPost(path, { ids: selectedReq });
      const res = await apiGet<any[]>('/doctor/clinic/requests');
      setRequests(res.data ?? []);
      setSelectedReq([]);
      Alert.alert('Tamam', action === 'approve' ? 'Talepler onaylandı.' : 'Talepler reddedildi.');
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  async function loadClinicExpenses() {
    try {
      const res = await apiGet<any[]>('/doctor/clinic/expenses', {
        baslangic: expFilterBas || undefined,
        bitis: expFilterBit || undefined,
      });
      setClinicExpenses(res.data ?? []);
      setExpTotal(Number((res.meta as any)?.toplam_tutar ?? 0));
    } catch (e) {
      alertError(e);
    }
  }

  async function addExpense() {
    setBusy(true);
    const wasEdit = editExpId != null;
    try {
      const body = {
        tutar: Number(expForm.tutar),
        tarih: expForm.tarih,
        kategori: expForm.kategori,
        aciklama: expForm.aciklama || null,
      };
      if (editExpId) {
        await apiPut(`/doctor/clinic/expenses/${editExpId}`, body);
      } else {
        await apiPost('/doctor/clinic/expenses', body);
      }
      setExpForm({ tutar: '', tarih: todayKey(), kategori: 'diger', aciklama: '' });
      setEditExpId(null);
      await loadClinicExpenses();
      Alert.alert('Tamam', wasEdit ? 'Gider güncellendi.' : 'Gider eklendi.');
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  async function clinicApptStatus(id: number, durum: string) {
    setBusy(true);
    try {
      await apiPost(`/doctor/clinic/appointments/${id}/status`, { durum });
      const res = await apiGet<any>('/doctor/clinic/calendar');
      setClinicAppts(res.data?.appointments ?? []);
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  async function clinicApptReschedule() {
    if (!rescheduleId) return;
    setBusy(true);
    try {
      await apiPost(`/doctor/clinic/appointments/${rescheduleId}/reschedule`, {
        tarih: rescheduleDate,
        saat: rescheduleTime,
      });
      setRescheduleId(null);
      const res = await apiGet<any>('/doctor/clinic/calendar');
      setClinicAppts(res.data?.appointments ?? []);
      Alert.alert('Tamam', 'Randevu ertelendi.');
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  async function saveSettlement() {
    if (!settleForm.doktor_id || !settleForm.donem_baslangic || !settleForm.donem_bitis) {
      Alert.alert('Eksik', 'Hekim ve dönem alanlarını doldurun.');
      return;
    }
    setBusy(true);
    try {
      await apiPost('/doctor/clinic/settlements', {
        doktor_id: Number(settleForm.doktor_id),
        donem_baslangic: settleForm.donem_baslangic,
        donem_bitis: settleForm.donem_bitis,
        komisyon_orani: Number(settleForm.komisyon_orani) || 0,
      });
      const res = await apiGet<any>('/doctor/clinic/settlements');
      setSettlements(res.data?.items ?? []);
      Alert.alert('Tamam', 'Hakediş hesaplandı.');
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setBusy(true);
    try {
      await apiPut('/doctor/clinic/settings', {
        ad: settings.ad,
        telefon: settings.telefon,
        e_posta: settings.e_posta,
        adres: settings.adres,
        aciklama: settings.aciklama,
        meta_baslik: settings.meta_baslik,
        meta_aciklama: settings.meta_aciklama,
        calisma_saatleri: settings.calisma_saatleri,
      });
      Alert.alert('Tamam', 'Klinik ayarları kaydedildi.');
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  async function saveAnnouncement() {
    if (!annForm.baslik.trim() || !annForm.icerik.trim()) {
      Alert.alert('Eksik', 'Başlık ve içerik zorunlu.');
      return;
    }
    setBusy(true);
    try {
      if (annEditId) {
        await apiPut(`/doctor/clinic/announcements/${annEditId}`, annForm);
      } else {
        await apiPost('/doctor/clinic/announcements', annForm);
      }
      setAnnForm({ baslik: '', icerik: '', onem_derecesi: 'genel' });
      setAnnEditId(null);
      const res = await apiGet<any[]>('/doctor/clinic/announcements/admin');
      setAnnouncements(res.data ?? []);
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  async function setupClinicWebsite() {
    if (!domainInput.trim()) return;
    setBusy(true);
    try {
      const res = await apiPost<{ domain: string; api_key: string; plain_api_secret: string }>(
        '/doctor/clinic/website/setup',
        { domain: domainInput.trim() },
      );
      setWebsiteSecret(res.data?.plain_api_secret ?? null);
      const w = await apiGet<any>('/doctor/clinic/website');
      setWebsite(w.data);
      Alert.alert('Tamam', 'Domain kaydedildi. Secret keyi kaydedin.');
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  const tabs: { key: ClinicTab; label: string; ownerOnly?: boolean }[] = [
    { key: 'bilgi', label: 'Özet' },
    { key: 'talepler', label: 'Talepler' },
    { key: 'takvim', label: 'Takvim' },
    { key: 'hekimler', label: 'Hekimler' },
    { key: 'saatler', label: 'Mesai' },
    { key: 'personel', label: 'Personel', ownerOnly: true },
    { key: 'hastalar', label: 'Hastalar' },
    { key: 'duyuru', label: 'Duyuru' },
    { key: 'finans', label: 'Finans', ownerOnly: true },
    { key: 'giderler', label: 'Gider', ownerOnly: true },
    { key: 'hakedis', label: 'Hakediş', ownerOnly: true },
    { key: 'rapor', label: 'Rapor', ownerOnly: true },
    { key: 'ayarlar', label: 'Ayarlar', ownerOnly: true },
    { key: 'website', label: 'Web', ownerOnly: true },
  ];

  async function openClinicPatient(id: number) {
    setBusy(true);
    try {
      const res = await apiGet<any>(`/doctor/clinic/patients/${id}`);
      setPatientDetail(res.data);
    } catch (e) {
      alertError(e, 'Hasta detayı yüklenemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadClinicLogo() {
    const source = await pickImageSource();
    if (!source) return;
    const asset = await launchImagePicker(source);
    if (!asset?.uri) return;
    setLogoBusy(true);
    try {
      const form = new FormData();
      form.append('logo', {
        uri: asset.uri,
        name: `logo_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      } as any);
      const res = await apiUpload<{ logo: string; logo_url: string }>('/doctor/clinic/settings/logo', form);
      setSettings((prev: any) => (prev ? { ...prev, logo: res.data?.logo, logo_url: res.data?.logo_url } : prev));
      Alert.alert('Tamam', 'Klinik logosu güncellendi.');
    } catch (e) {
      alertError(e, 'Logo yüklenemedi.');
    } finally {
      setLogoBusy(false);
    }
  }

  async function shareClinicPdf() {
    try {
      const res = await apiGet<{ filename: string; pdf_base64: string }>('/doctor/clinic/reports.pdf', {
        ...reportRange,
        base64: 1,
      });
      const b64 = res.data?.pdf_base64;
      const filename = res.data?.filename || 'klinik-raporu.pdf';
      if (!b64) {
        Alert.alert('Hata', 'PDF içeriği alınamadı.');
        return;
      }
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const a = document.createElement('a');
        a.href = `data:application/pdf;base64,${b64}`;
        a.download = filename;
        a.click();
        return;
      }
      await Share.share({
        title: filename,
        message: Platform.OS === 'android' ? `${filename} hazır (${Math.round(b64.length / 1024)} KB).` : filename,
        url: `data:application/pdf;base64,${b64}`,
      });
    } catch (e) {
      alertError(e, 'PDF alınamadı.');
    }
  }

  return (
    <ScreenShell title="Klinik" subtitle="Ekip, talepler ve yönetim" onBack={onBack} loading={loading}>
      {!data?.uye_mi ? (
        <EmptyState title="Klinik üyeliği yok" text="Bir kliniğe bağlı değilsiniz." />
      ) : (
        <>
          <SelectField
            label="Klinik bölümü"
            placeholder="Bölüm seçin…"
            searchable
            options={tabs
              .filter((t) => !t.ownerOnly || isOwner)
              .map((t) => ({ label: t.label, value: t.key }))}
            value={tab}
            onChange={setTab}
          />

          {tab === 'bilgi' ? (
            <>
              <View style={s.card}>
                <Text style={s.cardTitle}>{data.klinik?.ad}</Text>
                <Text style={s.cardMeta}>Rol: {data.rol || 'üye'}{isOwner ? ' · sahip' : ''}</Text>
                {data.klinik?.telefon ? <Text style={s.cardBody}>{data.klinik.telefon}</Text> : null}
                {data.klinik?.adres ? <Text style={s.cardBody}>{data.klinik.adres}</Text> : null}
              </View>
              <View style={s.statGrid}>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{data.stats?.doktor_sayisi ?? 0}</Text>
                  <Text style={s.statLabel}>Hekim</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{data.stats?.personel_sayisi ?? 0}</Text>
                  <Text style={s.statLabel}>Personel</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{data.stats?.hasta_sayisi ?? 0}</Text>
                  <Text style={s.statLabel}>Hasta</Text>
                </View>
              </View>
              {!isOwner ? (
                <Pressable style={[s.menuSignOut, { marginTop: 20 }]} onPress={() => void leaveClinic()}>
                  <Text style={s.menuSignOutText}>Klinikten ayrıl</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {tab === 'hekimler' ? (
            <>
              {isOwner ? (
                <View style={s.card}>
                  <Text style={s.cardTitle}>Hekim davet et</Text>
                  <TextInput style={s.input} value={inviteEmail} onChangeText={setInviteEmail} autoCapitalize="none" placeholder="hekim@ornek.com" placeholderTextColor="#6B7F93" />
                  <Pressable style={[s.primaryButton, { marginTop: 12 }, busy && s.primaryButtonDisabled]} disabled={busy} onPress={() => void invite()}>
                    <Text style={s.primaryButtonText}>Davetiye gönder</Text>
                  </Pressable>
                </View>
              ) : null}
              {doctorsPack.davetiyeler.map((i) => (
                <View key={i.id} style={s.card}>
                  <Text style={s.cardTitle}>{i.e_posta}</Text>
                  <Text style={s.cardMeta}>Bekleyen davet · {i.son_kullanma}</Text>
                  {isOwner ? (
                    <Pressable
                      style={[s.actionBtn, s.actionBtnDanger, { marginTop: 10 }]}
                      onPress={() =>
                        void (async () => {
                          try {
                            await apiDelete(`/doctor/clinic/invites/${i.id}`);
                            setDoctorsPack((p) => ({ ...p, davetiyeler: p.davetiyeler.filter((x) => x.id !== i.id) }));
                          } catch (e) {
                            alertError(e);
                          }
                        })()
                      }
                    >
                      <Text style={[s.actionBtnText, s.actionBtnDangerText]}>İptal</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {doctorsPack.doktorlar.map((d) => (
                <View key={d.id} style={s.card}>
                  <Text style={s.cardTitle}>{[d.unvan, d.ad_soyad].filter(Boolean).join(' ')}</Text>
                  <Text style={s.cardMeta}>{d.e_posta} · {d.rol || 'üye'}</Text>
                  <Text style={s.cardMeta}>{d.klinik_aktif_mi === false ? 'Klinikte pasif' : 'Aktif'}</Text>
                  {Array.isArray(d.calisma_saatleri) && d.calisma_saatleri.length > 0 ? (
                    <Text style={s.cardBody}>
                      Saatler:{' '}
                      {d.calisma_saatleri
                        .filter((cs: any) => cs.aktif_mi)
                        .map((cs: any) => `G${cs.gun} ${cs.mesai_baslangic}-${cs.mesai_bitis}`)
                        .join(' · ') || 'Kapalı günler'}
                    </Text>
                  ) : null}
                  {isOwner ? (
                    <View style={s.actions}>
                      <Pressable
                        style={s.actionBtn}
                        onPress={() =>
                          void (async () => {
                            try {
                              await apiPost(`/doctor/clinic/doctors/${d.id}/toggle`);
                              const res = await apiGet<any>('/doctor/clinic/doctors');
                              setDoctorsPack({ doktorlar: res.data?.doktorlar ?? [], davetiyeler: res.data?.davetiyeler ?? [] });
                            } catch (e) {
                              alertError(e);
                            }
                          })()
                        }
                      >
                        <Text style={s.actionBtnText}>Durum</Text>
                      </Pressable>
                      <Pressable
                        style={s.actionBtn}
                        onPress={() => {
                          Alert.alert('Hekim rolü', 'Rol seçin', [
                            {
                              text: 'Doktor',
                              onPress: () =>
                                void apiPut(`/doctor/clinic/doctors/${d.id}`, {
                                  klinik_rolu: 'doktor',
                                  komisyon_orani: Number(d.komisyon_orani) || 0,
                                })
                                  .then(() => apiGet<any>('/doctor/clinic/doctors'))
                                  .then((res) =>
                                    setDoctorsPack({
                                      doktorlar: res.data?.doktorlar ?? [],
                                      davetiyeler: res.data?.davetiyeler ?? [],
                                    }),
                                  )
                                  .catch(alertError),
                            },
                            {
                              text: 'Ortak',
                              onPress: () =>
                                void apiPut(`/doctor/clinic/doctors/${d.id}`, {
                                  klinik_rolu: 'ortak',
                                  komisyon_orani: Number(d.komisyon_orani) || 20,
                                })
                                  .then(() => apiGet<any>('/doctor/clinic/doctors'))
                                  .then((res) =>
                                    setDoctorsPack({
                                      doktorlar: res.data?.doktorlar ?? [],
                                      davetiyeler: res.data?.davetiyeler ?? [],
                                    }),
                                  )
                                  .catch(alertError),
                            },
                            { text: 'Vazgeç', style: 'cancel' },
                          ]);
                        }}
                      >
                        <Text style={s.actionBtnText}>Rol</Text>
                      </Pressable>
                      <Pressable
                        style={[s.actionBtn, s.actionBtnDanger]}
                        onPress={() =>
                          void (async () => {
                            try {
                              await apiPost(`/doctor/clinic/doctors/${d.id}/remove`);
                              setDoctorsPack((p) => ({ ...p, doktorlar: p.doktorlar.filter((x) => x.id !== d.id) }));
                            } catch (e) {
                              alertError(e);
                            }
                          })()
                        }
                      >
                        <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Çıkar</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))}
            </>
          ) : null}

          {tab === 'personel' && isOwner ? (
            <>
              <View style={s.card}>
                <Text style={s.cardTitle}>Personel ekle</Text>
                <Text style={s.label}>Ad Soyad</Text>
                <TextInput style={s.input} value={staffForm.ad_soyad} onChangeText={(v) => setStaffForm({ ...staffForm, ad_soyad: v })} />
                <Text style={s.label}>E-posta</Text>
                <TextInput style={s.input} value={staffForm.e_posta} onChangeText={(v) => setStaffForm({ ...staffForm, e_posta: v })} autoCapitalize="none" />
                <Text style={s.label}>Telefon</Text>
                <TextInput style={s.input} value={staffForm.telefon} onChangeText={(v) => setStaffForm({ ...staffForm, telefon: v })} />
                <Text style={s.label}>Şifre</Text>
                <TextInput style={s.input} value={staffForm.sifre} onChangeText={(v) => setStaffForm({ ...staffForm, sifre: v })} secureTextEntry />
                <SelectField
                  label="Rol"
                  options={[
                    { label: 'Sekreter', value: 'sekreter' },
                    { label: 'Muhasebeci', value: 'muhasebeci' },
                    { label: 'Resepsiyonist', value: 'resepsiyonist' },
                  ]}
                  value={staffForm.rol}
                  onChange={(r) => setStaffForm({ ...staffForm, rol: r })}
                />
                <Pressable style={[s.primaryButton, { marginTop: 12 }, busy && s.primaryButtonDisabled]} disabled={busy} onPress={() => void addStaff()}>
                  <Text style={s.primaryButtonText}>Kaydet</Text>
                </Pressable>
              </View>
              {editStaffId != null ? (
                <View style={s.card}>
                  <Text style={s.cardTitle}>Personel duzenle</Text>
                  <Text style={s.label}>Ad Soyad</Text>
                  <TextInput style={s.input} value={editStaffForm.ad_soyad} onChangeText={(v) => setEditStaffForm({ ...editStaffForm, ad_soyad: v })} />
                  <Text style={s.label}>E-posta</Text>
                  <TextInput style={s.input} value={editStaffForm.e_posta} onChangeText={(v) => setEditStaffForm({ ...editStaffForm, e_posta: v })} autoCapitalize="none" />
                  <Text style={s.label}>Telefon</Text>
                  <TextInput style={s.input} value={editStaffForm.telefon} onChangeText={(v) => setEditStaffForm({ ...editStaffForm, telefon: v })} />
                  <Text style={s.label}>Yeni şifre (opsiyonel)</Text>
                  <TextInput style={s.input} value={editStaffForm.sifre} onChangeText={(v) => setEditStaffForm({ ...editStaffForm, sifre: v })} secureTextEntry />
                  <SelectField
                    label="Rol"
                    options={[
                      { label: 'Sekreter', value: 'sekreter' },
                      { label: 'Muhasebeci', value: 'muhasebeci' },
                      { label: 'Resepsiyonist', value: 'resepsiyonist' },
                    ]}
                    value={editStaffForm.rol}
                    onChange={(r) => setEditStaffForm({ ...editStaffForm, rol: r })}
                  />
                  <View style={s.actions}>
                    <Pressable style={[s.actionBtn, s.actionBtnSuccess]} disabled={busy} onPress={() => void saveEditStaff()}>
                      <Text style={[s.actionBtnText, s.actionBtnSuccessText]}>Kaydet</Text>
                    </Pressable>
                    <Pressable style={s.actionBtn} onPress={() => setEditStaffId(null)}>
                      <Text style={s.actionBtnText}>Vazgec</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
              {staff.map((p) => (
                <View key={p.id} style={s.card}>
                  <Text style={s.cardTitle}>{p.ad_soyad}</Text>
                  <Text style={s.cardMeta}>{p.e_posta} · {p.rol} · {p.aktif_mi ? 'aktif' : 'pasif'}</Text>
                  <View style={s.actions}>
                    <Pressable
                      style={s.actionBtn}
                      onPress={() => {
                        setEditStaffId(p.id);
                        setEditStaffForm({
                          ad_soyad: p.ad_soyad || '',
                          e_posta: p.e_posta || '',
                          telefon: p.telefon || '',
                          sifre: '',
                          rol: p.rol || 'sekreter',
                        });
                      }}
                    >
                      <Text style={s.actionBtnText}>Düzenle</Text>
                    </Pressable>
                    <Pressable style={s.actionBtn} onPress={() => void apiPost(`/doctor/clinic/staff/${p.id}/toggle`).then(() => apiGet<any[]>('/doctor/clinic/staff').then((r) => setStaff(r.data ?? []))).catch(alertError)}>
                      <Text style={s.actionBtnText}>Durum</Text>
                    </Pressable>
                    <Pressable
                      style={s.actionBtn}
                      onPress={() =>
                        void apiPost<{ gecici_sifre: string }>(`/doctor/clinic/staff/${p.id}/reset-password`)
                          .then((r) => {
                            Alert.alert('Şifre sıfırlandı', `Geçici şifre: ${r.data?.gecici_sifre || '—'}`);
                          })
                          .catch(alertError)
                      }
                    >
                      <Text style={s.actionBtnText}>Şifre sıfırla</Text>
                    </Pressable>
                    <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={() => void apiDelete(`/doctor/clinic/staff/${p.id}`).then(() => setStaff((x) => x.filter((i) => i.id !== p.id))).catch(alertError)}>
                      <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          ) : null}

          {tab === 'talepler' ? (
            <>
              <View style={s.actions}>
                <Pressable style={[s.actionBtn, s.actionBtnSuccess]} disabled={busy} onPress={() => void bulk('approve')}>
                  <Text style={[s.actionBtnText, s.actionBtnSuccessText]}>Toplu onay</Text>
                </Pressable>
                <Pressable style={[s.actionBtn, s.actionBtnDanger]} disabled={busy} onPress={() => void bulk('reject')}>
                  <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Toplu red</Text>
                </Pressable>
              </View>
              {requests.length === 0 ? (
                <EmptyState title="Talep yok" text="Bekleyen klinik randevu talebi yok." />
              ) : (
                <>
                  <SelectField
                    label="Toplu işlem için talepler"
                    placeholder="Talep seçin…"
                    multiple
                    searchable
                    options={requests.map((r) => ({
                      label: r.hasta_adi,
                      value: r.id,
                      subtitle: `${r.doktor} · ${r.tarih} ${r.saat}${r.hizmet ? ` · ${r.hizmet}` : ''}`,
                    }))}
                    value={selectedReq}
                    onChange={setSelectedReq}
                  />
                  {requests.map((r) => (
                    <View key={r.id} style={s.card}>
                      <Text style={s.cardTitle}>{r.hasta_adi}</Text>
                      <Text style={s.cardMeta}>{r.doktor} · {r.tarih} {r.saat}</Text>
                      {r.hizmet ? <Text style={s.cardBody}>{r.hizmet}</Text> : null}
                      <Text style={s.hint}>
                        {selectedReq.includes(r.id) ? 'Toplu seçimde işaretli' : 'Listede görünür'}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </>
          ) : null}

          {tab === 'takvim' ? (
            <>
              {rescheduleId ? (
                <View style={s.card}>
                  <Text style={s.cardTitle}>Randevuyu ertele</Text>
                  <DateField label="Yeni tarih" value={rescheduleDate} onChange={setRescheduleDate} />
                  <TimeField label="Yeni saat" value={rescheduleTime} onChange={setRescheduleTime} />
                  <View style={s.actions}>
                    <Pressable style={[s.actionBtn, s.actionBtnSuccess]} disabled={busy} onPress={() => void clinicApptReschedule()}>
                      <Text style={[s.actionBtnText, s.actionBtnSuccessText]}>Kaydet</Text>
                    </Pressable>
                    <Pressable style={s.actionBtn} onPress={() => setRescheduleId(null)}>
                      <Text style={s.actionBtnText}>Vazgeç</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
              {clinicAppts.length === 0 ? (
                <EmptyState title="Randevu yok" text="Seçili haftada klinik randevusu yok." />
              ) : (
                clinicAppts.map((a) => (
                  <View key={a.id} style={s.card}>
                    <Text style={s.cardTitle}>{a.hasta_adi}</Text>
                    <Text style={s.cardMeta}>{a.doktor} · {a.tarih} {a.saat} · {a.durum}</Text>
                    {a.hizmet ? <Text style={s.cardBody}>{a.hizmet}</Text> : null}
                    {a.durum === 'beklemede' || a.durum === 'onaylandi' ? (
                      <View style={s.actions}>
                        {a.durum === 'beklemede' ? (
                          <Pressable style={[s.actionBtn, s.actionBtnSuccess]} disabled={busy} onPress={() => void clinicApptStatus(a.id, 'onaylandi')}>
                            <Text style={[s.actionBtnText, s.actionBtnSuccessText]}>Onayla</Text>
                          </Pressable>
                        ) : null}
                        <Pressable
                          style={s.actionBtn}
                          disabled={busy}
                          onPress={() => {
                            setRescheduleId(a.id);
                            setRescheduleDate(a.tarih);
                            setRescheduleTime(String(a.saat || '09:00').slice(0, 5));
                          }}
                        >
                          <Text style={s.actionBtnText}>Ertele</Text>
                        </Pressable>
                        <Pressable style={s.actionBtn} disabled={busy} onPress={() => void clinicApptStatus(a.id, 'tamamlandi')}>
                          <Text style={s.actionBtnText}>Tamam</Text>
                        </Pressable>
                        <Pressable style={[s.actionBtn, s.actionBtnDanger]} disabled={busy} onPress={() => void clinicApptStatus(a.id, 'iptal')}>
                          <Text style={[s.actionBtnText, s.actionBtnDangerText]}>İptal</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </>
          ) : null}

          {tab === 'duyuru' ? (
            <>
              {isOwner ? (
                <View style={s.card}>
                  <Text style={s.cardTitle}>{annEditId ? 'Duyuru düzenle' : 'Yeni duyuru'}</Text>
                  <Text style={s.label}>Başlık</Text>
                  <TextInput style={s.input} value={annForm.baslik} onChangeText={(v) => setAnnForm({ ...annForm, baslik: v })} />
                  <Text style={s.label}>İçerik</Text>
                  <TextInput style={[s.input, s.textArea]} value={annForm.icerik} onChangeText={(v) => setAnnForm({ ...annForm, icerik: v })} multiline />
                  <SelectField
                    label="Önem"
                    options={[
                      { label: 'Genel', value: 'genel' },
                      { label: 'Önemli', value: 'onemli' },
                      { label: 'Acil', value: 'acil' },
                    ]}
                    value={annForm.onem_derecesi}
                    onChange={(k) => setAnnForm({ ...annForm, onem_derecesi: k })}
                  />
                  <View style={s.actions}>
                    <Pressable style={[s.primaryButton, { flex: 1 }, busy && s.primaryButtonDisabled]} disabled={busy} onPress={() => void saveAnnouncement()}>
                      <Text style={s.primaryButtonText}>{annEditId ? 'Güncelle' : 'Yayınla'}</Text>
                    </Pressable>
                    {annEditId ? (
                      <Pressable
                        style={s.actionBtn}
                        onPress={() => {
                          setAnnEditId(null);
                          setAnnForm({ baslik: '', icerik: '', onem_derecesi: 'genel' });
                        }}
                      >
                        <Text style={s.actionBtnText}>Vazgeç</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {announcements.length === 0 ? (
                <EmptyState title="Duyuru yok" text="Klinik duyurusu bulunmuyor." />
              ) : (
                announcements.map((a) => (
                  <View key={a.id} style={s.card}>
                    <Text style={s.cardTitle}>{a.baslik}</Text>
                    <Text style={s.cardMeta}>{a.onem_derecesi || 'genel'} · {a.aktif_mi === false ? 'pasif' : 'aktif'}</Text>
                    <Text style={s.cardBody}>{a.icerik}</Text>
                    {isOwner ? (
                      <View style={s.actions}>
                        <Pressable
                          style={s.actionBtn}
                          onPress={() => {
                            setAnnEditId(a.id);
                            setAnnForm({
                              baslik: a.baslik || '',
                              icerik: a.icerik || '',
                              onem_derecesi: a.onem_derecesi || 'genel',
                            });
                          }}
                        >
                          <Text style={s.actionBtnText}>Düzenle</Text>
                        </Pressable>
                        <Pressable
                          style={s.actionBtn}
                          onPress={() =>
                            void apiPost(`/doctor/clinic/announcements/${a.id}/toggle`)
                              .then(() => apiGet<any[]>('/doctor/clinic/announcements/admin'))
                              .then((r) => setAnnouncements(r.data ?? []))
                              .catch(alertError)
                          }
                        >
                          <Text style={s.actionBtnText}>{a.aktif_mi === false ? 'Aktif et' : 'Pasif et'}</Text>
                        </Pressable>
                        <Pressable
                          style={[s.actionBtn, s.actionBtnDanger]}
                          onPress={() =>
                            void apiDelete(`/doctor/clinic/announcements/${a.id}`)
                              .then(() => setAnnouncements((x) => x.filter((i) => i.id !== a.id)))
                              .catch(alertError)
                          }
                        >
                          <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </>
          ) : null}

          {tab === 'saatler' ? (
            doctorsHours.length === 0 ? (
              <EmptyState title="Mesai yok" text="Klinik hekimlerinin çalışma saatleri yüklenemedi." />
            ) : (
              doctorsHours.map((d) => (
                <View key={d.id} style={s.card}>
                  <Text style={s.cardTitle}>{d.ad_soyad}</Text>
                  <Text style={s.cardMeta}>{d.klinik_aktif_mi === false ? 'Klinikte pasif' : 'Aktif'}</Text>
                  {(d.calisma_saatleri || []).map((h: any) => (
                    <Text key={h.gun} style={s.cardBody}>
                      {h.gun_ad}:{' '}
                      {h.aktif_mi
                        ? `${h.baslangic || '—'} – ${h.bitis || '—'}`
                        : 'Kapalı'}
                    </Text>
                  ))}
                </View>
              ))
            )
          ) : null}

          {tab === 'finans' && isOwner ? (
            clinicFinance ? (
              <>
                <View style={s.statGrid}>
                  <View style={s.statCard}>
                    <Text style={s.statValue}>{money(clinicFinance.bu_ay_gelir)}</Text>
                    <Text style={s.statLabel}>Bu ay gelir</Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statValue}>{money(clinicFinance.bu_ay_gider)}</Text>
                    <Text style={s.statLabel}>Bu ay gider</Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statValue}>{money(clinicFinance.bu_ay_net)}</Text>
                    <Text style={s.statLabel}>Net</Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statValue}>{money(clinicFinance.acik_borc)}</Text>
                    <Text style={s.statLabel}>Açık bakiye</Text>
                  </View>
                </View>
                <View style={s.card}>
                  <Text style={s.cardTitle}>6 aylık trend</Text>
                  {(clinicFinance.trend || []).map((t: any, i: number) => (
                    <Text key={i} style={s.cardMeta}>
                      {t.ay}: +{money(t.gelir)} / −{money(t.gider)} · net {money(t.net)}
                    </Text>
                  ))}
                </View>
                <Text style={s.hint}>Detaylı gider ve hakediş için ilgili sekmeleri kullanın.</Text>
              </>
            ) : (
              <EmptyState title="Finans" text="Özet yükleniyor veya veri yok." />
            )
          ) : null}

          {tab === 'hastalar' ? (
            <>
              <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder="Klinik hastası ara" placeholderTextColor="#6B7F93" />
              {patientDetail ? (
                <View style={s.card}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardTitle}>{patientDetail.hasta?.ad_soyad}</Text>
                    <Pressable onPress={() => setPatientDetail(null)}>
                      <Text style={s.modalClose}>Kapat</Text>
                    </Pressable>
                  </View>
                  <Text style={s.cardMeta}>{patientDetail.hasta?.telefon || '—'}</Text>
                  <Text style={s.cardMeta}>{patientDetail.hasta?.e_posta || '—'}</Text>
                  {patientDetail.hasta?.notlar ? (
                    <Text style={s.cardBody}>Not: {patientDetail.hasta.notlar}</Text>
                  ) : null}
                  <Text style={[s.cardTitle, { marginTop: 10 }]}>Randevular</Text>
                  {(patientDetail.randevular || []).length === 0 ? (
                    <Text style={s.cardBody}>Randevu yok.</Text>
                  ) : (
                    (patientDetail.randevular || []).map((r: any) => (
                      <Text key={r.id} style={s.cardMeta}>
                        {r.tarih} {r.saat} · {r.doktor} · {r.hizmet || '—'} · {r.durum}
                      </Text>
                    ))
                  )}
                </View>
              ) : null}
              {patients.length === 0 ? (
                <EmptyState title="Hasta yok" text="Klinik havuzunda hasta bulunamadı." />
              ) : (
                patients.map((p) => (
                  <View key={p.id} style={s.card}>
                    <Text style={s.cardTitle}>{p.ad} {p.soyad}</Text>
                    <Text style={s.cardMeta}>{p.telefon || p.e_posta || '—'}</Text>
                    {p.pivot?.notlar || p.notlar ? (
                      <Text style={s.cardBody}>Not: {p.pivot?.notlar || p.notlar}</Text>
                    ) : null}
                    <View style={s.actions}>
                      <Pressable style={s.actionBtn} disabled={busy} onPress={() => void openClinicPatient(p.id)}>
                        <Text style={s.actionBtnText}>Detay</Text>
                      </Pressable>
                      <Pressable
                        style={s.actionBtn}
                        onPress={() => {
                          setPatientNoteId(p.id);
                          setPatientNoteText(p.pivot?.notlar || p.notlar || '');
                        }}
                      >
                        <Text style={s.actionBtnText}>Not</Text>
                      </Pressable>
                      {p.telefon ? (
                        <Pressable style={s.actionBtn} onPress={() => openPhone(p.telefon)}>
                          <Text style={s.actionBtnText}>Ara</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
              <FormModal
                visible={patientNoteId != null}
                title="Klinik hasta notu"
                onClose={() => setPatientNoteId(null)}
                onSubmit={() => {
                  if (!patientNoteId) return;
                  void apiPut(`/doctor/clinic/patients/${patientNoteId}/note`, {
                    notlar: patientNoteText.trim() || null,
                  })
                    .then(() => {
                      setPatients((list) =>
                        list.map((x) =>
                          x.id === patientNoteId
                            ? { ...x, notlar: patientNoteText.trim(), pivot: { ...(x.pivot || {}), notlar: patientNoteText.trim() } }
                            : x,
                        ),
                      );
                      setPatientNoteId(null);
                      Alert.alert('Tamam', 'Not kaydedildi.');
                    })
                    .catch(alertError);
                }}
              >
                <Text style={s.label}>Not</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={patientNoteText}
                  onChangeText={setPatientNoteText}
                  multiline
                  placeholderTextColor="#6B7F93"
                />
              </FormModal>
            </>
          ) : null}

          {tab === 'giderler' && isOwner ? (
            <>
              <View style={s.card}>
                <Text style={s.cardTitle}>Tarih filtresi</Text>
                <DateField label="Başlangıç" value={expFilterBas} onChange={setExpFilterBas} />
                <DateField label="Bitis" value={expFilterBit} onChange={setExpFilterBit} />
                <Pressable style={[s.secondaryButton, { marginTop: 8 }]} onPress={() => void loadClinicExpenses()}>
                  <Text style={s.secondaryButtonText}>Filtrele</Text>
                </Pressable>
                <Text style={[s.cardMeta, { marginTop: 10 }]}>Donem toplami: {money(expTotal)}</Text>
              </View>
              <View style={s.card}>
                <Text style={s.cardTitle}>{editExpId ? 'Gideri duzenle' : 'Klinik gideri ekle'}</Text>
                <Text style={s.label}>Tutar</Text>
                <TextInput style={s.input} value={expForm.tutar} onChangeText={(v) => setExpForm({ ...expForm, tutar: v })} keyboardType="decimal-pad" />
                <DateField label="Tarih" value={expForm.tarih} onChange={(v) => setExpForm({ ...expForm, tarih: v })} />
                <SelectField
                  label="Kategori"
                  options={[
                    { label: 'Diğer', value: 'diger' },
                    { label: 'Kira', value: 'kira' },
                    { label: 'Personel', value: 'personel' },
                    { label: 'Malzeme', value: 'malzeme' },
                    { label: 'Pazarlama', value: 'pazarlama' },
                    { label: 'Teknoloji', value: 'teknoloji' },
                  ]}
                  value={expForm.kategori}
                  onChange={(k) => setExpForm({ ...expForm, kategori: k })}
                />
                <Text style={s.label}>Açıklama</Text>
                <TextInput style={s.input} value={expForm.aciklama} onChangeText={(v) => setExpForm({ ...expForm, aciklama: v })} />
                <View style={s.actions}>
                  <Pressable style={[s.primaryButton, { flex: 1, marginTop: 12 }, busy && s.primaryButtonDisabled]} disabled={busy} onPress={() => void addExpense()}>
                    <Text style={s.primaryButtonText}>{editExpId ? 'Guncelle' : 'Kaydet'}</Text>
                  </Pressable>
                  {editExpId ? (
                    <Pressable
                      style={[s.secondaryButton, { marginTop: 12 }]}
                      onPress={() => {
                        setEditExpId(null);
                        setExpForm({ tutar: '', tarih: todayKey(), kategori: 'diger', aciklama: '' });
                      }}
                    >
                      <Text style={s.secondaryButtonText}>Vazgec</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <Text style={s.hint}>Hakedis ozeti icin «Hakedis» sekmesine gidin — giderler klinik merkezidir.</Text>
              {clinicExpenses.map((g) => (
                <View key={g.id} style={s.card}>
                  <Text style={s.cardTitle}>{g.kategori}</Text>
                  <Text style={s.cardMeta}>{g.tarih} · {money(Number(g.tutar))}</Text>
                  {g.aciklama ? <Text style={s.cardBody}>{g.aciklama}</Text> : null}
                  <View style={s.actions}>
                    <Pressable
                      style={s.actionBtn}
                      onPress={() => {
                        setEditExpId(g.id);
                        setExpForm({
                          tutar: String(g.tutar ?? ''),
                          tarih: String(g.tarih || '').slice(0, 10),
                          kategori: g.kategori || 'diger',
                          aciklama: g.aciklama || '',
                        });
                      }}
                    >
                      <Text style={s.actionBtnText}>Düzenle</Text>
                    </Pressable>
                    <Pressable
                      style={[s.actionBtn, s.actionBtnDanger]}
                      onPress={() =>
                        void apiDelete(`/doctor/clinic/expenses/${g.id}`)
                          .then(() => loadClinicExpenses())
                          .catch(alertError)
                      }
                    >
                      <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Sil</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          ) : null}

          {tab === 'hakedis' && isOwner ? (
            <>
              <View style={s.card}>
                <Text style={s.cardTitle}>Hakediş hesapla</Text>
                <SelectField
                  label="Hekim"
                  placeholder="Hekim seçin…"
                  searchable
                  options={settlementDoctors.map((d) => ({
                    label: d.ad_soyad,
                    value: String(d.id),
                  }))}
                  value={settleForm.doktor_id || null}
                  onChange={(id) => setSettleForm({ ...settleForm, doktor_id: id })}
                />
                <Text style={s.label}>Dönem başlangıç</Text>
                <DateField
                  label="Dönem başlangıç"
                  value={settleForm.donem_baslangic}
                  onChange={(v) => setSettleForm({ ...settleForm, donem_baslangic: v })}
                />
                <DateField
                  label="Dönem bitiş"
                  value={settleForm.donem_bitis}
                  onChange={(v) => setSettleForm({ ...settleForm, donem_bitis: v })}
                />
                <Text style={s.label}>Komisyon %</Text>
                <TextInput style={s.input} value={settleForm.komisyon_orani} onChangeText={(v) => setSettleForm({ ...settleForm, komisyon_orani: v })} keyboardType="decimal-pad" />
                <Pressable style={[s.primaryButton, { marginTop: 12 }, busy && s.primaryButtonDisabled]} disabled={busy} onPress={() => void saveSettlement()}>
                  <Text style={s.primaryButtonText}>Hesapla</Text>
                </Pressable>
              </View>
              {settlements.length === 0 ? (
                <EmptyState title="Hakediş yok" text="Henüz hesaplanmış hakediş kaydı yok." />
              ) : (
                settlements.map((h) => (
                  <View key={h.id} style={s.card}>
                    <Text style={s.cardTitle}>{h.doktor}</Text>
                    <Text style={s.cardMeta}>{h.donem_baslangic} → {h.donem_bitis}</Text>
                    <Text style={s.cardBody}>Gelir: {money(h.toplam_gelir)} · Komisyon: {money(h.komisyon_tutari)}</Text>
                    <Text style={s.cardBody}>Net: {money(h.net_hakedis)} · {h.durum}</Text>
                    <SelectField
                      label="Durum güncelle"
                      options={[
                        { label: 'Hesaplandı', value: 'hesaplandi' },
                        { label: 'Onaylandı', value: 'onaylandi' },
                        { label: 'Ödendi', value: 'odendi' },
                      ]}
                      value={h.durum || 'hesaplandi'}
                      onChange={(st) =>
                        void apiPost(`/doctor/clinic/settlements/${h.id}/status`, { durum: st })
                          .then(() => apiGet<any>('/doctor/clinic/settlements'))
                          .then((r) => setSettlements(r.data?.items ?? []))
                          .catch(alertError)
                      }
                    />
                  </View>
                ))
              )}
            </>
          ) : null}

          {tab === 'rapor' && isOwner ? (
            <>
              <View style={s.card}>
                <Text style={s.cardTitle}>Rapor aralığı</Text>
                <Text style={s.label}>Başlangıç</Text>
                <TextInput style={s.input} value={reportRange.baslangic} onChangeText={(v) => setReportRange({ ...reportRange, baslangic: v })} />
                <Text style={s.label}>Bitiş</Text>
                <TextInput style={s.input} value={reportRange.bitis} onChangeText={(v) => setReportRange({ ...reportRange, bitis: v })} />
                <Pressable
                  style={[s.primaryButton, { marginTop: 12 }]}
                  onPress={() =>
                    void apiGet<any>('/doctor/clinic/reports', reportRange)
                      .then((r) => setReports(r.data))
                      .catch(alertError)
                  }
                >
                  <Text style={s.primaryButtonText}>Raporu yükle</Text>
                </Pressable>
                <Pressable style={[s.secondaryButton, { marginTop: 10 }]} onPress={() => void shareClinicPdf()}>
                  <Text style={s.secondaryButtonText}>PDF paylaş / indir</Text>
                </Pressable>
              </View>
              {reports ? (
                <>
                  <View style={s.statGrid}>
                    <View style={s.statCard}>
                      <Text style={s.statValue}>{reports.toplam_randevu ?? 0}</Text>
                      <Text style={s.statLabel}>Toplam randevu</Text>
                    </View>
                    <View style={s.statCard}>
                      <Text style={s.statValue}>{reports.durum_dagilimi?.tamamlandi ?? 0}</Text>
                      <Text style={s.statLabel}>Tamamlanan</Text>
                    </View>
                  </View>
                  <View style={s.card}>
                    <Text style={s.cardTitle}>Durum dağılımı</Text>
                    {Object.entries(reports.durum_dagilimi || {}).map(([k, v]) => (
                      <Text key={k} style={s.cardMeta}>{k}: {String(v)}</Text>
                    ))}
                  </View>
                  <View style={s.card}>
                    <Text style={s.cardTitle}>Hekim randevu sayıları</Text>
                    {(reports.doktor_randevu || []).map((d: any, i: number) => (
                      <Text key={i} style={s.cardMeta}>{d.ad_soyad}: {d.adet}</Text>
                    ))}
                  </View>
                  <View style={s.card}>
                    <Text style={s.cardTitle}>Popüler hizmetler</Text>
                    {(reports.populer_hizmetler || []).map((h: any, i: number) => (
                      <Text key={i} style={s.cardMeta}>{h.hizmet_ad}: {h.adet}</Text>
                    ))}
                  </View>
                  <View style={s.card}>
                    <Text style={s.cardTitle}>Gelir / gider (son 6 ay)</Text>
                    {(reports.finans_karsilastirma || []).map((f: any, i: number) => (
                      <Text key={i} style={s.cardMeta}>{f.ay}: +{money(f.gelir)} / -{money(f.gider)}</Text>
                    ))}
                  </View>
                </>
              ) : (
                <EmptyState title="Rapor" text="Aralık seçip yükleyin." />
              )}
            </>
          ) : null}

          {tab === 'ayarlar' && isOwner && settings ? (
            <>
              <View style={s.card}>
                <Text style={s.cardTitle}>Klinik ayarları</Text>
                <Text style={s.label}>Ad</Text>
                <TextInput style={s.input} value={settings.ad || ''} onChangeText={(v) => setSettings({ ...settings, ad: v })} />
                <Text style={s.label}>Telefon</Text>
                <TextInput style={s.input} value={settings.telefon || ''} onChangeText={(v) => setSettings({ ...settings, telefon: v })} />
                <Text style={s.label}>E-posta</Text>
                <TextInput style={s.input} value={settings.e_posta || ''} onChangeText={(v) => setSettings({ ...settings, e_posta: v })} autoCapitalize="none" />
                <Text style={s.label}>Adres</Text>
                <TextInput style={[s.input, s.textArea]} value={settings.adres || ''} onChangeText={(v) => setSettings({ ...settings, adres: v })} multiline />
                <Text style={s.label}>Açıklama</Text>
                <TextInput style={[s.input, s.textArea]} value={settings.aciklama || ''} onChangeText={(v) => setSettings({ ...settings, aciklama: v })} multiline />
              </View>

              <View style={s.card}>
                <Text style={s.cardTitle}>Logo</Text>
                {settings.logo || settings.logo_url ? (
                  <Image
                    source={{ uri: settings.logo_url || `${SITE_URL}/${String(settings.logo || '').replace(/^\//, '')}` }}
                    style={{ width: 96, height: 96, borderRadius: 12, marginBottom: 10, backgroundColor: '#EEF1F5' }}
                  />
                ) : (
                  <Text style={s.hint}>Henüz logo yok.</Text>
                )}
                <Pressable style={[s.secondaryButton, logoBusy && s.primaryButtonDisabled]} disabled={logoBusy} onPress={() => void uploadClinicLogo()}>
                  <Text style={s.secondaryButtonText}>{logoBusy ? 'Yükleniyor…' : 'Logo yükle'}</Text>
                </Pressable>
              </View>

              <View style={s.card}>
                <Text style={s.cardTitle}>SEO</Text>
                <Text style={s.label}>Meta başlık</Text>
                <TextInput
                  style={s.input}
                  value={settings.meta_baslik || ''}
                  onChangeText={(v) => setSettings({ ...settings, meta_baslik: v })}
                  placeholder="Klinik SEO başlığı"
                  placeholderTextColor="#6B7F93"
                />
                <Text style={s.label}>Meta açıklama</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={settings.meta_aciklama || ''}
                  onChangeText={(v) => setSettings({ ...settings, meta_aciklama: v })}
                  multiline
                  placeholder="Kısa klinik açıklaması"
                  placeholderTextColor="#6B7F93"
                />
              </View>

              <View style={s.card}>
                <Text style={s.cardTitle}>Klinik çalışma saatleri</Text>
                {Object.keys(gunLabels).map((gun) => {
                  const row = (settings.calisma_saatleri || defaultClinicHours)[gun] || defaultClinicHours[gun as keyof typeof defaultClinicHours];
                  return (
                    <View key={gun} style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF1F5' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={s.cardMeta}>{gunLabels[gun]}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={s.hint}>{row.kapali ? 'Kapalı' : 'Açık'}</Text>
                          <Switch
                            value={!row.kapali}
                            onValueChange={(open) =>
                              setSettings({
                                ...settings,
                                calisma_saatleri: {
                                  ...(settings.calisma_saatleri || defaultClinicHours),
                                  [gun]: { ...row, kapali: !open },
                                },
                              })
                            }
                            trackColor={{ false: '#D1D5DB', true: '#FDBA8C' }}
                            thumbColor={!row.kapali ? '#F58A45' : '#9CA3AF'}
                          />
                        </View>
                      </View>
                      {!row.kapali ? (
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <View style={{ flex: 1 }}>
                            <TimeField
                              label="Açılış"
                              value={String(row.acilis || '09:00').slice(0, 5)}
                              onChange={(v) =>
                                setSettings({
                                  ...settings,
                                  calisma_saatleri: {
                                    ...(settings.calisma_saatleri || defaultClinicHours),
                                    [gun]: { ...row, acilis: v },
                                  },
                                })
                              }
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <TimeField
                              label="Kapanış"
                              value={String(row.kapanis || '18:00').slice(0, 5)}
                              onChange={(v) =>
                                setSettings({
                                  ...settings,
                                  calisma_saatleri: {
                                    ...(settings.calisma_saatleri || defaultClinicHours),
                                    [gun]: { ...row, kapanis: v },
                                  },
                                })
                              }
                            />
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              <Pressable style={[s.primaryButton, { marginTop: 8 }, busy && s.primaryButtonDisabled]} disabled={busy} onPress={() => void saveSettings()}>
                <Text style={s.primaryButtonText}>Tüm ayarları kaydet</Text>
              </Pressable>
            </>
          ) : null}

          {tab === 'website' && isOwner ? (
            <>
              <View style={s.card}>
                <Text style={s.cardTitle}>Klinik web sitesi</Text>
                {website?.kurulu_mu ? (
                  <>
                    <Text style={s.cardMeta}>Domain: {website.domain}</Text>
                    <Text style={s.cardMeta}>Durum: {website.durum || '—'}</Text>
                    <Text style={s.cardMeta}>API key: {website.api_key || '—'}</Text>
                    <Pressable
                      style={[s.secondaryButton, { marginTop: 12 }]}
                      disabled={busy}
                      onPress={() =>
                        void (async () => {
                          setBusy(true);
                          try {
                            const res = await apiPost<{ api_key: string; plain_api_secret: string }>('/doctor/clinic/website/api-key');
                            setWebsiteSecret(res.data?.plain_api_secret ?? null);
                            const w = await apiGet<any>('/doctor/clinic/website');
                            setWebsite(w.data);
                          } catch (e) {
                            alertError(e);
                          } finally {
                            setBusy(false);
                          }
                        })()
                      }
                    >
                      <Text style={s.secondaryButtonText}>API anahtarını yenile</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={s.hint}>Domain tanımlayın (örn. kliniginiz.com)</Text>
                    <TextInput style={s.input} value={domainInput} onChangeText={setDomainInput} autoCapitalize="none" placeholder="kliniginiz.com" placeholderTextColor="#6B7F93" />
                    <Pressable style={[s.primaryButton, { marginTop: 12 }, busy && s.primaryButtonDisabled]} disabled={busy} onPress={() => void setupClinicWebsite()}>
                      <Text style={s.primaryButtonText}>Kur</Text>
                    </Pressable>
                  </>
                )}
                {websiteSecret ? (
                  <Text style={[s.cardBody, { marginTop: 12 }]} selectable>
                    Secret (bir kez): {websiteSecret}
                  </Text>
                ) : null}
              </View>
              <DnsStepsCard steps={website?.dns_adimlari} />
            </>
          ) : null}
        </>
      )}
    </ScreenShell>
  );
}

// Menü ekranı: şık native tasarım (MenuProfile.tsx)
export { PolishedMenuScreen as MenuScreen };

// ── Packages (premium · site paket_sec etiketleri) ─────────────────────────

function moneyTry(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}

type PackageRibbon = {
  label: string;
  tone: 'popular' | 'web' | 'free' | 'active' | 'trial';
};

/** Site paket_sec ile aynı statik etiket mantığı (API etiket yoksa yedek) */
function resolvePackageRibbon(p: any, allItems: any[]): PackageRibbon | null {
  if (p.aktif_paket_mi) return { label: 'Aktif', tone: 'active' };
  if (p.etiket) {
    const t = String(p.etiket);
    if (t === 'Popüler' || t === 'Önerilen') return { label: t, tone: 'popular' };
    if (t.toLowerCase().includes('web')) return { label: t, tone: 'web' };
    if (t === 'Ücretsiz') return { label: t, tone: 'free' };
    if (t.includes('deneme')) return { label: t, tone: 'trial' };
    if (t === 'Aktif') return { label: t, tone: 'active' };
  }
  if (p.populer_mi) {
    return {
      label: (p.tur ?? '') === 'klinik' ? 'Önerilen' : 'Popüler',
      tone: 'popular',
    };
  }
  const isFree = !!p.ucretsiz_mi;
  const isWeb =
    !!p.web_sitesi_mi ||
    (Array.isArray(p.features) &&
      (p.features.includes('web_sitesi') || p.features.includes('klinik_web_sitesi'))) ||
    String(p.ad ?? '').toLowerCase().includes('web sitesi');
  if (isWeb) return { label: 'Web sitesi', tone: 'web' };
  if (isFree) return { label: 'Ücretsiz', tone: 'free' };

  // 2. ücretli non-web = Popüler
  let paid = 0;
  for (const x of allItems) {
    if (x.ucretsiz_mi) continue;
    const xWeb =
      !!x.web_sitesi_mi ||
      (Array.isArray(x.features) && x.features.includes('web_sitesi')) ||
      String(x.ad ?? '').toLowerCase().includes('web sitesi');
    if (xWeb) continue;
    paid += 1;
    if (Number(x.id) === Number(p.id) && paid === 2) {
      return { label: 'Popüler', tone: 'popular' };
    }
  }
  return null;
}

export function PackagesScreen({ onBack }: ModuleProps) {
  const [mevcut, setMevcut] = useState<{ id?: number; ad?: string | null } | null>(null);
  const [uyelik, setUyelik] = useState<{
    uyelik_baslangic?: string | null;
    uyelik_bitis?: string | null;
    kalan_gun?: number | null;
    uyelik_aktif_mi?: boolean;
    demo_mu?: boolean;
    kaynak?: string;
    features?: string[];
    ozellik_sayisi?: number;
  } | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [globalPeriod, setGlobalPeriod] = useState<'aylik' | 'yillik'>('aylik');
  const [periodById, setPeriodById] = useState<Record<number, 'aylik' | 'yillik'>>({});
  const [havaleById, setHavaleById] = useState<Record<number, string>>({});
  const [pendingBanner, setPendingBanner] = useState<{
    name: string;
    paketId?: number | null;
    period?: string;
    isKlinik?: boolean;
  } | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{
        mevcut: any;
        uyelik?: any;
        items: any[];
      }>('/doctor/packages');
      setMevcut(res.data?.mevcut ?? null);
      setUyelik(res.data?.uyelik ?? null);
      setItems(res.data?.items ?? []);
    } catch (e) {
      alertError(e, 'Paketler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Onboarding'den gelen paket tercihi
  useEffect(() => {
    void (async () => {
      try {
        const { loadPendingIap, clearPendingIap } = await import('../services/iap');
        const pending = await loadPendingIap();
        if (!pending) return;
        const isKlinik =
          pending.tur === 'klinik' || pending.packageKey.startsWith('klinik_');
        setPendingBanner({
          name: pending.packageName,
          paketId: pending.paketId,
          period: pending.period,
          isKlinik,
        });
        if (pending.paketId) {
          setHighlightId(pending.paketId);
          if (pending.period) {
            setPeriodById((prev) => ({ ...prev, [pending.paketId!]: pending.period }));
          }
        }
        // Free auto-applied at login; if still pending free, try once
        if (pending.productId === 'free' && pending.paketId && !isKlinik) {
          try {
            await apiPost('/doctor/packages/subscribe', {
              paket_id: pending.paketId,
              odeme_periyodu: pending.period,
              odeme_yontemi: 'ucretsiz',
            });
            await clearPendingIap();
            setPendingBanner(null);
            await load();
            Alert.alert('Paket aktif', `${pending.packageName} aktifleştirildi.`);
          } catch {
            /* user can retry below */
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, [load]);

  async function subscribe(paket: any) {
    const period = periodById[paket.id] ?? globalPeriod;
    const isFree = !!paket.ucretsiz_mi;
    const ref = (havaleById[paket.id] ?? '').trim();
    const isKlinik = (paket.tur ?? '') === 'klinik' || String(paket.ad ?? '').toLowerCase().includes('klinik');

    if (!isFree && !ref) {
      Alert.alert(
        'Havale referansı',
        isKlinik
          ? 'Klinik paket yükseltmesi için havale/EFT referansını girin. Yeni klinik kaydı hâlâ web panelinden yapılır.'
          : 'Ücretli paket için havale/EFT referans numaranızı girin veya “Mağazadan satın al” kullanın.',
      );
      return;
    }

    setBusyId(paket.id);
    try {
      const res = await apiPost('/doctor/packages/subscribe', {
        paket_id: paket.id,
        odeme_periyodu: period,
        odeme_yontemi: isFree ? 'ucretsiz' : 'havale',
        havale_referans: isFree ? undefined : ref,
      });
      try {
        const { clearPendingIap } = await import('../services/iap');
        await clearPendingIap();
        setPendingBanner(null);
      } catch {
        /* ignore */
      }
      Alert.alert(
        'Tamam',
        res.message ??
          (isFree
            ? 'Paket aktifleştirildi.'
            : isKlinik
              ? 'Klinik paket havale talebiniz alındı.'
              : 'Havale talebiniz alındı.'),
      );
      await load();
    } catch (e) {
      const msg = errMessage(e, 'Paket aboneliği başarısız.');
      // Sahip değilse tercihi kaydet + web yönlendirme
      if (isKlinik && /klinik sahibi|owner|web panel/i.test(msg)) {
        try {
          await apiPost('/doctor/packages/prefer', {
            paket_id: paket.id,
            odeme_periyodu: period,
            tur: 'klinik',
          });
        } catch {
          /* ignore */
        }
      }
      alertError(e, msg);
    } finally {
      setBusyId(null);
    }
  }

  async function buyWithStore(paket: any) {
    const period = periodById[paket.id] ?? globalPeriod;
    const isFree = !!paket.ucretsiz_mi;
    if (isFree) {
      void subscribe(paket);
      return;
    }
    const isKlinik = (paket.tur ?? '') === 'klinik';
    if (isKlinik) {
      Alert.alert('Klinik paket', 'Klinik paketleri mağaza IAP ile satılmaz.');
      return;
    }
    setBusyId(paket.id);
    try {
      const { purchaseStorePackage } = await import('../services/iap');
      const { isIapConfigured } = await import('../config/store');
      if (!isIapConfigured()) {
        Alert.alert(
          'Mağaza IAP',
          'RevenueCat anahtarı veya production build yok. Havale referansı ile devam edebilir veya EAS production build + RC anahtarı ekleyin.',
        );
        return;
      }
      let doktorId: number | null = null;
      try {
        const me = await apiGet<{ id?: number }>('/doctor/auth/me');
        doktorId = me.data?.id ?? null;
      } catch {
        /* optional */
      }
      const res = await purchaseStorePackage({
        paketId: Number(paket.id),
        packageName: String(paket.ad ?? 'Paket'),
        period,
        doktorId,
      });
      if (!res.ok) {
        Alert.alert('Satın alma', res.message);
        return;
      }
      Alert.alert('Tamam', res.message);
      setPendingBanner(null);
      await load();
    } catch (e) {
      alertError(e, 'Mağaza satın alma başarısız.');
    } finally {
      setBusyId(null);
    }
  }

  async function restoreStorePurchases() {
    try {
      const { restorePurchases } = await import('../services/iap');
      const res = await restorePurchases();
      Alert.alert(res.ok ? 'Geri yükleme' : 'Hata', res.message);
      if (res.ok) await load();
    } catch (e) {
      alertError(e, 'Geri yükleme başarısız.');
    }
  }

  return (
    <ScreenShell
      title="Paketler"
      subtitle={mevcut?.ad ? `Aktif: ${mevcut.ad}` : 'Profesyonel hekimlik için doğru planı seçin.'}
      onBack={onBack}
      loading={loading}
    >
      {/* Hero */}
      <View style={pkgStyles.hero}>
        <Text style={pkgStyles.heroEyebrow}>RANDEVU AJANDAM</Text>
        <Text style={pkgStyles.heroTitle}>Premium hekim paketleri</Text>
        <Text style={pkgStyles.heroSub}>
          Fiyatlara KDV dahildir. Web sitesi paketinde 1 yıl domain (.com / .net) dahil.
        </Text>
      </View>

      {pendingBanner ? (
        <View style={pkgStyles.banner}>
          <Text style={pkgStyles.bannerTitle}>Onboarding seçiminiz</Text>
          <Text style={pkgStyles.bannerBody}>
            {pendingBanner.name}
            {pendingBanner.period
              ? ` · ${pendingBanner.period === 'yillik' ? 'Yıllık' : 'Aylık'}`
              : ''}
          </Text>
          <Pressable
            onPress={() => {
              void (async () => {
                const { clearPendingIap } = await import('../services/iap');
                await clearPendingIap();
                setPendingBanner(null);
                setHighlightId(null);
              })();
            }}
          >
            <Text style={pkgStyles.bannerLink}>Seçimi temizle</Text>
          </Pressable>
        </View>
      ) : null}

      {uyelik ? (
        <View style={pkgStyles.memberCard}>
          <View style={pkgStyles.memberRow}>
            <Text style={pkgStyles.memberTitle}>Üyeliğiniz</Text>
            <View
              style={[
                pkgStyles.memberPill,
                uyelik.uyelik_aktif_mi ? pkgStyles.memberPillOk : pkgStyles.memberPillMute,
              ]}
            >
              <Text
                style={[
                  pkgStyles.memberPillTxt,
                  uyelik.uyelik_aktif_mi ? pkgStyles.memberPillTxtOk : null,
                ]}
              >
                {uyelik.demo_mu ? 'Demo' : uyelik.uyelik_aktif_mi ? 'Aktif' : 'Süresi dolmuş'}
              </Text>
            </View>
          </View>
          <Text style={pkgStyles.memberMeta}>
            {mevcut?.ad || 'Paket'} · Bitiş {uyelik.uyelik_bitis || '—'}
            {uyelik.kalan_gun != null && uyelik.kalan_gun >= 0
              ? ` · ${uyelik.kalan_gun} gün kaldı`
              : ''}
          </Text>
        </View>
      ) : null}

      {/* Aylık / Yıllık toggle — site billingToggle */}
      <View style={pkgStyles.periodSeg}>
        <Pressable
          style={[pkgStyles.periodBtn, globalPeriod === 'aylik' && pkgStyles.periodBtnOn]}
          onPress={() => setGlobalPeriod('aylik')}
        >
          <Text style={[pkgStyles.periodTxt, globalPeriod === 'aylik' && pkgStyles.periodTxtOn]}>
            Aylık
          </Text>
        </Pressable>
        <Pressable
          style={[pkgStyles.periodBtn, globalPeriod === 'yillik' && pkgStyles.periodBtnOn]}
          onPress={() => setGlobalPeriod('yillik')}
        >
          <Text style={[pkgStyles.periodTxt, globalPeriod === 'yillik' && pkgStyles.periodTxtOn]}>
            Yıllık
          </Text>
          <View style={pkgStyles.saveBadge}>
            <Text style={pkgStyles.saveBadgeTxt}>Tasarruf</Text>
          </View>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <EmptyState title="Paket listesi yok" text="Aktif paket bulunamadı." />
      ) : (
        items.map((p) => {
          const period = periodById[p.id] ?? globalPeriod;
          const isFree = !!p.ucretsiz_mi;
          const ribbon = resolvePackageRibbon(p, items);
          const popular = ribbon?.tone === 'popular' || !!p.populer_mi;
          const isWeb = ribbon?.tone === 'web' || !!p.web_sitesi_mi;
          const highlighted = highlightId != null && Number(p.id) === Number(highlightId);
          const price =
            period === 'yillik'
              ? (p.yillik_indirimli_fiyat ?? p.yillik_fiyat)
              : (p.aylik_indirimli_fiyat ?? p.aylik_fiyat);
          const priceOld =
            period === 'yillik'
              ? p.yillik_indirimli_fiyat != null
                ? p.yillik_fiyat
                : null
              : p.aylik_indirimli_fiyat != null
                ? p.aylik_fiyat
                : null;
          const bullets: string[] =
            Array.isArray(p.ozellikler) && p.ozellikler.length > 0
              ? p.ozellikler
              : Array.isArray(p.features)
                ? p.features.map((f: string) => String(f).replace(/_/g, ' '))
                : [];
          const showAll = expandedId === p.id;
          const visibleBullets = showAll ? bullets : bullets.slice(0, 5);
          const saveAmt =
            priceOld != null && price != null ? Number(priceOld) - Number(price) : 0;

          return (
            <View
              key={p.id}
              style={[
                pkgStyles.card,
                popular && pkgStyles.cardPopular,
                isWeb && !popular && pkgStyles.cardWeb,
                (p.aktif_paket_mi || highlighted) && pkgStyles.cardActive,
              ]}
            >
              {ribbon ? (
                <View
                  style={[
                    pkgStyles.ribbon,
                    ribbon.tone === 'popular' && pkgStyles.ribbonPopular,
                    ribbon.tone === 'web' && pkgStyles.ribbonWeb,
                    ribbon.tone === 'free' && pkgStyles.ribbonFree,
                    ribbon.tone === 'active' && pkgStyles.ribbonActive,
                    ribbon.tone === 'trial' && pkgStyles.ribbonTrial,
                  ]}
                >
                  <Text
                    style={[
                      pkgStyles.ribbonTxt,
                      (ribbon.tone === 'popular' || ribbon.tone === 'active') &&
                        pkgStyles.ribbonTxtLight,
                    ]}
                  >
                    {ribbon.label}
                  </Text>
                </View>
              ) : null}

              <Text style={pkgStyles.planName}>{p.ad}</Text>
              {p.aciklama ? (
                <Text style={pkgStyles.planDesc} numberOfLines={showAll ? 6 : 3}>
                  {p.aciklama}
                </Text>
              ) : null}

              <View style={pkgStyles.priceBlock}>
                {isFree ? (
                  <Text style={pkgStyles.priceFree}>Ücretsiz</Text>
                ) : (
                  <>
                    <View style={pkgStyles.priceRow}>
                      <Text style={pkgStyles.priceCurrency}>₺</Text>
                      <Text style={pkgStyles.priceMain}>{moneyTry(price)}</Text>
                      <Text style={pkgStyles.priceUnit}>
                        / {period === 'yillik' ? 'yıl' : 'ay'}
                      </Text>
                    </View>
                    {priceOld != null ? (
                      <View style={pkgStyles.priceMetaRow}>
                        <Text style={pkgStyles.priceOld}>₺{moneyTry(priceOld)}</Text>
                        {saveAmt > 0 ? (
                          <View style={pkgStyles.tasarrufPill}>
                            <Text style={pkgStyles.tasarrufTxt}>
                              ₺{moneyTry(saveAmt)} tasarruf
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    <Text style={pkgStyles.kdv}>KDV dahil</Text>
                  </>
                )}
              </View>

              {visibleBullets.length > 0 ? (
                <View style={pkgStyles.featList}>
                  {visibleBullets.map((line, i) => (
                    <View key={`${p.id}-f-${i}`} style={pkgStyles.featRow}>
                      <View style={[pkgStyles.featCheck, (popular || isWeb) && pkgStyles.featCheckBrand]}>
                        <Text style={pkgStyles.featCheckMark}>✓</Text>
                      </View>
                      <Text style={pkgStyles.featTxt}>{line}</Text>
                    </View>
                  ))}
                  {bullets.length > 5 ? (
                    <Pressable onPress={() => setExpandedId(showAll ? null : p.id)}>
                      <Text style={pkgStyles.moreLink}>
                        {showAll ? 'Daha az göster' : `+${bullets.length - 5} özellik daha`}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {!p.aktif_paket_mi ? (
                <View style={pkgStyles.ctaBlock}>
                  {!isFree ? (
                    <>
                      <Text style={pkgStyles.refLabel}>Havale / EFT referansı (opsiyonel IAP dışında)</Text>
                      <TextInput
                        style={pkgStyles.refInput}
                        placeholder="Dekont no"
                        placeholderTextColor="#95A2B5"
                        value={havaleById[p.id] ?? ''}
                        onChangeText={(t) => setHavaleById((prev) => ({ ...prev, [p.id]: t }))}
                      />
                      <Pressable
                        style={[pkgStyles.ctaPrimary, busyId === p.id && { opacity: 0.65 }]}
                        disabled={busyId === p.id}
                        onPress={() => {
                          setPeriodById((prev) => ({ ...prev, [p.id]: globalPeriod }));
                          void buyWithStore({ ...p });
                        }}
                      >
                        <Text style={pkgStyles.ctaPrimaryTxt}>
                          {busyId === p.id ? 'İşleniyor…' : 'Mağazadan satın al'}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[pkgStyles.ctaGhost, busyId === p.id && { opacity: 0.65 }]}
                        disabled={busyId === p.id}
                        onPress={() => {
                          setPeriodById((prev) => ({ ...prev, [p.id]: globalPeriod }));
                          void subscribe(p);
                        }}
                      >
                        <Text style={pkgStyles.ctaGhostTxt}>Havale ile talep gönder</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      style={[pkgStyles.ctaPrimary, busyId === p.id && { opacity: 0.65 }]}
                      disabled={busyId === p.id}
                      onPress={() => {
                        setPeriodById((prev) => ({ ...prev, [p.id]: globalPeriod }));
                        void subscribe(p);
                      }}
                    >
                      <Text style={pkgStyles.ctaPrimaryTxt}>
                        {busyId === p.id ? 'İşleniyor…' : 'Hemen başla'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={pkgStyles.activeBar}>
                  <Text style={pkgStyles.activeBarTxt}>Bu paket hesabınızda aktif</Text>
                </View>
              )}
            </View>
          );
        })
      )}

      <View style={pkgStyles.footerNote}>
        <Text style={pkgStyles.footerNoteTxt}>
          Kartlı ödeme web panelinden. Klinik paketleri mobilden abone edilemez.
        </Text>
        <Pressable onPress={() => void restoreStorePurchases()} style={{ marginTop: 8 }}>
          <Text style={pkgStyles.restoreLink}>Mağaza satın almalarını geri yükle</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const pkgStyles = {
  hero: {
    marginTop: 2,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  } as ViewStyle,
  heroEyebrow: {
    color: '#C96A2B',
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1.2,
  } as TextStyle,
  heroTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
    marginTop: 4,
  } as TextStyle,
  heroSub: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  } as TextStyle,
  banner: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(201,106,43,0.35)',
    padding: 12,
    marginBottom: 10,
  } as ViewStyle,
  bannerTitle: { color: '#0F172A', fontSize: 14, fontWeight: '700' as const } as TextStyle,
  bannerBody: { color: '#64748B', fontSize: 12, marginTop: 4 } as TextStyle,
  bannerLink: { color: '#C96A2B', fontSize: 12, fontWeight: '700' as const, marginTop: 8 } as TextStyle,
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    padding: 12,
    marginBottom: 12,
  } as ViewStyle,
  memberRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  } as ViewStyle,
  memberTitle: { color: '#0F172A', fontSize: 14, fontWeight: '700' as const } as TextStyle,
  memberPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  } as ViewStyle,
  memberPillOk: { backgroundColor: '#ECFDF5' } as ViewStyle,
  memberPillMute: { backgroundColor: '#F1F5F9' } as ViewStyle,
  memberPillTxt: { fontSize: 10, fontWeight: '700' as const, color: '#64748B' } as TextStyle,
  memberPillTxtOk: { color: '#047857' } as TextStyle,
  memberMeta: { color: '#64748B', fontSize: 12, marginTop: 4 } as TextStyle,
  periodSeg: {
    flexDirection: 'row' as const,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  } as ViewStyle,
  periodBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  } as ViewStyle,
  periodBtnOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  } as ViewStyle,
  periodTxt: { color: '#64748B', fontSize: 13, fontWeight: '600' as const } as TextStyle,
  periodTxtOn: { color: '#0F172A', fontWeight: '700' as const } as TextStyle,
  saveBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  } as ViewStyle,
  saveBadgeTxt: { color: '#047857', fontSize: 9, fontWeight: '800' as const } as TextStyle,
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E8EDF3',
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden' as const,
  } as ViewStyle,
  cardPopular: {
    borderColor: 'rgba(201,106,43,0.55)',
    backgroundColor: '#FFFBF7',
    shadowColor: '#C96A2B',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  } as ViewStyle,
  cardWeb: {
    borderColor: 'rgba(201,106,43,0.28)',
    backgroundColor: '#FFFBF7',
  } as ViewStyle,
  cardActive: {
    borderColor: 'rgba(46,158,91,0.45)',
  } as ViewStyle,
  ribbon: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  } as ViewStyle,
  ribbonPopular: {
    backgroundColor: '#C96A2B',
  } as ViewStyle,
  ribbonWeb: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: 'rgba(231,181,138,0.5)',
  } as ViewStyle,
  ribbonFree: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  } as ViewStyle,
  ribbonActive: {
    backgroundColor: '#2E9E5B',
  } as ViewStyle,
  ribbonTrial: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  } as ViewStyle,
  ribbonTxt: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: '#C96A2B',
  } as TextStyle,
  ribbonTxtLight: { color: '#FFFFFF' } as TextStyle,
  planName: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: -0.2,
    paddingRight: 8,
  } as TextStyle,
  planDesc: {
    color: '#64748B',
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 6,
  } as TextStyle,
  priceBlock: {
    marginTop: 14,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  } as ViewStyle,
  priceRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: 4,
  } as ViewStyle,
  priceCurrency: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 4,
  } as TextStyle,
  priceMain: {
    color: '#0F172A',
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
    lineHeight: 38,
  } as TextStyle,
  priceUnit: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 5,
  } as TextStyle,
  priceFree: {
    color: '#C96A2B',
    fontSize: 28,
    fontWeight: '800' as const,
  } as TextStyle,
  priceMetaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap' as const,
  } as ViewStyle,
  priceOld: {
    color: '#94A3B8',
    fontSize: 12,
    textDecorationLine: 'line-through' as const,
  } as TextStyle,
  tasarrufPill: {
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  } as ViewStyle,
  tasarrufTxt: { color: '#047857', fontSize: 10, fontWeight: '700' as const } as TextStyle,
  kdv: { color: '#94A3B8', fontSize: 11, marginTop: 4, fontWeight: '500' as const } as TextStyle,
  featList: { gap: 8, marginBottom: 4 } as ViewStyle,
  featRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
  } as ViewStyle,
  featCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 1,
  } as ViewStyle,
  featCheckBrand: { backgroundColor: 'rgba(201,106,43,0.14)' } as ViewStyle,
  featCheckMark: {
    color: '#C96A2B',
    fontSize: 10,
    fontWeight: '800' as const,
  } as TextStyle,
  featTxt: {
    flex: 1,
    color: '#334155',
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500' as const,
  } as TextStyle,
  moreLink: {
    color: '#C96A2B',
    fontSize: 12,
    fontWeight: '700' as const,
    marginTop: 4,
  } as TextStyle,
  ctaBlock: { marginTop: 14, gap: 8 } as ViewStyle,
  refLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600' as const,
    marginBottom: 2,
  } as TextStyle,
  refInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  } as TextStyle,
  ctaPrimary: {
    backgroundColor: '#C96A2B',
    borderRadius: 12,
    minHeight: 46,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#C96A2B',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  } as ViewStyle,
  ctaPrimaryTxt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800' as const,
  } as TextStyle,
  ctaGhost: {
    borderRadius: 12,
    minHeight: 42,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(201,106,43,0.35)',
    backgroundColor: 'rgba(201,106,43,0.06)',
  } as ViewStyle,
  ctaGhostTxt: {
    color: '#C96A2B',
    fontSize: 13,
    fontWeight: '700' as const,
  } as TextStyle,
  activeBar: {
    marginTop: 14,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center' as const,
  } as ViewStyle,
  activeBarTxt: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700' as const,
  } as TextStyle,
  footerNote: {
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
  } as ViewStyle,
  footerNoteTxt: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center' as const,
    lineHeight: 15,
  } as TextStyle,
  restoreLink: {
    color: '#C96A2B',
    fontSize: 12,
    fontWeight: '700' as const,
  } as TextStyle,
};

// ── Notifications ──────────────────────────────────────────────────────────

type NotifItem = {
  id: string;
  title: string;
  body: string;
  read_at?: string | null;
  created_at?: string;
  data?: any;
};

function NotificationRow({
  item,
  busy,
  onMarkRead,
  onDelete,
}: {
  item: NotifItem;
  busy?: boolean;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const unread = !item.read_at;
  return (
    <View style={[notifStyles.row, unread && notifStyles.rowUnread]}>
      <View style={[notifStyles.iconWrap, unread && notifStyles.iconWrapUnread]}>
        <AppIcon name={unread ? 'bell' : 'bellOutline'} size={18} color={unread ? '#EE7D31' : '#94A3B8'} />
      </View>
      <View style={notifStyles.copy}>
        <Text style={[notifStyles.title, unread && notifStyles.titleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.body ? (
          <Text style={notifStyles.body} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
        <Text style={notifStyles.meta}>
          {item.created_at ? formatDateTime(item.created_at) : ''}
        </Text>
      </View>
      <View style={notifStyles.actions}>
        {unread ? (
          <Pressable
            style={[notifStyles.iconBtn, notifStyles.iconRead]}
            hitSlop={6}
            disabled={busy}
            onPress={() => onMarkRead(item.id)}
            accessibilityLabel="Okundu işaretle"
          >
            <AppIcon name="check" size={16} color="#1F9D55" />
          </Pressable>
        ) : null}
        <Pressable
          style={[notifStyles.iconBtn, notifStyles.iconDelete]}
          hitSlop={6}
          disabled={busy}
          onPress={() => onDelete(item.id)}
          accessibilityLabel="Bildirimi sil"
        >
          <AppIcon name="close" size={16} color="#DC2626" />
        </Pressable>
      </View>
    </View>
  );
}

const notifStyles = {
  row: {
    marginTop: 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  rowUnread: {
    borderColor: 'transparent',
    backgroundColor: '#FFFBF7',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconWrapUnread: {
    backgroundColor: 'rgba(238,125,49,0.14)',
  },
  dotCol: { width: 10, paddingTop: 5, alignItems: 'center' as const },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EE7D31',
  },
  dotEmpty: { width: 7, height: 7 },
  copy: { flex: 1, minWidth: 0 },
  title: {
    color: '#39495B',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  titleUnread: {
    color: '#102133',
    fontWeight: '700' as const,
  },
  body: {
    color: '#6D7D8E',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  meta: {
    color: '#95A2B5',
    fontSize: 10,
    marginTop: 3,
    fontWeight: '500' as const,
  },
  actions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingTop: 0,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconRead: {
    backgroundColor: 'rgba(46,158,91,0.12)',
  },
  iconDelete: {
    backgroundColor: 'rgba(193,60,44,0.1)',
  },
  iconTxt: {
    color: '#102133',
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 18,
  },
};

export function NotificationsScreen({ onBack }: ModuleProps) {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await apiGet<{ items: any[]; unread: number }>('/doctor/notifications');
      const raw = res.data?.items ?? [];
      setItems(
        raw.map((n: any) => ({
          id: String(n.id),
          title: n.title || 'Bildirim',
          body: n.body || '',
          read_at: n.read_at ?? null,
          created_at: n.created_at,
          data: n.data,
        })),
      );
      setUnread(res.data?.unread ?? 0);
    } catch (e) {
      alertError(e, 'Bildirimler yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  async function markAllRead() {
    if (items.length === 0) return;
    if (unread === 0) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Okunmamış bildirim yok.');
      } else {
        Alert.alert('Bildirimler', 'Okunmamış bildirim yok.');
      }
      return;
    }
    try {
      await apiPost('/doctor/notifications/read');
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    } catch (e) {
      alertError(e, 'Tümü okundu işaretlenemedi.');
    }
  }

  function deleteAll() {
    if (items.length === 0) return;
    confirmDestructive(
      'Tümünü sil',
      `${items.length} bildirim kalıcı olarak silinecek.`,
      'Tümünü sil',
      () => {
        void (async () => {
          const prevItems = items;
          const prevUnread = unread;
          setItems([]);
          setUnread(0);
          try {
            await apiDelete('/doctor/notifications');
          } catch (e) {
            setItems(prevItems);
            setUnread(prevUnread);
            alertError(e, 'Toplu silme başarısız.');
            void load();
          }
        })();
      },
    );
  }

  async function markOneRead(id: string) {
    const item = items.find((n) => n.id === id);
    if (!item || item.read_at) return;
    setBusyId(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    setUnread((u) => Math.max(0, u - 1));
    try {
      await apiPost('/doctor/notifications/read', { ids: [id] });
    } catch (e) {
      alertError(e, 'Okundu işaretlenemedi.');
      void load();
    } finally {
      setBusyId(null);
    }
  }

  function deleteOne(id: string) {
    confirmDestructive('Bildirimi sil', 'Bu bildirim kalıcı olarak silinsin mi?', 'Sil', () => {
      void (async () => {
        const prevItems = items;
        const wasUnread = !items.find((n) => n.id === id)?.read_at;
        setBusyId(id);
        setItems((list) => list.filter((n) => n.id !== id));
        if (wasUnread) setUnread((u) => Math.max(0, u - 1));
        try {
          await apiDelete(`/doctor/notifications/${encodeURIComponent(id)}`);
        } catch (e) {
          setItems(prevItems);
          alertError(e, 'Silinemedi.');
          void load();
        } finally {
          setBusyId(null);
        }
      })();
    });
  }

  return (
    <ScreenShell
      title="Bildirimler"
      subtitle={
        unread > 0
          ? `${unread} okunmamış`
          : items.length > 0
            ? `${items.length} bildirim`
            : 'Yeni bildirimler burada görünür'
      }
      onBack={onBack}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      {items.length > 0 ? (
        <View style={bulkStyles.row}>
          <Pressable
            style={[bulkStyles.btn, bulkStyles.btnRead, unread === 0 && bulkStyles.btnDisabled]}
            onPress={() => void markAllRead()}
            disabled={unread === 0}
          >
            <Text style={bulkStyles.btnText}>Tümü okundu</Text>
          </Pressable>
          <Pressable style={[bulkStyles.btn, bulkStyles.btnDelete]} onPress={deleteAll}>
            <Text style={[bulkStyles.btnText, bulkStyles.btnDeleteText]}>Tümünü sil</Text>
          </Pressable>
        </View>
      ) : null}

      {items.length === 0 ? (
        <EmptyState title="Bildirim yok" text="Yeni randevu talepleri ve uyarılar burada listelenir." />
      ) : (
        items.map((n) => (
          <NotificationRow
            key={n.id}
            item={n}
            busy={busyId === n.id}
            onMarkRead={(id) => void markOneRead(id)}
            onDelete={deleteOne}
          />
        ))
      )}
    </ScreenShell>
  );
}

const bulkStyles = {
  row: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnRead: {
    backgroundColor: 'rgba(46,158,91,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(46,158,91,0.28)',
  },
  btnDelete: {
    backgroundColor: 'rgba(193,60,44,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(193,60,44,0.22)',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: '#102133',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  btnDeleteText: {
    color: '#C13C2C',
  },
};

// ── Hızlı Saat Kapat — anında toggle, minimal ─────────────────────────────

type QcSlot = {
  saat_string: string;
  saat_baslangic?: string;
  saat_bitis?: string;
  ogle_mi?: boolean;
  kapali_mi?: boolean;
  dolu_mu?: boolean;
};

function nextDays(count: number): string[] {
  const out: string[] = [];
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(todayKeyFromDate(d));
  }
  return out;
}

function todayKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Toggle = anında API; kaydet butonu yok */
export function QuickCloseScreen({ onBack, onNavigate }: ModuleProps) {
  const dayKeys = useMemo(() => nextDays(14), []);
  const [qcDate, setQcDate] = useState(dayKeys[0] ?? todayKey());
  const [qcSlots, setQcSlots] = useState<QcSlot[]>([]);
  const [qcSelected, setQcSelected] = useState<string[]>([]);
  const [qcLoading, setQcLoading] = useState(false);
  const [busySaat, setBusySaat] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [qcMsg, setQcMsg] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const loadQuickClose = useCallback(async (date: string) => {
    setQcLoading(true);
    setQcMsg(null);
    try {
      const res = await apiGet<{
        aktif_mi?: boolean;
        mesaj?: string;
        slots?: QcSlot[];
      }>('/doctor/quick-close/slots', { tarih: date });
      const slots = res.data?.slots ?? [];
      setQcSlots(slots);
      setQcSelected(
        slots
          .filter((sl) => sl.kapali_mi && !sl.ogle_mi && !sl.dolu_mu)
          .map((sl) => sl.saat_string),
      );
      if (res.data?.aktif_mi === false) {
        setQcMsg(res.data?.mesaj || 'Bu günde çalışma saati yok veya gün kapalı.');
      }
    } catch (e) {
      alertError(e, 'Slotlar yüklenemedi.');
      setQcSlots([]);
      setQcSelected([]);
    } finally {
      setQcLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuickClose(qcDate);
  }, [qcDate, loadQuickClose]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
  }, [flash]);

  async function persist(nextSelected: string[], date = qcDate) {
    await apiPost('/doctor/quick-close', { tarih: date, saatler: nextSelected });
  }

  async function applySelection(
    nextSelected: string[],
    opts?: { saat?: string; bulk?: boolean },
  ) {
    const prev = qcSelected;
    setQcSelected(nextSelected);
    if (opts?.saat) setBusySaat(opts.saat);
    if (opts?.bulk) setBulkBusy(true);
    try {
      await persist(nextSelected);
      setFlash(
        nextSelected.length > prev.length
          ? 'Kapandı'
          : nextSelected.length < prev.length
            ? 'Açıldı'
            : 'Güncellendi',
      );
    } catch (e) {
      setQcSelected(prev);
      alertError(e, 'Güncellenemedi.');
    } finally {
      setBusySaat(null);
      setBulkBusy(false);
    }
  }

  function onToggle(saat: string, wantClosed: boolean) {
    if (busySaat || bulkBusy || qcLoading) return;
    const next = wantClosed
      ? [...new Set([...qcSelected, saat])].sort()
      : qcSelected.filter((s) => s !== saat);
    void applySelection(next, { saat });
  }

  function closeAllAvailable() {
    if (bulkBusy || qcLoading) return;
    const all = qcSlots
      .filter((sl) => !sl.ogle_mi && !sl.dolu_mu)
      .map((sl) => sl.saat_string)
      .sort();
    void applySelection(all, { bulk: true });
  }

  function openAll() {
    if (bulkBusy || qcLoading) return;
    void applySelection([], { bulk: true });
  }

  const closedCount = qcSelected.length;
  const freeCount = qcSlots.filter((sl) => !sl.ogle_mi && !sl.dolu_mu).length;
  const openCount = Math.max(0, freeCount - closedCount);

  return (
    <ScreenShell
      title="Hızlı Kapat"
      subtitle="Anahtar = anında kapat / aç"
      onBack={onBack}
    >
      {/* Gün şeridi */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={qcStyles.stripScroll}
        contentContainerStyle={qcStyles.strip}
      >
        {dayKeys.map((key) => {
          const d = new Date(key + 'T12:00:00');
          const on = key === qcDate;
          const isToday = key === dayKeys[0];
          return (
            <Pressable
              key={key}
              style={[qcStyles.dayChip, on && qcStyles.dayChipOn]}
              onPress={() => setQcDate(key)}
            >
              <Text style={[qcStyles.dayChipWd, on && qcStyles.dayOnTxt]}>
                {isToday ? 'Bugün' : d.toLocaleDateString('tr-TR', { weekday: 'short' })}
              </Text>
              <Text style={[qcStyles.dayChipNum, on && qcStyles.dayOnTxt]}>{d.getDate()}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Özet + toplu */}
      <View style={qcStyles.bar}>
        <Text style={qcStyles.barMeta}>
          {qcLoading ? '…' : `${closedCount} kapalı · ${openCount} açık`}
        </Text>
        {flash ? <Text style={qcStyles.flash}>{flash}</Text> : null}
        <View style={qcStyles.barActions}>
          <Pressable onPress={closeAllAvailable} disabled={qcLoading || bulkBusy} hitSlop={6}>
            <Text style={qcStyles.barLinkDanger}>Tümü kapat</Text>
          </Pressable>
          <Text style={qcStyles.barDot}>·</Text>
          <Pressable onPress={openAll} disabled={qcLoading || bulkBusy} hitSlop={6}>
            <Text style={qcStyles.barLink}>Tümü aç</Text>
          </Pressable>
        </View>
      </View>

      {qcMsg ? <Text style={qcStyles.warn}>{qcMsg}</Text> : null}

      {qcLoading || bulkBusy ? (
        <ActivityIndicator color="#EE7D31" style={{ marginTop: 20 }} />
      ) : qcSlots.length === 0 ? (
        <EmptyState
          title="Slot yok"
          text="Bu günde çalışma saati yok. Çalışma saatlerinden tanımlayın."
        />
      ) : (
        <View style={qcStyles.list}>
          {qcSlots.map((sl, idx) => {
            const locked = !!sl.ogle_mi || !!sl.dolu_mu;
            const closed = qcSelected.includes(sl.saat_string);
            const busy = busySaat === sl.saat_string;
            const end = sl.saat_bitis ? `– ${sl.saat_bitis}` : '';
            return (
              <View
                key={sl.saat_string}
                style={[qcStyles.row, idx === 0 && qcStyles.rowFirst]}
              >
                <View style={qcStyles.rowLeft}>
                  <Text style={[qcStyles.rowTime, locked && qcStyles.muted]}>
                    {sl.saat_string}
                    {end ? ` ${end}` : ''}
                  </Text>
                  <Text
                    style={[
                      qcStyles.rowStatus,
                      locked && qcStyles.muted,
                      !locked && closed && qcStyles.statusClosed,
                      !locked && !closed && qcStyles.statusOpen,
                    ]}
                  >
                    {sl.dolu_mu
                      ? 'Dolu'
                      : sl.ogle_mi
                        ? 'Öğle arası'
                        : closed
                          ? 'Kapalı'
                          : 'Açık'}
                  </Text>
                </View>
                {busy ? (
                  <ActivityIndicator size="small" color="#EE7D31" />
                ) : (
                  <Switch
                    value={locked ? false : closed}
                    disabled={locked || bulkBusy}
                    onValueChange={(v) => onToggle(sl.saat_string, v)}
                    trackColor={{ false: '#E2E8F0', true: 'rgba(193,60,44,0.45)' }}
                    thumbColor={
                      locked ? '#CBD5E1' : closed ? '#C13C2C' : '#FFFFFF'
                    }
                    ios_backgroundColor="#E2E8F0"
                  />
                )}
              </View>
            );
          })}
        </View>
      )}

      <Text style={qcStyles.footHint}>
        Anahtar kapalı = hasta o saati seçemez. Değişiklik anında kaydedilir.
      </Text>
      <Pressable style={qcStyles.linkLeaves} onPress={() => onNavigate('leaves')}>
        <Text style={qcStyles.linkLeavesTxt}>Uzun izin / tatil →</Text>
      </Pressable>
    </ScreenShell>
  );
}

/** Plain styles (avoid StyleSheet.create crash in some web bundle paths) */
const qcStyles: {
  [key: string]: ViewStyle | TextStyle;
} = {
  stripScroll: { marginHorizontal: -2, maxHeight: 64, marginTop: 2 },
  strip: { paddingVertical: 2, gap: 6, flexDirection: 'row' },
  dayChip: {
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF3',
    alignItems: 'center',
  },
  dayChipOn: {
    backgroundColor: '#102133',
    borderColor: '#102133',
  },
  dayChipWd: { color: '#95A2B5', fontSize: 10, fontWeight: '600' },
  dayChipNum: { color: '#102133', fontSize: 15, fontWeight: '700', marginTop: 1 },
  dayOnTxt: { color: '#FFFFFF' },
  bar: {
    marginTop: 12,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  barMeta: { color: '#6D7D8E', fontSize: 12, fontWeight: '600', flex: 1 },
  flash: {
    color: '#2E9E5B',
    fontSize: 11,
    fontWeight: '700',
  },
  barActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLink: { color: '#39495B', fontSize: 12, fontWeight: '600' },
  barLinkDanger: { color: '#C13C2C', fontSize: 12, fontWeight: '600' },
  barDot: { color: '#CBD5E1', fontSize: 12 },
  warn: {
    color: '#C96A2B',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 4,
  },
  list: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
    minHeight: 48,
  },
  rowFirst: { borderTopWidth: 0 },
  rowLeft: { flex: 1, marginRight: 12 },
  rowTime: {
    color: '#102133',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  rowStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  statusOpen: { color: '#2E9E5B' },
  statusClosed: { color: '#C13C2C' },
  muted: { color: '#95A2B5' },
  footHint: {
    color: '#95A2B5',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  linkLeaves: { marginTop: 10, marginBottom: 6, alignItems: 'center' },
  linkLeavesTxt: { color: '#C96A2B', fontSize: 12, fontWeight: '700' },
};

// ── Module map ─────────────────────────────────────────────────────────────

export const MODULE_SCREENS: Partial<Record<ScreenId, ComponentType<ModuleProps>>> = {
  requests: RequestsScreen,
  waitlist: WaitlistScreen,
  patients: PatientsScreen,
  services: ServicesScreen,
  workingHours: WorkingHoursScreen,
  settings: SettingsScreen,
  leaves: LeavesScreen,
  quickClose: QuickCloseScreen,
  blogs: BlogsScreen,
  reviews: ReviewsScreen,
  gallery: GalleryScreen,
  finance: FinanceScreen,
  financeIncomes: FinanceIncomesScreen,
  financeExpenses: FinanceExpensesScreen,
  financeCategories: FinanceCategoriesScreen,
  financeBalances: FinanceBalancesScreen,
  financePatientAccount: FinancePatientAccountScreen,
  faq: FaqScreen,
  education: EducationScreen,
  educationApps: EducationAppsScreen,
  profile: ProfileScreen,
  password: PasswordScreen,
  about: AboutScreen,
  website: WebsiteScreen,
  twoFactor: TwoFactorScreen,
  clinic: ClinicScreen,
  notifications: NotificationsScreen,
  packages: PackagesScreen,
  referral: ReferralScreen,
  menu: PolishedMenuScreen,
};
