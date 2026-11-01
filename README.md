# Reto 01 - Agente de Registro como Proveedor

Solución desarrollada para el **Reto 01 - Registro como Proveedor**.

El proyecto implementa un agente conversacional capaz de interpretar solicitudes de registro de proveedores, consultar un repositorio maestro, mapear campos solicitados por diferentes clientes, validar documentación, detectar información faltante y preparar los entregables correspondientes.

## Demo pública

La aplicación se encuentra desplegada en Render:

https://reto-01-registro-proveedores-ghdr.onrender.com

## Funcionalidades

La solución permite:

- Interpretar solicitudes escritas en lenguaje natural mediante Gemini.
- Procesar los cuatro casos definidos en los fixtures.
- Consultar datos únicamente desde el repositorio maestro.
- Resolver diferentes nombres de campos mediante el glosario.
- Detectar campos sin información disponible.
- Validar soportes documentales y sus vigencias.
- Generar formularios XLSX.
- Generar formularios PDF.
- Preparar datos para carga manual en portal.
- Armar paquetes documentales.
- Generar un checklist de trazabilidad.
- Mostrar las herramientas ejecutadas en la interfaz.
- Solicitar revisión humana cuando existen faltantes o acciones manuales.
- Ejecutar una demo determinista de los cuatro casos sin depender del modelo de lenguaje.

---

## Arquitectura

El proyecto separa la interpretación conversacional de las reglas deterministas.

```text
Usuario
   |
   v
Frontend web
   |
   v
API Express
   |
   +------> Gemini
   |          |
   |          v
   |     Interpretación
   |     de intención
   |
   v
Herramientas TypeScript
   |
   +--> Leer solicitud
   +--> Mapear campos
   +--> Validar soportes
   +--> Generar XLSX
   +--> Generar PDF
   +--> Preparar portal
   +--> Armar paquete
   |
   v
Fixtures / Repositorio maestro
   |
   v
Resultados en out/
```

Gemini interpreta el lenguaje natural.

Las reglas relacionadas con campos, documentos, vigencias y generación de archivos permanecen implementadas mediante código TypeScript determinista.

---

## Tecnologías

- Node.js 20+
- TypeScript
- Express
- Zod
- Google Gemini API
- ExcelJS
- pdf-lib
- HTML
- CSS
- JavaScript
- Git

---

## Requisitos

Se requiere:

```text
Node.js >= 20
npm
```

Para utilizar las funciones conversacionales con Gemini se requiere una API key válida.

La demo determinista puede ejecutarse independientemente del flujo conversacional.

---

## Instalación

Clonar o descargar el proyecto y entrar a la carpeta:

```powershell
cd reto-01
```

Instalar dependencias:

```powershell
npm install
```

En Windows PowerShell, si la política de ejecución impide utilizar `npm`, se puede utilizar:

```powershell
npm.cmd install
```

---

## Configuración de Gemini

Copiar:

```text
.env.example
```

como:

```text
.env
```

Configurar:

```env
GEMINI_API_KEY=TU_API_KEY
```

La API key real no debe incluirse en Git.

`.env` está excluido mediante `.gitignore`.

---

## Comandos disponibles

### Comprobar TypeScript

```powershell
npm run check
```

En PowerShell también se puede utilizar:

```powershell
npm.cmd run check
```

### Ejecutar demo determinista

```powershell
npm run demo
```

La demo procesa los cuatro casos sin utilizar el LLM para tomar las decisiones del flujo.

### Ejecutar la aplicación

```powershell
npm run dev
```

Después abrir en el navegador:

```text
http://localhost:3000
```

### Compilar

```powershell
npm run build
```

---

## Casos incluidos

### Colombia - Industrias Delta

Identificador:

```text
co-industrias-delta
```

Salida principal:

```text
formulario.xlsx
```

Durante las pruebas del proyecto se mapearon correctamente los campos definidos por el fixture y se validaron los soportes requeridos.

---

### Ecuador - Corporación Andina

Identificador:

```text
ec-corp-andina
```

Salida principal:

```text
formulario.pdf
```

El flujo detecta información que no está disponible en el repositorio en lugar de inventarla.

Cuando existen faltantes, el sistema solicita revisión humana.

---

### Honduras - Agroexport Sula

Identificador:

```text
hn-agroexport-sula
```

Salida principal:

```text
formulario.xlsx
```

Los campos que no pueden resolverse mediante el glosario y el repositorio maestro se identifican como faltantes.

---

### Panamá - Logística del Istmo

Identificador:

```text
pa-logistica-istmo
```

Salida principal:

```text
portal-preparado.json
```

No se automatiza un portal externo real.

La aplicación prepara los valores y soportes para una carga manual y exige intervención humana.

---

## Herramientas principales

Las herramientas del proveedor se encuentran en:

```text
src/tools/proveedor.ts
```

Entre las funciones implementadas están:

```text
proveedor_leer_solicitud
proveedor_mapear_campos
proveedor_validar_soportes
proveedor_generar_formulario
proveedor_generar_pdf
proveedor_preparar_portal
proveedor_armar_paquete
```

Las entradas relevantes están validadas mediante Zod.

---

## Agente conversacional

El comportamiento base del agente está documentado en:

```text
agent/prompt.md
```

La integración con Gemini se encuentra en:

```text
src/llm/gemini.ts
```

Gemini se utiliza para interpretar lenguaje natural.

Por ejemplo:

```text
Necesito revisar la solicitud de Corporación Andina
```

puede identificarse como una solicitud de análisis del caso:

```text
ec-corp-andina
```

La salida de Gemini se valida antes de utilizarla.

---

## Principio de seguridad del agente

El modelo de lenguaje no es la fuente de verdad del proceso.

Gemini no determina directamente:

- vigencia documental;
- valores corporativos;
- datos bancarios;
- existencia de soportes;
- contenido de formularios;
- confirmaciones humanas.

Estas decisiones dependen del repositorio y de las herramientas deterministas.

Si un dato no existe:

```text
FALTANTE
```

El sistema no fabricará un valor para completar el formulario.

---

## Confirmación humana

Cuando el sistema identifica que el caso requiere intervención humana, la interfaz muestra:

```text
Revisión humana: Sí
```

y presenta las opciones:

```text
Confirmar continuación
Cancelar
```

La confirmación no completa ni inventa la información faltante.

El endpoint utilizado es:

```text
POST /api/confirmacion
```

La decisión humana permanece separada de Gemini.

---

## Trazabilidad

El frontend muestra las herramientas ejecutadas durante el análisis.

Ejemplo:

```text
proveedor_leer_solicitud       OK
proveedor_mapear_campos        OK
proveedor_validar_soportes     OK
```

Los paquetes generados incluyen un:

```text
checklist.json
```

con información del procesamiento del caso.

---

## Demo determinista

El archivo:

```text
demo.ts
```

permite recorrer los casos definidos en los fixtures y ejecutar el flujo de herramientas sin depender del LLM para determinar los resultados.

Ejecutar:

```powershell
npm run demo
```

El resultado esperado finaliza con:

```text
DEMO FINALIZADA
```

---

## Estructura principal

```text
reto-01/
|
|-- agent/
|   `-- prompt.md
|
|-- fixtures/
|   `-- reto-01/
|       |-- casos/
|       |-- repositorio/
|       `-- glosario-campos.json
|
|-- src/
|   |-- llm/
|   |   `-- gemini.ts
|   |
|   |-- tools/
|   |   `-- proveedor.ts
|   |
|   |-- index.ts
|   `-- server.ts
|
|-- web/
|   |-- index.html
|   |-- styles.css
|   `-- app.js
|
|-- out/
|
|-- demo.ts
|-- package.json
|-- tsconfig.json
|-- .env.example
|-- README.md
`-- SOLUCION.md
```

---

## Archivos generados

Las salidas se escriben bajo:

```text
out/<caso>/
```

Según el caso pueden incluir:

```text
formulario.xlsx
formulario.pdf
portal-preparado.json
paquete/
checklist.json
soportes/
```

La carpeta `out/` contiene resultados generados y está excluida del repositorio mediante `.gitignore`.

---

## Manejo de secretos

Nunca se debe incluir la API key de Gemini en:

- código fuente;
- frontend;
- logs;
- commits;
- documentación.

La configuración local se realiza mediante:

```text
.env
```

y el repositorio incluye solamente:

```text
.env.example
```

sin secretos.

---

## Autor

Henry Allyver Fonseca Calderon

## Estado

Versión funcional del Reto 01 preparada para validación final y despliegue.