# Ranking Vendedores GDL App v7

Versión corregida para trabajar desde **Configuración**.

## Cambios principales

- **Metas de venta:** sólo se usa **Meta mínima**. Se eliminó la Meta máxima del formato visible.
- **Cartera vencida:** el formato ahora es únicamente:
  - `Vendedor`
  - `Saldo`
- **Recuperación de categorías:** se agregó carga desde Configuración para el archivo con:
  - vendedor
  - cliente
  - descripción de producto
  - piezas/cantidad
- El archivo **Recuperacion de Categorias.xlsx** quedó precargado como base inicial y también se incluyó convertido en `recuperacion_categorias_precargada.csv`.
- Las cargas de ventas, metas, visitas, recuperación y cartera se hacen desde **Configuración**.

## Archivos ejemplo incluidos

- `metas_junio_2026.csv`
- `ventas_junio_plantilla.csv`
- `estructura_visitas_ejemplo.csv`
- `cartera_vencida_ejemplo.csv`
- `recuperacion_categorias_ejemplo.csv`
- `recuperacion_categorias_precargada.csv`

## Uso

Abrir `index.html` en el navegador. Para cambiar el mes, entrar a **Configuración**, actualizar el periodo y cargar los archivos del mes.
