import {
  proveedor_leer_solicitud,
  proveedor_mapear_campos,
  proveedor_validar_soportes,
} from "./src/tools/proveedor.js";

const casos = [
  "co-industrias-delta",
  "ec-corp-andina",
  "hn-agroexport-sula",
  "pa-logistica-istmo",
] as const;

async function main() {
  console.log("========================================");
  console.log(" RETO 01 - REGISTRO COMO PROVEEDOR");
  console.log(" DEMO DETERMINISTA");
  console.log("========================================");

  for (const caso of casos) {
    console.log(`\n\n===== CASO: ${caso} =====`);

    const solicitud = await proveedor_leer_solicitud({ caso });
    const campos = await proveedor_mapear_campos({ caso });
    const soportes = await proveedor_validar_soportes({ caso });

    console.log(`Cliente: ${solicitud.cliente}`);
    console.log(`País: ${solicitud.pais}`);
    console.log(`Formato: ${solicitud.formato}`);

    console.log("\nCampos:");

    for (const campo of campos) {
      const estado = campo.encontrado ? "OK" : "FALTANTE";

      console.log(
        `[${estado}] ${campo.etiqueta} -> ${campo.valor ?? "null"}`,
      );
    }

    const encontrados = campos.filter(
      (campo) => campo.encontrado,
    ).length;

    const faltantes = campos.filter(
      (campo) => !campo.encontrado,
    ).length;

    console.log("\nResumen:");
    console.log(`Encontrados: ${encontrados}`);
    console.log(`Faltantes: ${faltantes}`);
    console.log("\nSoportes:");
    
    for (const soporte of soportes) {
    console.log(
        `[${soporte.estado}] ${soporte.tipo}` +
        ` -> ${soporte.archivo ?? "sin archivo"}` +
        ` -> vigencia: ${soporte.vigenciaHasta ?? "no aplica"}`,
    );
    }
    
  }
}

main().catch((error) => {
  console.error("\nERROR EN DEMO:");
  console.error(error);
  process.exit(1);
});