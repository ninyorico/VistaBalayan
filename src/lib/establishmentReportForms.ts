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

const dayVisitorTypes = new Set([
  "resort",
  "farm resort",
  "swimming pool",
  "tourist attraction",
  "food & beverage establishment",
]);

const hasRooms = (establishment?: EstablishmentReportFormSource | null) =>
  Number(establishment?.total_rooms || 0) > 0;

export const canSubmitAccommodationReport = (establishment?: EstablishmentReportFormSource | null) => {
  if (!establishment) return false;
  const type = normalize(establishment.type);

  if (accommodationTypes.has(type)) return true;

  // If it has configured rooms, it should use the hotel/accommodation form.
  return hasRooms(establishment);
};

export const canSubmitVisitorReport = (establishment?: EstablishmentReportFormSource | null) => {
  if (!establishment) return false;
  const type = normalize(establishment.type);

  if (accommodationTypes.has(type)) return false;

  // Resorts, swimming pools, farms, attractions, and F&B locations without rooms use the resort/visitor form.
  if (dayVisitorTypes.has(type)) return !hasRooms(establishment);

  return !hasRooms(establishment);
};

export const getPrimaryReportFormLabel = (establishment?: EstablishmentReportFormSource | null) => {
  if (canSubmitAccommodationReport(establishment)) return "Hotel accommodation report";
  if (canSubmitVisitorReport(establishment)) return "Resort visitor report";
  return "Tourism report";
};
