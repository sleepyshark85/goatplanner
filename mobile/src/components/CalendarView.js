import { CalendarBody, CalendarContainer, CalendarHeader } from '@howljs/calendar-kit';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const VIEW_MODES = [
  { label: 'Day', days: 1 },
  { label: 'Week', days: 7 },
];

export default function CalendarView({
  events,
  teams,
  numberOfDays,
  onChangeView,
  onPressEvent,
  onPressBackground,
  onPressTeam,
}) {
  const calendarRef = useRef(null);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.navGroup}>
          <Pressable
            style={styles.navBtn}
            onPress={() => calendarRef.current?.goToPrevPage(true)}
          >
            <Text style={styles.navIcon}>‹</Text>
          </Pressable>
          <Pressable
            style={[styles.navBtn, styles.todayBtn]}
            onPress={() =>
              calendarRef.current?.goToDate({
                date: new Date(),
                hourScroll: true,
                animatedDate: true,
              })
            }
          >
            <Text style={styles.todayText}>Today</Text>
          </Pressable>
          <Pressable
            style={styles.navBtn}
            onPress={() => calendarRef.current?.goToNextPage(true)}
          >
            <Text style={styles.navIcon}>›</Text>
          </Pressable>
        </View>

        <View style={styles.modeToggle}>
          {VIEW_MODES.map((m) => {
            const selected = m.days === numberOfDays;
            return (
              <Pressable
                key={m.days}
                onPress={() => onChangeView(m.days)}
                style={[styles.modeBtn, selected && styles.modeBtnSelected]}
              >
                <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.calendarWrap}>
        <CalendarContainer
          ref={calendarRef}
          numberOfDays={numberOfDays}
          events={events}
          scrollByDay={numberOfDays === 1}
          onPressEvent={(evt) => {
            const occ = evt._occurrence;
            if (occ) onPressEvent(occ);
          }}
          onPressBackground={(dateObj) => {
            const iso = dateObj?.dateTime ?? dateObj;
            const d = new Date(iso);
            if (!isNaN(d.getTime())) onPressBackground(d);
          }}
        >
          <CalendarHeader />
          <CalendarBody />
        </CalendarContainer>
      </View>

      <View style={styles.legend}>
        {teams.map((t) => (
          <Pressable
            key={t.id}
            style={styles.legendItem}
            onPress={() => onPressTeam?.(t)}
          >
            <View style={[styles.legendDot, { backgroundColor: t.color }]} />
            <Text style={styles.legendText}>{t.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  navGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f3f4',
    minWidth: 32,
    alignItems: 'center',
  },
  navIcon: { fontSize: 20, lineHeight: 22, color: '#202124' },
  todayBtn: { paddingHorizontal: 14 },
  todayText: { fontSize: 13, fontWeight: '600', color: '#202124' },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f4',
    borderRadius: 8,
    padding: 2,
  },
  modeBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6 },
  modeBtnSelected: { backgroundColor: '#fff' },
  modeText: { fontSize: 13, color: '#555' },
  modeTextSelected: { color: '#202124', fontWeight: '600' },
  calendarWrap: { flex: 1 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#555' },
});
