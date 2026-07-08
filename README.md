# Ranking Vendedores GDL · Cascarón KPI v3

## Flujo corregido

Esta versión deja el cascarón fijo y centraliza todas las cargas en **Configuración**.

### Archivo principal: DATA (1)
El archivo `data (1).xlsx` alimenta automáticamente:

- Meta de Ventas: se usa sólo el mes activo para calcular **Venta real**.
- Incremento y recuperación de categoría: mes activo vs meses anteriores.
- Prospectos y recuperación de clientes: mes activo vs meses anteriores.

Columnas esperadas:
- AGENTE_DE_VENTAS_CLIENTE
- NOMBRE_SN
- DESCRIPCION_PRODUCTO
- Suma de SUBTOTAL
- Date - Año
- Date - Mes
- Date - Día

### Categorías
El archivo `Categorias.xlsx` alimenta la relación producto → categoría.

Columnas esperadas:
- CODIGO DE PRODUCTO
- DESCRIPCION DE PRODUCTO
- Categoria

### Visitas
El archivo `admin_visitas_filtros_YYYY-MM-DD_a_YYYY-MM-DD.xls` alimenta la sección Visitas.

Sólo se consideran estos vendedores:
- Sergio Garibay
- Oscar Yepez
- Sandra Navarro
- Arcenio Aguirre
- Aldo Sierra
- Maricela Reynoso
- Julio de la Cruz
- Alan Perez
- Daniel Aguilar
- Antonio

Se ignoran rutas, oficinas, QIN, ALSEA, Verde Valle, Esmeralda Sánchez y cualquier vendedor desconocido.

### Archivos incluidos
En la carpeta `archivos_base` vienen CSV convertidos desde los archivos que compartiste:
- ventas_data_1.csv
- categorias.csv
- visitas_junio_2026.csv
- metas_junio_2026.csv

Si abres la app desde GitHub Pages, puedes usar el botón **Cargar archivos incluidos del ZIP**.
Si abres `index.html` directo en tu computadora, carga manualmente los CSV de `archivos_base` desde Configuración.

## Exportación
Cada tabla tiene botón **Exportar CSV**.
