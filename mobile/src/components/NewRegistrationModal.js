import { useEffect, useMemo, useRef, useState } from 'react';
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
import { TEAM_COLOR_PALETTE } from '../data/store';
import DateTimeField from './DateTimeField';
import RecurrencePicker from './RecurrencePicker';

const DEFAULT_DURATION_MS = 60 * 60_000;

const MODES = [
  { value: 'team', label: 'Team' },
  { value: 'oneoff', label: 'One-off' },
];

export default function NewRegistrationModal({
  start: initialStart,
  teams,
  onClose,
  onCreate,
  onCreateTeam,
}) {
  const visible = !!initialStart;
  const [mode, setMode] = useState('team');
  const [teamId, setTeamId] = useState(null);
  const [oneoffTitle, setOneoffTitle] = useState('');
  const [oneoffColor, setOneoffColor] = useState(TEAM_COLOR_PALETTE[0]);
  const [description, setDescription] = useState('');
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [rrule, setRrule] = useState(null);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLOR_PALETTE[0]);
  const [newTeamDescription, setNewTeamDescription] = useState('');

  const wasVisibleRef = useRef(false);
  useEffect(() => {
    const justOpened = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (justOpened && initialStart) {
      setMode('team');
      setTeamId(teams[0]?.id ?? null);
      setOneoffTitle('');
      setOneoffColor(TEAM_COLOR_PALETTE[0]);
      setDescription('');
      setStart(new Date(initialStart));
      setEnd(new Date(initialStart.getTime() + DEFAULT_DURATION_MS));
      setRrule(null);
      setShowTeamForm(false);
      setNewTeamName('');
      setNewTeamColor(TEAM_COLOR_PALETTE[0]);
      setNewTeamDescription('');
    }
  }, [visible, initialStart, teams]);

  const handleStartChange = (next) => {
    if (!start || !end) {
      setStart(next);
      return;
    }
    const duration = end.getTime() - start.getTime();
    setStart(next);
    setEnd(new Date(next.getTime() + duration));
  };

  const invalidRange = useMemo(
    () => start && end && end.getTime() <= start.getTime(),
    [start, end]
  );

  const canSubmit = useMemo(() => {
    if (!start || !end || invalidRange) return false;
    if (mode === 'team') return !!teamId && !showTeamForm;
    return oneoffTitle.trim().length > 0;
  }, [mode, teamId, oneoffTitle, start, end, invalidRange, showTeamForm]);

  const submit = () => {
    if (!canSubmit) return;
    const desc = description.trim() || null;
    if (mode === 'team') {
      onCreate({ teamId, title: null, color: null, description: desc, start, end, rrule });
    } else {
      onCreate({
        teamId: null,
        title: oneoffTitle.trim(),
        color: oneoffColor,
        description: desc,
        start,
        end,
        rrule,
      });
    }
  };

  const createTeam = async () => {
    const trimmed = newTeamName.trim();
    if (!trimmed) return;
    const desc = newTeamDescription.trim() || null;
    const created = await onCreateTeam(trimmed, newTeamColor, desc);
    if (created?.id) setTeamId(created.id);
    setShowTeamForm(false);
    setNewTeamName('');
    setNewTeamDescription('');
  };

  const cancelTeamForm = () => {
    setShowTeamForm(false);
    setNewTeamName('');
    setNewTeamDescription('');
    setNewTeamColor(TEAM_COLOR_PALETTE[0]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.backdrop} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={styles.sheet}>
            {showTeamForm ? (
              <>
                <Text style={styles.title}>New team</Text>
                <Text style={styles.modalSubtitle}>
                  It will be selected for your booking once created.
                </Text>

                <ScrollView
                  style={styles.scroll}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    placeholder="Team name"
                    value={newTeamName}
                    onChangeText={setNewTeamName}
                    style={styles.input}
                    autoFocus
                    returnKeyType="next"
                  />
                  <Text style={styles.label}>Color</Text>
                  <View style={styles.swatches}>
                    {TEAM_COLOR_PALETTE.map((c) => {
                      const selected = c === newTeamColor;
                      return (
                        <Pressable
                          key={c}
                          onPress={() => setNewTeamColor(c)}
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
                    value={newTeamDescription}
                    onChangeText={setNewTeamDescription}
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
                      !newTeamName.trim() && styles.btnDisabled,
                    ]}
                    disabled={!newTeamName.trim()}
                    onPress={createTeam}
                  >
                    <Text style={styles.btnPrimaryText}>Create team</Text>
                  </Pressable>
                  <Pressable style={[styles.btn, styles.btnGhost]} onPress={cancelTeamForm}>
                    <Text style={styles.btnGhostText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>New booking</Text>

                <View style={styles.modeRow}>
                  {MODES.map((m) => {
                    const selected = m.value === mode;
                    return (
                      <Pressable
                        key={m.value}
                        onPress={() => setMode(m.value)}
                        style={[styles.modeBtn, selected && styles.modeBtnSelected]}
                      >
                        <Text
                          style={[styles.modeText, selected && styles.modeTextSelected]}
                        >
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
                  {mode === 'team' ? (
                    <>
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
                                selected && {
                                  borderColor: t.color,
                                  backgroundColor: `${t.color}22`,
                                },
                              ]}
                            >
                              <View style={[styles.dot, { backgroundColor: t.color }]} />
                              <Text style={styles.chipText}>{t.name}</Text>
                            </Pressable>
                          );
                        })}
                        <Pressable
                          onPress={() => setShowTeamForm(true)}
                          style={[styles.chip, styles.chipNew]}
                        >
                          <Text style={styles.chipNewText}>+ New team</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.label}>Name</Text>
                      <TextInput
                        placeholder="e.g. Acme Corp interview"
                        value={oneoffTitle}
                        onChangeText={setOneoffTitle}
                        style={styles.input}
                        returnKeyType="done"
                      />
                      <Text style={styles.helper}>
                        No team will be created. This name is saved on the booking itself.
                      </Text>
                      <Text style={styles.label}>Color</Text>
                      <View style={styles.swatches}>
                        {TEAM_COLOR_PALETTE.map((c) => {
                          const selected = c === oneoffColor;
                          return (
                            <Pressable
                              key={c}
                              onPress={() => setOneoffColor(c)}
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
                    </>
                  )}

                  {start && end && (
                    <>
                      <View style={styles.timeRow}>
                        <DateTimeField label="Start" value={start} onChange={handleStartChange} />
                      </View>
                      <View style={styles.timeRow}>
                        <DateTimeField label="End" value={end} onChange={setEnd} />
                      </View>
                      {invalidRange && (
                        <Text style={styles.error}>End must be after start.</Text>
                      )}
                    </>
                  )}

                  <RecurrencePicker value={rrule} onChange={setRrule} startDate={start} />

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
                    style={[styles.btn, styles.btnPrimary, !canSubmit && styles.btnDisabled]}
                    disabled={!canSubmit}
                    onPress={submit}
                  >
                    <Text style={styles.btnPrimaryText}>Create booking</Text>
                  </Pressable>
                  <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
                    <Text style={styles.btnGhostText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
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
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  scroll: { flexShrink: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  modalSubtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 8 },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f4',
    borderRadius: 8,
    padding: 3,
    marginTop: 12,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeBtnSelected: { backgroundColor: '#fff' },
  modeText: { fontSize: 13, color: '#555' },
  modeTextSelected: { color: '#202124', fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  helper: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 4 },
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
  chipSelected: { borderColor: '#4285F4', backgroundColor: '#e8f0fe' },
  chipNew: { borderStyle: 'dashed', borderColor: '#4285F4' },
  chipNewText: { fontSize: 13, color: '#4285F4', fontWeight: '600' },
  chipText: { fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: 5 },
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
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
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
  timeRow: { marginTop: 12 },
  error: { color: '#d32f2f', fontSize: 13, marginTop: 8 },
  actions: { gap: 8, marginTop: 16 },
  btn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#4285F4' },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  btnGhost: {},
  btnGhostText: { color: '#555' },
});
