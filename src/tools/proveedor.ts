import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";


const LeerSolicitudSchema = z.object({
  caso: z.enum([
    "co-industrias-delta",
    "ec-corp-andina",
    "hn-agroexport-sula",
    "pa-logistica-istmo",
  ]),
});

export type LeerSolicitudInput = z.infer<typeof LeerSolicitudSchema>;

export interface SolicitudProveedor {
  id: string;
  de: string;
  para: string;
  asunto: string;
  fecha: string;
  pais: string;
  cliente: string;
  formato: string;
  cuerpo: string;
  adjuntos: string[];
}

/**
 * Lee la solicitud de uno de los casos oficiales.
 *
 * Esta función NO modifica los fixtures.
 */
export async function proveedor_leer_solicitud(
  input: LeerSolicitudInput,
): Promise<SolicitudProveedor> {
  const datosValidados = LeerSolicitudSchema.parse(input);

  const rutaSolicitud = join(
    process.cwd(),
    "fixtures",
    "reto-01",
    "casos",
    datosValidados.caso,
    "solicitud.json",
  );

  const contenido = await readFile(rutaSolicitud, "utf-8");

  return JSON.parse(contenido) as SolicitudProveedor;
}