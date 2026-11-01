import express from "express";
import cors from "cors";
import { join } from "node:path";

import {
  interpretarMensaje,
} from "./llm/gemini.js";

import {
  proveedor_leer_solicitud,
  proveedor_mapear_campos,
  proveedor_validar_soportes,
} from "./tools/proveedor.js";


const app = express();

const PORT = Number(
  process.env.PORT ?? 3000,
);


const casos = [
  "co-industrias-delta",
  "ec-corp-andina",
  "hn-agroexport-sula",
  "pa-logistica-istmo",
] as const;


type Caso = (typeof casos)[number];


type EstadoHerramienta =
  | "OK"
  | "ERROR";


interface HerramientaEjecutada {
  nombre: string;
  estado: EstadoHerramienta;
}


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
    servicio:
      "Reto 01 - Registro como Proveedor",
    estado: "activo",
  });
});


/*
 * CHAT
 *
 * Flujo:
 *
 * Usuario
 *   ↓
 * Mensaje
 *   ↓
 * ¿Contiene ID exacto?
 *   ├── Sí → usar caso directamente
 *   │
 *   └── No → Gemini interpreta
 *              ↓
 *          caso identificado
 *              ↓
 *     herramientas deterministas
 */

app.post("/api/chat", async (req, res) => {
  try {

    /*
     * OBTENER MENSAJE
     */

    const mensaje = String(
      req.body?.mensaje ?? "",
    ).trim();


    /*
     * VALIDAR MENSAJE
     */

    if (!mensaje) {
      return res.status(400).json({
        ok: false,
        error:
          "El campo 'mensaje' es obligatorio.",
      });
    }


    /*
     * PRIMER INTENTO:
     *
     * identificar directamente un ID
     * conocido.
     */

    let casoSeleccionado:
      Caso | null =
        casos.find((item) =>
          mensaje
            .toLowerCase()
            .includes(
              item.toLowerCase(),
            ),
        ) ?? null;


    /*
     * RESPUESTA GENERADA POR GEMINI
     *
     * Solo se utilizará cuando Gemini
     * haya interpretado el mensaje.
     */

    let respuestaGemini:
      string | null = null;


    /*
     * SI NO HAY ID EXACTO:
     *
     * usar Gemini para interpretar
     * lenguaje natural.
     */

    if (!casoSeleccionado) {

      try {

        const intencion =
          await interpretarMensaje(
            mensaje,
          );


        respuestaGemini =
          intencion.respuesta;


        /*
         * ANALIZAR CASO
         */

        if (
          intencion.accion ===
            "analizar" &&
          intencion.caso
        ) {

          casoSeleccionado =
            intencion.caso;

        }


        /*
         * LISTAR CASOS
         */

        else if (
          intencion.accion ===
          "listar_casos"
        ) {

          return res.json({
            ok: true,

            respuesta:
              intencion.respuesta,

            casosDisponibles:
              casos,

            herramientasEjecutadas:
              [],
          });

        }


        /*
         * AYUDA
         */

        else if (
          intencion.accion ===
          "ayuda"
        ) {

          return res.json({
            ok: true,

            respuesta:
              intencion.respuesta,

            casosDisponibles:
              casos,

            herramientasEjecutadas:
              [],
          });

        }


        /*
         * INTENCIÓN DESCONOCIDA
         */

        else {

          return res.status(400).json({
            ok: false,

            error:
              intencion.respuesta ||
              "No pude identificar la solicitud.",

            casosDisponibles:
              casos,
          });

        }

      } catch (error) {

        /*
         * Gemini puede tener saturación,
         * timeout u otro problema.
         *
         * No permitimos que eso tumbe
         * el servidor.
         */

        console.error(
          "Gemini no pudo interpretar el mensaje:",
          error,
        );

      }

    }


    /*
     * SI AÚN NO TENEMOS CASO
     */

    if (!casoSeleccionado) {

      return res.status(400).json({
        ok: false,

        error:
          "No pude identificar el caso solicitado.",

        casosDisponibles:
          casos,
      });

    }


    /*
     * REGISTRO DE HERRAMIENTAS
     */

    const herramientasEjecutadas:
      HerramientaEjecutada[] = [];


    /*
     * 1. LEER SOLICITUD
     */

    const solicitud =
      await proveedor_leer_solicitud({
        caso: casoSeleccionado,
      });


    herramientasEjecutadas.push({
      nombre:
        "proveedor_leer_solicitud",

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
      nombre:
        "proveedor_mapear_campos",

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
      nombre:
        "proveedor_validar_soportes",

      estado: "OK",
    });


    /*
     * CAMPOS FALTANTES
     */

    const camposFaltantes =
      campos
        .filter(
          (campo) =>
            !campo.encontrado,
        )
        .map(
          (campo) =>
            campo.etiqueta,
        );


    /*
     * SOPORTES CON PROBLEMAS
     */

    const soportesProblematicos =
      soportes
        .filter(
          (soporte) =>
            soporte.estado !==
            "DISPONIBLE",
        )
        .map(
          (soporte) => ({
            tipo:
              soporte.tipo,

            estado:
              soporte.estado,
          }),
        );


    /*
     * REVISIÓN HUMANA
     */

    const requiereRevisionHumana =
      camposFaltantes.length > 0 ||
      soportesProblematicos.length > 0 ||
      solicitud.formato ===
        "portal";


    /*
     * RESPUESTA FINAL
     */

    return res.json({
      ok: true,


      /*
       * Si Gemini interpretó el mensaje,
       * utilizamos su respuesta.
       *
       * Si el usuario utilizó directamente
       * el ID, usamos la respuesta
       * determinista.
       */

      respuesta:
        respuestaGemini ??
        `Caso ${casoSeleccionado} analizado correctamente.`,


      caso:
        casoSeleccionado,


      solicitud: {

        cliente:
          solicitud.cliente,

        pais:
          solicitud.pais,

        formato:
          solicitud.formato,

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
 * CONFIRMACIÓN HUMANA
 *
 * Este endpoint permanece
 * FUERA del control de Gemini.
 */

app.post(
  "/api/confirmacion",
  (req, res) => {

    /*
     * OBTENER DATOS
     */

    const caso = String(
      req.body?.caso ?? "",
    ).trim();


    const decision = String(
      req.body?.decision ?? "",
    ).trim();


    /*
     * VALIDAR CASO
     */

    const casoValido =
      casos.find(
        (item) =>
          item === caso,
      );


    if (!casoValido) {

      return res
        .status(400)
        .json({

          ok: false,

          error:
            "El caso indicado no es válido.",

          casosDisponibles:
            casos,

        });

    }


    /*
     * VALIDAR DECISIÓN
     */

    if (
      decision !==
        "confirmar" &&
      decision !==
        "cancelar"
    ) {

      return res
        .status(400)
        .json({

          ok: false,

          error:
            "La decisión debe ser 'confirmar' o 'cancelar'.",

        });

    }


    /*
     * CONFIRMAR
     */

    if (
      decision === "confirmar"
    ) {

      return res.json({

        ok: true,

        caso:
          casoValido,

        decision:
          "confirmar",

        estado:
          "REVISION_HUMANA_CONFIRMADA",

        mensaje:
          "La revisión humana fue confirmada. El flujo puede continuar sin completar ni inventar los datos faltantes.",

      });

    }


    /*
     * CANCELAR
     */

    return res.json({

      ok: true,

      caso:
        casoValido,

      decision:
        "cancelar",

      estado:
        "CANCELADO_POR_USUARIO",

      mensaje:
        "El usuario canceló la continuación del flujo.",

    });

  },
);


/*
 * INICIAR SERVIDOR
 */

app.listen(
  PORT,
  () => {

    console.log(
      "========================================",
    );

    console.log(
      " RETO 01 - BACKEND",
    );

    console.log(
      "========================================",
    );


    console.log(
      `Servidor iniciado en http://localhost:${PORT}`,
    );


    console.log(
      `Frontend disponible en http://localhost:${PORT}`,
    );


    console.log(
      `Health check en http://localhost:${PORT}/api/health`,
    );


    console.log(
      `Confirmación humana en http://localhost:${PORT}/api/confirmacion`,
    );

  },
);