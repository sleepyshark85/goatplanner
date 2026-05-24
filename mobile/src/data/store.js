import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteBooking,
  deleteOccurrence,
  editOccurrence,
  getAllBookings,
  getAllExceptions,
  getAllTeams,
  insertBooking,
  insertTeam,
  rowToBooking,
  rowToException,
  splitSeriesAndEdit,
  updateBooking,
  updateTeam,
} from './db';
import { expandBookings } from './expand';
import { isConfigured, supabase } from './supabase';

export const TEAM_COLOR_PALETTE = [
  '#4285F4',
  '#34A853',
  '#EA4335',
  '#FBBC04',
  '#9C27B0',
  '#FF6D00',
  '#00ACC1',
  '#5D4037',
  '#3F51B5',
  '#E91E63',
];

export function availableTeamColors(takenColors) {
  const taken = new Set(takenColors);
  const filtered = TEAM_COLOR_PALETTE.filter((c) => !taken.has(c));
  return filtered.length > 0 ? filtered : TEAM_COLOR_PALETTE;
}

const EXPANSION_MONTHS_BACK = 6;
const EXPANSION_MONTHS_FORWARD = 18;

function defaultWindow() {
  const start = new Date();
  start.setMonth(start.getMonth() - EXPANSION_MONTHS_BACK);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setMonth(end.getMonth() + EXPANSION_MONTHS_FORWARD);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function rowToTeam(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    description: row.description ?? null,
  };
}

export function useBookingStore() {
  const [teams, setTeams] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isConfigured) {
      setError('Supabase is not configured. See .env.example.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    Promise.all([getAllTeams(), getAllBookings(), getAllExceptions()])
      .then(([t, b, e]) => {
        if (!cancelled) {
          setTeams(t);
          setBookings(b);
          setExceptions(e);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    const teamsChannel = supabase
      .channel('teams-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const t = rowToTeam(payload.new);
          setTeams((prev) =>
            prev.some((x) => x.id === t.id)
              ? prev
              : [...prev, t].sort((a, b) => a.name.localeCompare(b.name))
          );
        } else if (payload.eventType === 'UPDATE') {
          const t = rowToTeam(payload.new);
          setTeams((prev) =>
            prev
              .map((x) => (x.id === t.id ? t : x))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
        } else if (payload.eventType === 'DELETE') {
          setTeams((prev) => prev.filter((x) => x.id !== payload.old.id));
        }
      })
      .subscribe();

    const bookingsChannel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const b = rowToBooking(payload.new);
            setBookings((prev) => (prev.some((x) => x.id === b.id) ? prev : [...prev, b]));
          } else if (payload.eventType === 'UPDATE') {
            const b = rowToBooking(payload.new);
            setBookings((prev) => prev.map((x) => (x.id === b.id ? b : x)));
          } else if (payload.eventType === 'DELETE') {
            setBookings((prev) => prev.filter((x) => x.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const exceptionsChannel = supabase
      .channel('exceptions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exceptions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const e = rowToException(payload.new);
            setExceptions((prev) =>
              prev.some((x) => x.id === e.id) ? prev : [...prev, e]
            );
          } else if (payload.eventType === 'UPDATE') {
            const e = rowToException(payload.new);
            setExceptions((prev) => prev.map((x) => (x.id === e.id ? e : x)));
          } else if (payload.eventType === 'DELETE') {
            setExceptions((prev) => prev.filter((x) => x.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(exceptionsChannel);
    };
  }, []);

  const teamById = useCallback((id) => teams.find((t) => t.id === id), [teams]);
  const bookingById = useCallback((id) => bookings.find((b) => b.id === id), [bookings]);

  const addTeam = useCallback(async (name, color, description = null) => {
    const team = await insertTeam(name, color, description);
    setTeams((prev) =>
      prev.some((t) => t.id === team.id)
        ? prev
        : [...prev, team].sort((a, b) => a.name.localeCompare(b.name))
    );
    return team;
  }, []);

  const editTeam = useCallback(async (id, name, color, description = null) => {
    const team = await updateTeam(id, name, color, description);
    setTeams((prev) =>
      prev
        .map((t) => (t.id === id ? team : t))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    return team;
  }, []);

  const addBooking = useCallback(async (params) => {
    const booking = await insertBooking(params);
    setBookings((prev) => (prev.some((b) => b.id === booking.id) ? prev : [...prev, booking]));
    return booking;
  }, []);

  const editOccurrenceOnly = useCallback(async (booking, occurrenceAt, overrides) => {
    const ex = await editOccurrence(booking.id, occurrenceAt, overrides);
    setExceptions((prev) => {
      const without = prev.filter(
        (e) =>
          !(e.bookingId === ex.bookingId && e.occurrenceAt.getTime() === ex.occurrenceAt.getTime())
      );
      return [...without, ex];
    });
    return ex;
  }, []);

  const editFromOccurrence = useCallback(async (booking, occurrenceAt, fields) => {
    if (!booking.rrule) {
      const updated = await updateBooking(booking.id, fields);
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      return { oldBooking: null, newBooking: updated };
    }
    const isFirstOccurrence = occurrenceAt.getTime() === booking.start.getTime();
    if (isFirstOccurrence) {
      const updated = await updateBooking(booking.id, fields);
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      return { oldBooking: null, newBooking: updated };
    }
    const result = await splitSeriesAndEdit(booking, occurrenceAt, fields);
    setBookings((prev) => {
      const swapped = prev.map((b) =>
        b.id === result.oldBooking.id ? result.oldBooking : b
      );
      return swapped.some((b) => b.id === result.newBooking.id)
        ? swapped
        : [...swapped, result.newBooking];
    });
    return result;
  }, []);

  const removeOccurrence = useCallback(async (bookingId, occurrenceAt) => {
    const ex = await deleteOccurrence(bookingId, occurrenceAt);
    setExceptions((prev) => {
      const without = prev.filter(
        (e) =>
          !(e.bookingId === ex.bookingId && e.occurrenceAt.getTime() === ex.occurrenceAt.getTime())
      );
      return [...without, ex];
    });
    return ex;
  }, []);

  const removeBooking = useCallback(async (bookingId) => {
    await deleteBooking(bookingId);
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    setExceptions((prev) => prev.filter((e) => e.bookingId !== bookingId));
  }, []);

  const events = useMemo(() => {
    const window = defaultWindow();
    const expanded = expandBookings(bookings, exceptions, window.start, window.end);
    return expanded.map((occ) => {
      let displayName;
      let displayColor;
      if (occ.teamId) {
        const team = teams.find((t) => t.id === occ.teamId);
        displayName = team?.name ?? 'Unknown';
        displayColor = team?.color ?? '#888';
      } else {
        displayName = occ.title ?? 'Untitled';
        displayColor = occ.color ?? '#888';
      }
      const eventId = occ.occurrenceAt
        ? `${occ.bookingId}#${occ.occurrenceAt.toISOString()}`
        : occ.bookingId;
      const enriched = { ...occ, displayName, displayColor };
      return {
        id: eventId,
        title: displayName,
        start: { dateTime: occ.start.toISOString() },
        end: { dateTime: occ.end.toISOString() },
        color: displayColor,
        _occurrence: enriched,
      };
    });
  }, [bookings, exceptions, teams]);

  return {
    loading,
    error,
    teams,
    teamById,
    bookingById,
    events,
    addTeam,
    editTeam,
    addBooking,
    editOccurrenceOnly,
    editFromOccurrence,
    removeOccurrence,
    removeBooking,
  };
}
