import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

function formatRange(start, end) {
  const dateOpts = { weekday: 'short', month: 'short', day: 'numeric' };
  const timeOpts = { hour: 'numeric', minute: '2-digit' };
  return `${start.toLocaleDateString(undefined, dateOpts)} · ${start.toLocaleTimeString(
    undefined,
    timeOpts
  )} – ${end.toLocaleTimeString(undefined, timeOpts)}`;
}

export default function RegistrationDetailModal({
  occurrence,
  onClose,
  onEdit,
  onDeleteOccurrence,
  onDeleteSeries,
}) {
  const visible = !!occurrence;
  const isRecurring = !!occurrence?.isRecurring;
  const displayName = occurrence?.displayName ?? 'Unknown';
  const displayColor = occurrence?.displayColor ?? '#888';
  const isOneoff = !occurrence?.teamId;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {occurrence && (
            <>
              <View style={[styles.swatch, { backgroundColor: displayColor }]} />
              <Text style={styles.title}>{displayName}</Text>
              {isOneoff && <Text style={styles.kindHint}>One-off booking</Text>}
              <Text style={styles.subtitle}>
                {formatRange(occurrence.start, occurrence.end)}
              </Text>
              {isRecurring && (
                <Text style={styles.badge}>Part of a recurring series</Text>
              )}
              {occurrence.description && (
                <Text style={styles.description}>{occurrence.description}</Text>
              )}

              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={() => onEdit(occurrence)}
                >
                  <Text style={styles.btnPrimaryText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnDanger]}
                  onPress={() => onDeleteOccurrence(occurrence)}
                >
                  <Text style={styles.btnDangerText}>
                    {isRecurring ? 'Delete this occurrence' : 'Delete'}
                  </Text>
                </Pressable>
                {isRecurring && (
                  <Pressable
                    style={[styles.btn, styles.btnDangerOutline]}
                    onPress={() => onDeleteSeries(occurrence)}
                  >
                    <Text style={styles.btnDangerOutlineText}>Delete entire series</Text>
                  </Pressable>
                )}
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
                  <Text style={styles.btnGhostText}>Close</Text>
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
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  swatch: { width: 32, height: 6, borderRadius: 3, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  kindHint: { fontSize: 11, color: '#888', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 12 },
  description: {
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    lineHeight: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff3cd',
    color: '#7a5d00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    marginBottom: 16,
  },
  actions: { gap: 8, marginTop: 8 },
  btn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#4285F4' },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnDanger: { backgroundColor: '#d32f2f' },
  btnDangerText: { color: '#fff', fontWeight: '600' },
  btnDangerOutline: { borderWidth: 1, borderColor: '#d32f2f' },
  btnDangerOutlineText: { color: '#d32f2f', fontWeight: '600' },
  btnGhost: {},
  btnGhostText: { color: '#555' },
});
