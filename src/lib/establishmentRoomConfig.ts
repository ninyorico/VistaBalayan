export type RoomSizeOption = "Single" | "King Capacity" | "Dormitory Type";

export interface EstablishmentRoomConfig {
  type: string;
  code: string;
  count: number;
  size: RoomSizeOption;
}

export const ROOM_SIZE_OPTIONS: RoomSizeOption[] = ["Single", "King Capacity", "Dormitory Type"];

export const DEFAULT_ROOM_SIZE: RoomSizeOption = "Single";

const normalizeRoomSize = (value: unknown): RoomSizeOption => {
  const roomSize = String(value || "").trim().toLowerCase();

  if (roomSize === "king" || roomSize === "king capacity") return "King Capacity";
  if (roomSize === "dormitory" || roomSize === "dormitory type") return "Dormitory Type";
  return "Single";
};

export const DEFAULT_ROOM_CONFIG: EstablishmentRoomConfig[] = [
  { type: "Single Room", code: "S", count: 0, size: "Single" },
  { type: "King Room", code: "K", count: 0, size: "King Capacity" },
  { type: "Dormitory Room", code: "D", count: 0, size: "Dormitory Type" },
];

const ROOM_CONFIG_MARKER = "__room_configuration__:";

export function normalizeRoomConfig(config: unknown): EstablishmentRoomConfig[] {
  if (!Array.isArray(config)) return DEFAULT_ROOM_CONFIG;

  const normalized = config
    .map((item: any) => ({
      type: String(item?.type || "").trim(),
      code: String(item?.code || "").trim().toUpperCase(),
      count: Math.max(0, Number.parseInt(String(item?.count ?? 0), 10) || 0),
      size: normalizeRoomSize(item?.size || item?.roomSize),
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
