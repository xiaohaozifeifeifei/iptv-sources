export interface XmltvTimeRange {
  date: string;
  start: string;
  end: string;
}

const DEFAULT_EPG_TIME_ZONE = 'Asia/Shanghai';

function formatInEpgTimeZone(date: Date): {
  date: string;
  time: string;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_EPG_TIME_ZONE,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

/** XMLTV start/stop 格式: 20240314080000 +0800 → 提取 YYYY-mm-dd 与 HH:mm */
export function parseXmltvTimeRange(startStr: string, stopStr: string): XmltvTimeRange | null {
  const start = parseXmltvTimestamp(startStr);
  const stop = parseXmltvTimestamp(stopStr);
  if (!start || !stop) return null;

  const startFormatted = formatInEpgTimeZone(start);
  const stopFormatted = formatInEpgTimeZone(stop);

  return {
    date: startFormatted.date,
    start: startFormatted.time,
    end: stopFormatted.time,
  };
}

/** 将 XMLTV 时间戳（YYYYmmddHHMMSS +ZZZZ）解析为正确的绝对时间。 */
export function parseXmltvTimestamp(timeStr: string): Date | null {
  const match = timeStr?.match(/^(\d{14})(?:\s+([+-])(\d{2})(\d{2}))?$/);
  if (!match) return null;

  const compact = match[1];
  const year = Number(compact.slice(0, 4));
  const month = Number(compact.slice(4, 6)) - 1;
  const day = Number(compact.slice(6, 8));
  const hour = Number(compact.slice(8, 10));
  const minute = Number(compact.slice(10, 12));
  const second = Number(compact.slice(12, 14));
  const sign = match[2];
  const offsetHours = Number(match[3] ?? '0');
  const offsetMinutes = Number(match[4] ?? '0');
  const totalOffsetMinutes =
    sign === '-' ? -(offsetHours * 60 + offsetMinutes) : offsetHours * 60 + offsetMinutes;

  return new Date(Date.UTC(year, month, day, hour, minute - totalOffsetMinutes, second));
}

export function formatHourMinute(date: Date): string {
  return formatInEpgTimeZone(date).time;
}
