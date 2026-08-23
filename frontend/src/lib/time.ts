import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";

dayjs.extend(relativeTime);
dayjs.extend(utc);

// Backend stores UTC; some timestamps miss the trailing Z.
function normalize(iso: string): dayjs.Dayjs {
  if (!iso) return dayjs();
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
  return hasTz ? dayjs(iso) : dayjs.utc(iso).local();
}

export function timeAgo(iso: string): string {
  return normalize(iso).fromNow();
}

export function formatDateTime(iso: string): string {
  return normalize(iso).format("MMM D, YYYY · h:mm A");
}
