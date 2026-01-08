export type NetAppDriveCompat = {
  version: number;
  updatedAtISO: string;
  controllers: NetAppDriveController[];
};

export type NetAppDriveController = {
  model: string;
  expansionShelves: NetAppExpansionShelf[];
  sourceUrl?: string;
};

export type NetAppExpansionShelf = {
  model: string;
  supportedDriveSizesTB: number[];
  maxExpansionQty?: number;
  sourceUrl?: string;
};

export async function loadNetAppDriveCompat(basePath: string): Promise<NetAppDriveCompat> {
  const res = await fetch(`${basePath}/data/energy/netapp_drive_compat.json`);
  if (!res.ok) {
    throw new Error(`Failed to load NetApp compatibility data (${res.status})`);
  }
  return (await res.json()) as NetAppDriveCompat;
}

export function getControllerModels(compat: NetAppDriveCompat | null): string[] {
  if (!compat) return [];
  return compat.controllers.map((controller) => controller.model).sort((a, b) => a.localeCompare(b));
}

export function getExpansionModels(compat: NetAppDriveCompat | null, controllerModel: string): string[] {
  if (!compat) return [];
  const controller = compat.controllers.find((item) => item.model === controllerModel);
  if (!controller) return [];
  return controller.expansionShelves.map((shelf) => shelf.model).sort((a, b) => a.localeCompare(b));
}

export function getDriveSizes(
  compat: NetAppDriveCompat | null,
  controllerModel: string,
  expansionModel: string,
): number[] {
  if (!compat) return [];
  const controller = compat.controllers.find((item) => item.model === controllerModel);
  if (!controller) return [];
  const shelf = controller.expansionShelves.find((item) => item.model === expansionModel);
  if (!shelf) return [];
  return [...shelf.supportedDriveSizesTB].sort((a, b) => a - b);
}

export function getMaxExpansionQty(
  compat: NetAppDriveCompat | null,
  controllerModel: string,
  expansionModel: string,
): number | undefined {
  if (!compat) return undefined;
  const controller = compat.controllers.find((item) => item.model === controllerModel);
  if (!controller) return undefined;
  const shelf = controller.expansionShelves.find((item) => item.model === expansionModel);
  return shelf?.maxExpansionQty;
}
