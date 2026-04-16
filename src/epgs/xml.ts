import { Builder, parseString, type BuilderOptions, type ParserOptions } from 'xml2js';

export interface XmlNodeWithAttributes {
  $?: Record<string, string | undefined>;
  _?: string;
  [key: string]: unknown;
}

export type XmlTextNode = string | XmlNodeWithAttributes | Array<string | XmlNodeWithAttributes>;

export interface XmltvProgrammeNode extends XmlNodeWithAttributes {
  $?: {
    start?: string;
    stop?: string;
    channel?: string;
    [key: string]: string | undefined;
  };
  title?: XmlTextNode;
  desc?: XmlTextNode;
}

export interface XmltvChannelNode extends XmlNodeWithAttributes {
  $?: {
    id?: string;
    name?: string;
    [key: string]: string | undefined;
  };
  name?: string;
  'display-name'?: XmlTextNode;
}

export interface XmltvNode {
  channel?: XmltvChannelNode | XmltvChannelNode[];
  programme?: XmltvProgrammeNode | XmltvProgrammeNode[];
}

const XML_PARSE_OPTIONS: ParserOptions = {
  async: false,
  attrkey: '$',
  charkey: '_',
  explicitArray: false,
  explicitRoot: true,
  trim: true,
  mergeAttrs: false,
};

const XML_BUILD_OPTIONS: BuilderOptions = {
  attrkey: '$',
  charkey: '_',
  headless: true,
  renderOpts: {
    pretty: false,
  },
};

export function parseXmlDocument<T>(xml: string): T | null {
  let parsed: T | null = null;
  let parseError: Error | null = null;

  parseString(xml, XML_PARSE_OPTIONS, (error, result) => {
    if (error) {
      parseError = error;
      return;
    }
    parsed = result as T;
  });

  if (parseError) {
    return null;
  }

  return parsed;
}

export function buildXmlDocument(document: object): string {
  return new Builder(XML_BUILD_OPTIONS).buildObject(document);
}

export function normalizeXmlList<T>(node: T | T[] | null | undefined): T[] {
  if (node === undefined || node === null) return [];
  return Array.isArray(node) ? node : [node];
}

export function readXmlText(node: unknown): string {
  if (typeof node === 'string') {
    return node.trim();
  }

  if (Array.isArray(node)) {
    return readXmlText(node[0]);
  }

  if (node && typeof node === 'object') {
    const text = (node as XmlNodeWithAttributes)._;
    return typeof text === 'string' ? text.trim() : '';
  }

  return '';
}

export function readXmlAttr(node: XmlNodeWithAttributes | null | undefined, name: string): string {
  const value = node?.$?.[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function readXmltvChannelName(node: XmltvChannelNode | null | undefined): string {
  const displayName = readXmlText(node?.['display-name']);
  if (displayName) return displayName;

  const nameFromAttr = readXmlAttr(node, 'name');
  if (nameFromAttr) return nameFromAttr;

  return node?.name?.trim() ?? '';
}

export function readXmltvProgrammeTitle(node: XmltvProgrammeNode | null | undefined): string {
  return readXmlText(node?.title);
}

export function parseXmltvRoot(xml: string): XmltvNode | null {
  const parsed = parseXmlDocument<{ tv?: XmltvNode }>(xml);
  return parsed?.tv ?? null;
}
