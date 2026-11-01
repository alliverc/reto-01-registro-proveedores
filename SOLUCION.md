# SOLUCIÓN - Reto 01: Registro como Proveedor

## 1. Resumen de la solución

La solución implementa un agente conversacional para apoyar el proceso de registro de Periferia IT Group como proveedor frente a diferentes clientes.

El sistema puede:

- interpretar solicitudes escritas en lenguaje natural;
- identificar el caso correspondiente;
- leer solicitudes estructuradas desde fixtures;
- consultar un repositorio maestro;
- mapear diferentes nombres de campos;
- detectar información faltante;
- validar soportes documentales;
- comprobar vigencias;
- generar formularios XLSX;
- generar formularios PDF;
- preparar información para portales;
- armar paquetes documentales;
- generar trazabilidad;
- solicitar confirmación humana cuando corresponde.

El diseño separa la interpretación mediante un modelo de lenguaje de las reglas de negocio deterministas.

Gemini interpreta la intención del usuario, pero los valores utilizados para completar los formularios y las decisiones relacionadas con soportes y vigencias proceden de las herramientas TypeScript y los fixtures suministrados.

---

# 2. Arquitectura

La arquitectura implementada es:

```text
Usuario
   |
   v
Frontend HTML/CSS/JavaScript
   |
   v
Express API
   |
   +----------------------+
   |                      |
   v                      v
Gemini                 Herramientas
Interpretación         TypeScript
de intención              |
   |                      |
   +----------+-----------+
              |
              v
       Reglas deterministas
              |
              v
       Fixtures / Maestro
              |
              v
         Archivos out/
```

Los principales componentes son:

```text
agent/prompt.md
src/llm/gemini.ts
src/tools/proveedor.ts
src/server.ts
web/
demo.ts
fixtures/
```

---

# 3. Separación entre IA y reglas deterministas

Una decisión central de arquitectura fue no utilizar el modelo de lenguaje como fuente de verdad.

Gemini se utiliza principalmente para:

- interpretar lenguaje natural;
- identificar la intención;
- asociar una solicitud con uno de los casos permitidos;
- generar una respuesta conversacional breve.

Ejemplo:

```text
Necesito revisar la solicitud de Corporación Andina
```

puede convertirse en:

```json
{
  "accion": "analizar",
  "caso": "ec-corp-andina",
  "respuesta": "Procedo con el análisis de la solicitud para Corporación Andina."
}
```

Incluso después de recibir esa respuesta, el backend valida la estructura antes de continuar.

Gemini no decide directamente:

- el NIT;
- el RUC;
- el RTN;
- los datos bancarios;
- la vigencia de un documento;
- si existe un soporte;
- el contenido real de un formulario;
- si una revisión humana fue aprobada.

Estas decisiones pertenecen a código TypeScript determinista.

---

# 4. Prompt del agente

El comportamiento general está documentado en:

```text
agent/prompt.md
```

El prompt establece principios como:

- no inventar información;
- utilizar el repositorio maestro como fuente de datos corporativos;
- utilizar el glosario para resolver equivalencias;
- identificar información faltante;
- exigir confirmación humana cuando corresponda;
- no afirmar que una acción externa ocurrió si no fue ejecutada.

---

# 5. Integración con Gemini

La integración está implementada en:

```text
src/llm/gemini.ts
```

La API key se obtiene desde:

```text
GEMINI_API_KEY
```

mediante variables de entorno.

La salida que interpreta la intención es validada mediante Zod.

Las acciones válidas definidas son:

```text
analizar
listar_casos
ayuda
desconocida
```

Los únicos casos válidos son:

```text
co-industrias-delta
ec-corp-andina
hn-agroexport-sula
pa-logistica-istmo
```

Si Gemini devuelve una estructura que no satisface el esquema esperado, la aplicación no debe aceptarla como una intención válida.

---

# 6. Fallback determinista

El backend primero comprueba si el mensaje ya contiene directamente un identificador conocido.

Ejemplo:

```text
Analiza el caso co-industrias-delta
```

En este escenario no es necesario depender de Gemini para determinar el identificador.

Si el usuario utiliza lenguaje natural:

```text
Analiza Industrias Delta
```

Gemini puede interpretar la intención.

Este diseño permite mantener un camino determinista para los identificadores explícitos.

---

# 7. Herramientas implementadas

Las principales herramientas están implementadas en:

```text
src/tools/proveedor.ts
```

## proveedor_leer_solicitud

Responsabilidad:

- recibir un caso válido;
- localizar su `solicitud.json`;
- leer la solicitud;
- devolver sus datos.

Los casos aceptados se validan mediante Zod.

---

## proveedor_mapear_campos

Responsabilidad:

- leer los campos de la plantilla del cliente;
- consultar `glosario-campos.json`;
- obtener la ruta del atributo correspondiente;
- consultar `maestro.json`;
- devolver el valor encontrado;
- marcar como faltante cualquier valor que no pueda resolverse.

La solución no inventa valores cuando no existe un mapeo.

Ejemplos de equivalencias que pueden resolverse utilizando el glosario:

```text
NIT
RUC
RTN
```

hacia un atributo común cuando así esté definido por los fixtures.

---

## proveedor_validar_soportes

Responsabilidad:

- leer `soportes-exigidos.json`;
- consultar el índice del repositorio;
- comprobar que el soporte exista;
- comparar vigencias cuando corresponde.

Estados posibles:

```text
DISPONIBLE
VENCIDO
FALTANTE
```

La fecha de solicitud se utiliza para realizar la comparación de vigencias.

---

## proveedor_generar_formulario

Responsabilidad:

- procesar los casos XLSX;
- leer `plantilla-celdas.json`;
- generar un libro Excel;
- crear las hojas definidas;
- escribir etiquetas y valores;
- marcar como FALTANTE los campos no encontrados.

Se utiliza:

```text
ExcelJS
```

Los resultados se almacenan bajo:

```text
out/<caso>/formulario.xlsx
```

---

## proveedor_generar_pdf

Responsabilidad:

- procesar el caso PDF;
- leer los campos requeridos;
- consultar los valores mapeados;
- generar un documento PDF;
- mostrar explícitamente los valores faltantes.

Se utiliza:

```text
pdf-lib
```

El resultado se almacena en:

```text
out/ec-corp-andina/formulario.pdf
```

---

## proveedor_preparar_portal

El caso de Panamá corresponde a un flujo de portal.

La solución no simula una integración externa inexistente.

En su lugar genera:

```text
portal-preparado.json
```

con:

- campos preparados;
- valores;
- estados de soportes;
- necesidad de confirmación humana.

La acción final de carga permanece manual.

---

## proveedor_armar_paquete

Responsabilidad:

- crear el paquete final del caso;
- copiar el formulario generado;
- incluir los soportes disponibles;
- crear un checklist;
- determinar si requiere revisión humana.

La estructura generada es similar a:

```text
out/<caso>/
|
|-- formulario.xlsx
|   o formulario.pdf
|   o portal-preparado.json
|
`-- paquete/
    |-- archivo principal
    |-- checklist.json
    `-- soportes/
```

---

# 8. Validación mediante Zod

Zod se utiliza para impedir que las herramientas reciban parámetros arbitrarios.

Ejemplo conceptual:

```text
caso
  |
  v
Zod
  |
  +--> caso permitido -> continuar
  |
  `--> caso inválido -> error
```

También se valida la estructura generada por Gemini antes de utilizarla como intención.

---

# 9. Tratamiento de datos faltantes

Una regla fundamental es:

```text
Dato inexistente != dato estimado
```

Cuando no existe información suficiente:

```text
FALTANTE
```

La aplicación no intenta completar automáticamente el dato mediante el modelo de lenguaje.

Esto ocurre, por ejemplo, cuando un campo de la plantilla no tiene correspondencia utilizable en los datos disponibles.

---

# 10. Validación documental

Los documentos exigidos por cada cliente se comparan con:

```text
fixtures/reto-01/repositorio/soportes/index.json
```

El sistema obtiene:

- tipo;
- archivo;
- vigencia;
- disponibilidad.

Los documentos disponibles pueden copiarse al paquete final.

Los documentos faltantes no se crean ni se simulan.

---

# 11. Formularios XLSX

Los casos XLSX utilizan:

```text
plantilla-celdas.json
```

La definición indica:

- hoja;
- etiqueta;
- celda de etiqueta;
- celda de valor.

La herramienta reproduce esa estructura mediante ExcelJS.

Identificadores como documentos tributarios, cuentas o códigos pueden mantenerse como texto para evitar alteraciones como la pérdida de ceros iniciales.

---

# 12. Formulario PDF

El caso de Ecuador genera:

```text
formulario.pdf
```

El documento presenta:

- etiquetas;
- valores;
- obligatoriedad;
- identificación visible de faltantes.

Los faltantes permanecen visibles para revisión humana.

---

# 13. Portal

El portal correspondiente al caso de Panamá no se automatiza contra un sistema externo real.

El resultado generado es:

```text
portal-preparado.json
```

Este archivo representa la información preparada para una carga manual.

El flujo requiere intervención humana.

---

# 14. Confirmación humana

La revisión humana está separada del modelo de lenguaje.

El frontend solicita confirmación cuando:

- hay campos faltantes;
- existen soportes problemáticos;
- corresponde un flujo manual de portal.

El backend expone:

```text
POST /api/confirmacion
```

Decisiones permitidas:

```text
confirmar
cancelar
```

Confirmar significa que una persona revisó la situación y decidió continuar.

Confirmar NO significa:

- inventar un campo;
- crear un soporte inexistente;
- modificar los fixtures;
- afirmar que un portal fue diligenciado;
- afirmar que se realizó un envío externo.

---

# 15. Trazabilidad

La interfaz muestra las herramientas ejecutadas.

Ejemplo:

```text
proveedor_leer_solicitud       OK
proveedor_mapear_campos        OK
proveedor_validar_soportes     OK
```

Los paquetes también incluyen:

```text
checklist.json
```

Este archivo registra información como:

- caso;
- cliente;
- país;
- formato;
- archivo principal;
- cantidad de campos encontrados;
- campos faltantes;
- estados de soportes;
- soportes problemáticos;
- necesidad de revisión humana;
- estado del paquete.

---

# 16. Demo determinista

La solución incluye:

```text
demo.ts
```

Su propósito es demostrar el procesamiento de los cuatro casos utilizando directamente las herramientas.

El flujo de la demo no depende de que Gemini interprete cuál caso debe utilizarse.

Ejecutar:

```powershell
npm run demo
```

Durante la ejecución se procesan:

```text
co-industrias-delta
ec-corp-andina
hn-agroexport-sula
pa-logistica-istmo
```

La ejecución correcta termina en:

```text
DEMO FINALIZADA
```

---

# 17. Frontend

La interfaz está implementada mediante:

```text
web/index.html
web/styles.css
web/app.js
```

Permite:

- seleccionar casos;
- escribir mensajes;
- enviar lenguaje natural;
- visualizar resultados;
- visualizar campos faltantes;
- comprobar soportes problemáticos;
- visualizar herramientas ejecutadas;
- identificar necesidad de revisión humana;
- confirmar o cancelar una continuación.

---

# 18. Backend

El backend utiliza Express.

Archivo:

```text
src/server.ts
```

Endpoints principales:

```text
GET  /api/health
POST /api/chat
POST /api/confirmacion
```

`/api/chat` puede:

1. reconocer directamente un identificador de caso;
2. utilizar Gemini para interpretar lenguaje natural;
3. validar el caso obtenido;
4. ejecutar las herramientas deterministas;
5. devolver un resumen al frontend.

---

# 19. Manejo de secretos

La API key de Gemini no está almacenada en el código.

Localmente se utiliza:

```text
.env
```

con:

```env
GEMINI_API_KEY=...
```

`.env` está excluido mediante `.gitignore`.

La entrega incluye:

```text
.env.example
```

sin secretos.

---

# 20. Tratamiento de errores del LLM

Durante una integración con un servicio externo pueden ocurrir errores transitorios, por ejemplo indisponibilidad o timeout.

El diseño evita utilizar Gemini como fuente de verdad de las reglas.

Cuando el usuario proporciona directamente uno de los identificadores conocidos, el backend dispone de un camino determinista para identificar el caso.

---

# 21. Casos de prueba

## Caso 1 - Colombia

```text
co-industrias-delta
```

Formato:

```text
XLSX
```

La implementación genera el formulario correspondiente, valida los soportes y arma el paquete.

---

## Caso 2 - Ecuador

```text
ec-corp-andina
```

Formato:

```text
PDF
```

La solución detecta campos y soportes que no se encuentran disponibles y activa la revisión humana.

---

## Caso 3 - Honduras

```text
hn-agroexport-sula
```

Formato:

```text
XLSX
```

Los valores disponibles se completan y aquellos que no tienen información suficiente permanecen como faltantes.

---

## Caso 4 - Panamá

```text
pa-logistica-istmo
```

Formato:

```text
portal
```

Se prepara un JSON para carga manual sin simular una integración externa.

---

# 22. Decisiones técnicas

## Node.js

Se utilizó Node.js por cumplir el requisito técnico y permitir integrar:

- TypeScript;
- Express;
- Gemini;
- ExcelJS;
- pdf-lib;
- Zod.

## HTML/CSS/JavaScript sin framework

Se utilizó una interfaz web ligera sin añadir React, Vue u otro framework.

Esto reduce dependencias y facilita la ejecución local.

## Reglas de negocio fuera del LLM

La validación documental, mapeo y generación se mantienen fuera del modelo.

Esta decisión reduce el riesgo de resultados inventados o inconsistentes.

---

# 23. Seguridad

Los controles principales son:

- API key fuera del repositorio;
- `.env` ignorado por Git;
- validación con Zod;
- casos permitidos definidos explícitamente;
- confirmación humana separada del LLM;
- campos faltantes explícitos;
- soporte documental basado en fixtures;
- no simulación de acciones externas no ejecutadas.

---

# 24. Uso de asistentes de IA durante el desarrollo

Durante el desarrollo se utilizaron asistentes de IA como apoyo para:

- diseño de arquitectura;
- estructuración del proyecto;
- generación y revisión de código TypeScript;
- resolución de errores;
- diseño del frontend;
- documentación;
- integración con Gemini.

El código generado fue probado progresivamente mediante:

```text
npx tsc --noEmit
npm run demo
npm run dev
```

Las decisiones y resultados del flujo se validaron contra los fixtures suministrados.

---

# 25. Limitaciones

La implementación tiene las siguientes limitaciones intencionales:

- no envía correos reales;
- no realiza firmas electrónicas;
- no carga información en portales externos;
- no utiliza SharePoint real;
- no utiliza una base de datos;
- el repositorio maestro utilizado corresponde a los fixtures;
- la disponibilidad del flujo conversacional depende de la API externa de Gemini;
- las reglas deterministas pueden ejecutarse sin depender de la interpretación del LLM.

Estas limitaciones mantienen la solución dentro del alcance del reto y evitan afirmar integraciones que no están implementadas.

---

# 26. Ejecución

Instalar:

```powershell
npm install
```

Comprobar TypeScript:

```powershell
npm run check
```

Demo:

```powershell
npm run demo
```

Aplicación:

```powershell
npm run dev
```

Abrir:

```text
http://localhost:3000
```

---

# 27. Conclusión

La solución implementa un agente conversacional con separación entre interpretación mediante LLM y ejecución determinista.

Gemini permite utilizar lenguaje natural, mientras TypeScript mantiene las reglas de negocio, validación documental y generación de resultados.

La revisión humana permanece como control explícito para los escenarios que requieren intervención.

La demo determinista permite validar los cuatro casos incluso sin utilizar el LLM para decidir el flujo.

---

## Autor

Henry Allyver Fonseca Calderon