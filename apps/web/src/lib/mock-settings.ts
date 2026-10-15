import type { PublicSettingsDto } from "@irpc/types";

// Sample /settings response. Real mode always reads settings from the API.
export const mockSettings: PublicSettingsDto = {
  dryingRecovery: "0.80", millingRecovery: "0.60", sackKg: "50", dryingCapacityKg: "56000",
};
