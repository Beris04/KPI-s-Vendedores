# App Ranking Vendedores GDL · Toyo Foods

App web estática para revisar el tabulador de ranking por vendedor y sus hojas de KPI:

- Dashboard
- Tabulador ranking
- Meta de Ventas
- Visitas a clientes
- Recuperación de Productos
- Incremento de Catálogo
- Prospección
- Cartera Vencida
- Giro de Clientes
- Configuración

## Datos incluidos

- Ventas desglosadas: `Ventas Desglosada (Enero-Mayo).xlsx`
- Giro de clientes: `Giro de Clientes.xlsx`
- Periodo base: Enero-Mayo 2026, con foco inicial en Mayo 2026
- Registros procesados de ventas: 150,002
- Clientes en archivo de giros: 912
- Productos recuperados detectados: 3,326
- Incrementos de catálogo detectados: 3,913
- Prospectos detectados en Mayo: 18

## Importante sobre Meta de Ventas

El archivo de ventas desglosadas contiene **cantidad** por cliente/producto/fecha, pero no contiene importe/subtotal por vendedor. Por eso la app ya carga las metas de la imagen, pero el avance de ventas en pesos se calcula cuando captures o importes la venta real de Mayo por vendedor en la hoja **Meta de Ventas**.

Formato para pegar venta real:

```csv
vendedor,venta
GDL6 - DANIEL  AGUILAR,2710000
GDL13 - SANDRA NAVARRO,3978227
```

## Conexión de visitas

La app puede cargar visitas de dos maneras:

### Opción A: Supabase
Si la app anterior de visitas guarda en Supabase, captura en la hoja **Visitas a clientes**:

- Supabase URL
- Anon key

La tabla esperada es `visits` con campos compatibles:

```text
day, city, vendor, client, type, start_ts, end_ts, duration_sec
```

### Opción B: GitHub Raw público
Pega una URL raw pública de GitHub con CSV o JSON.

Ejemplo CSV:

```csv
fecha,vendedor,cliente,tipo,ciudad,duracion_min
2026-05-03,GDL6 - DANIEL  AGUILAR,Cliente ABC,Seguimiento,GDL,25
```

No coloques un token de GitHub en el frontend. Para repositorio privado, es mejor usar Supabase o generar un JSON público con GitHub Actions.

## Cartera vencida

Se debe cargar después del día 5 de cada mes. Formato:

```csv
vendedor,cliente,saldo_vencido,dias_vencido,fecha
GDL6 - DANIEL  AGUILAR,Cliente ABC,4200,15,2026-06-05
```

## Publicar en GitHub Pages

1. Sube estos archivos al repositorio:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `data.js`
2. En GitHub: Settings → Pages → Deploy from branch → main / root.
3. Abre la URL de GitHub Pages.

## Nota

La app guarda captura manual y configuraciones en el navegador con `localStorage`. Si cambias de equipo o navegador, vuelve a importar ventas, visitas o cartera.
