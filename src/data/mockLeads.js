export const mockLeads = [];

export function createMockLead(lead) {
  const newLead = {
    id: crypto.randomUUID(),
    status: "new",
    createdAt: new Date().toISOString(),
    ...lead,
  };

  mockLeads.unshift(newLead);

  return newLead;
}