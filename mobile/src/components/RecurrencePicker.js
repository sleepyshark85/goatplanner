import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimeField from './DateTimeField';

const FREQUENCIES = [
  { value: 'NONE', label: 'No repeat' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const END_MODES = [
  { value: 'count', label: 'After' },
  { value: 'until', label: 'On date' },
  { value: 'never', label: 'Never' }
];

const UNIT_LABEL = {
  DAILY: { one: 'day', many: 'days' },
  WEEKLY: { one: 'week', many: 'weeks' },
  MONTHLY: { one: 'month', many: 'months' },
};

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatUntil(d) {
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function buildRRule({ frequency, interval, endMode, count, until }) {
  if (frequency === 'NONE') return null;
  const parts = [`FREQ=${frequency}`];
  if (interval && interval > 1) parts.push(`INTERVAL=${interval}`);
  if (endMode === 'count' && count > 0) parts.push(`COUNT=${count}`);
  if (endMode === 'until' && until) {
    const endOfDay = new Date(until);
    endOfDay.setHours(23, 59, 59, 0);
    parts.push(`UNTIL=${formatUntil(endOfDay)}`);
  }
  return parts.join(';');
}

export default function RecurrencePicker({ value, onChange, startDate }) {
  const [frequency, setFrequency] = useState('NONE');
  const [interval, setInterval] = useState(1);
  const [endMode, setEndMode] = useState('count');
  const [count, setCount] = useState(1);
  const [until, setUntil] = useState(null);

  useEffect(() => {
    if (!until && startDate) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + 3);
      setUntil(d);
    }
  }, [startDate, until]);

  useEffect(() => {
    if (value === null) {
      setFrequency('NONE');
      setInterval(1);
      setEndMode('count');
      setCount(1);
    }
  }, [value]);

  const rrule = useMemo(
    () => buildRRule({ frequency, interval, endMode, count, until }),
    [frequency, interval, endMode, count, until]
  );

  useEffect(() => {
    onChange(rrule);
  }, [rrule, onChange]);

  const unitLabel = useMemo(() => {
    if (frequency === 'NONE') return '';
    const labels = UNIT_LABEL[frequency];
    return interval === 1 ? labels.one : labels.many;
  }, [frequency, interval]);

  const bumpInterval = (delta) => {
    const next = Math.max(1, Math.min(99, interval + delta));
    setInterval(next);
  };

  const bumpCount = (delta) => {
    const next = Math.max(1, Math.min(999, count + delta));
    setCount(next);
  };

  return (
    <View>
      <Text style={styles.label}>Repeat</Text>
      <View style={styles.row}>
        {FREQUENCIES.map((f) => {
          const selected = f.value === frequency;
          return (
            <Pressable
              key={f.value}
              onPress={() => setFrequency(f.value)}
              style={[styles.segment, selected && styles.segmentSelected]}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {frequency !== 'NONE' && (
        <>
          <Text style={styles.subLabel}>Every</Text>
          <View style={styles.stepperRow}>
            <Pressable style={styles.stepperBtn} onPress={() => bumpInterval(-1)}>
              <Text style={styles.stepperBtnText}>−</Text>
            </Pressable>
            <TextInput
              value={String(interval)}
              onChangeText={(t) => {
                const n = parseInt(t, 10);
                if (!isNaN(n) && n > 0) setInterval(Math.min(99, n));
                else if (t === '') setInterval(1);
              }}
              keyboardType="number-pad"
              style={styles.stepperInput}
            />
            <Pressable style={styles.stepperBtn} onPress={() => bumpInterval(1)}>
              <Text style={styles.stepperBtnText}>+</Text>
            </Pressable>
            <Text style={styles.unitText}>{unitLabel}</Text>
          </View>

          <Text style={styles.subLabel}>Ends</Text>
          <View style={styles.row}>
            {END_MODES.map((m) => {
              const selected = m.value === endMode;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => setEndMode(m.value)}
                  style={[styles.segment, selected && styles.segmentSelected]}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {endMode === 'count' && (
            <View style={styles.stepperRow}>
              <Pressable style={styles.stepperBtn} onPress={() => bumpCount(-1)}>
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <TextInput
                value={String(count)}
                onChangeText={(t) => {
                  const n = parseInt(t, 10);
                  if (!isNaN(n) && n > 0) setCount(Math.min(999, n));
                  else if (t === '') setCount(1);
                }}
                keyboardType="number-pad"
                style={styles.stepperInput}
              />
              <Pressable style={styles.stepperBtn} onPress={() => bumpCount(1)}>
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
              <Text style={styles.unitText}>occurrences</Text>
            </View>
          )}

          {endMode === 'until' && until && (
            <View style={styles.untilRow}>
              <DateTimeField label="" value={until} onChange={setUntil} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  subLabel: { fontSize: 12, fontWeight: '500', color: '#666', marginTop: 10, marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  segmentSelected: { borderColor: '#4285F4', backgroundColor: '#e8f0fe' },
  segmentText: { fontSize: 13, color: '#555' },
  segmentTextSelected: { color: '#1a73e8', fontWeight: '600' },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  stepperBtnText: { fontSize: 18, lineHeight: 20, color: '#202124' },
  stepperInput: {
    width: 56,
    height: 32,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: '#fff',
    paddingVertical: 0,
  },
  unitText: { fontSize: 14, color: '#555' },
  untilRow: { marginTop: 6 },
});
