const BUSINESS_PERMIT_MARKER = "__business_permit_images__:";

export function getBusinessPermitImages(record: { business_permit_images?: unknown; amenities?: unknown } | null | undefined): string[] {
  if (!record) return [];

  if (Array.isArray(record.business_permit_images)) {
    const columnImages = record.business_permit_images.filter((url): url is string => typeof url === "string" && url.trim().length > 0);
    if (columnImages.length > 0) return columnImages;
  }

  if (typeof record.amenities !== "string") return [];

  const markerIndex = record.amenities.lastIndexOf(BUSINESS_PERMIT_MARKER);
  if (markerIndex === -1) return [];

  const rawJson = record.amenities.slice(markerIndex + BUSINESS_PERMIT_MARKER.length).trim();
  try {
    const parsed = JSON.parse(rawJson);
    return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string" && url.trim().length > 0) : [];
  } catch {
    return [];
  }
}

export function setBusinessPermitImagesInAmenities(currentAmenities: unknown, imageUrls: string[]): string {
  const current = typeof currentAmenities === "string" ? currentAmenities : "";
  const markerIndex = current.lastIndexOf(BUSINESS_PERMIT_MARKER);
  const visibleAmenities = markerIndex === -1 ? current.trimEnd() : current.slice(0, markerIndex).trimEnd();
  const normalizedUrls = imageUrls.filter((url) => typeof url === "string" && url.trim().length > 0);
  const metadata = `${BUSINESS_PERMIT_MARKER}${JSON.stringify(normalizedUrls)}`;

  return visibleAmenities ? `${visibleAmenities}\n${metadata}` : metadata;
}
