export const AUCKLAND_TIME_ZONE = "Pacific/Auckland";
export const OPENING_MINUTES = 9 * 60;
export const CLOSING_MINUTES = 20 * 60;
export const SLOT_INTERVAL_MINUTES = 15;
export const TRAVEL_FEE_CENTS = 10_000;
export const DEPOSIT_RATE = 0.2;
export const STRIPE_DOMESTIC_RATE = 0.0265;
export const STRIPE_FIXED_FEE_CENTS = 30;

export type Service = {
  id: string;
  name: string;
  description: string;
  priceOptionsCents: number[];
  durationMinutes: number;
};

export type ServiceSelection = {
  id: string;
  priceCents: number;
};

export const SERVICES: Service[] = [
  { id: "haircut", name: "Haircut", description: "A considered cut shaped around your requested finish.", priceOptionsCents: [4_000], durationMinutes: 45 },
  { id: "beard", name: "Beard Trim / Sculpt", description: "Trim, shape and sharp beard definition.", priceOptionsCents: [2_000, 2_500], durationMinutes: 30 },
  { id: "wax", name: "Wax", description: "A clean finishing service for a polished result.", priceOptionsCents: [2_000], durationMinutes: 20 },
  { id: "combo", name: "Haircut + Beard + Wax", description: "The complete Fade Plug grooming package.", priceOptionsCents: [7_000], durationMinutes: 75 },
  { id: "ear-wax", name: "Ear Wax", description: "Quick ear waxing service.", priceOptionsCents: [500], durationMinutes: 10 },
  { id: "nose-wax", name: "Nose Wax", description: "Quick nose waxing service.", priceOptionsCents: [500], durationMinutes: 10 },
  { id: "face-scrub", name: "Face Scrub", description: "A refreshing facial scrub treatment.", priceOptionsCents: [3_000], durationMinutes: 30 },
  { id: "hair-colour", name: "Hair Colour", description: "Hair colour application and finish.", priceOptionsCents: [3_000], durationMinutes: 45 },
  { id: "beard-colour", name: "Beard Colour", description: "Beard colour application and finish.", priceOptionsCents: [2_000], durationMinutes: 30 },
];

export function getService(serviceId: string) {
  return SERVICES.find(service => service.id === serviceId);
}

const COMBO_SERVICE_ID = "combo";
const COMBO_COMPONENT_IDS = new Set(["haircut", "beard", "wax"]);

export function serviceIdsConflict(serviceIds: string[]) {
  return serviceIds.includes(COMBO_SERVICE_ID) && serviceIds.some(id => COMBO_COMPONENT_IDS.has(id));
}

export function getServiceSelectionSummary(selections: ServiceSelection[]) {
  if (!selections.length || selections.length > SERVICES.length) return null;
  if (selections.some(selection => !selection || typeof selection.id !== "string" || !Number.isInteger(selection.priceCents))) return null;
  const uniqueIds = new Set(selections.map(selection => selection.id));
  if (uniqueIds.size !== selections.length || serviceIdsConflict([...uniqueIds])) return null;
  const selected = selections.map(selection => {
    const service = getService(selection.id);
    return service && service.priceOptionsCents.includes(selection.priceCents) ? { service, priceCents: selection.priceCents } : null;
  });
  if (selected.some(item => !item)) return null;
  const valid = selected.filter((item): item is { service: Service; priceCents: number } => Boolean(item));
  return {
    services: valid.map(item => item.service),
    serviceIds: valid.map(item => item.service.id),
    serviceName: valid.map(item => item.service.name).join(" + "),
    servicePriceCents: valid.reduce((total, item) => total + item.priceCents, 0),
    durationMinutes: valid.reduce((total, item) => total + item.service.durationMinutes, 0),
  };
}

export function getServiceDurationSummary(serviceIds: string[]) {
  if (!serviceIds.length || serviceIds.length > SERVICES.length || new Set(serviceIds).size !== serviceIds.length || serviceIdsConflict(serviceIds)) return null;
  const services = serviceIds.map(getService);
  if (services.some(service => !service)) return null;
  return {
    serviceIds,
    durationMinutes: services.reduce((total, service) => total + (service?.durationMinutes ?? 0), 0),
  };
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function getSlotMinutes(startMinutes: number, durationMinutes: number) {
  const slotCount = Math.ceil(durationMinutes / SLOT_INTERVAL_MINUTES);
  return Array.from({ length: slotCount }, (_, index) => startMinutes + index * SLOT_INTERVAL_MINUTES);
}

export function calculateBookingMoney(servicePriceCents: number, location: "studio" | "mobile") {
  const travelFeeCents = location === "mobile" ? TRAVEL_FEE_CENTS : 0;
  const serviceTotalCents = servicePriceCents + travelFeeCents;
  const baseDepositCents = Math.round(serviceTotalCents * DEPOSIT_RATE);
  let depositCents = Math.ceil((baseDepositCents + STRIPE_FIXED_FEE_CENTS) / (1 - STRIPE_DOMESTIC_RATE));
  while (depositCents > baseDepositCents && depositCents - 1 - Math.round((depositCents - 1) * STRIPE_DOMESTIC_RATE) - STRIPE_FIXED_FEE_CENTS >= baseDepositCents) depositCents -= 1;
  const processingFeeCents = depositCents - baseDepositCents;
  const totalCents = serviceTotalCents + processingFeeCents;
  return {
    travelFeeCents,
    serviceTotalCents,
    baseDepositCents,
    processingFeeCents,
    totalCents,
    depositCents,
    balanceCents: serviceTotalCents - baseDepositCents,
  };
}
