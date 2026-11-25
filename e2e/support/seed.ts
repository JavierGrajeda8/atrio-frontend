// Ids deterministas del seed del backend (`make seed`, uuid5 con el espacio de nombres del seed):
// los mismos en cada corrida y en cada máquina. Si el backend los cambiara, las pruebas fallan.
export const LAS_FLORES = {
  id: "dc8bef5c-f9f8-5090-b62a-19ab640a8112",
  name: "Residencial Las Flores",
  slug: "las-flores",
} as const;

export const LOS_PINOS = {
  id: "86f3d3b7-0f36-5bf8-8f59-3f77f1e1ec72",
  name: "Condominio Los Pinos",
  slug: "los-pinos",
} as const;

export const USERS = {
  adminFlores: "da8f2f9c-f5b4-5064-a5d7-bfa2b466e196",
  adminPinos: "883a27bd-fbfb-5b44-b704-5c5c3bb4673c",
  // Membresías de Las Flores que no están activas.
  residentFlores2Pending: "e74abb49-b996-5a5d-8bab-386c9342f6aa",
  residentFlores3Suspended: "50f6fc27-ff8d-5ba0-a237-c6526e9ae53e",
} as const;

/** Un id con forma de residencial que no existe en el seed. */
export const UNKNOWN_RESIDENTIAL = "00000000-0000-7000-8000-000000000000";
