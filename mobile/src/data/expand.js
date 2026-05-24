import { RRule } from 'rrule';

const ABSURD_FUTURE = new Date('2999-12-31T00:00:00Z');

export function parseRule(rruleStr, dtstart) {
  if (!rruleStr) return null;
  const opts = RRule.parseString(rruleStr);
  return new RRule({ ...opts, dtstart });
}

export function ruleHasCount(rruleStr) {
  return /(^|;)COUNT=/i.test(rruleStr ?? '');
}

export function buildRRuleString(opts) {
  const rule = new RRule(opts);
  return rule.toString().replace(/^RRULE:/, '').replace(/^DTSTART:[^\n]+\n?/m, '');
}

function exceptionKey(booking, occurrenceDate) {
  return `${booking.id}|${occurrenceDate.toISOString()}`;
}

function indexExceptions(exceptions) {
  const map = new Map();
  for (const ex of exceptions) {
    map.set(`${ex.bookingId}|${ex.occurrenceAt.toISOString()}`, ex);
  }
  return map;
}

export function expandBookings(bookings, exceptions, windowStart, windowEnd) {
  const exceptionByKey = indexExceptions(exceptions);
  const events = [];

  for (const booking of bookings) {
    if (!booking.rrule) {
      if (booking.end > windowStart && booking.start < windowEnd) {
        events.push({
          bookingId: booking.id,
          teamId: booking.teamId,
          title: booking.title,
          color: booking.color,
          description: booking.description,
          start: booking.start,
          end: booking.end,
          occurrenceAt: null,
          isRecurring: false,
          rrule: null,
        });
      }
      continue;
    }

    const rule = parseRule(booking.rrule, booking.start);
    if (!rule) continue;

    const durationMs = booking.end.getTime() - booking.start.getTime();

    const occurrences = rule.between(
      new Date(windowStart.getTime() - durationMs),
      windowEnd,
      true
    );

    for (const occStart of occurrences) {
      const key = exceptionKey(booking, occStart);
      const ex = exceptionByKey.get(key);

      if (ex?.deleted) continue;

      const start = ex?.start ?? occStart;
      const end = ex?.end ?? new Date(occStart.getTime() + durationMs);
      const teamId = ex?.teamId ?? booking.teamId;
      const title = ex?.title ?? booking.title;
      const color = ex?.color ?? booking.color;
      const description = ex?.description ?? booking.description;

      if (end <= windowStart || start >= windowEnd) continue;

      events.push({
        bookingId: booking.id,
        teamId,
        title,
        color,
        description,
        start,
        end,
        occurrenceAt: occStart,
        isRecurring: true,
        rrule: booking.rrule,
      });
    }
  }

  return events;
}

export function splitRecurrence(rruleStr, dtstart, splitAt) {
  const opts = RRule.parseString(rruleStr);
  const ruleWithStart = new RRule({ ...opts, dtstart });

  const past = ruleWithStart.between(dtstart, new Date(splitAt.getTime() - 1), true);
  const pastCount = past.length;

  const oldOpts = { ...opts };
  delete oldOpts.count;
  oldOpts.until = new Date(splitAt.getTime() - 1000);
  const oldRRule = buildRRuleString(oldOpts);

  const newOpts = { ...opts };
  delete newOpts.until;
  if (opts.count != null) {
    const remaining = opts.count - pastCount;
    newOpts.count = remaining > 0 ? remaining : 1;
  }
  const newRRule = buildRRuleString(newOpts);

  return { oldRRule, newRRule, pastCount };
}
