import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toDateInput(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInput(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
          {createElement('input', {
            type: 'time',
            value: toTimeInput(value),
            onChange: handleTime,
            style: inputStyle,
          })}
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
  fieldTime: { flex: 1, minWidth: 100 },
});
