# Ranking Vendedores GDL App v5

Cambios principales:

- Todas las cargas de archivos ahora se hacen desde **Configuración**: ventas, metas, visitas y cartera vencida.
- Se eliminaron los vendedores **GDL11- OSCAR MERCADO** y **GDL12- MIGUEL SEPULVEDA**.
- Se cargaron las **metas de Junio 2026** como metas base.
- Las metas editadas en Configuración se guardan automáticamente y se reflejan en Meta de Ventas, Ranking y Dashboard.
- Giro de clientes ahora muestra venta en dinero por giro y porcentaje de participación.
- Meta de Ventas, Visitas y Cartera vencida quedaron como hojas de consulta; la importación se concentra en Configuración.

Archivos de apoyo incluidos:

- `metas_junio_2026.csv`: metas cargadas en la app.
- `ventas_junio_plantilla.csv`: plantilla para cargar venta real mensual.
- `estructura_visitas_ejemplo.csv`: ejemplo de estructura de visitas.
- `cartera_vencida_ejemplo.csv`: ejemplo de cartera vencida.

Notas:

- El importador acepta `.csv`, `.txt`, `.json` y `.xls` tipo HTML.
- Si el archivo viene en `.xlsx`, guárdalo como CSV o `.xls` antes de importarlo.
- La información se guarda en el navegador donde se abre la app mediante localStorage.
