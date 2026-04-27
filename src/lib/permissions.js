import { getDealerPlan } from "../config/plans.js";

export function getEffectiveDealerPermissions(dealer) {
  const plan = getDealerPlan(dealer.plan);

  const extraQuota = dealer.benefits?.extraPublicationQuota || 0;

  return {
    planId: plan.id,
    planLabel: plan.label,
    rankLabel: plan.rankLabel,
    rankTheme: plan.rankTheme,

    vehicleLimit: plan.unlimitedPublishing
      ? Infinity
      : plan.vehicleLimit + extraQuota,

    leadPriority: dealer.benefits?.leadPriorityBoost || plan.leadPriority,
    metricsLevel: dealer.benefits?.metricsLevel || plan.metricsLevel,
    badgeVisibility: dealer.benefits?.badgeVisibility || plan.badgeVisibility,

    marketIntelligence:
      dealer.benefits?.marketIntelligence ?? plan.marketIntelligence,

    sellVehicleLeads:
      dealer.benefits?.sellVehicleLeads ?? plan.sellVehicleLeads,

    fullFinancingTools:
      dealer.benefits?.fullFinancingTools ?? plan.fullFinancingTools,

    unlimitedPublishing: plan.unlimitedPublishing,

    canPublish: dealer.planStatus === "active" || dealer.planStatus === "expiring",
    canReceiveNewLeads: dealer.planStatus === "active" || dealer.planStatus === "expiring",
    canAccessGraceData: dealer.planStatus === "expired_grace",
  };
}

export function canDealerPublish(dealer) {
  const permissions = getEffectiveDealerPermissions(dealer);

  if (!permissions.canPublish) {
    return {
      allowed: false,
      reason: "El plan no está activo.",
    };
  }

  if (permissions.unlimitedPublishing) {
    return {
      allowed: true,
      reason: null,
    };
  }

  const used = dealer.currentPeriod?.publicationsUsed || 0;

  if (used >= permissions.vehicleLimit) {
    return {
      allowed: false,
      reason: "El cupo de publicaciones del período está agotado.",
    };
  }

  return {
    allowed: true,
    reason: null,
  };
}