using InventarioMultiSucursal.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace InventarioMultiSucursal.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Sucursal> Sucursales => Set<Sucursal>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<UnidadMedida> UnidadesMedida => Set<UnidadMedida>();
    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<ProductoUnidadMedida> ProductoUnidadesMedida => Set<ProductoUnidadMedida>();
    public DbSet<Inventario> Inventarios => Set<Inventario>();
    public DbSet<MovimientoInventario> MovimientosInventario => Set<MovimientoInventario>();
    public DbSet<Proveedor> Proveedores => Set<Proveedor>();
    public DbSet<OrdenCompra> OrdenesCompra => Set<OrdenCompra>();
    public DbSet<OrdenCompraLinea> OrdenesCompraLineas => Set<OrdenCompraLinea>();
    public DbSet<Venta> Ventas => Set<Venta>();
    public DbSet<VentaLinea> VentasLineas => Set<VentaLinea>();
    public DbSet<Transferencia> Transferencias => Set<Transferencia>();
    public DbSet<TransferenciaLinea> TransferenciasLineas => Set<TransferenciaLinea>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Sucursal>(entity =>
        {
            entity.ToTable("sucursales");
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Id).HasColumnName("id");
            entity.Property(s => s.Nombre).HasColumnName("nombre");
            entity.Property(s => s.Direccion).HasColumnName("direccion");
            entity.Property(s => s.Ciudad).HasColumnName("ciudad");
            entity.Property(s => s.Telefono).HasColumnName("telefono");
            entity.Property(s => s.Activa).HasColumnName("activa");
            entity.Property(s => s.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.ToTable("usuarios");
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Id).HasColumnName("id");
            entity.Property(u => u.SucursalId).HasColumnName("sucursal_id");
            entity.Property(u => u.Nombre).HasColumnName("nombre");
            entity.Property(u => u.Email).HasColumnName("email");
            entity.Property(u => u.PasswordHash).HasColumnName("password_hash");
            entity.Property(u => u.Activo).HasColumnName("activo");
            entity.Property(u => u.CreatedAt).HasColumnName("created_at");

            entity.Property(u => u.Rol)
                .HasColumnName("rol")
                .HasConversion(
                    rol => RolToDb(rol),
                    valor => RolFromDb(valor));

            entity.HasOne(u => u.Sucursal)
                .WithMany(s => s.Usuarios)
                .HasForeignKey(u => u.SucursalId);
        });

        modelBuilder.Entity<UnidadMedida>(entity =>
        {
            entity.ToTable("unidades_medida");
            entity.HasKey(um => um.Id);
            entity.Property(um => um.Id).HasColumnName("id");
            entity.Property(um => um.Nombre).HasColumnName("nombre");
            entity.Property(um => um.Abreviatura).HasColumnName("abreviatura");
        });

        modelBuilder.Entity<Producto>(entity =>
        {
            entity.ToTable("productos");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasColumnName("id");
            entity.Property(p => p.UnidadMedidaId).HasColumnName("unidad_medida_id");
            entity.Property(p => p.ProveedorId).HasColumnName("proveedor_id");
            entity.Property(p => p.Sku).HasColumnName("sku");
            entity.Property(p => p.Nombre).HasColumnName("nombre");
            entity.Property(p => p.Descripcion).HasColumnName("descripcion");
            entity.Property(p => p.Categoria).HasColumnName("categoria");
            entity.Property(p => p.Activo).HasColumnName("activo");
            entity.Property(p => p.CreatedAt).HasColumnName("created_at");

            entity.HasOne(p => p.UnidadMedida)
                .WithMany(um => um.Productos)
                .HasForeignKey(p => p.UnidadMedidaId);

            entity.HasOne(p => p.Proveedor)
                .WithMany()
                .HasForeignKey(p => p.ProveedorId);
        });

        modelBuilder.Entity<ProductoUnidadMedida>(entity =>
        {
            entity.ToTable("producto_unidades_medida");
            entity.HasKey(pum => pum.Id);
            entity.Property(pum => pum.Id).HasColumnName("id");
            entity.Property(pum => pum.ProductoId).HasColumnName("producto_id");
            entity.Property(pum => pum.UnidadMedidaId).HasColumnName("unidad_medida_id");
            entity.Property(pum => pum.FactorConversion).HasColumnName("factor_conversion");
            entity.Property(pum => pum.PrecioVenta).HasColumnName("precio_venta");

            entity.HasIndex(pum => new { pum.ProductoId, pum.UnidadMedidaId }).IsUnique();

            entity.HasOne(pum => pum.Producto)
                .WithMany(p => p.UnidadesAlternativas)
                .HasForeignKey(pum => pum.ProductoId);

            entity.HasOne(pum => pum.UnidadMedida)
                .WithMany()
                .HasForeignKey(pum => pum.UnidadMedidaId);
        });

        modelBuilder.Entity<Inventario>(entity =>
        {
            entity.ToTable("inventario");
            entity.HasKey(i => i.Id);
            entity.Property(i => i.Id).HasColumnName("id");
            entity.Property(i => i.ProductoId).HasColumnName("producto_id");
            entity.Property(i => i.SucursalId).HasColumnName("sucursal_id");
            entity.Property(i => i.Cantidad).HasColumnName("cantidad");
            entity.Property(i => i.StockMinimo).HasColumnName("stock_minimo");
            entity.Property(i => i.CostoPromedio).HasColumnName("costo_promedio");
            entity.Property(i => i.UpdatedAt).HasColumnName("updated_at");

            entity.HasIndex(i => new { i.ProductoId, i.SucursalId }).IsUnique();

            entity.HasOne(i => i.Producto)
                .WithMany(p => p.InventarioPorSucursal)
                .HasForeignKey(i => i.ProductoId);

            entity.HasOne(i => i.Sucursal)
                .WithMany()
                .HasForeignKey(i => i.SucursalId);
        });

        modelBuilder.Entity<MovimientoInventario>(entity =>
        {
            entity.ToTable("movimientos_inventario");
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Id).HasColumnName("id");
            entity.Property(m => m.ProductoId).HasColumnName("producto_id");
            entity.Property(m => m.SucursalId).HasColumnName("sucursal_id");
            entity.Property(m => m.UsuarioId).HasColumnName("usuario_id");
            entity.Property(m => m.Cantidad).HasColumnName("cantidad");
            entity.Property(m => m.Motivo).HasColumnName("motivo");
            entity.Property(m => m.ReferenciaTipo).HasColumnName("referencia_tipo");
            entity.Property(m => m.ReferenciaId).HasColumnName("referencia_id");
            entity.Property(m => m.Fecha).HasColumnName("fecha");

            entity.Property(m => m.Tipo)
                .HasColumnName("tipo")
                .HasConversion(
                    tipo => TipoMovimientoToDb(tipo),
                    valor => TipoMovimientoFromDb(valor));

            entity.HasOne(m => m.Producto)
                .WithMany()
                .HasForeignKey(m => m.ProductoId);

            entity.HasOne(m => m.Sucursal)
                .WithMany()
                .HasForeignKey(m => m.SucursalId);

            entity.HasOne(m => m.Usuario)
                .WithMany()
                .HasForeignKey(m => m.UsuarioId);
        });

        modelBuilder.Entity<Venta>(entity =>
        {
            entity.ToTable("ventas");
            entity.HasKey(v => v.Id);
            entity.Property(v => v.Id).HasColumnName("id");
            entity.Property(v => v.SucursalId).HasColumnName("sucursal_id");
            entity.Property(v => v.UsuarioId).HasColumnName("usuario_id");
            entity.Property(v => v.NumeroComprobante).HasColumnName("numero_comprobante");
            entity.Property(v => v.Subtotal).HasColumnName("subtotal");
            entity.Property(v => v.DescuentoTotal).HasColumnName("descuento_total");
            entity.Property(v => v.Total).HasColumnName("total");
            entity.Property(v => v.Fecha).HasColumnName("fecha");

            entity.HasIndex(v => v.NumeroComprobante).IsUnique();

            entity.HasOne(v => v.Sucursal)
                .WithMany()
                .HasForeignKey(v => v.SucursalId);

            entity.HasOne(v => v.Usuario)
                .WithMany()
                .HasForeignKey(v => v.UsuarioId);
        });

        modelBuilder.Entity<VentaLinea>(entity =>
        {
            entity.ToTable("ventas_lineas");
            entity.HasKey(l => l.Id);
            entity.Property(l => l.Id).HasColumnName("id");
            entity.Property(l => l.VentaId).HasColumnName("venta_id");
            entity.Property(l => l.ProductoId).HasColumnName("producto_id");
            entity.Property(l => l.Cantidad).HasColumnName("cantidad");
            entity.Property(l => l.UnidadMedidaId).HasColumnName("unidad_medida_id");
            entity.Property(l => l.CantidadVendida).HasColumnName("cantidad_vendida");
            entity.Property(l => l.PrecioUnitario).HasColumnName("precio_unitario");
            entity.Property(l => l.Descuento).HasColumnName("descuento");

            entity.HasOne(l => l.Venta)
                .WithMany(v => v.Lineas)
                .HasForeignKey(l => l.VentaId);

            entity.HasOne(l => l.UnidadMedida)
                .WithMany()
                .HasForeignKey(l => l.UnidadMedidaId);

            entity.HasOne(l => l.Producto)
                .WithMany()
                .HasForeignKey(l => l.ProductoId);
        });

        modelBuilder.Entity<Transferencia>(entity =>
        {
            entity.ToTable("transferencias");
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Id).HasColumnName("id");
            entity.Property(t => t.SucursalOrigenId).HasColumnName("sucursal_origen_id");
            entity.Property(t => t.SucursalDestinoId).HasColumnName("sucursal_destino_id");
            entity.Property(t => t.UsuarioSolicitanteId).HasColumnName("usuario_solicitante_id");
            entity.Property(t => t.Transportista).HasColumnName("transportista");
            entity.Property(t => t.Ruta).HasColumnName("ruta");
            entity.Property(t => t.CostoEnvio).HasColumnName("costo_envio");
            entity.Property(t => t.FechaSolicitud).HasColumnName("fecha_solicitud");
            entity.Property(t => t.FechaEnvio).HasColumnName("fecha_envio");
            entity.Property(t => t.FechaEstimadaLlegada).HasColumnName("fecha_estimada_llegada");
            entity.Property(t => t.FechaRecepcion).HasColumnName("fecha_recepcion");

            entity.Property(t => t.Estado)
                .HasColumnName("estado")
                .HasConversion(
                    estado => EstadoTransferenciaToDb(estado),
                    valor => EstadoTransferenciaFromDb(valor));

            entity.Property(t => t.Prioridad)
                .HasColumnName("prioridad")
                .HasConversion(
                    prioridad => prioridad == null ? null : PrioridadToDb(prioridad.Value),
                    valor => valor == null ? null : PrioridadFromDb(valor));

            entity.HasOne(t => t.SucursalOrigen)
                .WithMany()
                .HasForeignKey(t => t.SucursalOrigenId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.SucursalDestino)
                .WithMany()
                .HasForeignKey(t => t.SucursalDestinoId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.UsuarioSolicitante)
                .WithMany()
                .HasForeignKey(t => t.UsuarioSolicitanteId);
        });

        modelBuilder.Entity<TransferenciaLinea>(entity =>
        {
            entity.ToTable("transferencias_lineas");
            entity.HasKey(l => l.Id);
            entity.Property(l => l.Id).HasColumnName("id");
            entity.Property(l => l.TransferenciaId).HasColumnName("transferencia_id");
            entity.Property(l => l.ProductoId).HasColumnName("producto_id");
            entity.Property(l => l.CantidadSolicitada).HasColumnName("cantidad_solicitada");
            entity.Property(l => l.CantidadEnviada).HasColumnName("cantidad_enviada");
            entity.Property(l => l.CantidadRecibida).HasColumnName("cantidad_recibida");

            entity.HasOne(l => l.Transferencia)
                .WithMany(t => t.Lineas)
                .HasForeignKey(l => l.TransferenciaId);

            entity.HasOne(l => l.Producto)
                .WithMany()
                .HasForeignKey(l => l.ProductoId);
        });

        modelBuilder.Entity<Proveedor>(entity =>
        {
            entity.ToTable("proveedores");
            entity.HasKey(pr => pr.Id);
            entity.Property(pr => pr.Id).HasColumnName("id");
            entity.Property(pr => pr.Nombre).HasColumnName("nombre");
            entity.Property(pr => pr.Contacto).HasColumnName("contacto");
            entity.Property(pr => pr.Telefono).HasColumnName("telefono");
            entity.Property(pr => pr.Email).HasColumnName("email");
            entity.Property(pr => pr.Direccion).HasColumnName("direccion");
            entity.Property(pr => pr.Activo).HasColumnName("activo");
            entity.Property(pr => pr.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<OrdenCompra>(entity =>
        {
            entity.ToTable("ordenes_compra");
            entity.HasKey(oc => oc.Id);
            entity.Property(oc => oc.Id).HasColumnName("id");
            entity.Property(oc => oc.ProveedorId).HasColumnName("proveedor_id");
            entity.Property(oc => oc.SucursalId).HasColumnName("sucursal_id");
            entity.Property(oc => oc.UsuarioId).HasColumnName("usuario_id");
            entity.Property(oc => oc.PlazoPagoDias).HasColumnName("plazo_pago_dias");
            entity.Property(oc => oc.Fecha).HasColumnName("fecha");
            entity.Property(oc => oc.FechaRecepcion).HasColumnName("fecha_recepcion");

            entity.Property(oc => oc.Estado)
                .HasColumnName("estado")
                .HasConversion(
                    estado => EstadoOrdenCompraToDb(estado),
                    valor => EstadoOrdenCompraFromDb(valor));

            entity.HasOne(oc => oc.Proveedor)
                .WithMany(pr => pr.OrdenesCompra)
                .HasForeignKey(oc => oc.ProveedorId);

            entity.HasOne(oc => oc.Sucursal)
                .WithMany()
                .HasForeignKey(oc => oc.SucursalId);

            entity.HasOne(oc => oc.Usuario)
                .WithMany()
                .HasForeignKey(oc => oc.UsuarioId);
        });

        modelBuilder.Entity<OrdenCompraLinea>(entity =>
        {
            entity.ToTable("ordenes_compra_lineas");
            entity.HasKey(l => l.Id);
            entity.Property(l => l.Id).HasColumnName("id");
            entity.Property(l => l.OrdenCompraId).HasColumnName("orden_compra_id");
            entity.Property(l => l.ProductoId).HasColumnName("producto_id");
            entity.Property(l => l.Cantidad).HasColumnName("cantidad");
            entity.Property(l => l.PrecioUnitario).HasColumnName("precio_unitario");
            entity.Property(l => l.Descuento).HasColumnName("descuento");

            entity.HasOne(l => l.OrdenCompra)
                .WithMany(oc => oc.Lineas)
                .HasForeignKey(l => l.OrdenCompraId);

            entity.HasOne(l => l.Producto)
                .WithMany()
                .HasForeignKey(l => l.ProductoId);
        });
    }

    private static string EstadoOrdenCompraToDb(EstadoOrdenCompra estado) => estado switch
    {
        EstadoOrdenCompra.Pendiente => "pendiente",
        EstadoOrdenCompra.Confirmada => "confirmada",
        EstadoOrdenCompra.Recibida => "recibida",
        EstadoOrdenCompra.Cancelada => "cancelada",
        _ => throw new ArgumentOutOfRangeException(nameof(estado), estado, "Estado no reconocido")
    };

    private static EstadoOrdenCompra EstadoOrdenCompraFromDb(string valor) => valor switch
    {
        "pendiente" => EstadoOrdenCompra.Pendiente,
        "confirmada" => EstadoOrdenCompra.Confirmada,
        "recibida" => EstadoOrdenCompra.Recibida,
        "cancelada" => EstadoOrdenCompra.Cancelada,
        _ => throw new ArgumentOutOfRangeException(nameof(valor), valor, "Valor de estado desconocido en la base de datos")
    };

    private static string EstadoTransferenciaToDb(EstadoTransferencia estado) => estado switch
    {
        EstadoTransferencia.Solicitada => "solicitada",
        EstadoTransferencia.EnPreparacion => "en_preparacion",
        EstadoTransferencia.EnTransito => "en_transito",
        EstadoTransferencia.RecibidaCompleta => "recibida_completa",
        EstadoTransferencia.RecibidaParcial => "recibida_parcial",
        EstadoTransferencia.Cancelada => "cancelada",
        _ => throw new ArgumentOutOfRangeException(nameof(estado), estado, "Estado no reconocido")
    };

    private static EstadoTransferencia EstadoTransferenciaFromDb(string valor) => valor switch
    {
        "solicitada" => EstadoTransferencia.Solicitada,
        "en_preparacion" => EstadoTransferencia.EnPreparacion,
        "en_transito" => EstadoTransferencia.EnTransito,
        "recibida_completa" => EstadoTransferencia.RecibidaCompleta,
        "recibida_parcial" => EstadoTransferencia.RecibidaParcial,
        "cancelada" => EstadoTransferencia.Cancelada,
        _ => throw new ArgumentOutOfRangeException(nameof(valor), valor, "Valor de estado de transferencia desconocido en la base de datos")
    };

    private static string PrioridadToDb(PrioridadTransferencia prioridad) => prioridad switch
    {
        PrioridadTransferencia.Baja => "baja",
        PrioridadTransferencia.Media => "media",
        PrioridadTransferencia.Alta => "alta",
        _ => throw new ArgumentOutOfRangeException(nameof(prioridad), prioridad, "Prioridad no reconocida")
    };

    private static PrioridadTransferencia PrioridadFromDb(string valor) => valor switch
    {
        "baja" => PrioridadTransferencia.Baja,
        "media" => PrioridadTransferencia.Media,
        "alta" => PrioridadTransferencia.Alta,
        _ => throw new ArgumentOutOfRangeException(nameof(valor), valor, "Valor de prioridad desconocido en la base de datos")
    };

    private static string RolToDb(RolUsuario rol) => rol switch
    {
        RolUsuario.AdministradorGeneral => "administrador_general",
        RolUsuario.GerenteSucursal => "gerente_sucursal",
        RolUsuario.OperadorInventario => "operador_inventario",
        _ => throw new ArgumentOutOfRangeException(nameof(rol), rol, "Rol no reconocido")
    };

    private static RolUsuario RolFromDb(string valor) => valor switch
    {
        "administrador_general" => RolUsuario.AdministradorGeneral,
        "gerente_sucursal" => RolUsuario.GerenteSucursal,
        "operador_inventario" => RolUsuario.OperadorInventario,
        _ => throw new ArgumentOutOfRangeException(nameof(valor), valor, "Valor de rol desconocido en la base de datos")
    };

    private static string TipoMovimientoToDb(TipoMovimiento tipo) => tipo switch
    {
        TipoMovimiento.Ingreso => "ingreso",
        TipoMovimiento.Retiro => "retiro",
        _ => throw new ArgumentOutOfRangeException(nameof(tipo), tipo, "Tipo de movimiento no reconocido")
    };

    private static TipoMovimiento TipoMovimientoFromDb(string valor) => valor switch
    {
        "ingreso" => TipoMovimiento.Ingreso,
        "retiro" => TipoMovimiento.Retiro,
        _ => throw new ArgumentOutOfRangeException(nameof(valor), valor, "Valor de tipo de movimiento desconocido en la base de datos")
    };
}
