import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TextField } from '../components/TextField';
import { SelectField } from '../components/SelectField';
import { API_URL } from '../api/client';
import { colors, spacing } from '../theme';
import { AppIcon } from '../components/AppIcon';
import { loadPendingIap } from '../services/iap';

export type AuthMode = 'login' | 'forgot' | 'register' | 'reset';

export type RegisterResult = {
  token: string;
  doktor: any;
  next_step?: 'meslek_bekleme' | 'payment' | string;
  meslek_dogrulama_durumu?: string;
  message?: string;
};

type Meta = {
  unvanlar: { id: number; ad: string }[];
  branslar: { id: number; ad: string }[];
  iller: { id: number; ad: string }[];
};

type PkgItem = {
  id: number;
  ad: string;
  tur: string;
  aciklama?: string | null;
  ozellikler?: string[];
  aylik_fiyat: number;
  aylik_indirimli_fiyat?: number | null;
  yillik_fiyat: number;
  yillik_indirimli_fiyat?: number | null;
  ucretsiz_mi?: boolean;
  populer_mi?: boolean;
  etiket?: string | null;
};

type RegStep = 'package' | 'account' | 'verify' | 'done';

type Props = {
  mode: AuthMode;
  onChangeMode: (m: AuthMode) => void;
  onRegistered: (result: RegisterResult) => void;
  resetToken?: string | null;
  resetEmail?: string | null;
};

export function AuthFlows({ mode, onChangeMode, onRegistered, resetToken, resetEmail }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');

  const [rEmail, setREmail] = useState(resetEmail ?? '');
  const [rToken, setRToken] = useState(resetToken ?? '');
  const [rPass, setRPass] = useState('');
  const [rPass2, setRPass2] = useState('');

  const [meta, setMeta] = useState<Meta | null>(null);
  const [packages, setPackages] = useState<PkgItem[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaRetry, setMetaRetry] = useState(0);
  const [regStep, setRegStep] = useState<RegStep>('package');
  const [period, setPeriod] = useState<'aylik' | 'yillik'>('aylik');
  const [paketId, setPaketId] = useState<number | null>(null);
  const [ilceler, setIlceler] = useState<{ id: number; ad: string }[]>([]);
  const [adSoyad, setAdSoyad] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [tcKimlik, setTcKimlik] = useState('');
  const [diplomaNo, setDiplomaNo] = useState('');
  const [edevletBarkod, setEdevletBarkod] = useState('');
  const [unvan, setUnvan] = useState<string | null>(null);
  const [ilId, setIlId] = useState<number | null>(null);
  const [ilceId, setIlceId] = useState<number | null>(null);
  const [branslar, setBranslar] = useState<number[]>([]);
  const [sifre, setSifre] = useState('');
  const [sifre2, setSifre2] = useState('');
  const [kvkk, setKvkk] = useState(false);
  const [sozlesme, setSozlesme] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const [doneStep, setDoneStep] = useState<string | null>(null);

  const selectedPkg = useMemo(
    () => packages.find((p) => p.id === paketId) ?? null,
    [packages, paketId],
  );

  const pkgPrice = useCallback(
    (p: PkgItem) => {
      if (period === 'yillik') {
        return p.yillik_indirimli_fiyat ?? p.yillik_fiyat ?? 0;
      }
      return p.aylik_indirimli_fiyat ?? p.aylik_fiyat ?? 0;
    },
    [period],
  );

  useEffect(() => {
    if (mode !== 'register') return;
    let cancelled = false;
    void (async () => {
      setMetaLoading(true);
      setError(null);
      try {
        const [metaRes, pkgRes, pending] = await Promise.all([
          fetch(`${API_URL}/doctor/auth/register-meta`, {
            headers: { Accept: 'application/json' },
          }),
          fetch(`${API_URL}/app/packages-catalog`, {
            headers: { Accept: 'application/json' },
          }),
          loadPendingIap(),
        ]);
        if (!metaRes.ok) throw new Error(`meta HTTP ${metaRes.status}`);
        const metaJson = await metaRes.json();
        if (cancelled) return;
        if (metaJson.success && metaJson.data) {
          setMeta(metaJson.data as Meta);
        } else {
          setError(metaJson.message ?? 'Kayıt formu verisi alınamadı.');
        }
        let items: PkgItem[] = [];
        if (pkgRes.ok) {
          const pkgJson = await pkgRes.json();
          items = (pkgJson.data?.items ?? pkgJson.data ?? []) as PkgItem[];
          setPackages(Array.isArray(items) ? items : []);
        }
        // Tanıtım (onboarding) paket seçimi → kayıtta aynı paket (site akışı)
        if (pending?.paketId) {
          setPaketId(pending.paketId);
          if (pending.period === 'aylik' || pending.period === 'yillik') {
            setPeriod(pending.period);
          }
          const exists = items.some((p) => p.id === pending.paketId);
          if (exists) {
            setRegStep('account');
          }
        }
      } catch {
        if (!cancelled) {
          setMeta(null);
          setError(
            'Kayıt formu yüklenemedi. API sunucusuna ulaşılamıyor (yerelde artisan serve :8000 + USE_LOCAL_API=1).',
          );
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, metaRetry]);

  useEffect(() => {
    if (!ilId) {
      setIlceler([]);
      setIlceId(null);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`${API_URL}/doctor/auth/register-meta/ilceler?il_id=${ilId}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setIlceler(json.data?.ilceler ?? []);
        setIlceId(null);
      } catch {
        setIlceler([]);
      }
    })();
  }, [ilId]);

  useEffect(() => {
    if (resetToken) setRToken(resetToken);
    if (resetEmail) setREmail(resetEmail);
  }, [resetToken, resetEmail]);

  const submitForgot = useCallback(async () => {
    setError(null);
    setOk(null);
    if (!forgotEmail.trim()) {
      setError('E-posta girin.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/doctor/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ e_posta: forgotEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? 'İstek gönderilemedi.');
        return;
      }
      setOk(json.message ?? 'E-posta gönderildi.');
    } catch {
      setError('Sunucuya ulaşılamadı.');
    } finally {
      setBusy(false);
    }
  }, [forgotEmail]);

  const submitReset = useCallback(async () => {
    setError(null);
    setOk(null);
    if (!rEmail.trim() || !rToken.trim() || rPass.length < 6) {
      setError('E-posta, kod ve en az 6 karakter şifre gerekli.');
      return;
    }
    if (rPass !== rPass2) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/doctor/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          e_posta: rEmail.trim(),
          token: rToken.trim(),
          sifre: rPass,
          sifre_confirmation: rPass2,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? 'Şifre güncellenemedi.');
        return;
      }
      setOk(json.message ?? 'Şifre güncellendi. Giriş yapabilirsiniz.');
      setTimeout(() => onChangeMode('login'), 1200);
    } catch {
      setError('Sunucuya ulaşılamadı.');
    } finally {
      setBusy(false);
    }
  }, [onChangeMode, rEmail, rPass, rPass2, rToken]);

  const goAccountStep = useCallback(() => {
    setError(null);
    if (!paketId) {
      setError('Devam etmek için bir paket seçin (sitedeki gibi önce paket zorunlu).');
      return;
    }
    setRegStep('account');
  }, [paketId]);

  const goVerifyStep = useCallback(() => {
    setError(null);
    if (!adSoyad.trim() || !email.trim() || !telefon.trim() || !unvan || !ilId || !ilceId) {
      setError('Zorunlu alanları doldurun.');
      return;
    }
    if (branslar.length < 1) {
      setError('En az bir branş seçin.');
      return;
    }
    const tc = tcKimlik.replace(/\D/g, '');
    if (tc.length !== 11) {
      setError('T.C. kimlik numarası 11 haneli olmalıdır.');
      return;
    }
    if (sifre.length < 8 || !/[A-Z]/.test(sifre) || !/[a-z]/.test(sifre) || !/\d/.test(sifre)) {
      setError('Şifre en az 8 karakter; büyük harf, küçük harf ve rakam içermelidir.');
      return;
    }
    if (sifre !== sifre2) {
      setError('Şifre tekrarı uyuşmuyor.');
      return;
    }
    setRegStep('verify');
  }, [adSoyad, branslar, email, ilId, ilceId, sifre, sifre2, tcKimlik, telefon, unvan]);

  const submitRegister = useCallback(async () => {
    setError(null);
    if (!paketId) {
      setError('Paket seçimi zorunludur.');
      setRegStep('package');
      return;
    }
    const tc = tcKimlik.replace(/\D/g, '');
    if (tc.length !== 11) {
      setError('T.C. kimlik numarası 11 haneli olmalıdır.');
      return;
    }
    if (!diplomaNo.trim() && !edevletBarkod.trim()) {
      setError('Diploma / tescil no veya e-Devlet barkodu girin.');
      return;
    }
    if (!kvkk || !sozlesme) {
      setError('KVKK ve kullanım koşullarını kabul etmelisiniz.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/doctor/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          ad_soyad: adSoyad.trim(),
          e_posta: email.trim(),
          telefon: telefon.trim(),
          tc_kimlik_no: tc,
          diploma_no: diplomaNo.trim() || null,
          edevlet_barkod: edevletBarkod.trim() || null,
          unvan,
          il_id: ilId,
          ilce_id: ilceId,
          branslar,
          paket_id: paketId,
          kayit_periyot: period,
          kvkk_onay: true,
          sozlesme_onay: true,
          sifre,
          sifre_confirmation: sifre2,
          device: Platform.OS,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.token || !json.data?.doktor) {
        setError(json.message ?? 'Kayıt başarısız.');
        return;
      }
      setDoneMsg(json.message ?? 'Kayıt alındı.');
      setDoneStep(json.data.next_step ?? 'meslek_bekleme');
      setRegStep('done');
      onRegistered({
        token: json.data.token,
        doktor: json.data.doktor,
        next_step: json.data.next_step,
        meslek_dogrulama_durumu: json.data.meslek_dogrulama_durumu,
        message: json.message,
      });
    } catch {
      setError('Sunucuya ulaşılamadı.');
    } finally {
      setBusy(false);
    }
  }, [
    adSoyad,
    branslar,
    diplomaNo,
    edevletBarkod,
    email,
    ilId,
    ilceId,
    kvkk,
    onRegistered,
    paketId,
    period,
    sifre,
    sifre2,
    sozlesme,
    tcKimlik,
    telefon,
    unvan,
  ]);

  if (mode === 'forgot') {
    return (
      <Card style={styles.card} elevated>
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>ŞİFRE</Text>
        </View>
        <Text style={styles.title}>Şifremi unuttum</Text>
        <Text style={styles.desc}>Kayıtlı e-postanıza sıfırlama kodu gönderilir. Tüm adımlar uygulama içinde.</Text>
        <TextField
          label="E-posta"
          value={forgotEmail}
          onChangeText={setForgotEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="hekim@ornek.com"
        />
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}
        <Button
          label="Sıfırlama maili gönder"
          loading={busy}
          disabled={busy}
          onPress={() => void submitForgot()}
          style={styles.btn}
        />
        <Pressable onPress={() => onChangeMode('login')} hitSlop={8}>
          <Text style={styles.link}>Girişe dön</Text>
        </Pressable>
        <Pressable onPress={() => onChangeMode('reset')} hitSlop={8}>
          <Text style={[styles.linkSoft, { marginTop: 12 }]}>E-postadaki kod ile şifre belirle</Text>
        </Pressable>
      </Card>
    );
  }

  if (mode === 'reset') {
    return (
      <Card style={styles.card} elevated>
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>YENİ ŞİFRE</Text>
        </View>
        <Text style={styles.title}>Yeni şifre belirle</Text>
        <Text style={styles.desc}>E-postadaki kodu girin. Siteye gitmenize gerek yok.</Text>
        <TextField
          label="E-posta"
          value={rEmail}
          onChangeText={setREmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField
          label="E-postadaki kod"
          value={rToken}
          onChangeText={setRToken}
          autoCapitalize="none"
        />
        <TextField label="Yeni şifre" value={rPass} onChangeText={setRPass} secureTextEntry />
        <TextField label="Şifre tekrar" value={rPass2} onChangeText={setRPass2} secureTextEntry />
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}
        <Button
          label="Şifreyi güncelle"
          loading={busy}
          disabled={busy}
          onPress={() => void submitReset()}
          style={styles.btn}
        />
        <Pressable onPress={() => onChangeMode('login')} hitSlop={8}>
          <Text style={styles.link}>Girişe dön</Text>
        </Pressable>
      </Card>
    );
  }

  if (mode === 'register') {
    const stepLabel =
      regStep === 'package'
        ? '1/3 · Paket'
        : regStep === 'account'
          ? '2/3 · Hesap'
          : regStep === 'verify'
            ? '3/3 · Doğrulama'
            : 'Tamam';

    return (
      <Card style={styles.card} elevated>
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{stepLabel}</Text>
        </View>
        <Text style={styles.title}>
          {regStep === 'package'
            ? 'Paket seçin'
            : regStep === 'account'
              ? 'Hesap bilgileri'
              : regStep === 'verify'
                ? 'Meslek & yasal onay'
                : 'Kayıt alındı'}
        </Text>
        <Text style={styles.desc}>
          {regStep === 'package'
            ? 'Site kaydıyla aynı: önce paket, sonra hesap + meslek doğrulama. Ödeme meslek onayı sonrası.'
            : regStep === 'account'
              ? selectedPkg
                ? `Seçili paket: ${selectedPkg.ad}. Kimlik ve iletişim bilgilerinizi girin.`
                : 'Kimlik ve iletişim bilgilerinizi girin.'
              : regStep === 'verify'
                ? 'e-Devlet barkodu veya diploma no + KVKK onayı (site ile aynı zorunluluklar).'
                : doneMsg ?? 'Devam edebilirsiniz.'}
        </Text>

        {/* Step progress */}
        {regStep !== 'done' ? (
          <View style={styles.stepDots}>
            {(['package', 'account', 'verify'] as RegStep[]).map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  (regStep === s ||
                    (regStep === 'account' && s === 'package') ||
                    (regStep === 'verify' && (s === 'package' || s === 'account'))) &&
                    styles.stepDotOn,
                ]}
              />
            ))}
          </View>
        ) : null}

        {metaLoading && !meta ? (
          <View style={{ marginVertical: 24, alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={colors.brand.orange} />
            <Text style={styles.desc}>Form ve paketler yükleniyor…</Text>
          </View>
        ) : !meta ? (
          <View style={{ marginVertical: 16, gap: 12 }}>
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <Button
              label="Tekrar dene"
              onPress={() => {
                setError(null);
                setMetaRetry((n) => n + 1);
              }}
              style={styles.btn}
            />
          </View>
        ) : regStep === 'package' ? (
          <>
            <View style={styles.periodRow}>
              <Pressable
                style={[styles.periodBtn, period === 'aylik' && styles.periodOn]}
                onPress={() => setPeriod('aylik')}
              >
                <Text style={[styles.periodTxt, period === 'aylik' && styles.periodTxtOn]}>Aylık</Text>
              </Pressable>
              <Pressable
                style={[styles.periodBtn, period === 'yillik' && styles.periodOn]}
                onPress={() => setPeriod('yillik')}
              >
                <Text style={[styles.periodTxt, period === 'yillik' && styles.periodTxtOn]}>
                  Yıllık
                </Text>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }} nestedScrollEnabled>
              {packages.length === 0 ? (
                <Text style={styles.desc}>Aktif paket bulunamadı.</Text>
              ) : (
                packages.map((p) => {
                  const price = pkgPrice(p);
                  const selected = paketId === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setPaketId(p.id)}
                      style={[styles.pkgCard, selected && styles.pkgCardOn]}
                    >
                      <View style={styles.pkgHead}>
                        <Text style={styles.pkgName}>{p.ad}</Text>
                        {p.populer_mi || p.etiket ? (
                          <View style={styles.pkgTag}>
                            <Text style={styles.pkgTagTxt}>{p.etiket ?? 'Öne çıkan'}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.pkgTur}>
                        {p.tur === 'klinik' ? 'Klinik' : 'Bireysel'}
                      </Text>
                      <Text style={styles.pkgPrice}>
                        {price <= 0
                          ? 'Ücretsiz'
                          : `${price.toLocaleString('tr-TR')} ₺ / ${period === 'yillik' ? 'yıl' : 'ay'}`}
                      </Text>
                      {p.aciklama ? (
                        <Text style={styles.pkgDesc} numberOfLines={2}>
                          {p.aciklama}
                        </Text>
                      ) : null}
                      {selected ? (
                        <View style={styles.pkgCheck}>
                          <AppIcon name="check" size={14} color="#FFF" />
                          <Text style={styles.pkgCheckTxt}>Seçildi</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <Button label="Devam — hesap bilgileri" onPress={goAccountStep} style={styles.btn} />
          </>
        ) : regStep === 'account' ? (
          <>
            {selectedPkg ? (
              <View style={styles.pkgSummary}>
                <Text style={styles.pkgSummaryTxt}>
                  Paket: {selectedPkg.ad} · {period === 'yillik' ? 'Yıllık' : 'Aylık'}
                </Text>
                <Pressable onPress={() => setRegStep('package')}>
                  <Text style={styles.linkSoft}>Değiştir</Text>
                </Pressable>
              </View>
            ) : null}
            <TextField label="Ad soyad" value={adSoyad} onChangeText={setAdSoyad} />
            <TextField
              label="T.C. kimlik no"
              value={tcKimlik}
              onChangeText={setTcKimlik}
              keyboardType="number-pad"
              maxLength={11}
              placeholder="11 haneli"
            />
            <TextField
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextField
              label="Telefon"
              value={telefon}
              onChangeText={setTelefon}
              keyboardType="phone-pad"
              placeholder="05xx xxx xx xx"
            />
            <SelectField
              label="Unvan"
              placeholder="Seçin…"
              searchable
              options={meta.unvanlar.map((u) => ({ label: u.ad, value: u.ad }))}
              value={unvan}
              onChange={setUnvan}
            />
            <SelectField
              label="İl"
              placeholder="İl seçin…"
              searchable
              options={meta.iller.map((i) => ({ label: i.ad, value: i.id }))}
              value={ilId}
              onChange={setIlId}
            />
            <SelectField
              label="İlçe"
              placeholder="İlçe seçin…"
              searchable
              options={ilceler.map((i) => ({ label: i.ad, value: i.id }))}
              value={ilceId}
              onChange={setIlceId}
              disabled={!ilId}
            />
            <SelectField
              label="Branşlar"
              placeholder="Branş seçin…"
              multiple
              searchable
              options={meta.branslar.map((b) => ({ label: b.ad, value: b.id }))}
              value={branslar}
              onChange={setBranslar}
            />
            <TextField label="Şifre" value={sifre} onChangeText={setSifre} secureTextEntry />
            <TextField label="Şifre tekrar" value={sifre2} onChangeText={setSifre2} secureTextEntry />
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <Button label="Devam — meslek doğrulama" onPress={goVerifyStep} style={styles.btn} />
            <Pressable onPress={() => setRegStep('package')} hitSlop={8}>
              <Text style={styles.linkSoft}>← Paket seçimine dön</Text>
            </Pressable>
          </>
        ) : regStep === 'verify' ? (
          <>
            <Text style={styles.desc}>
              Site kaydıyla aynı: e-Devlet mezuniyet barkodu veya diploma/tescil no ile meslek
              doğrulama kuyruğuna alınır. Onaylanmadan ödeme/panel tam açılmaz.
            </Text>
            <TextField
              label="e-Devlet barkod (önerilen)"
              value={edevletBarkod}
              onChangeText={setEdevletBarkod}
              autoCapitalize="characters"
              placeholder="Belge barkodu"
            />
            <TextField
              label="Diploma / tescil no"
              value={diplomaNo}
              onChangeText={setDiplomaNo}
              placeholder="Barkod yoksa zorunlu"
            />
            <Pressable style={styles.checkRow} onPress={() => setKvkk((v) => !v)}>
              <View style={[styles.checkbox, kvkk && styles.checkboxOn]}>
                {kvkk ? <AppIcon name="check" size={12} color="#FFF" /> : null}
              </View>
              <Text style={styles.checkTxt}>KVKK aydınlatma metnini okudum ve kabul ediyorum.</Text>
            </Pressable>
            <Pressable style={styles.checkRow} onPress={() => setSozlesme((v) => !v)}>
              <View style={[styles.checkbox, sozlesme && styles.checkboxOn]}>
                {sozlesme ? <AppIcon name="check" size={12} color="#FFF" /> : null}
              </View>
              <Text style={styles.checkTxt}>Kullanım koşullarını kabul ediyorum.</Text>
            </Pressable>
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <Button
              label="Kaydı tamamla"
              loading={busy}
              disabled={busy}
              onPress={() => void submitRegister()}
              style={styles.btn}
            />
            <Pressable onPress={() => setRegStep('account')} hitSlop={8}>
              <Text style={styles.linkSoft}>← Hesap bilgilerine dön</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.doneBox}>
              <AppIcon
                name={doneStep === 'payment' ? 'package' : 'time'}
                size={28}
                color={colors.brand.orange}
              />
              <Text style={styles.doneTitle}>
                {doneStep === 'payment' ? 'Ödeme adımına hazırsınız' : 'Meslek onayı bekleniyor'}
              </Text>
              <Text style={styles.desc}>{doneMsg}</Text>
              {doneStep === 'meslek_bekleme' ? (
                <Text style={styles.desc}>
                  Yönetici onayından sonra seçtiğiniz paketi aktifleştirebilir / ödeyebilirsiniz.
                  Panelde paket ekranından devam edin.
                </Text>
              ) : (
                <Text style={styles.desc}>
                  Giriş sonrası paket / abonelik ekranından ödemeyi tamamlayın.
                </Text>
              )}
            </View>
          </>
        )}

        {regStep !== 'done' ? (
          <Pressable onPress={() => onChangeMode('login')} hitSlop={8}>
            <Text style={styles.link}>Zaten hesabım var — giriş</Text>
          </Pressable>
        ) : null}
      </Card>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 18,
    marginTop: 4,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.input,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  badgeTxt: {
    color: colors.brand.orangeSoft,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text.heading,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  desc: {
    color: colors.text.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    fontWeight: '500',
  },
  err: { color: colors.status.error, marginTop: 10, fontSize: 13, fontWeight: '600' },
  ok: { color: colors.status.success, marginTop: 10, fontSize: 13, fontWeight: '600' },
  btn: { marginTop: 12 },
  link: {
    color: colors.brand.orangeSoft,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
    fontSize: 14,
  },
  linkSoft: {
    color: colors.text.muted,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 13,
    marginTop: 10,
  },
  stepDots: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  stepDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  stepDotOn: { backgroundColor: colors.brand.orange },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  periodOn: { backgroundColor: '#FFFFFF' },
  periodTxt: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
  periodTxtOn: { color: '#0F172A', fontWeight: '700' },
  pkgCard: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FAFBFC',
  },
  pkgCardOn: {
    borderColor: colors.brand.orange,
    backgroundColor: '#FFF7ED',
  },
  pkgHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pkgName: { color: '#0F172A', fontSize: 15, fontWeight: '800', flex: 1 },
  pkgTag: {
    backgroundColor: '#EE7D31',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pkgTagTxt: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  pkgTur: { color: '#64748B', fontSize: 11, fontWeight: '600', marginTop: 4 },
  pkgPrice: { color: '#C96A2B', fontSize: 16, fontWeight: '800', marginTop: 6 },
  pkgDesc: { color: '#64748B', fontSize: 12, marginTop: 6, lineHeight: 17 },
  pkgCheck: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.brand.orange,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pkgCheckTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  pkgSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  pkgSummaryTxt: { color: '#C96A2B', fontWeight: '700', fontSize: 13, flex: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.brand.orange, borderColor: colors.brand.orange },
  checkTxt: { flex: 1, color: '#334155', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  doneBox: { alignItems: 'center', paddingVertical: 12, gap: 8 },
  doneTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
  },
});
