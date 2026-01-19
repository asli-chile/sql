# 📋 Resumen: Configuración de Ejecutivos y Clientes

## 👥 Ejecutivos (9)

1. **ALEX CARDENAS** - Lector, todos los clientes
2. **HANS VASQUEZ** - Admin, todos los clientes ✅
3. **MARIO BAZAEZ** - Admin, todos los clientes ✅
4. **NINA SCOTI** - Usuario, solo: HILLVILLA, BLOSSOM
5. **POLIANA CISTERNAS** - Usuario (puede crear), todos los clientes
6. **RICARDO LAZO** - Usuario, solo: BARON EXPORT, AISIEN, VIF, SIBARIT
7. **ROCIO VILLARROEL** - Usuario, todos los clientes
8. **RODRIGO CACERES** - Admin, todos los clientes ✅
9. **STEFANIE CORDOVA** - Lector, todos los clientes

## 📊 Resumen por Rol

### 🔴 Admin (Acceso Total)
- **MARIO BAZAEZ**
- **HANS VASQUEZ**
- **RODRIGO CACERES**

### 🟡 Usuario (Puede crear/editar sus clientes)
- **NINA SCOTI** → HILLVILLA, BLOSSOM
- **RICARDO LAZO** → BARON EXPORT, AISIEN, VIF, SIBARIT
- **ROCIO VILLARROEL** → TODOS
- **POLIANA CISTERNAS** → TODOS (puede crear para cualquier cliente)

### 🟢 Lector (Solo lectura)
- **ALEX CARDENAS** → TODOS
- **STEFANIE CORDOVA** → TODOS

## 📦 Clientes (22)

1. AGRI. INDEPENDENCIA
2. AGROSOL
3. AISIEN *(Ricardo)*
4. ALMAFRUIT
5. BARON EXPORT *(Ricardo)*
6. BLOSSOM *(Nina)*
7. COPEFRUT
8. CRISTIAN MUÑOZ
9. EXPORTADORA DEL SUR (XSUR)
10. EXPORTADORA SAN ANDRES
11. FAMILY GROWERS
12. FENIX
13. FRUIT ANDES SUR
14. GF EXPORT
15. HILLVILLA *(Nina)*
16. JOTRISA
17. LA RESERVA
18. RINOFRUIT
19. SIBARIT *(Ricardo)*
20. TENO FRUIT
21. THE GROWERS CLUB
22. VIF *(Ricardo)*

## 🔧 Scripts SQL

### Opción 1: Por Nombre (Búsqueda flexible)
Archivo: `scripts/configurar-ejecutivos-clientes.sql`

Usa búsqueda por nombre, funciona aunque los emails sean diferentes.

### Opción 2: Por Email Exacto (Más seguro)
Archivo: `scripts/configurar-ejecutivos-por-email.sql`

Requiere conocer los emails exactos. Reemplaza los emails de ejemplo con los reales.

## ⚠️ Importante

1. **Primero ejecuta** `scripts/crear-ejecutivo-clientes.sql` para crear la tabla
2. **Verifica los emails** de los ejecutivos antes de ejecutar los scripts
3. **Los nombres de clientes** deben coincidir EXACTAMENTE con el catálogo
4. **Poliana** necesita rol 'usuario' (no 'lector') para poder crear registros

## 📝 Notas

- **STEFANIE CORDOVA** aparece como "STEFANIE" en la lista, puede que el email sea "stefania.cordova@asli.cl" o "stefanie.cordova@asli.cl"
- Todos los ejecutivos deben tener email `@asli.cl`
- Los clientes vienen del catálogo (`catalogos` tabla, categoría 'clientes')

