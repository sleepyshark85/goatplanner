import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function formatDate(d) {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(d) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function DateTimeField({ label, value, onChange }) {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const updateDate = (_, picked) => {
    setShowDate(false);
    if (!picked) return;
    const next = new Date(value);
    next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    onChange(next);
  };

  const updateTime = (_, picked) => {
    setShowTime(false);
    if (!picked) return;
    const next = new Date(value);
    next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    onChange(next);
  };

  return (
    <View style={styles.row}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.fields}>
        <Pressable style={styles.field} onPress={() => setShowDate(true)}>
          <Text style={styles.fieldText}>{formatDate(value)}</Text>
        </Pressable>
        <Pressable style={styles.field} onPress={() => setShowTime(true)}>
          <Text style={styles.fieldText}>{formatTime(value)}</Text>
        </Pressable>
      </View>
      {showDate && (
        <DateTimePicker value={value} mode="date" onChange={updateDate} />
      )}
      {showTime && (
        <DateTimePicker value={value} mode="time" onChange={updateTime} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#333' },
  fields: { flexDirection: 'row', gap: 8 },
  field: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  fieldText: { fontSize: 14, color: '#202124' },
});
