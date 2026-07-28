export interface EstablishmentReportFormSource {
  type?: string | null;
  total_rooms?: number | null;
}

const hasRooms = (establishment?: EstablishmentReportFormSource | null) =>
  Number(establishment?.total_rooms || 0) > 0;

export const canSubmitAccommodationReport = (establishment?: EstablishmentReportFormSource | null) => {
  if (!establishment) return false;

  // The hotel/accommodation report requires a configured room inventory.
  // Some establishments imported from Excel have an accommodation-like type but no rooms;
  // those accounts must not be routed to the hotel form because the hotel report cannot be
  // submitted without configured rooms.
  return hasRooms(establishment);
};

export const canSubmitVisitorReport = (establishment?: EstablishmentReportFormSource | null) => {
  if (!establishment) return false;

  // No-room establishments report visitor/day-use arrivals, even when the imported type is
  // hotel/lodge/accommodation but the Excel record did not include room inventory.
  return !hasRooms(establishment);
};

export const getPrimaryReportFormLabel = (establishment?: EstablishmentReportFormSource | null) => {
  if (canSubmitAccommodationReport(establishment)) return "Hotel accommodation report";
  if (canSubmitVisitorReport(establishment)) return "Resort visitor report";
  return "Tourism report";
};
