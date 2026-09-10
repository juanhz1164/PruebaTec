# Auth

Constantes de rol usadas por todo el backend para expresar autorización declarativa en los
controllers (`[Authorize(Roles = Roles.X)]`). No contiene lógica de autenticación en sí
misma — eso vive en `Services/AuthService.cs` (verificación de credenciales) y
`Services/JwtService.cs` (emisión del token).

## `Roles.cs`

```csharp
public const string Admin = "AdministradorGeneral";
public const string Gerente = "GerenteSucursal";
public const string Operador = "OperadorInventario";

public const string AdminYGerente = $"{Admin},{Gerente}";
public const string GerenteYOperador = $"{Gerente},{Operador}";
public const string Todos = $"{Admin},{Gerente},{Operador}";
```

Los tres valores base (`Admin`, `Gerente`, `Operador`) son **exactamente** los nombres del
enum `RolUsuario` (`Models/RolUsuario.cs`) convertidos a string — `JwtService` emite el
claim de rol con `usuario.Rol.ToString()`, así que estas constantes tienen que coincidir
carácter por carácter con los nombres del enum o la autorización dejaría de funcionar
silenciosamente (ASP.NET Core no lanza error si el nombre de rol no matchea, simplemente
nunca autoriza a nadie).

Las combinaciones (`AdminYGerente`, `GerenteYOperador`, `Todos`) existen porque
`[Authorize(Roles = "...")]` acepta una lista separada por comas como "cualquiera de estos
roles" — se predefinen aquí en vez de concatenar strings sueltos en cada controller, para
que un cambio de política de acceso (ej. "ahora Operador también puede...") se haga en un
solo lugar.

## Cómo se usa junto con el resto del sistema de autorización

El atributo `[Authorize(Roles = ...)]` es solo el primer filtro (rol). La mayoría de los
controllers añaden un **segundo filtro interno** que no puede expresarse declarativamente:
pertenencia a sucursal. Un `[Authorize(Roles = Roles.Gerente)]` en
`PUT /api/Transferencias/{id}/preparar`, por ejemplo, deja pasar a *cualquier* Gerente,
pero el método valida además que ese Gerente pertenezca a la sucursal **origen** de esa
transferencia específica (comparando el claim `"sucursalId"` del JWT contra el dato de la
entidad) — si no coincide, `Forbid()`. Ese patrón de "rol correcto + sucursal correcta" se
repite en `InventarioController`, `VentasController`, `VisitasController` y
`TransferenciasController`. Ver `Controllers/README.md` para el detalle completo endpoint
por endpoint.
