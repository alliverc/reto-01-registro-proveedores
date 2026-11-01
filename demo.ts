import {
  proveedor_leer_solicitud,
  proveedor_mapear_campos,
  proveedor_validar_soportes,
  proveedor_generar_formulario,
  proveedor_generar_pdf,
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

    /*
     * 1. LEER SOLICITUD
     */
    const solicitud = await proveedor_leer_solicitud({
      caso,
    });

    /*
     * 2. MAPEAR CAMPOS
     */
    const campos = await proveedor_mapear_campos({
      caso,
    });

    /*
     * 3. VALIDAR SOPORTES
     */
    const soportes = await proveedor_validar_soportes({
      caso,
    });

    console.log(`Cliente: ${solicitud.cliente}`);
    console.log(`País: ${solicitud.pais}`);
    console.log(`Formato: ${solicitud.formato}`);

    /*
     * CAMPOS
     */
    console.log("\nCampos:");

    for (const campo of campos) {
      const estado = campo.encontrado
        ? "OK"
        : "FALTANTE";

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

    /*
     * SOPORTES
     */
    console.log("\nSoportes:");

    for (const soporte of soportes) {
      console.log(
        `[${soporte.estado}] ${soporte.tipo}` +
          ` -> ${soporte.archivo ?? "sin archivo"}` +
          ` -> vigencia: ${soporte.vigenciaHasta ?? "no aplica"}`,
      );
    }

    /*
     * 4. GENERAR FORMULARIO
     */

    // Colombia y Honduras utilizan XLSX
    if (
      caso === "co-industrias-delta" ||
      caso === "hn-agroexport-sula"
    ) {
      const archivoGenerado =
        await proveedor_generar_formulario({
          caso,
        });

      console.log("\nFormulario XLSX generado:");
      console.log(archivoGenerado);
    }

    // Ecuador utiliza PDF
    else if (caso === "ec-corp-andina") {
      const archivoGenerado =
        await proveedor_generar_pdf({
          caso,
        });

      console.log("\nFormulario PDF generado:");
      console.log(archivoGenerado);
    }

    // Panamá utiliza portal
    else if (caso === "pa-logistica-istmo") {
      console.log(
        "\nPortal: preparación pendiente",
      );
    }
  }

  console.log("\n\n========================================");
  console.log(" DEMO FINALIZADA");
  console.log("========================================");
}

main().catch((error) => {
  console.error("\nERROR EN DEMO:");
  console.error(error);
  process.exit(1);
});