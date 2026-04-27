export const DEALER_PLANS = {
  inicio: {
    id: "inicio",
    label: "Inicio",
    rankLabel: "Dealer Inicio",
    vehicleLimit: 10,
    rankTheme: "inicio",
    leadPriority: "basic",
    metricsLevel: "basic",
    badgeVisibility: "limited",
    marketIntelligence: false,
    sellVehicleLeads: false,
    fullFinancingTools: false,
    unlimitedPublishing: false,
  },

  pro: {
    id: "pro",
    label: "Pro",
    rankLabel: "Dealer Pro",
    vehicleLimit: 30,
    rankTheme: "pro",
    leadPriority: "medium",
    metricsLevel: "standard",
    badgeVisibility: "standard",
    marketIntelligence: false,
    sellVehicleLeads: false,
    fullFinancingTools: true,
    unlimitedPublishing: false,
  },

  elite: {
    id: "elite",
    label: "Elite",
    rankLabel: "Dealer Elite",
    vehicleLimit: 50,
    rankTheme: "elite",
    leadPriority: "high",
    metricsLevel: "advanced",
    badgeVisibility: "premium",
    marketIntelligence: true,
    sellVehicleLeads: true,
    fullFinancingTools: true,
    unlimitedPublishing: false,
  },

  platinum: {
    id: "platinum",
    label: "Platinum",
    rankLabel: "Dealer Platinum",
    vehicleLimit: Infinity,
    rankTheme: "platinum",
    leadPriority: "max",
    metricsLevel: "full",
    badgeVisibility: "full",
    marketIntelligence: true,
    sellVehicleLeads: true,
    fullFinancingTools: true,
    unlimitedPublishing: true,
  },
};

export const PLAN_STATUS = {
  ACTIVE: "active",
  EXPIRING: "expiring",
  EXPIRED_GRACE: "expired_grace",
  SUSPENDED: "suspended",
  PENDING_ACTIVATION: "pending_activation",
};

export function getDealerPlan(planId) {
  return DEALER_PLANS[planId] || DEALER_PLANS.inicio;
}