import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AuthScreen from './src/components/AuthScreen';
import BookingEditModal from './src/components/BookingEditModal';
import CalendarView from './src/components/CalendarView';
import NewRegistrationModal from './src/components/NewRegistrationModal';
import RegistrationDetailModal from './src/components/RegistrationDetailModal';
import TeamEditModal from './src/components/TeamEditModal';
import { useBookingStore } from './src/data/store';
import { isConfigured, supabase } from './src/data/supabase';
import { emailToUsername } from './src/data/username';

function StatusScreen({ label, color = '#4285F4', spinner = true }) {
  return (
    <View style={styles.loading}>
      {spinner && <ActivityIndicator size="large" color={color} />}
      <Text style={[styles.loadingLabel, { color }]}>{label}</Text>
    </View>
  );
}

function BookingApp({ session }) {
  const store = useBookingStore();
  const [numberOfDays, setNumberOfDays] = useState(7);
  const [detail, setDetail] = useState(null);
  const [createStart, setCreateStart] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingOccurrence, setEditingOccurrence] = useState(null);

  if (store.error) {
    return <StatusScreen label={store.error} color="#d32f2f" spinner={false} />;
  }
  if (store.loading) {
    return <StatusScreen label="Loading bookings…" />;
  }

  const handleCreate = (params) => {
    store.addBooking(params);
    setCreateStart(null);
  };

  const handleEditSave = async (scope, teamId, start, end, description) => {
    if (!editingOccurrence) return;
    const booking = store.bookingById(editingOccurrence.bookingId);
    if (!booking) return;
    const fields = { teamId, start, end, description };
    if (scope === 'single' && editingOccurrence.isRecurring) {
      await store.editOccurrenceOnly(booking, editingOccurrence.occurrenceAt, fields);
    } else {
      await store.editFromOccurrence(
        booking,
        editingOccurrence.occurrenceAt ?? booking.start,
        fields
      );
    }
  };

  const handleDeleteOccurrence = async (occurrence) => {
    if (occurrence.isRecurring) {
      await store.removeOccurrence(occurrence.bookingId, occurrence.occurrenceAt);
    } else {
      await store.removeBooking(occurrence.bookingId);
    }
    setDetail(null);
  };

  const handleDeleteSeries = async (occurrence) => {
    await store.removeBooking(occurrence.bookingId);
    setDetail(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Team Bookings</Text>
          <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          @{emailToUsername(session.user.email)}
        </Text>
      </View>

      <CalendarView
        events={store.events}
        teams={store.teams}
        numberOfDays={numberOfDays}
        onChangeView={setNumberOfDays}
        onPressEvent={(occ) => setDetail(occ)}
        onPressBackground={(date) => setCreateStart(date)}
        onPressTeam={(team) => setEditingTeam(team)}
      />

      <RegistrationDetailModal
        occurrence={detail}
        onClose={() => setDetail(null)}
        onEdit={(occ) => {
          setDetail(null);
          setEditingOccurrence(occ);
        }}
        onDeleteOccurrence={handleDeleteOccurrence}
        onDeleteSeries={handleDeleteSeries}
      />

      <NewRegistrationModal
        start={createStart}
        teams={store.teams}
        onClose={() => setCreateStart(null)}
        onCreate={handleCreate}
        onCreateTeam={store.addTeam}
      />

      <TeamEditModal
        team={editingTeam}
        teams={store.teams}
        onClose={() => setEditingTeam(null)}
        onSave={store.editTeam}
      />

      <BookingEditModal
        occurrence={editingOccurrence}
        teams={store.teams}
        onClose={() => setEditingOccurrence(null)}
        onSave={handleEditSave}
      />
    </>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        {!isConfigured ? (
          <StatusScreen
            label="Supabase is not configured. See .env.example."
            color="#d32f2f"
            spinner={false}
          />
        ) : !authReady ? (
          <StatusScreen label="Checking session…" />
        ) : !session ? (
          <AuthScreen />
        ) : (
          <BookingApp key={session.user.id} session={session} />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  signOutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f3f4',
  },
  signOutText: { fontSize: 12, color: '#5f6368', fontWeight: '500' },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingLabel: { textAlign: 'center' },
});
