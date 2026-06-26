# Ranking Vendedores GDL · Toyo Foods

App local en HTML/CSS/JS para medir KPIs por vendedor.

## Hojas / secciones
- Dashboard ejecutivo
- Tabulador ranking
- Meta de Ventas
- Visitas a clientes
- Recuperación de Productos
- Incremento de Catálogo
- Prospección
- Cartera Vencida
- Giro de Clientes
- Configuración

## Cambios incluidos
- Metas de Mayo 2026 integradas como base fija, con edición mensual en Configuración.
- Incremento de catálogo con categoría por producto, vendedor, cliente y cobertura de categorías por cliente.
- Recuperación de productos con categoría por producto, recuperados y pendientes por recuperar.
- Prospección con ventanas/tablas con scroll.
- Conexión de visitas por GitHub Raw o Supabase.

## Visitas desde Supabase
La app pide:
1. Supabase URL, por ejemplo: `https://xxxxx.supabase.co`
2. Publishable / Anon key.
3. Nombre de la tabla. Default: `visits`.
4. Campo fecha. Default: `day`.

Campos compatibles en la tabla:
- `day`, `fecha` o `date`
- `vendor`, `vendedor` o `agent`
- `client` o `cliente`
- `type` o `tipo`
- `city` o `ciudad`
- `duration_sec`, `duration_min` o `duracion_min`

Para que funcione desde navegador, la tabla debe permitir lectura con RLS/policy de SELECT para la key pública.

## Uso
Abrir `index.html` en el navegador. La información que captures manualmente se guarda en localStorage del navegador.
