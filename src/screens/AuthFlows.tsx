import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TextField } from '../components/TextField';
import { SelectField } from '../components/SelectField';
import { API_URL } from '../api/client';

export type AuthMode = 'login' | 'forgot' | 'register' | 'reset';

type Meta = {
  unvanlar: { id: number; ad: string }[];
  branslar: { id: number; ad: string }[];
  iller: { id: number; ad: string }[];
};

type Props = {
  mode: AuthMode;
  onChangeMode: (m: AuthMode) => void;
  onRegistered: (token: string, doktor: any) => void;
  /** Pre-fill reset from deep link */
  resetToken?: string | null;
  resetEmail?: string | null;
};

export function AuthFlows({ mode, onChangeMode, onRegistered, resetToken, resetEmail }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Forgot
  const [forgotEmail, setForgotEmail] = useState('');

  // Reset
  const [rEmail, setREmail] = useState(resetEmail ?? '');
  const [rToken, setRToken] = useState(resetToken ?? '');
  const [rPass, setRPass] = useState('');
  const [rPass2, setRPass2] = useState('');

  // Register
  const [meta, setMeta] = useState<Meta | null>(null);
  const [ilceler, setIlceler] = useState<{ id: number; ad: string }[]>([]);
  const [adSoyad, setAdSoyad] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [unvan, setUnvan] = useState<string | null>(null);
  const [ilId, setIlId] = useState<number | null>(null);
  const [ilceId, setIlceId] = useState<number | null>(null);
  const [branslar, setBranslar] = useState<number[]>([]);
  const [sifre, setSifre] = useState('');
  const [sifre2, setSifre2] = useState('');

  useEffect(() => {
    if (mode !== 'register') return;
    void (async () => {
      try {
        const res = await fetch(`${API_URL}/doctor/auth/register-meta`, {
          headers: { Accept: 'application/json' },
        });
        const json = await res.json();
        if (json.success && json.data) setMeta(json.data as Meta);
      } catch {
        setError('Kayıt formu yüklenemedi.');
      }
    })();
  }, [mode]);

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
    if (!rEmail.trim() || !rToken.trim() || !rPass) {
      setError('E-posta, kod/token ve yeni şifre gerekli.');
      return;
    }
    if (rPass !== rPass2) {
      setError('Şifreler uyuşmuyor.');
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
        setError(json.message ?? 'Şifre sıfırlanamadı.');
        return;
      }
      setOk(json.message ?? 'Şifre güncellendi.');
      setTimeout(() => onChangeMode('login'), 1200);
    } catch {
      setError('Sunucuya ulaşılamadı.');
    } finally {
      setBusy(false);
    }
  }, [onChangeMode, rEmail, rPass, rPass2, rToken]);

  const submitRegister = useCallback(async () => {
    setError(null);
    setOk(null);
    if (!adSoyad.trim() || !email.trim() || !telefon.trim() || !unvan || !ilId || !ilceId || branslar.length < 1) {
      setError('Zorunlu alanları doldurun (branş dahil).');
      return;
    }
    if (sifre.length < 8 || sifre !== sifre2) {
      setError('Şifre en az 8 karakter olmalı ve tekrarı ile uyuşmalı.');
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
          unvan,
          il_id: ilId,
          ilce_id: ilceId,
          branslar,
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
      onRegistered(json.data.token, json.data.doktor);
    } catch {
      setError('Sunucuya ulaşılamadı.');
    } finally {
      setBusy(false);
    }
  }, [adSoyad, branslar, email, ilId, ilceId, onRegistered, sifre, sifre2, telefon, unvan]);

  if (mode === 'forgot') {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Şifremi unuttum</Text>
        <Text style={styles.desc}>Kayıtlı e-posta adresinize sıfırlama bağlantısı gönderilir.</Text>
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
        <Button label="Sıfırlama maili gönder" loading={busy} disabled={busy} onPress={() => void submitForgot()} style={styles.btn} />
        <Pressable onPress={() => onChangeMode('login')}>
          <Text style={styles.link}>Girişe dön</Text>
        </Pressable>
        <Pressable onPress={() => onChangeMode('reset')}>
          <Text style={[styles.link, { marginTop: 10 }]}>E-postadaki kod ile şifre belirle</Text>
        </Pressable>
      </Card>
    );
  }

  if (mode === 'reset') {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Yeni şifre</Text>
        <Text style={styles.desc}>
          E-postadaki sıfırlama kodunu (token) ve e-posta adresinizi girin. Linke tıklamanız gerekmez; işlem tamamen uygulama içinde yapılır.
        </Text>
        <TextField label="E-posta" value={rEmail} onChangeText={setREmail} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="E-postadaki kod" value={rToken} onChangeText={setRToken} autoCapitalize="none" />
        <TextField label="Yeni şifre" value={rPass} onChangeText={setRPass} secureTextEntry />
        <TextField label="Şifre tekrar" value={rPass2} onChangeText={setRPass2} secureTextEntry />
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}
        <Button label="Şifreyi güncelle" loading={busy} disabled={busy} onPress={() => void submitReset()} style={styles.btn} />
        <Pressable onPress={() => onChangeMode('login')}>
          <Text style={styles.link}>Girişe dön</Text>
        </Pressable>
      </Card>
    );
  }

  if (mode === 'register') {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Hekim kayıt</Text>
        <Text style={styles.desc}>Hesabınızı oluşturun; ardından paket seçebilirsiniz.</Text>
        {!meta ? (
          <ActivityIndicator color="#F58A45" style={{ marginVertical: 20 }} />
        ) : (
          <>
            <TextField label="Ad soyad" value={adSoyad} onChangeText={setAdSoyad} />
            <TextField label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextField label="Telefon" value={telefon} onChangeText={setTelefon} keyboardType="phone-pad" placeholder="05xx xxx xx xx" />
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
          </>
        )}
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <Button label="Kayıt ol" loading={busy} disabled={busy || !meta} onPress={() => void submitRegister()} style={styles.btn} />
        <Pressable onPress={() => onChangeMode('login')}>
          <Text style={styles.link}>Zaten hesabım var — giriş</Text>
        </Pressable>
      </Card>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: { marginTop: -36, marginHorizontal: 20, padding: 22 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  desc: { color: '#94A7B9', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  err: { color: '#F09AA8', marginTop: 10, fontSize: 13 },
  ok: { color: '#7ED2AB', marginTop: 10, fontSize: 13 },
  btn: { marginTop: 16 },
  link: { color: '#F3A26B', fontWeight: '700', textAlign: 'center', marginTop: 18, fontSize: 14 },
});
