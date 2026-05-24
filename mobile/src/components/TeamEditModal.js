import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { availableTeamColors, TEAM_COLOR_PALETTE } from '../data/store';

export default function TeamEditModal({ team, teams = [], onClose, onSave }) {
  const visible = !!team;
  const [name, setName] = useState('');
  const [color, setColor] = useState(TEAM_COLOR_PALETTE[0]);
  const [description, setDescription] = useState('');

  const palette = useMemo(() => {
    const otherColors = teams
      .filter((t) => t.id !== team?.id)
      .map((t) => t.color);
    const filtered = availableTeamColors(otherColors);
    if (team?.color && !filtered.includes(team.color)) {
      return [team.color, ...filtered];
    }
    return filtered;
  }, [teams, team]);

  useEffect(() => {
    if (team) {
      setName(team.name);
      setColor(team.color);
      setDescription(team.description ?? '');
    }
  }, [team]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || !team) return;
    const desc = description.trim() || null;
    await onSave(team.id, trimmed, color, desc);
    onClose();
  };

  const dirty =
    team &&
    (name.trim() !== team.name ||
      color !== team.color ||
      (description.trim() || null) !== (team.description ?? null));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>Edit team</Text>
            <Text style={styles.subtitle}>Changes apply to all bookings</Text>

            <ScrollView style={{ maxHeight: 480 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                returnKeyType="next"
              />

              <Text style={styles.label}>Color</Text>
              <View style={styles.swatches}>
                {palette.map((c) => {
                  const selected = c === color;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setColor(c)}
                      style={[
                        styles.swatchOuter,
                        selected && styles.swatchOuterSelected,
                      ]}
                    >
                      <View style={[styles.swatch, { backgroundColor: c }]}>
                        {selected && <Text style={styles.swatchCheck}>✓</Text>}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                placeholder="Members, contact, what they do…"
                value={description}
                onChangeText={setDescription}
                style={[styles.input, styles.textarea]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  (!name.trim() || !dirty) && styles.btnDisabled,
                ]}
                disabled={!name.trim() || !dirty}
                onPress={save}
              >
                <Text style={styles.btnPrimaryText}>Save</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textarea: { minHeight: 72 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatchOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchOuterSelected: {
    borderColor: '#202124',
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchCheck: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actions: { gap: 8, marginTop: 20 },
  btn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#4285F4' },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  btnGhost: {},
  btnGhostText: { color: '#555' },
});
