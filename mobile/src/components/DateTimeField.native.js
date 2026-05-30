import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

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

function generateTimeSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    slots.push({ hours: h, minutes: 0 });
    slots.push({ hours: h, minutes: 30 });
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function formatSlot(slot) {
  const d = new Date(0);
  d.setHours(slot.hours, slot.minutes);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDate(d) {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(d) {
  const r = roundToHalfHour(d);
  return r.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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

  const selectTime = (slot) => {
    const next = new Date(value);
    next.setHours(slot.hours, slot.minutes, 0, 0);
    onChange(next);
    setShowTime(false);
  };

  const rounded = roundToHalfHour(value);
  const selectedIndex = rounded.getHours() * 2 + (rounded.getMinutes() === 30 ? 1 : 0);

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
      <Modal
        visible={showTime}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTime(false)}
      >
        <Pressable style={styles.timeBackdrop} onPress={() => setShowTime(false)}>
          <Pressable style={styles.timeSheet} onPress={() => {}}>
            <Text style={styles.timeTitle}>Select time</Text>
            <FlatList
              data={TIME_SLOTS}
              keyExtractor={(_, i) => String(i)}
              initialScrollIndex={Math.max(0, selectedIndex - 3)}
              getItemLayout={(_, index) => ({ length: TIME_ITEM_HEIGHT, offset: TIME_ITEM_HEIGHT * index, index })}
              style={styles.timeList}
              renderItem={({ item, index }) => {
                const selected = index === selectedIndex;
                return (
                  <Pressable
                    style={[styles.timeItem, selected && styles.timeItemSelected]}
                    onPress={() => selectTime(item)}
                  >
                    <Text style={[styles.timeItemText, selected && styles.timeItemTextSelected]}>
                      {formatSlot(item)}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const TIME_ITEM_HEIGHT = 48;

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
  timeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  timeSheet: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingTop: 16,
    paddingBottom: 8,
    maxHeight: 400,
  },
  timeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202124',
    textAlign: 'center',
    marginBottom: 8,
  },
  timeList: { flexGrow: 0 },
  timeItem: {
    height: TIME_ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  timeItemSelected: { backgroundColor: '#e8f0fe' },
  timeItemText: { fontSize: 16, color: '#202124' },
  timeItemTextSelected: { color: '#1a73e8', fontWeight: '600' },
});
