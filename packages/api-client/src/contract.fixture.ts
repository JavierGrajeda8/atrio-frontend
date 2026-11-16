import type { ApiClient } from "./index";

/** Consumidor mínimo del contrato: si el endpoint o sus campos cambian, este archivo deja de compilar. */
export async function residentialName(client: ApiClient, residentialId: string): Promise<string> {
  const { data, error } = await client.GET("/api/v1/residentials/{residential_id}", {
    params: { path: { residential_id: residentialId } },
  });
  if (error || !data) throw new Error("Residencial no disponible");
  return data.name;
}
