const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const messages = document.getElementById("messages");
const processing = document.getElementById("processing");
const sendButton = document.getElementById("send-button");

const caseButtons = document.querySelectorAll(".case-card");


function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = String(texto);
  return div.innerHTML;
}


function agregarMensajeUsuario(texto) {
  const elemento = document.createElement("div");

  elemento.className = "message user-message";

  elemento.innerHTML = `
    <div class="avatar">
      TÚ
    </div>

    <div class="message-content">
      <p>${escaparHtml(texto)}</p>
    </div>
  `;

  messages.appendChild(elemento);

  desplazarChat();
}


function agregarMensajeSistema(
  mensaje,
  tipo = "success",
) {
  const elemento = document.createElement("div");

  elemento.className = "message assistant-message";

  const titulo =
    tipo === "success"
      ? "Decisión registrada"
      : "Flujo cancelado";

  elemento.innerHTML = `
    <div class="avatar">
      IA
    </div>

    <div class="message-content">

      <strong>
        ${escaparHtml(titulo)}
      </strong>

      <p>
        ${escaparHtml(mensaje)}
      </p>

    </div>
  `;

  messages.appendChild(elemento);

  desplazarChat();
}


function agregarMensajeAgente(data) {
  const elemento = document.createElement("div");

  elemento.className = "message assistant-message";

  /*
   * DATOS DEL RESULTADO
   */

  const faltantes =
    data.resumen?.camposFaltantes ?? [];

  const soportesProblematicos =
    data.resumen?.soportesProblematicos ?? [];

  const herramientas =
    data.herramientasEjecutadas ?? [];


  /*
   * REVISIÓN HUMANA
   */

  const requiereRevision =
    data.resumen?.requiereRevisionHumana === true;

  const revision =
    requiereRevision
      ? "Sí"
      : "No";

  const claseRevision =
    requiereRevision
      ? "warning"
      : "success";


  /*
   * TEXTO DE FALTANTES
   */

  const faltantesTexto =
    faltantes.length > 0
      ? faltantes.join(", ")
      : "Ninguno";


  /*
   * TEXTO DE SOPORTES
   */

  const soportesTexto =
    soportesProblematicos.length > 0
      ? soportesProblematicos
          .map(
            (soporte) =>
              `${soporte.tipo} (${soporte.estado})`,
          )
          .join(", ")
      : "Ninguno";


  /*
   * HERRAMIENTAS EJECUTADAS
   */

  const herramientasHtml =
    herramientas.length > 0
      ? herramientas
          .map(
            (herramienta) => `
              <div class="result-row">

                <span class="result-label">
                  ${escaparHtml(herramienta.nombre)}
                </span>

                <span class="result-value success">
                  ✓ ${escaparHtml(herramienta.estado)}
                </span>

              </div>
            `,
          )
          .join("")
      : `
          <div class="result-row">

            <span class="result-label">
              Sin herramientas registradas
            </span>

          </div>
        `;


  /*
   * PANEL DE CONFIRMACIÓN HUMANA
   */

  const confirmacionHtml =
    requiereRevision
      ? `
          <div class="result-card human-review">

            <div class="result-row">
              <span class="result-label">

                <strong>
                  ⚠ Revisión humana requerida
                </strong>

              </span>
            </div>

            <div class="review-content">

              <p>
                El caso contiene información faltante,
                soportes con problemas o requiere una
                acción manual.
              </p>

              <p>
                Confirmar la continuación
                <strong>no completa ni inventa</strong>
                los datos faltantes.
              </p>

              <div class="review-actions">

                <button
                  type="button"
                  class="confirm-button"
                  data-confirm-case="${escaparHtml(data.caso)}"
                >
                  Confirmar continuación
                </button>

                <button
                  type="button"
                  class="cancel-button"
                  data-cancel-case="${escaparHtml(data.caso)}"
                >
                  Cancelar
                </button>

              </div>

              <div
                class="confirmation-result"
                data-result-case="${escaparHtml(data.caso)}"
              ></div>

            </div>

          </div>
        `
      : "";


  /*
   * CONSTRUIR RESPUESTA
   */

  elemento.innerHTML = `
    <div class="avatar">
      IA
    </div>

    <div class="message-content">

      <strong>
        ${escaparHtml(data.respuesta)}
      </strong>


      <!-- RESUMEN -->

      <div class="result-card">

        <div class="result-row">

          <span class="result-label">
            Cliente
          </span>

          <span class="result-value">
            ${escaparHtml(
              data.solicitud?.cliente ??
              "No disponible",
            )}
          </span>

        </div>


        <div class="result-row">

          <span class="result-label">
            País
          </span>

          <span class="result-value">
            ${escaparHtml(
              data.solicitud?.pais ??
              "No disponible",
            )}
          </span>

        </div>


        <div class="result-row">

          <span class="result-label">
            Formato
          </span>

          <span class="result-value">
            ${escaparHtml(
              data.solicitud?.formato ??
              "No disponible",
            )}
          </span>

        </div>


        <div class="result-row">

          <span class="result-label">
            Campos encontrados
          </span>

          <span class="result-value success">
            ${escaparHtml(
              data.resumen?.camposEncontrados ?? 0,
            )}
          </span>

        </div>


        <div class="result-row">

          <span class="result-label">
            Campos faltantes
          </span>

          <span class="result-value">
            ${escaparHtml(faltantesTexto)}
          </span>

        </div>


        <div class="result-row">

          <span class="result-label">
            Soportes con problemas
          </span>

          <span class="result-value">
            ${escaparHtml(soportesTexto)}
          </span>

        </div>


        <div class="result-row">

          <span class="result-label">
            Revisión humana
          </span>

          <span class="result-value ${claseRevision}">
            ${revision}
          </span>

        </div>

      </div>


      <!-- HERRAMIENTAS -->

      <div class="result-card">

        <div class="result-row">

          <span class="result-label">
            <strong>
              Herramientas ejecutadas
            </strong>
          </span>

        </div>

        ${herramientasHtml}

      </div>


      <!-- CONFIRMACIÓN HUMANA -->

      ${confirmacionHtml}

    </div>
  `;

  messages.appendChild(elemento);

  /*
   * ACTIVAR BOTONES DE CONFIRMACIÓN
   */

  if (requiereRevision) {
    activarConfirmacionHumana(
      elemento,
      data.caso,
    );
  }

  desplazarChat();
}


function activarConfirmacionHumana(
  elemento,
  caso,
) {
  const confirmar =
    elemento.querySelector(
      "[data-confirm-case]",
    );

  const cancelar =
    elemento.querySelector(
      "[data-cancel-case]",
    );

  const resultado =
    elemento.querySelector(
      "[data-result-case]",
    );

  if (
    !confirmar ||
    !cancelar ||
    !resultado
  ) {
    return;
  }


  confirmar.addEventListener(
    "click",
    async () => {
      confirmar.disabled = true;
      cancelar.disabled = true;

      resultado.textContent =
        "Registrando confirmación...";

      try {
        const data =
          await enviarConfirmacion(
            caso,
            "confirmar",
          );

        resultado.textContent =
          data.mensaje;

        resultado.className =
          "confirmation-result success";

        agregarMensajeSistema(
          data.mensaje,
          "success",
        );

      } catch (error) {
        resultado.textContent =
          error instanceof Error
            ? error.message
            : "Error registrando la confirmación.";

        resultado.className =
          "confirmation-result warning";

        confirmar.disabled = false;
        cancelar.disabled = false;
      }
    },
  );


  cancelar.addEventListener(
    "click",
    async () => {
      confirmar.disabled = true;
      cancelar.disabled = true;

      resultado.textContent =
        "Registrando cancelación...";

      try {
        const data =
          await enviarConfirmacion(
            caso,
            "cancelar",
          );

        resultado.textContent =
          data.mensaje;

        resultado.className =
          "confirmation-result warning";

        agregarMensajeSistema(
          data.mensaje,
          "warning",
        );

      } catch (error) {
        resultado.textContent =
          error instanceof Error
            ? error.message
            : "Error registrando la cancelación.";

        resultado.className =
          "confirmation-result warning";

        confirmar.disabled = false;
        cancelar.disabled = false;
      }
    },
  );
}


async function enviarConfirmacion(
  caso,
  decision,
) {
  const response = await fetch(
    "/api/confirmacion",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        caso,
        decision,
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ??
      "No fue posible registrar la decisión.",
    );
  }

  return data;
}


function agregarError(mensaje) {
  const elemento = document.createElement("div");

  elemento.className = "message assistant-message";

  elemento.innerHTML = `
    <div class="avatar">
      !
    </div>

    <div class="message-content">

      <strong>
        No pude procesar la solicitud.
      </strong>

      <p>
        ${escaparHtml(mensaje)}
      </p>

    </div>
  `;

  messages.appendChild(elemento);

  desplazarChat();
}


function desplazarChat() {
  messages.scrollTop =
    messages.scrollHeight;
}


function establecerProcesando(valor) {
  processing.classList.toggle(
    "hidden",
    !valor,
  );

  sendButton.disabled = valor;
  input.disabled = valor;
}


async function enviarMensaje(mensaje) {
  agregarMensajeUsuario(mensaje);

  establecerProcesando(true);

  try {
    const response = await fetch(
      "/api/chat",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          mensaje,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ??
        "El servidor devolvió un error.",
      );
    }

    agregarMensajeAgente(data);

  } catch (error) {
    agregarError(
      error instanceof Error
        ? error.message
        : "Error desconocido.",
    );

  } finally {
    establecerProcesando(false);

    input.value = "";
    input.focus();
  }
}


/*
 * ENVÍO DESDE EL INPUT
 */

form.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const mensaje = input.value.trim();

    if (!mensaje) {
      return;
    }

    await enviarMensaje(mensaje);
  },
);


/*
 * SELECCIÓN DE CASO
 */

caseButtons.forEach((button) => {
  button.addEventListener(
    "click",
    async () => {
      const caso = button.dataset.case;

      if (!caso) {
        return;
      }

      caseButtons.forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      const mensaje =
        `Analiza el caso ${caso}`;

      input.value = mensaje;

      await enviarMensaje(mensaje);
    },
  );
});