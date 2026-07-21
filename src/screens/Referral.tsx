import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  Text,
  View,
} from 'react-native';
import { apiGet } from '../api/client';
import type { ModuleProps } from '../navigation/types';
import { ScreenShell } from '../ui/Screen';
import { moduleStyles as s } from '../ui/styles';

type ReferralOzet = {
  kod: string;
  link: string;
  bekleyen: number;
  odullu: number;
  bu_ay: number;
  limit: number;
  kalan: number;
  indirim: number;
  komisyon: number;
};

type ReferralItem = {
  id: number;
  hekim: string;
  e_posta?: string | null;
  durum: string;
  durum_label: string;
  odul_gun?: number | null;
  red_nedeni?: string | null;
  tarih?: string | null;
};

type ReferralData = {
  aktif: boolean;
  ozet: ReferralOzet | null;
  davetler: ReferralItem[];
  message?: string;
};

async function shareText(text: string, title: string) {
  try {
    await Share.share({ message: text, title });
  } catch {
    Alert.alert(title, text);
  }
}

export function ReferralScreen({ onBack }: ModuleProps) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<ReferralData>('/doctor/referral');
      setData(res.data ?? { aktif: false, ozet: null, davetler: [] });
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Referans bilgisi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ozet = data?.ozet;

  return (
    <ScreenShell
      title="Referans programı"
      subtitle="Arkadaşını getir, üyelik süresi kazan"
      onBack={onBack}
      loading={loading}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      {!data?.aktif ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>Program kapalı</Text>
          <Text style={s.cardBody}>{data?.message || 'Referans programı şu an aktif değil.'}</Text>
        </View>
      ) : ozet ? (
        <>
          <View style={s.card}>
            <Text style={s.cardTitle}>Nasıl çalışır?</Text>
            <Text style={s.cardBody}>
              Davet linkin paket seçimine gider; referans kodun otomatik taşınır. Davet ettiğin hekim ilk
              ücretli paket ödemesinde %{ozet.indirim} indirim alır. Ödeme onaylanınca sen abonelik
              süresinin %{ozet.komisyon}’i kadar ücretsiz gün kazanırsın. Nakit ödeme yok — yalnızca üyelik
              süresi.
            </Text>
          </View>

          <View style={s.statGrid}>
            <View style={s.statCard}>
              <Text style={s.statValue}>{ozet.kalan}</Text>
              <Text style={s.statLabel}>Bu ay kalan</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statValue}>{ozet.limit}</Text>
              <Text style={s.statLabel}>Aylık limit</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statValue}>{ozet.bekleyen}</Text>
              <Text style={s.statLabel}>Bekleyen</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statValue}>{ozet.odullu}</Text>
              <Text style={s.statLabel}>Ödüllü</Text>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardMeta}>Referans kodun</Text>
            <Text style={[s.cardTitle, { letterSpacing: 1 }]} selectable>
              {ozet.kod}
            </Text>
            <Pressable
              style={[s.secondaryButton, { marginTop: 10 }]}
              onPress={() => void shareText(ozet.kod, 'Referans kodu')}
            >
              <Text style={s.secondaryButtonText}>Kodu paylaş</Text>
            </Pressable>
          </View>

          <View style={s.card}>
            <Text style={s.cardMeta}>Davet linki</Text>
            <Text style={[s.cardBody, { fontSize: 12 }]} selectable>
              {ozet.link}
            </Text>
            <Pressable
              style={[s.primaryButton, { marginTop: 12 }]}
              onPress={() =>
                void shareText(
                  `Randevu Ajandam hekim paneline bu linkten katıl: ${ozet.link}`,
                  'Hekim davet linki',
                )
              }
            >
              <Text style={s.primaryButtonText}>Linki paylaş</Text>
            </Pressable>
          </View>

          <Text style={[s.menuGroupTitle, { marginTop: 8 }]}>Davetlerin</Text>
          {(data.davetler ?? []).length === 0 ? (
            <View style={s.card}>
              <Text style={s.cardBody}>Henüz davet yok. Linkini paylaş.</Text>
            </View>
          ) : (
            (data.davetler ?? []).map((d) => (
              <View key={d.id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle}>{d.hekim}</Text>
                  <View style={s.pill}>
                    <Text style={s.pillText}>{d.durum_label}</Text>
                  </View>
                </View>
                {d.e_posta ? <Text style={s.cardMeta}>{d.e_posta}</Text> : null}
                <Text style={s.cardBody}>
                  {d.durum === 'odullendirildi' && d.odul_gun != null
                    ? `+${d.odul_gun} gün ödül`
                    : d.red_nedeni || '—'}
                  {d.tarih ? ` · ${d.tarih}` : ''}
                </Text>
              </View>
            ))
          )}
        </>
      ) : (
        <ActivityIndicator color="#F58A45" />
      )}
    </ScreenShell>
  );
}
