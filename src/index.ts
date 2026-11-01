/*import {
  proveedor_leer_solicitud,
  proveedor_mapear_campos,
} from "./tools/proveedor.js";

async function main() {
  const caso = "pa-logistica-istmo" as const;

  const solicitud = await proveedor_leer_solicitud({ caso });
  const campos = await proveedor_mapear_campos({ caso });

  console.log("\n=== SOLICITUD ===");
  console.log(`${solicitud.cliente} - ${solicitud.pais}`);
  console.log(`Formato: ${solicitud.formato}`);

  console.log("\n=== CAMPOS MAPEADOS ===");

  for (const campo of campos) {
    const estado = campo.encontrado ? "OK" : "FALTANTE";

    console.log(
      `[${estado}] ${campo.etiqueta} -> ${campo.rutaMaestro ?? "sin mapeo"} ->`,
      campo.valor,
    );
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});*/

/*import {
  proveedor_generar_formulario,
} from "./tools/proveedor.js";

async function main() {
  const archivo = await proveedor_generar_formulario({
    caso: "hn-agroexport-sula",
  });

  console.log("Formulario generado correctamente:");
  console.log(archivo);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
*/
/*import {
  proveedor_generar_pdf,
} from "./tools/proveedor.js";

async function main() {
  const archivo = await proveedor_generar_pdf({
    caso: "ec-corp-andina",
  });

  console.log("PDF generado correctamente:");
  console.log(archivo);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});*/

/*import {
  proveedor_preparar_portal,
} from "./tools/proveedor.js";

async function main() {
  const archivo = await proveedor_preparar_portal({
    caso: "pa-logistica-istmo",
  });

  console.log("Preparación de portal generada:");
  console.log(archivo);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
import {
  proveedor_armar_paquete,
} from "./tools/proveedor.js";

async function main() {
  const paquete = await proveedor_armar_paquete({
    caso: "co-industrias-delta",
  });

  console.log("Paquete generado correctamente:");
  console.log(paquete);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});*/

import { probarGemini } from "./llm/gemini.js";

async function main() {
  console.log("Probando conexión con Gemini...");

  const respuesta = await probarGemini();

  console.log("Respuesta:");
  console.log(respuesta);
}

main().catch((error) => {
  console.error("Error probando Gemini:");
  console.error(error);

  process.exit(1);
});