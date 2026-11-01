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

const MapearCamposSchema = z.object({
  caso: z.enum([
    "co-industrias-delta",
    "ec-corp-andina",
    "hn-agroexport-sula",
    "pa-logistica-istmo",
  ]),
});

export type MapearCamposInput = z.infer<typeof MapearCamposSchema>;

interface CampoMapeado {
  etiqueta: string;
  rutaMaestro: string | null;
  valor: unknown;
  encontrado: boolean;
}

function obtenerValorPorRuta(
  objeto: Record<string, unknown>,
  ruta: string,
): unknown {
  return ruta.split(".").reduce<unknown>((actual, clave) => {
    if (
      actual !== null &&
      typeof actual === "object" &&
      clave in (actual as Record<string, unknown>)
    ) {
      return (actual as Record<string, unknown>)[clave];
    }

    return undefined;
  }, objeto);
}

export async function proveedor_mapear_campos(
  input: MapearCamposInput,
): Promise<CampoMapeado[]> {
  const datosValidados = MapearCamposSchema.parse(input);

  const baseFixtures = join(process.cwd(), "fixtures", "reto-01");

  const rutaCaso = join(
    baseFixtures,
    "casos",
    datosValidados.caso,
  );

  const rutaGlosario = join(
    baseFixtures,
    "glosario-campos.json",
  );

  const rutaMaestro = join(
    baseFixtures,
    "repositorio",
    "maestro.json",
  );

  const [contenidoGlosario, contenidoMaestro] = await Promise.all([
    readFile(rutaGlosario, "utf-8"),
    readFile(rutaMaestro, "utf-8"),
  ]);

  const glosario = JSON.parse(contenidoGlosario) as Record<string, string>;
  const maestro = JSON.parse(contenidoMaestro) as Record<string, unknown>;

  let etiquetas: string[] = [];

  try {
    const contenidoPlantilla = await readFile(
      join(rutaCaso, "plantilla-celdas.json"),
      "utf-8",
    );

    const plantilla = JSON.parse(contenidoPlantilla) as Array<{
      etiqueta: string;
    }>;

    etiquetas = plantilla.map((campo) => campo.etiqueta);
  } catch {
    const contenidoPlantilla = await readFile(
      join(rutaCaso, "plantilla-campos.json"),
      "utf-8",
    );

    const plantilla = JSON.parse(contenidoPlantilla) as Array<{
      etiqueta: string;
    }>;

    etiquetas = plantilla.map((campo) => campo.etiqueta);
  }

  return etiquetas.map((etiqueta) => {
    const rutaMaestro = glosario[etiqueta] ?? null;

    if (!rutaMaestro) {
      return {
        etiqueta,
        rutaMaestro: null,
        valor: null,
        encontrado: false,
      };
    }

    const valor = obtenerValorPorRuta(maestro, rutaMaestro);

    return {
      etiqueta,
      rutaMaestro,
      valor: valor ?? null,
      encontrado: valor !== undefined && valor !== null,
    };
  });
}

const ValidarSoportesSchema = z.object({
  caso: z.enum([
    "co-industrias-delta",
    "ec-corp-andina",
    "hn-agroexport-sula",
    "pa-logistica-istmo",
  ]),
});

export type ValidarSoportesInput = z.infer<
  typeof ValidarSoportesSchema
>;

type EstadoSoporte = "DISPONIBLE" | "VENCIDO" | "FALTANTE";

interface SoporteValidado {
  tipo: string;
  estado: EstadoSoporte;
  archivo: string | null;
  vigenciaHasta: string | null;
}

interface SoporteRepositorio {
  tipo: string;
  archivo: string;
  vigencia_hasta: string | null;
  pais_emisor: string;
  descripcion: string;
}

export async function proveedor_validar_soportes(
  input: ValidarSoportesInput,
): Promise<SoporteValidado[]> {
  const datosValidados = ValidarSoportesSchema.parse(input);

  const baseFixtures = join(process.cwd(), "fixtures", "reto-01");

  const rutaCaso = join(
    baseFixtures,
    "casos",
    datosValidados.caso,
  );

  const rutaSoportesExigidos = join(
    rutaCaso,
    "soportes-exigidos.json",
  );

  const rutaIndiceSoportes = join(
    baseFixtures,
    "repositorio",
    "soportes",
    "index.json",
  );

  const rutaSolicitud = join(
    rutaCaso,
    "solicitud.json",
  );

  const [
    contenidoExigidos,
    contenidoIndice,
    contenidoSolicitud,
  ] = await Promise.all([
    readFile(rutaSoportesExigidos, "utf-8"),
    readFile(rutaIndiceSoportes, "utf-8"),
    readFile(rutaSolicitud, "utf-8"),
  ]);

  const soportesExigidos = JSON.parse(
    contenidoExigidos,
  ) as string[];

  const indiceSoportes = JSON.parse(
    contenidoIndice,
  ) as SoporteRepositorio[];

  const solicitud = JSON.parse(
    contenidoSolicitud,
  ) as SolicitudProveedor;

  const fechaSolicitud = new Date(
    `${solicitud.fecha}T00:00:00Z`,
  );

  return soportesExigidos.map((tipo) => {
    const soporte = indiceSoportes.find(
      (item) => item.tipo === tipo,
    );

    if (!soporte) {
      return {
        tipo,
        estado: "FALTANTE",
        archivo: null,
        vigenciaHasta: null,
      };
    }

    if (soporte.vigencia_hasta) {
      const fechaVencimiento = new Date(
        `${soporte.vigencia_hasta}T00:00:00Z`,
      );

      if (fechaVencimiento < fechaSolicitud) {
        return {
          tipo,
          estado: "VENCIDO",
          archivo: soporte.archivo,
          vigenciaHasta: soporte.vigencia_hasta,
        };
      }
    }

    return {
      tipo,
      estado: "DISPONIBLE",
      archivo: soporte.archivo,
      vigenciaHasta: soporte.vigencia_hasta,
    };
  });
}