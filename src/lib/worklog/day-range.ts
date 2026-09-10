/** Korean field MVP default when `project.timezone` is empty. No schema change. */
export const WORKLOG_DEFAULT_TIME_ZONE = "Asia/Seoul";

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function resolveWorklogTimeZone(projectTimezone: string | null | undefined) {
  const value = projectTimezone?.trim();
  return value && value.length > 0 ? value : WORKLOG_DEFAULT_TIME_ZONE;
}

export function isWorklogDateYmd(value: string) {
  const match = YMD.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function todayYmd(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function formatWorklogDateLabel(dateYmd: string) {
  const match = YMD.exec(dateYmd);
  if (!match) return dateYmd;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

export type WorklogDayRange = {
  dateYmd: string;
  timeZone: string;
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
};

export function worklogDayRange(dateYmd: string, timeZone: string): WorklogDayRange {
  if (!isWorklogDateYmd(dateYmd)) {
    throw new Error("invalid worklog date");
  }
  const start = localMidnightUtc(dateYmd, timeZone);
  const end = localMidnightUtc(addCalendarDay(dateYmd), timeZone);
  return {
    dateYmd,
    timeZone,
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function isInstantInDay(value: string, range: WorklogDayRange) {
  if (YMD.test(value) && value.length === 10) {
    return value === range.dateYmd;
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) return false;
  return time >= range.start.getTime() && time < range.end.getTime();
}

function addCalendarDay(dateYmd: string) {
  const [year, month, day] = dateYmd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

function localMidnightUtc(dateYmd: string, timeZone: string) {
  const utcGuess = new Date(`${dateYmd}T00:00:00.000Z`);
  const instant = new Date(utcGuess.getTime() - tzOffsetMs(utcGuess, timeZone));
  const adjusted = new Date(utcGuess.getTime() - tzOffsetMs(instant, timeZone));
  return adjusted;
}

function tzOffsetMs(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((item) => item.type === type)?.value;
    return Number(part);
  };
  let hour = value("hour");
  if (hour === 24) hour = 0;
  const asLocal = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    hour,
    value("minute"),
    value("second"),
  );
  const asUtc = Date.UTC(
    instant.getUTCFullYear(),
    instant.getUTCMonth(),
    instant.getUTCDate(),
    instant.getUTCHours(),
    instant.getUTCMinutes(),
    instant.getUTCSeconds(),
  );
  return asLocal - asUtc;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
