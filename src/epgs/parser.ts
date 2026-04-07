/**
 * 解析 XMLTV 格式 EPG XML，按日期、频道分组并转换为目标 JSON 结构
 * 使用 xml2js 解析
 */

import {
  normalizeXmlList,
  parseXmlDocument,
  readXmlAttr,
  readXmlText,
  type XmlNodeWithAttributes,
} from './xml';

export interface EpgProgrammeItem {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  title: string;
}

export interface EpgChannelJson {
  channel: string;
  epg_data: EpgProgrammeItem[];
}

/** XMLTV start/stop 格式: 20240314080000 +0800 → 提取 YYYYmmdd 与 HH:mm */
function parseXmltvTime(
  startStr: string,
  stopStr: string
): { date: string; start: string; end: string } | null {
  const startMatch = startStr?.match(/^(\d{14})/);
  const stopMatch = stopStr?.match(/^(\d{14})/);
  if (!startMatch || !stopMatch) return null;
  const start = startMatch[1];
  const stop = stopMatch[1];
  const date = `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}`;
  const startTime = `${start.slice(8, 10)}:${start.slice(10, 12)}`;
  const endTime = `${stop.slice(8, 10)}:${stop.slice(10, 12)}`;
  return { date, start: startTime, end: endTime };
}

type XmlTextNode = string | XmlNodeWithAttributes | Array<string | XmlNodeWithAttributes>;

function pickTitle(programme: ParsedProgramme): string {
  return readXmlText(programme.title);
}

/** 将频道名转为安全文件名（去掉非法字符） */
export function sanitizeChannelFileName(channel: string): string {
  return channel.replace(/[/\\:*?"<>|]/g, '_').trim() || 'channel';
}

type ParsedProgramme = XmlNodeWithAttributes & {
  $?: {
    start?: string;
    stop?: string;
    channel?: string;
  };
  title?: XmlTextNode;
};
type ChannelId = string;
type ChannelName = string;
type ChannelFromXml = XmlNodeWithAttributes & {
  $?: {
    id?: string;
    name?: string;
  };
  name?: string;
  'display-name'?: XmlTextNode;
};
type ParsedChannel = Record<ChannelId, ChannelName>;

function toProgrammeList(programme: unknown): ParsedProgramme[] {
  return normalizeXmlList(programme as ParsedProgramme | ParsedProgramme[] | undefined);
}

function pickChannelName(channel: ChannelFromXml): string {
  const displayName = readXmlText(channel['display-name']);
  if (displayName) return displayName;
  const nameFromAttr = readXmlAttr(channel, 'name');
  if (nameFromAttr) return nameFromAttr;
  return channel.name?.trim() ?? '';
}

function toChannelList(channel: unknown): ParsedChannel {
  const parsedChannels: ParsedChannel = {};
  const channels = normalizeXmlList(channel as ChannelFromXml | ChannelFromXml[] | undefined);

  for (const c of channels) {
    const id = readXmlAttr(c, 'id');
    parsedChannels[id] = pickChannelName(c);
  }
  return parsedChannels;
}

/**
 * 解析单段 XML，返回 (date, channel, EpgProgrammeItem) 列表
 */
export function parseEpgXml(
  xml: string
): Array<{ date: string; channel: string; item: EpgProgrammeItem }> {
  const parsed = parseXmlDocument<{ tv?: { programme?: unknown; channel?: unknown } }>(xml);
  const tv = parsed?.tv;
  if (!tv) return [];

  if (!tv.channel) {
    console.warn(`[WARNING] No channels found in XML`);
    return [];
  }

  const channels = toChannelList(tv.channel);
  console.log(`[TASK] Parse ${Object.keys(channels).length} channels`);
  const programmes = toProgrammeList(tv.programme);
  const out: Array<{ date: string; channel: string; item: EpgProgrammeItem }> = [];

  for (const p of programmes) {
    const channelId = readXmlAttr(p, 'channel');
    const startAttr = readXmlAttr(p, 'start');
    const stopAttr = readXmlAttr(p, 'stop');
    const time = parseXmltvTime(startAttr, stopAttr);
    const title = pickTitle(p);
    if (!channelId || !time) {
      continue;
    }
    const channel = channels[channelId];
    if (!channel) {
      console.warn(`[WARNING] Channel ${channelId} not found in XML`);
      continue;
    }
    out.push({
      date: time.date,
      channel,
      item: { start: time.start, end: time.end, title },
    });
  }
  return out;
}

/**
 * 将多个 XML 的解析结果按日期、频道合并，同一频道同一天按 start 排序
 */
export function mergeByDateAndChannel(
  allItems: Array<{ date: string; channel: string; item: EpgProgrammeItem }>
): Map<ChannelName, EpgChannelJson> {
  const byKey = new Map<string, EpgProgrammeItem[]>();
  for (const { date, channel, item } of allItems) {
    const key = `${date}\t${channel}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(item);
  }
  const result = new Map<ChannelName, EpgChannelJson>();
  for (const [key, items] of byKey) {
    const [, channel] = key.split('\t');
    items.sort((a, b) => a.start.localeCompare(b.start));
    result.set(key, { channel, epg_data: items });
  }
  return result;
}
