import {
  interpretarMensaje,
  probarGemini,
} from "./llm/gemini.js";

async function main() {
  console.log(
    "Probando conexión con Gemini...",
  );

  const conexion =
    await probarGemini();

  console.log(conexion);

  console.log(
    "\nProbando interpretación...",
  );

  const resultado =
    await interpretarMensaje(
      "Necesito revisar la solicitud de Corporación Andina",
    );

  console.log(
    JSON.stringify(
      resultado,
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    "Error probando Gemini:",
  );

  console.error(error);

  process.exit(1);
});