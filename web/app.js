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

  const revision =
    data.resumen?.requiereRevisionHumana
      ? "Sí"
      : "No";

  const claseRevision =
    data.resumen?.requiereRevisionHumana
      ? "warning"
      : "success";


  /*
   * CAMPOS FALTANTES
   */

  const faltantesTexto =
    faltantes.length > 0
      ? faltantes.join(", ")
      : "Ninguno";


  /*
   * SOPORTES PROBLEMÁTICOS
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
   * CONSTRUIR RESPUESTA VISUAL
   */

  elemento.innerHTML = `
    <div class="avatar">
      IA
    </div>

    <div class="message-content">

      <strong>
        ${escaparHtml(data.respuesta)}
      </strong>


      <!-- RESULTADO DEL ANÁLISIS -->

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


      <!-- HERRAMIENTAS EJECUTADAS -->

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

    </div>
  `;

  messages.appendChild(elemento);

  desplazarChat();
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
  messages.scrollTop = messages.scrollHeight;
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
 * ENVÍO MANUAL DESDE EL INPUT
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
 * SELECCIÓN DE CASO DESDE EL PANEL
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