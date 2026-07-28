export interface EstablishmentReportFormSource {
  type?: string | null;
  total_rooms?: number | null;
}

const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

const accommodationTypes = new Set([
  "accommodation",
  "accommodation establishment",
  "hotel",
  "lodge",
  "inn",
  "motel",
  "apartelle",
  "hostel",
]);

const hasRooms = (establishment?: EstablishmentReportFormSource | null) =>
  Number(establishment?.total_rooms || 0) > 0;

const isAccommodationType = (establishment?: EstablishmentReportFormSource | null) =>
  accommodationTypes.has(normalize(establishment?.type));

export const canSubmitAccommodationReport = (establishment?: EstablishmentReportFormSource | null) => {
  if (!establishment) return false;

  // Only actual accommodation categories with room inventory use the hotel form.
  // Resorts remain on the resort/non-accommodation report even if imported data has a room count.
  return isAccommodationType(establishment) && hasRooms(establishment);
};

export const canSubmitVisitorReport = (establishment?: EstablishmentReportFormSource | null) => {
  if (!establishment) return false;

  // Resorts and other non-accommodation categories use the visitor/non-accommodation form.
  // Accommodation categories without room inventory also fall back to the visitor form so staff
  // are not sent to a hotel report they cannot complete.
  return !canSubmitAccommodationReport(establishment);
};

export const getPrimaryReportFormLabel = (establishment?: EstablishmentReportFormSource | null) => {
  if (canSubmitAccommodationReport(establishment)) return "Hotel accommodation report";
  if (canSubmitVisitorReport(establishment)) return "Resort visitor report";
  return "Tourism report";
};
