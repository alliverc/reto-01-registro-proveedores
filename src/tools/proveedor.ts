import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import ExcelJS from "exceljs";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";


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
const GenerarFormularioSchema = z.object({
  caso: z.enum([
    "co-industrias-delta",
    "hn-agroexport-sula",
  ]),
});

export type GenerarFormularioInput = z.infer<
  typeof GenerarFormularioSchema
>;

interface CampoCelda {
  hoja: string;
  celda_etiqueta: string;
  etiqueta: string;
  celda_valor: string;
}

export async function proveedor_generar_formulario(
  input: GenerarFormularioInput,
): Promise<string> {
  const datos = GenerarFormularioSchema.parse(input);

  const rutaPlantilla = join(
    process.cwd(),
    "fixtures",
    "reto-01",
    "casos",
    datos.caso,
    "plantilla-celdas.json",
  );

  const contenido = await readFile(rutaPlantilla, "utf-8");
  const plantilla = JSON.parse(contenido) as CampoCelda[];

  const camposMapeados = await proveedor_mapear_campos({
    caso: datos.caso,
  });

  const libro = new ExcelJS.Workbook();

  for (const campo of plantilla) {
    let hoja = libro.getWorksheet(campo.hoja);

    if (!hoja) {
      hoja = libro.addWorksheet(campo.hoja);
    }

    hoja.getCell(campo.celda_etiqueta).value = campo.etiqueta;

    const mapeado = camposMapeados.find(
      (item) => item.etiqueta === campo.etiqueta,
    );

    hoja.getCell(campo.celda_valor).value =
      mapeado?.encontrado
        ? String(mapeado.valor)
        : "FALTANTE";

    hoja.getCell(campo.celda_etiqueta).font = {
      bold: true,
    };

    hoja.getColumn(
      hoja.getCell(campo.celda_etiqueta).col,
    ).width = 32;

    hoja.getColumn(
      hoja.getCell(campo.celda_valor).col,
    ).width = 55;
  }

  const carpetaSalida = join(
    process.cwd(),
    "out",
    datos.caso,
  );

  await mkdir(carpetaSalida, {
    recursive: true,
  });

  const rutaSalida = join(
    carpetaSalida,
    "formulario.xlsx",
  );

  await libro.xlsx.writeFile(rutaSalida);

  return rutaSalida;
}

const GenerarPdfSchema = z.object({
  caso: z.literal("ec-corp-andina"),
});

export type GenerarPdfInput = z.infer<
  typeof GenerarPdfSchema
>;

interface CampoPdf {
  etiqueta: string;
  obligatorio: boolean;
}

export async function proveedor_generar_pdf(
  input: GenerarPdfInput,
): Promise<string> {
  const datos = GenerarPdfSchema.parse(input);

  const rutaPlantilla = join(
    process.cwd(),
    "fixtures",
    "reto-01",
    "casos",
    datos.caso,
    "plantilla-campos.json",
  );

  const contenidoPlantilla = await readFile(
    rutaPlantilla,
    "utf-8",
  );

  const plantilla = JSON.parse(
    contenidoPlantilla,
  ) as CampoPdf[];

  const camposMapeados = await proveedor_mapear_campos({
    caso: datos.caso,
  });

  const pdf = await PDFDocument.create();

  const pagina = pdf.addPage([595.28, 841.89]);

  const fuenteNormal = await pdf.embedFont(
    StandardFonts.Helvetica,
  );

  const fuenteNegrita = await pdf.embedFont(
    StandardFonts.HelveticaBold,
  );

  const anchoPagina = pagina.getWidth();

  let y = pagina.getHeight() - 60;

  /*
   * Título
   */
  pagina.drawText("FORMULARIO DE CALIFICACION DE PROVEEDOR", {
    x: 45,
    y,
    size: 16,
    font: fuenteNegrita,
    color: rgb(0.1, 0.2, 0.45),
  });

  y -= 25;

  pagina.drawText(
    "Reto 01 - Registro como Proveedor",
    {
      x: 45,
      y,
      size: 10,
      font: fuenteNormal,
      color: rgb(0.35, 0.35, 0.35),
    },
  );

  y -= 35;

  /*
   * Línea separadora
   */
  pagina.drawLine({
    start: { x: 45, y },
    end: { x: anchoPagina - 45, y },
    thickness: 1,
    color: rgb(0.75, 0.75, 0.75),
  });

  y -= 25;

  /*
   * Campos del fixture
   */
  for (const campoPlantilla of plantilla) {
    const campoMapeado = camposMapeados.find(
      (campo) =>
        campo.etiqueta === campoPlantilla.etiqueta,
    );

    const encontrado =
      campoMapeado?.encontrado === true;

    const valor = encontrado
      ? String(campoMapeado?.valor ?? "")
      : "FALTANTE";

    /*
     * Etiqueta
     */
    pagina.drawText(campoPlantilla.etiqueta, {
      x: 45,
      y,
      size: 9,
      font: fuenteNegrita,
      color: rgb(0.15, 0.15, 0.15),
    });

    /*
     * Indicador obligatorio/opcional
     */
    pagina.drawText(
      campoPlantilla.obligatorio
        ? "Obligatorio"
        : "Opcional",
      {
        x: 430,
        y,
        size: 7,
        font: fuenteNormal,
        color: campoPlantilla.obligatorio
          ? rgb(0.55, 0.1, 0.1)
          : rgb(0.3, 0.3, 0.3),
      },
    );

    y -= 15;

    /*
     * Valor
     */
    pagina.drawText(valor, {
      x: 55,
      y,
      size: 9,
      font: fuenteNormal,
      color: encontrado
        ? rgb(0, 0, 0)
        : rgb(0.8, 0, 0),
      maxWidth: anchoPagina - 110,
    });

    y -= 15;

    /*
     * Separador
     */
    pagina.drawLine({
      start: { x: 45, y },
      end: { x: anchoPagina - 45, y },
      thickness: 0.4,
      color: rgb(0.85, 0.85, 0.85),
    });

    y -= 18;
  }

  /*
   * Nota final
   */
  pagina.drawText(
    "Los campos marcados como FALTANTE requieren revision humana.",
    {
      x: 45,
      y: 35,
      size: 8,
      font: fuenteNormal,
      color: rgb(0.4, 0.4, 0.4),
    },
  );

  /*
   * Carpeta de salida
   */
  const carpetaSalida = join(
    process.cwd(),
    "out",
    datos.caso,
  );

  await mkdir(carpetaSalida, {
    recursive: true,
  });

  const rutaSalida = join(
    carpetaSalida,
    "formulario.pdf",
  );

  const bytesPdf = await pdf.save();

  await writeFile(
    rutaSalida,
    Buffer.from(bytesPdf),
  );

  return rutaSalida;
}