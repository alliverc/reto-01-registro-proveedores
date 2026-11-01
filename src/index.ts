import {
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
});