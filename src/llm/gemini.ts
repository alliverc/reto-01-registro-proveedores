import "dotenv/config";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";


/*
 * CONFIGURACIÓN
 */

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "No se encontró GEMINI_API_KEY en el archivo .env",
  );
}


const ai = new GoogleGenAI({
  apiKey,
});


const MODELO = "gemini-3.8-flash";


/*
 * CASOS DISPONIBLES
 */

export const casosDisponibles = [
  "co-industrias-delta",
  "ec-corp-andina",
  "hn-agroexport-sula",
  "pa-logistica-istmo",
] as const;


/*
 * ESQUEMA DE INTENCIÓN
 *
 * Gemini interpreta el mensaje.
 * Zod valida que la respuesta tenga
 * exactamente una estructura conocida.
 */

const IntencionSchema = z.object({
  accion: z.enum([
    "analizar",
    "listar_casos",
    "ayuda",
    "desconocida",
  ]),

  caso: z
    .enum(casosDisponibles)
    .nullable(),

  respuesta: z.string(),
});


export type IntencionAgente =
  z.infer<typeof IntencionSchema>;


/*
 * LIMPIAR RESPUESTA JSON
 *
 * Si Gemini devuelve:
 *
 * ```json
 * {...}
 * ```
 *
 * eliminamos el bloque Markdown.
 */

function limpiarJson(
  texto: string,
): string {

  let resultado =
    texto.trim();


  if (resultado.startsWith("```")) {

    resultado =
      resultado.replace(
        /^```(?:json)?\s*/i,
        "",
      );


    resultado =
      resultado.replace(
        /\s*```$/,
        "",
      );
  }


  return resultado.trim();
}


/*
 * CARGAR PROMPT DEL AGENTE
 *
 * Lee:
 *
 * agent/prompt.md
 */

async function cargarPrompt():
  Promise<string> {

  const rutaPrompt = join(
    process.cwd(),
    "agent",
    "prompt.md",
  );


  return readFile(
    rutaPrompt,
    "utf-8",
  );
}


/*
 * PRUEBA DE CONEXIÓN
 *
 * Conservamos esta función porque
 * nos permite comprobar rápidamente
 * que Gemini está disponible.
 */

export async function probarGemini():
  Promise<string> {

  const response =
    await ai.models.generateContent({

      model: MODELO,

      contents:
        "Responde únicamente con esta frase: Conexion con Gemini correcta",

    });


  return response.text ?? "";
}


/*
 * INTERPRETAR MENSAJE
 *
 * Gemini solamente interpreta
 * la intención del usuario.
 *
 * Gemini NO:
 *
 * - modifica fixtures;
 * - genera Excel;
 * - genera PDF;
 * - valida vigencias;
 * - inventa datos;
 * - ejecuta acciones externas.
 *
 * Todo eso seguirá controlado
 * por nuestras herramientas TypeScript.
 */

export async function interpretarMensaje(
  mensaje: string,
): Promise<IntencionAgente> {

  /*
   * Cargar prompt principal.
   */

  const promptBase =
    await cargarPrompt();


  /*
   * Construir instrucción.
   */

  const instruccion = `
${promptBase}

# Tarea actual

Interpreta el siguiente mensaje del usuario.

MENSAJE DEL USUARIO:

${JSON.stringify(mensaje)}

Debes responder EXCLUSIVAMENTE con JSON válido.

No utilices Markdown.

No utilices bloques de código.

La estructura obligatoria es:

{
  "accion": "analizar | listar_casos | ayuda | desconocida",
  "caso": "co-industrias-delta | ec-corp-andina | hn-agroexport-sula | pa-logistica-istmo | null",
  "respuesta": "respuesta breve para el usuario"
}

Reglas:

1. Si el usuario quiere analizar, revisar o procesar uno de los cuatro casos:
   accion = "analizar"

2. Si puedes identificar claramente el caso:
   devuelve su identificador exacto.

3. No inventes identificadores de casos.

4. Si pregunta qué casos existen:
   accion = "listar_casos"
   caso = null

5. Si pregunta qué puede hacer el agente:
   accion = "ayuda"
   caso = null

6. Si no puedes determinar una intención válida:
   accion = "desconocida"
   caso = null

7. Nunca afirmes que ejecutaste herramientas.

8. Nunca afirmes que generaste documentos.

9. Nunca afirmes que enviaste información.

10. La propiedad "respuesta" debe ser breve.
`;


  /*
   * ENVIAR A GEMINI
   */

  const response =
    await ai.models.generateContent({

      model: MODELO,

      contents: instruccion,

    });


  /*
   * EXTRAER TEXTO
   */

  const texto =
    response.text ?? "";


  if (!texto.trim()) {

    throw new Error(
      "Gemini devolvió una respuesta vacía.",
    );

  }


  /*
   * LIMPIAR JSON
   */

  const jsonLimpio =
    limpiarJson(texto);


  /*
   * CONVERTIR TEXTO A OBJETO
   */

  let resultadoDesconocido:
    unknown;


  try {

    resultadoDesconocido =
      JSON.parse(jsonLimpio);

  } catch {

    console.error(
      "Respuesta recibida de Gemini:",
      texto,
    );


    throw new Error(
      "Gemini no devolvió un JSON válido.",
    );

  }


  /*
   * VALIDACIÓN FINAL CON ZOD
   *
   * Aunque Gemini responda con cualquier
   * estructura, esta validación evita que
   * pase información no esperada.
   */

  const resultadoValidado =
    IntencionSchema.parse(
      resultadoDesconocido,
    );


  return resultadoValidado;
}