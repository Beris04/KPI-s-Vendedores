# Ranking Vendedores GDL App v8

## Cambios principales v8

- La sección **Giro clientes** ahora se alimenta desde **Configuración**.
- Las primeras gráficas de Giro muestran el **último mes cargado / periodo activo**, por ejemplo **Junio 2026**.
- Giro muestra:
  - venta en dinero por giro,
  - porcentaje de participación por giro,
  - resumen por giro,
  - detalle por cliente,
  - filtro por vendedor cuando el archivo trae vendedor.
- En Configuración se agregó carga de archivo y texto para **Giro clientes / venta por giro**.

## Cómo alimentar Giro clientes

Para que las gráficas de Giro salgan en dinero y participación, carga un archivo del mes filtrado, por ejemplo junio. El archivo debe traer como mínimo:

- CLIENTE
- GIRO
- SUBTOTAL, VENTA o IMPORTE

Opcionalmente puede traer:

- CODIGO DE SN
- Vendedor / ALMACEN AGRUPADO / AGENTE_DE_VENTAS_CLIENTE
- Fecha / Mes / Año

Si el archivo no trae fecha o mes, la app lo tomará como el **periodo activo** seleccionado en Configuración.

## Archivos de ejemplo incluidos

- `giro_clientes_junio_plantilla.csv`
- `metas_junio_2026.csv`
- `ventas_junio_plantilla.csv`
- `estructura_visitas_ejemplo.csv`
- `cartera_vencida_ejemplo.csv`
- `recuperacion_categorias_ejemplo.csv`

## Uso recomendado mensual

1. Entrar a **Configuración**.
2. Seleccionar el periodo activo, por ejemplo `2026-06` y nombre `Junio 2026`.
3. Cargar metas del mes.
4. Cargar venta real del mes por vendedor.
5. Cargar visitas del mes.
6. Cargar recuperación de categorías.
7. Cargar giro clientes filtrado al mes.
8. Cargar cartera vencida a partir del día 5.

