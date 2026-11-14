export function isDisallowedHostname(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (host === "" || host === "localhost" || host.endsWith(".localhost")) {
    return true;
  }
  return isIpAddressLiteral(host) && isDisallowedIpAddress(host);
}

/**
 * Rejects loopback, private, link-local, unique-local, and reserved addresses.
 * Malformed input is treated as disallowed so a parsing gap cannot fail open.
 */
export function isDisallowedIpAddress(address: string): boolean {
  const host = normalizeHostname(address);
  return host.includes(":") ? isDisallowedIpv6(host) : isDisallowedIpv4(host);
}

export function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
}

export function isIpAddressLiteral(host: string): boolean {
  return host.includes(":") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function isDisallowedIpv4(host: string): boolean {
  const octets = parseIpv4(host);
  if (octets === null) return true;
  const [a, b, c] = octets;
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 IETF
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 TEST-NET-1
  if (a === 192 && b === 88 && c === 99) return true; // 192.88.99.0/24 6to4
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 bench
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24
  return a >= 224; // multicast + reserved (224.0.0.0/4, 240.0.0.0/4)
}

function isDisallowedIpv6(host: string): boolean {
  const bytes = parseIpv6(host);
  if (bytes === null) return true;

  if (bytes.every((byte) => byte === 0)) return true; // :: unspecified
  if (bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1) {
    return true; // ::1 loopback
  }

  // IPv4-mapped (::ffff:0:0/96) and deprecated IPv4-compatible (::/96).
  if (bytes.slice(0, 10).every((byte) => byte === 0)) {
    return isDisallowedIpv4Bytes(bytes, 12);
  }

  if ((bytes[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0xc0) return true; // fec0::/10
  if (bytes[0] === 0xff) return true; // ff00::/8 multicast
  if (bytes[0] === 0x20 && bytes[1] === 0x02) return true; // 2002::/16 6to4
  if (
    bytes[0] === 0x20 &&
    bytes[1] === 0x01 &&
    bytes[2] === 0x0d &&
    bytes[3] === 0xb8
  ) {
    return true; // 2001:db8::/32 documentation
  }
  if (bytes[0] === 0x01 && bytes[1] === 0x00) return true; // 100::/64 discard
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x64 &&
    bytes[2] === 0xff &&
    bytes[3] === 0x9b
  ) {
    return true; // 64:ff9b::/96 NAT64
  }
  return false;
}

function isDisallowedIpv4Bytes(bytes: Uint8Array, offset: number): boolean {
  const a = bytes[offset];
  const b = bytes[offset + 1];
  const c = bytes[offset + 2];
  const d = bytes[offset + 3];
  return isDisallowedIpv4(`${a}.${b}.${c}.${d}`);
}

function parseIpv4(
  host: string,
): readonly [number, number, number, number] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  const [a, b, c, d] = octets;
  if (
    a === undefined ||
    b === undefined ||
    c === undefined ||
    d === undefined
  ) {
    return null;
  }
  return [a, b, c, d];
}

function parseIpv6(host: string): Uint8Array | null {
  const withoutZone = host.split("%", 1)[0] ?? host;
  if (!withoutZone.includes(":")) return null;

  const sections = withoutZone.split("::");
  if (sections.length > 2) return null;

  const head = parseHextets(sections[0] ?? "");
  const tail = sections.length === 2 ? parseHextets(sections[1] ?? "") : [];
  if (head === null || tail === null) return null;

  let hextets: number[];
  if (sections.length === 2) {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    hextets = [...head, ...new Array<number>(missing).fill(0), ...tail];
  } else {
    hextets = head;
  }
  if (hextets.length !== 8) return null;

  const bytes = new Uint8Array(16);
  for (let index = 0; index < 8; index += 1) {
    const value = hextets[index];
    bytes[index * 2] = (value >> 8) & 0xff;
    bytes[index * 2 + 1] = value & 0xff;
  }
  return bytes;
}

function parseHextets(segment: string): number[] | null {
  if (segment === "") return [];
  const pieces = segment.split(":");
  const hextets: number[] = [];
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index];
    if (piece === undefined) return null;
    if (piece.includes(".")) {
      if (index !== pieces.length - 1) return null;
      const octets = parseIpv4(piece);
      if (octets === null) return null;
      const [first, second, third, fourth] = octets;
      hextets.push(((first << 8) | second) >>> 0);
      hextets.push(((third << 8) | fourth) >>> 0);
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/.test(piece)) return null;
    hextets.push(Number.parseInt(piece, 16));
  }
  return hextets;
}
