# Ranking Vendedores GDL · Cascarón KPI

Esta versión está hecha desde cero para que el flujo sea simple:

1. Abrir `index.html`.
2. Entrar a **Configuración**.
3. Definir el periodo activo, por ejemplo `2026-06`.
4. Cargar los Excel/CSV de cada KPI.
5. Revisar cada sección y exportar cualquier tabla con el botón pequeño **Exportar CSV**.

## Archivos que alimentan la app

### 1. Metas
Archivo sugerido: `metas`

Columnas mínimas:

- `Vendedor`
- `Meta`

Sólo se usa meta mínima. Ya no se maneja meta máxima.

### 2. Ventas
Archivo sugerido: `ventas`

Columnas recomendadas:

- `Fecha` o `Mes`
- `Vendedor` o `ALMACEN AGRUPADO` o `AGENTE_DE_VENTAS_CLIENTE`
- `CodigoCliente`
- `Cliente`
- `Producto`
- `Categoria` opcional, si no viene se cruza con el archivo Categorías
- `Importe` / `Subtotal` / `Venta`
- `Piezas`

Este archivo alimenta:

- Meta de Ventas: venta real por vendedor.
- Incremento y recuperación de categoría.
- Prospección y recuperación de clientes.

### 3. Visitas
Archivo sugerido: `visitas`

Columnas recomendadas:

- `Fecha`
- `Vendedor`
- `Cliente`
- `Tipo`
- `Ciudad`
- `DuracionMin`

La meta mensual se calcula con:

`Meta semanal visitas x semanas del mes`

Por defecto: `25 x 4 = 100 visitas al mes`.

### 4. Categorías
Archivo sugerido: `categorias`

Columnas mínimas:

- `Producto`
- `Categoria`

Sirve para enlazar cada producto vendido con su categoría comercial.

### 5. No cobrado
Archivo sugerido: `no cobrado`

Columnas mínimas:

- `Vendedor`
- `Saldo` o `Deuda`

La sección Cartera Vencida queda sólo como vendedor y deuda.

### 6. Giro
Archivo sugerido: `giro`

Columnas recomendadas:

- `Vendedor`
- `CodigoCliente`
- `Cliente`
- `Giro`
- `Venta` / `Subtotal` / `Importe`

Sirve para revisar venta y participación por giro, con filtro por vendedor.

## Notas importantes

- La app guarda datos en el navegador usando localStorage.
- Si un Excel `.xlsx` no carga, guardar el archivo como CSV desde Excel y volver a cargarlo.
- También se puede pegar texto copiado desde Excel en cada bloque de Configuración.
- Cada tabla trae botón **Exportar CSV**.
- El Dashboard está diseñado compacto para verse completo sin scroll lateral.
