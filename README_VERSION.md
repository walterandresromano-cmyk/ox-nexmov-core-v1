# oX NEXMOV Core v1 Pre-beta

## Estado de versión

Versión estable local: `v1.0.0-prebeta`  
Commit estable: `bb08747`  
Rama estable: `stable/core-v1-prebeta`

## Estado funcional

- Login por roles funcionando.
- Navegación desktop/mobile protegida por rol.
- Cada usuario ve solo su panel correspondiente.
- Cierre de sesión disponible en desktop y mobile.
- Inventario dealer/admin funcional.
- Crear publicación funcionando.
- Editar datos de publicación funcionando.
- Editar imágenes y portada funcionando.
- Galería pública y operativa funcionando.
- Leads comerciales funcionando y protegidos por rol.
- Comprador ve sus consultas.
- Dealer ve solo leads de sus publicaciones.
- Admin ve leads globales.
- Financiación 0km funcionando con usuario logueado.
- Vender mi vehículo conectado comprador/admin/dealer.
- Admin puede asignar oportunidades a dealers.
- Dealer ve oportunidades asignadas.
- Notas separadas por nivel:
  - `internal_notes`: privadas del admin.
  - `admin_dealer_note`: visibles para dealer.
  - `dealer_notes`: visibles para dealer y admin.
- Tickets internos funcionando.
- Dealer crea tickets.
- Admin y soporte gestionan tickets.
- Notas internas de soporte protegidas.
- Auditoría mobile funcional básica completada.

## Roles activos

- Admin
- Dealer
- Buyer / Comprador
- Internal 0km
- Support / Soporte

## Pendientes principales

- Subir repositorio a GitHub.
- Backup/export de Supabase.
- Auditoría final RLS/policies.
- Limpieza de warnings de accesibilidad en formularios.
- Convertir tablas mobile en cards.
- Pulido visual premium de paneles.
- Catálogos/autocomplete de marcas, modelos, versiones, provincias y ciudades.
- Beta privada con dealers reales.
- Definir flujo comercial de planes y pagos.

## Nota

Esta versión representa el primer núcleo funcional estable de oX NEXMOV Core v1.  
Debe conservarse como punto de retorno antes de nuevas modificaciones grandes.