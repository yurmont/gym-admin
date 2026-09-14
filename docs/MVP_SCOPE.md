# Mapeo del sistema Laravel al MVP

El proyecto original es SportSuite 360 sobre Laravel 11 y MySQL. Su alcance real supera el prompt inicial: contiene administración SaaS, configuración modular y módulos de entrenamiento, deportes, comercio, finanzas, marketing y reportes.

| Dominio original                    | Estado en este MVP | Criterio de migración                                                 |
| ----------------------------------- | ------------------ | --------------------------------------------------------------------- |
| Tenant, usuario y rol               | Incluido           | Firebase Auth, `profiles` y autorizaci�n por tenant en NestJS         |
| Socios                              | Incluido           | Ficha operativa, búsqueda, estados y foto privada preparada           |
| Planes                              | Incluido           | Precio, duración, matrícula, sesiones, congelamiento y horario        |
| Membresías                          | Incluido           | Alta, renovación, cancelación, saldo y activación automática          |
| Pagos                               | Incluido           | Cobro, descuento, método, referencia y anulación con reversión        |
| Asistencia                          | Incluido           | Validaciones del sistema original y registro de accesos denegados     |
| Dashboard                           | Incluido           | Indicadores operativos y pagos recientes                              |
| Congelamientos                      | Preparado en plan  | La política está modelada, la operación queda para la siguiente etapa |
| Clases, horarios y reservas         | Siguiente etapa    | Dependen de sedes, salas, instructores y control de aforo             |
| POS, inventario, caja y facturación | Siguiente etapa    | Requieren un libro de movimientos y flujo fiscal separado             |
| Rutinas, evaluaciones y nutrición   | Siguiente etapa    | No bloquean la operación comercial del gimnasio                       |
| CRM, campañas y promociones         | Siguiente etapa    | Se construyen después de estabilizar socios y cobranzas               |
| SaaS superadmin e impersonación     | Siguiente etapa    | Requiere auditoría reforzada antes de exponer soporte entre tenants   |

## Reglas preservadas

- Un pago que completa el saldo activa la membresía y normaliza el estado del socio.
- Anular un pago revierte el saldo y devuelve la membresía a pago pendiente.
- Una renovación empieza después del vencimiento vigente o en la fecha actual si ya venció.
- El acceso valida baja, congelamiento, membresía, saldo, vigencia, sesiones y franja horaria.
- Un socio no puede registrar dos ingresos abiertos el mismo día.
- Los intentos denegados quedan registrados con el motivo.
- Las operaciones críticas comprueban el tenant de cada entidad dentro de la transacción.

El global scope de Eloquent del sistema anterior se reemplaza con políticas RLS, de modo que el aislamiento también aplica si una consulta sale directamente desde el navegador.
