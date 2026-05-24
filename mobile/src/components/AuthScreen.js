import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../data/supabase';
import { usernameToEmail, validateUsername } from '../data/username';

const MODES = [
  { value: 'signin', label: 'Sign in' },
  { value: 'signup', label: 'Sign up' },
];

function isAlreadyRegistered(error) {
  const msg = (error?.message ?? '').toLowerCase();
  return (
    msg.includes('already registered') ||
    msg.includes('user already') ||
    msg.includes('already exists')
  );
}

function isInvalidCredentials(error) {
  const msg = (error?.message ?? '').toLowerCase();
  return msg.includes('invalid login') || msg.includes('invalid credentials');
}

function sanitizeMessage(message) {
  if (!message) return 'Something went wrong.';
  return message
    .replace(/[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]+/gi, (m) => m.split('@')[0])
    .replace(/\bEmail address\b/g, 'Username')
    .replace(/\bemail address\b/g, 'username')
    .replace(/\bEmail\b/g, 'Username')
    .replace(/\bemail\b/g, 'username');
}

export default function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const email = usernameToEmail(username);
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(
            isInvalidCredentials(error)
              ? 'Wrong username or password.'
              : sanitizeMessage(error.message)
          );
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(
            isAlreadyRegistered(error)
              ? 'That username is already taken.'
              : sanitizeMessage(error.message)
          );
        }
      }
    } catch (err) {
      setError(sanitizeMessage(err.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>GoatPlanner</Text>
        <Text style={styles.subtitle}>Sign in to your bookings</Text>

        <View style={styles.modeRow}>
          {MODES.map((m) => {
            const selected = m.value === mode;
            return (
              <Pressable
                key={m.value}
                onPress={() => {
                  setMode(m.value);
                  setError(null);
                }}
                style={[styles.modeBtn, selected && styles.modeBtnSelected]}
              >
                <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={(t) => setUsername(t.toLowerCase())}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          placeholder="e.g. duongmui"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          placeholder="at least 6 characters"
          style={styles.input}
          onSubmitEditing={submit}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.btn, styles.btnPrimary, busy && styles.btnDisabled]}
          disabled={busy}
          onPress={submit}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f4',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  modeBtnSelected: { backgroundColor: '#fff' },
  modeText: { fontSize: 14, color: '#555' },
  modeTextSelected: { color: '#202124', fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  error: {
    marginTop: 12,
    backgroundColor: '#fdecea',
    color: '#a4180c',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    fontSize: 13,
  },
  btn: { marginTop: 18, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#4285F4' },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
});
