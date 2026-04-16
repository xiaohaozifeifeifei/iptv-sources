import { describe, expect, it } from 'vitest';
import { formatHourMinute, parseXmltvTimeRange, parseXmltvTimestamp } from '../../src/epgs/time';

describe('parseXmltvTimeRange', () => {
  it('should extract date and hh:mm from XMLTV timestamps', () => {
    expect(parseXmltvTimeRange('20240314080000 +0800', '20240314093000 +0800')).toEqual({
      date: '2024-03-14',
      start: '08:00',
      end: '09:30',
    });
  });

  it('should return null when timestamps are invalid', () => {
    expect(parseXmltvTimeRange('invalid', '20240314093000 +0800')).toBeNull();
  });

  it('should convert UTC timestamps into China date and hh:mm', () => {
    expect(parseXmltvTimeRange('20240314163000 +0000', '20240314180000 +0000')).toEqual({
      date: '2024-03-15',
      start: '00:30',
      end: '02:00',
    });
  });
});

describe('parseXmltvTimestamp', () => {
  it('should parse compact XMLTV timestamp with UTC offset', () => {
    const date = parseXmltvTimestamp('20240314093000 +0000');

    expect(date?.toISOString()).toBe('2024-03-14T09:30:00.000Z');
    const formatDate = formatHourMinute(date!);
    expect(formatDate).toBe('17:30');
  });

  it('should parse compact XMLTV timestamp with positive timezone offset', () => {
    const date = parseXmltvTimestamp('20240314093000 +0800');

    expect(date?.toISOString()).toBe('2024-03-14T01:30:00.000Z');
    expect(formatHourMinute(date!)).toBe('09:30');
  });

  it('should return null for invalid timestamp', () => {
    expect(parseXmltvTimestamp('bad')).toBeNull();
  });
});

describe('formatHourMinute', () => {
  it('should format time as HH:mm', () => {
    const date = new Date(Date.UTC(2024, 2, 14, 9, 5, 0));

    expect(formatHourMinute(date)).toBe('17:05');
  });
});
