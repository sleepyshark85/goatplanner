import { splitRecurrence } from './expand';
import { supabase } from './supabase';

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function rowToTeam(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    description: row.description ?? null,
  };
}

export function rowToBooking(row) {
  return {
    id: row.id,
    teamId: row.team_id ?? null,
    title: row.title ?? null,
    color: row.color ?? null,
    description: row.description ?? null,
    start: new Date(row.start_at),
    end: new Date(row.end_at),
    rrule: row.rrule ?? null,
  };
}

export function rowToException(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    occurrenceAt: new Date(row.occurrence_at),
    deleted: !!row.deleted,
    teamId: row.team_id ?? null,
    title: row.title ?? null,
    color: row.color ?? null,
    description: row.description ?? null,
    start: row.start_at ? new Date(row.start_at) : null,
    end: row.end_at ? new Date(row.end_at) : null,
  };
}

function throwIfError({ error }, label) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

export async function getAllTeams() {
  const res = await supabase.from('teams').select('*').order('name');
  throwIfError(res, 'getAllTeams');
  return (res.data ?? []).map(rowToTeam);
}

export async function insertTeam(name, color, description = null) {
  const id = genId('t');
  const res = await supabase
    .from('teams')
    .insert({ id, name, color, description })
    .select()
    .single();
  throwIfError(res, 'insertTeam');
  return rowToTeam(res.data);
}

export async function updateTeam(id, name, color, description = null) {
  const res = await supabase
    .from('teams')
    .update({ name, color, description })
    .eq('id', id)
    .select()
    .single();
  throwIfError(res, 'updateTeam');
  return rowToTeam(res.data);
}

export async function getAllBookings() {
  const res = await supabase.from('bookings').select('*').order('start_at');
  throwIfError(res, 'getAllBookings');
  return (res.data ?? []).map(rowToBooking);
}

export async function getAllExceptions() {
  const res = await supabase.from('exceptions').select('*');
  throwIfError(res, 'getAllExceptions');
  return (res.data ?? []).map(rowToException);
}

export async function insertBooking({
  teamId = null,
  title = null,
  color = null,
  description = null,
  start,
  end,
  rrule = null,
}) {
  const id = genId('b');
  const res = await supabase
    .from('bookings')
    .insert({
      id,
      team_id: teamId,
      title,
      color,
      description,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      rrule,
    })
    .select()
    .single();
  throwIfError(res, 'insertBooking');
  return rowToBooking(res.data);
}

export async function updateBooking(id, fields) {
  const payload = {};
  if (fields.teamId !== undefined) payload.team_id = fields.teamId;
  if (fields.title !== undefined) payload.title = fields.title;
  if (fields.color !== undefined) payload.color = fields.color;
  if (fields.description !== undefined) payload.description = fields.description;
  if (fields.start !== undefined) payload.start_at = fields.start.toISOString();
  if (fields.end !== undefined) payload.end_at = fields.end.toISOString();
  if (fields.rrule !== undefined) payload.rrule = fields.rrule;
  const res = await supabase
    .from('bookings')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  throwIfError(res, 'updateBooking');
  return rowToBooking(res.data);
}

export async function deleteBooking(id) {
  const res = await supabase.from('bookings').delete().eq('id', id);
  throwIfError(res, 'deleteBooking');
}

export async function upsertException(bookingId, occurrenceAt, overrides) {
  const payload = {
    id: genId('e'),
    booking_id: bookingId,
    occurrence_at: occurrenceAt.toISOString(),
    deleted: !!overrides.deleted,
    team_id: overrides.teamId ?? null,
    title: overrides.title ?? null,
    color: overrides.color ?? null,
    description: overrides.description ?? null,
    start_at: overrides.start ? overrides.start.toISOString() : null,
    end_at: overrides.end ? overrides.end.toISOString() : null,
  };
  const res = await supabase
    .from('exceptions')
    .upsert(payload, { onConflict: 'booking_id,occurrence_at' })
    .select()
    .single();
  throwIfError(res, 'upsertException');
  return rowToException(res.data);
}

export async function editOccurrence(
  bookingId,
  occurrenceAt,
  { teamId, title, color, description, start, end }
) {
  return upsertException(bookingId, occurrenceAt, {
    deleted: false,
    teamId,
    title,
    color,
    description,
    start,
    end,
  });
}

export async function deleteOccurrence(bookingId, occurrenceAt) {
  return upsertException(bookingId, occurrenceAt, { deleted: true });
}

export async function splitSeriesAndEdit(
  booking,
  occurrenceAt,
  { teamId, title, color, description, start, end }
) {
  const { oldRRule, newRRule } = splitRecurrence(
    booking.rrule,
    booking.start,
    occurrenceAt
  );

  const updatedOld = await updateBooking(booking.id, { rrule: oldRRule });
  const newBooking = await insertBooking({
    teamId: teamId ?? null,
    title: title ?? null,
    color: color ?? null,
    description: description ?? null,
    start,
    end,
    rrule: newRRule,
  });

  return { oldBooking: updatedOld, newBooking };
}
