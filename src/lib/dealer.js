export function getDealerName(vehicle) {
  return (
    vehicle?.dealer?.commercialName ||
    vehicle?.dealer?.commercial_name ||
    vehicle?.dealerName ||
    vehicle?.dealer_name ||
    vehicle?.raw?.dealer_name ||
    "Dealer no informado"
  );
}

export function getDealerPhone(vehicle, dealer) {
  return (
    dealer?.dealerWhatsapp ||
    dealer?.dealer_whatsapp ||
    dealer?.phone ||
    dealer?.phoneWhatsapp ||
    dealer?.phone_whatsapp ||
    dealer?.contactPhone ||
    dealer?.contact_phone ||
    dealer?.phone_visible ||
    dealer?.dealerPhone ||
    dealer?.dealer_phone ||
    vehicle?.dealerWhatsapp ||
    vehicle?.dealer_whatsapp ||
    vehicle?.phoneWhatsapp ||
    vehicle?.phone_whatsapp ||
    vehicle?.contactPhone ||
    vehicle?.contact_phone ||
    vehicle?.dealerPhone ||
    vehicle?.dealer_phone ||
    vehicle?.dealer?.dealerWhatsapp ||
    vehicle?.dealer?.dealer_whatsapp ||
    vehicle?.dealer?.phone ||
    vehicle?.dealer?.phoneWhatsapp ||
    vehicle?.dealer?.phone_whatsapp ||
    vehicle?.dealer?.contactPhone ||
    vehicle?.dealer?.contact_phone ||
    vehicle?.dealer?.dealerPhone ||
    vehicle?.dealer?.dealer_phone ||
    vehicle?.raw?.dealerWhatsapp ||
    vehicle?.raw?.dealer_whatsapp ||
    vehicle?.raw?.phoneWhatsapp ||
    vehicle?.raw?.phone_whatsapp ||
    vehicle?.raw?.contactPhone ||
    vehicle?.raw?.contact_phone ||
    vehicle?.raw?.dealerPhone ||
    vehicle?.raw?.dealer_phone ||
    vehicle?.raw?.dealer_phone_whatsapp ||
    ""
  );
}

export function getDealerForVehicle(vehicle) {
  const plan =
    vehicle?.dealer?.plan ||
    vehicle?.dealerPlan ||
    vehicle?.dealer_plan ||
    vehicle?.subscription_plan ||
    vehicle?.raw?.dealer_plan ||
    vehicle?.raw?.subscription_plan ||
    "inicio";

  return (
    vehicle?.dealer || {
      id: vehicle?.dealerId || vehicle?.dealer_id || "dealer-fallback",
      commercialName: getDealerName(vehicle),
      plan,
      planStatus: "active",
      province: vehicle?.province || "",
      city: vehicle?.city || "",
      logo: null,
      phone: "",
      benefits: {},
      currentPeriod: {
        publicationsUsed: 0,
        expiresInDays: 30,
      },
    }
  );
}
