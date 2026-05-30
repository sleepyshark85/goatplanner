import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toDateInput(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function roundToHalfHour(date) {
  const d = new Date(date);
  const mins = d.getMinutes();
  if (mins < 15) {
    d.setMinutes(0, 0, 0);
  } else if (mins < 45) {
    d.setMinutes(30, 0, 0);
  } else {
    d.setHours(d.getHours() + 1, 0, 0, 0);
  }
  return d;
}

function toTimeValue(d) {
  const r = roundToHalfHour(d);
  return `${pad(r.getHours())}:${pad(r.getMinutes())}`;
}

function formatSlot(h, m) {
  const d = new Date(0);
  d.setHours(h, m);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? 0 : 30;
  return { value: `${pad(h)}:${pad(m)}`, label: formatSlot(h, m) };
});

const inputStyle = {
  fontSize: 14,
  padding: 8,
  borderRadius: 6,
  border: '1px solid #ddd',
  backgroundColor: '#fff',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
};

export default function DateTimeField({ label, value, onChange }) {
  const handleDate = (e) => {
    const v = e.target.value;
    if (!v) return;
    const [y, m, d] = v.split('-').map(Number);
    const next = new Date(value);
    next.setFullYear(y, m - 1, d);
    onChange(next);
  };

  const handleTime = (e) => {
    const v = e.target.value;
    if (!v) return;
    const [h, min] = v.split(':').map(Number);
    const next = new Date(value);
    next.setHours(h, min, 0, 0);
    onChange(next);
  };

  return (
    <View style={styles.row}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.fields}>
        <View style={styles.field}>
          {createElement('input', {
            type: 'date',
            value: toDateInput(value),
            onChange: handleDate,
            style: inputStyle,
          })}
        </View>
        <View style={styles.fieldTime}>
          {createElement(
            'select',
            { value: toTimeValue(value), onChange: handleTime, style: inputStyle },
            ...TIME_SLOTS.map((slot) =>
              createElement('option', { key: slot.value, value: slot.value }, slot.label)
            )
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#333' },
  fields: { flexDirection: 'row', gap: 8 },
  field: { flex: 2 },
  fieldTime: { flex: 1, minWidth: 110 },
});
