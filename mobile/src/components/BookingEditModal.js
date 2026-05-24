import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimeField from './DateTimeField';

const SCOPE_OPTIONS = [
  { value: 'single', label: 'Just this one' },
  { value: 'future', label: 'This and following' },
];

export default function BookingEditModal({ occurrence, teams, onClose, onSave }) {
  const visible = !!occurrence;
  const [teamId, setTeamId] = useState(null);
  const [description, setDescription] = useState('');
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [scope, setScope] = useState('single');

  useEffect(() => {
    if (occurrence) {
      setTeamId(occurrence.teamId);
      setDescription(occurrence.description ?? '');
      setStart(new Date(occurrence.start));
      setEnd(new Date(occurrence.end));
      setScope('single');
    }
  }, [occurrence]);

  const handleStartChange = (next) => {
    if (!start || !end) {
      setStart(next);
      return;
    }
    const duration = end.getTime() - start.getTime();
    setStart(next);
    setEnd(new Date(next.getTime() + duration));
  };

  const dirty = useMemo(() => {
    if (!occurrence || !start || !end) return false;
    const currentDesc = description.trim();
    const originalDesc = occurrence.description ?? '';
    return (
      teamId !== occurrence.teamId ||
      currentDesc !== originalDesc ||
      start.getTime() !== occurrence.start.getTime() ||
      end.getTime() !== occurrence.end.getTime()
    );
  }, [occurrence, teamId, description, start, end]);

  const invalidRange = start && end && end.getTime() <= start.getTime();

  const isRecurring = !!occurrence?.isRecurring;

  const submit = async () => {
    if (!occurrence || !start || !end || !teamId || invalidRange) return;
    const effectiveScope = isRecurring ? scope : 'single';
    const desc = description.trim() || null;
    await onSave(effectiveScope, teamId, start, end, desc);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {occurrence && start && end && (
            <>
              <Text style={styles.title}>Edit booking</Text>

              <ScrollView style={{ maxHeight: 460 }}>
                {isRecurring && (
                  <>
                    <Text style={styles.label}>Apply changes to</Text>
                    <View style={styles.scopeRow}>
                      {SCOPE_OPTIONS.map((opt) => {
                        const selected = scope === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            onPress={() => setScope(opt.value)}
                            style={[
                              styles.scopeBtn,
                              selected && styles.scopeBtnSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.scopeText,
                                selected && styles.scopeTextSelected,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Text style={styles.scopeHint}>
                      {scope === 'single'
                        ? 'Only this occurrence will change. The rest of the series stays.'
                        : 'This occurrence and all later ones will change. Past stays unchanged.'}
                    </Text>
                  </>
                )}
                <Text style={styles.label}>Team</Text>
                <View style={styles.grid}>
                  {teams.map((t) => {
                    const selected = t.id === teamId;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => setTeamId(t.id)}
                        style={[
                          styles.chip,
                          selected && { borderColor: t.color, backgroundColor: `${t.color}22` },
                        ]}
                      >
                        <View style={[styles.dot, { backgroundColor: t.color }]} />
                        <Text style={styles.chipText}>{t.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.timeRow}>
                  <DateTimeField label="Start" value={start} onChange={handleStartChange} />
                </View>
                <View style={styles.timeRow}>
                  <DateTimeField label="End" value={end} onChange={setEnd} />
                </View>
                {invalidRange && (
                  <Text style={styles.error}>End must be after start.</Text>
                )}

                <Text style={styles.label}>Description (optional)</Text>
                <TextInput
                  placeholder="Notes, agenda, links…"
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
                    (!dirty || invalidRange) && styles.btnDisabled,
                  ]}
                  disabled={!dirty || invalidRange}
                  onPress={submit}
                >
                  <Text style={styles.btnPrimaryText}>Save changes</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
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
    maxWidth: 480,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  title: { fontSize: 20, fontWeight: '700' },
  scopeRow: { flexDirection: 'row', gap: 8 },
  scopeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  scopeBtnSelected: {
    borderColor: '#4285F4',
    backgroundColor: '#e8f0fe',
  },
  scopeText: { fontSize: 13, color: '#555' },
  scopeTextSelected: { color: '#1a73e8', fontWeight: '600' },
  scopeHint: { fontSize: 12, color: '#666', marginTop: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  chipText: { fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  timeRow: { marginTop: 12 },
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
  error: { color: '#d32f2f', fontSize: 13, marginTop: 8 },
  actions: { gap: 8, marginTop: 16 },
  btn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#4285F4' },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  btnGhost: {},
  btnGhostText: { color: '#555' },
});
