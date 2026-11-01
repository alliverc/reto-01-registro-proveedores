import { proveedor_leer_solicitud } from "./tools/proveedor.js";

async function main() {
  const solicitud = await proveedor_leer_solicitud({
    caso: "co-industrias-delta",
  });

  console.log("Solicitud cargada correctamente:");
  console.log(JSON.stringify(solicitud, null, 2));
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});