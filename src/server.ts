import express from "express";
import cors from "cors";
import { join } from "node:path";

import {
  proveedor_leer_solicitud,
  proveedor_mapear_campos,
  proveedor_validar_soportes,
} from "./tools/proveedor.js";

const app = express();
const PORT = 3000;

const casos = [
  "co-industrias-delta",
  "ec-corp-andina",
  "hn-agroexport-sula",
  "pa-logistica-istmo",
] as const;

type Caso = (typeof casos)[number];

/*
 * MIDDLEWARE
 */

app.use(cors());
app.use(express.json());

/*
 * PUBLICAR FRONTEND
 */

const rutaWeb = join(
  process.cwd(),
  "web",
);

app.use(
  express.static(rutaWeb),
);

/*
 * HEALTH CHECK
 */

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    servicio: "Reto 01 - Registro como Proveedor",
    estado: "activo",
  });
});

/*
 * CHAT LOCAL
 *
 * Por ahora NO utiliza un modelo de IA.
 */

app.post("/api/chat", async (req, res) => {
  try {
    /*
     * Obtener mensaje.
     */

    const mensaje = String(
      req.body?.mensaje ?? "",
    ).trim();

    /*
     * Validar mensaje.
     */

    if (!mensaje) {
      return res.status(400).json({
        ok: false,
        error: "El campo 'mensaje' es obligatorio.",
      });
    }

    /*
     * Identificar caso.
     */

    const caso = casos.find((item) =>
      mensaje
        .toLowerCase()
        .includes(item.toLowerCase()),
    );

    if (!caso) {
      return res.status(400).json({
        ok: false,

        error:
          "No pude identificar el caso solicitado.",

        casosDisponibles: casos,
      });
    }

    const casoSeleccionado: Caso = caso;

    /*
     * REGISTRO DE HERRAMIENTAS EJECUTADAS
     */

    const herramientasEjecutadas: Array<{
      nombre: string;
      estado: "OK" | "ERROR";
    }> = [];

    /*
     * 1. LEER SOLICITUD
     */

    const solicitud =
      await proveedor_leer_solicitud({
        caso: casoSeleccionado,
      });

    herramientasEjecutadas.push({
      nombre: "proveedor_leer_solicitud",
      estado: "OK",
    });

    /*
     * 2. MAPEAR CAMPOS
     */

    const campos =
      await proveedor_mapear_campos({
        caso: casoSeleccionado,
      });

    herramientasEjecutadas.push({
      nombre: "proveedor_mapear_campos",
      estado: "OK",
    });

    /*
     * 3. VALIDAR SOPORTES
     */

    const soportes =
      await proveedor_validar_soportes({
        caso: casoSeleccionado,
      });

    herramientasEjecutadas.push({
      nombre: "proveedor_validar_soportes",
      estado: "OK",
    });

    /*
     * CAMPOS FALTANTES
     */

    const camposFaltantes = campos
      .filter(
        (campo) => !campo.encontrado,
      )
      .map(
        (campo) => campo.etiqueta,
      );

    /*
     * SOPORTES CON PROBLEMAS
     */

    const soportesProblematicos =
      soportes
        .filter(
          (soporte) =>
            soporte.estado !== "DISPONIBLE",
        )
        .map((soporte) => ({
          tipo: soporte.tipo,
          estado: soporte.estado,
        }));

    /*
     * REVISIÓN HUMANA
     */

    const requiereRevisionHumana =
      camposFaltantes.length > 0 ||
      soportesProblematicos.length > 0 ||
      solicitud.formato === "portal";

    /*
     * RESPUESTA
     */

    return res.json({
      ok: true,

      respuesta:
        `Caso ${casoSeleccionado} analizado correctamente.`,

      caso: casoSeleccionado,

      solicitud: {
        cliente: solicitud.cliente,
        pais: solicitud.pais,
        formato: solicitud.formato,
      },

      resumen: {
        camposEncontrados:
          campos.length -
          camposFaltantes.length,

        camposFaltantes,

        soportesProblematicos,

        requiereRevisionHumana,
      },

      herramientasEjecutadas,
    });

  } catch (error) {
    console.error(
      "Error en /api/chat:",
      error,
    );

    return res.status(500).json({
      ok: false,

      error:
        "Error interno procesando la solicitud.",
    });
  }
});

/*
 * INICIAR SERVIDOR
 */

app.listen(PORT, () => {
  console.log("========================================");
  console.log(" RETO 01 - BACKEND");
  console.log("========================================");

  console.log(
    `Servidor iniciado en http://localhost:${PORT}`,
  );

  console.log(
    `Frontend disponible en http://localhost:${PORT}`,
  );

  console.log(
    `Health check en http://localhost:${PORT}/api/health`,
  );
});