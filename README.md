# Ranking Vendedores GDL · Cascarón KPI v5

Versión corregida para usar **los nombres oficiales de vendedor/ruta de venta** en todas las tablas.

## Vendedores reconocidos

La app sólo mostrará estos nombres en Dashboard, Meta de Ventas, Visitas, Categorías, Prospectos, Cartera y Giro:

- AGENTE CLAVE  GDL
- GDL1 - OSCAR YEPEZ
- GDL13 - SANDRA NAVARRO
- GDL14- ARCENIO AGUIRRE
- GDL15 - ALDO SIERRA
- GDL3 - MARICELA REYNOSO
- GDL4 - JULIO DE LA CRUZ
- GDL5 - ALAN PEREZ
- GDL6 - DANIEL  AGUILAR
- GDL9 - ANTONIO V.

## Visitas

El archivo de visitas puede traer el nombre de persona. La app lo convierte automáticamente al nombre oficial del KPI:

- Sergio Garibay → AGENTE CLAVE  GDL
- Oscar Yepez → GDL1 - OSCAR YEPEZ
- Sandra Navarro → GDL13 - SANDRA NAVARRO
- Arcenio Aguirre → GDL14- ARCENIO AGUIRRE
- Aldo Sierra → GDL15 - ALDO SIERRA
- Maricela Reynoso → GDL3 - MARICELA REYNOSO
- Julio de la Cruz → GDL4 - JULIO DE LA CRUZ
- Alan Perez → GDL5 - ALAN PEREZ
- Daniel Aguilar → GDL6 - DANIEL  AGUILAR
- Antonio → GDL9 - ANTONIO V.

Si aparece una ruta, oficina, QIN, ALSEA, Verde Valle, Esmeralda Sánchez o cualquier desconocido, no se plasma en visitas.

## Archivos de carga

Todo se carga desde Configuración:

1. DATA (1).xlsx: ventas, categorías, prospectos y recuperación de clientes.
2. Categorias.xlsx: producto → categoría.
3. admin_visitas_filtros_YYYY-MM-DD_a_YYYY-MM-DD.xls: visitas del mes.
4. no cobrado: cartera vencida con Vendedor y Saldo.
5. giro: cliente, giro, venta y vendedor.
