export interface EstablishmentRoomConfig {
  type: string;
  code: string;
  count: number;
}

export const DEFAULT_ROOM_CONFIG: EstablishmentRoomConfig[] = [
  { type: "Green", code: "G", count: 0 },
  { type: "Red", code: "R", count: 0 },
  { type: "Orange", code: "O", count: 0 },
  { type: "Rose", code: "RS", count: 0 },
  { type: "Blue", code: "B", count: 0 },
  { type: "Ocean View", code: "OV", count: 0 },
];

const ROOM_CONFIG_MARKER = "__room_configuration__:";

export function normalizeRoomConfig(config: unknown): EstablishmentRoomConfig[] {
  if (!Array.isArray(config)) return DEFAULT_ROOM_CONFIG;

  const normalized = config
    .map((item: any) => ({
      type: String(item?.type || "").trim(),
      code: String(item?.code || "").trim().toUpperCase(),
      count: Math.max(0, Number.parseInt(String(item?.count ?? 0), 10) || 0),
    }))
    .filter((item) => item.type && item.code);

  return normalized.length ? normalized : DEFAULT_ROOM_CONFIG;
}

export function getRoomConfigFromAmenities(amenities: unknown): EstablishmentRoomConfig[] {
  if (typeof amenities !== "string") return DEFAULT_ROOM_CONFIG;

  const markerIndex = amenities.lastIndexOf(ROOM_CONFIG_MARKER);
  if (markerIndex === -1) return DEFAULT_ROOM_CONFIG;

  const afterMarker = amenities.slice(markerIndex + ROOM_CONFIG_MARKER.length);
  const nextMetadataIndex = afterMarker.search(/\n__[a-z_]+__:/);
  const rawJson = (nextMetadataIndex === -1 ? afterMarker : afterMarker.slice(0, nextMetadataIndex)).trim();

  try {
    return normalizeRoomConfig(JSON.parse(rawJson));
  } catch {
    return DEFAULT_ROOM_CONFIG;
  }
}

export function setRoomConfigInAmenities(currentAmenities: unknown, config: EstablishmentRoomConfig[]): string {
  const current = typeof currentAmenities === "string" ? currentAmenities : "";
  const markerIndex = current.lastIndexOf(ROOM_CONFIG_MARKER);
  let withoutRoomConfig = current;

  if (markerIndex !== -1) {
    const beforeMarker = current.slice(0, markerIndex).trimEnd();
    const afterMarker = current.slice(markerIndex + ROOM_CONFIG_MARKER.length);
    const nextMetadataIndex = afterMarker.search(/\n__[a-z_]+__:/);
    const afterConfig = nextMetadataIndex === -1 ? "" : afterMarker.slice(nextMetadataIndex).trimStart();
    withoutRoomConfig = [beforeMarker, afterConfig].filter(Boolean).join("\n");
  }

  const normalized = normalizeRoomConfig(config);
  const metadata = `${ROOM_CONFIG_MARKER}${JSON.stringify(normalized)}`;
  return withoutRoomConfig.trimEnd() ? `${withoutRoomConfig.trimEnd()}\n${metadata}` : metadata;
}
