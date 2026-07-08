# Ranking Vendedores GDL · Cascarón KPI v2

Estructura corregida para cargar todos los archivos desde **Configuración**.

## Flujo mensual

1. Abrir `index.html`.
2. Entrar a **Configuración**.
3. Seleccionar el **Periodo activo** del mes que se revisa.
4. Cargar los Excel/CSV de cada KPI:
   - **Metas:** columnas `Vendedor`, `Meta`.
   - **Ventas histórico / actual:** archivo tipo `data(1).xlsx` con `AGENTE_DE_VENTAS_CLIENTE`, `NOMBRE_SN`, `DESCRIPCION_PRODUCTO`, `Suma de SUBTOTAL`, `Date - Año`, `Date - Mes`, `Date - Día`.
   - **Categorías:** archivo `Categorias.xlsx` con `CODIGO DE PRODUCTO`, `DESCRIPCION DE PRODUCTO`, `Categoria`.
   - **Visitas:** archivo mensual de visitas.
   - **No cobrado:** columnas `Vendedor`, `Saldo`.
   - **Giro:** columnas `Vendedor`, `Cliente`, `Giro`, `Venta`.
5. Revisar las secciones y exportar cada tabla con el botón **CSV**.

## Archivos incluidos

En la carpeta `archivos_base` dejé convertidos a CSV los archivos que compartiste:

- `categorias.csv`
- `ventas_data_1.csv`

Si la app está publicada en GitHub Pages, el botón **Cargar CSV incluidos del ZIP** los carga automáticamente. Si abres el HTML directo desde la computadora, usa **Elegir archivo** y carga manualmente esos CSV.

## Cálculos principales

- **Meta de Ventas:** usa sólo el periodo activo.
- **Recuperación de Categoría:** detecta cliente + categoría con compra histórica, pero sin compra en el periodo activo. El dinero mostrado es oportunidad estimada con promedio histórico mensual.
- **Colocación de Categoría:** detecta cliente + categoría que no tenía compra histórica y sí compra en el periodo activo.
- **Prospectos:** clientes con compra en el periodo activo sin historial previo en el archivo de ventas.
- **Clientes recuperados:** clientes con historial, sin compra en el mes anterior y con compra en el periodo activo.
- **Cartera Vencida:** usa el archivo `no cobrado` con vendedor y deuda.
