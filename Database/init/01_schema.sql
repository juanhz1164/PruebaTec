SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS inventario;
USE inventario;

-- ============================================================
-- Bloque base: catálogos sin dependencias
-- ============================================================

CREATE TABLE unidades_medida (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    abreviatura VARCHAR(10) NOT NULL,
    UNIQUE (abreviatura)
) ENGINE=InnoDB;

CREATE TABLE sucursales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    telefono VARCHAR(30),
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- Usuarios (depende de sucursales)
-- ============================================================

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sucursal_id INT NULL,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('administrador_general', 'gerente_sucursal', 'operador_inventario') NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (email),
    CONSTRAINT fk_usuarios_sucursal
        FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
) ENGINE=InnoDB;

-- ============================================================
-- Inventario: productos, stock por sucursal y movimientos
-- ============================================================

-- proveedor_id es opcional y su FK se agrega más abajo (después de crear la
-- tabla proveedores, que se declara luego en este mismo archivo).
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unidad_medida_id INT NOT NULL,
    proveedor_id INT NULL,
    sku VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    -- precio_venta: precio fijo al público (Ventas lo usa por defecto).
    -- precio_proveedor: precio de costo del proveedor principal (Compras lo
    -- autocompleta como precio unitario por defecto).
    precio_venta DECIMAL(12,2) NOT NULL DEFAULT 0,
    precio_proveedor DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (sku),
    CONSTRAINT fk_productos_unidad_medida
        FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id)
) ENGINE=InnoDB;

-- Unidades de medida alternativas por producto (además de la unidad base
-- en productos.unidad_medida_id). factor_conversion indica cuántas
-- unidades base equivalen a 1 unidad alternativa
-- (ej: unidad base "un", alternativa "caja" con factor 12 => 1 caja = 12 un).
-- precio_venta es opcional: precio fijo de venta para esa unidad (ej. la caja
-- se vende más barata que 12 unidades sueltas). Si es NULL, se calcula como
-- costo_promedio del inventario * factor_conversion.
CREATE TABLE producto_unidades_medida (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    unidad_medida_id INT NOT NULL,
    factor_conversion DECIMAL(12,4) NOT NULL,
    precio_venta DECIMAL(12,2) NULL,
    UNIQUE (producto_id, unidad_medida_id),
    CONSTRAINT fk_producto_unidades_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT fk_producto_unidades_unidad_medida
        FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id)
) ENGINE=InnoDB;

CREATE TABLE inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    sucursal_id INT NOT NULL,
    cantidad DECIMAL(5,2) NOT NULL DEFAULT 0,
    stock_minimo DECIMAL(5,2) NOT NULL DEFAULT 0,
    costo_promedio DECIMAL(12,2) NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (producto_id, sucursal_id),
    CONSTRAINT fk_inventario_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT fk_inventario_sucursal
        FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
) ENGINE=InnoDB;

CREATE TABLE movimientos_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    sucursal_id INT NOT NULL,
    usuario_id INT NOT NULL,
    tipo ENUM('ingreso', 'retiro') NOT NULL,
    cantidad DECIMAL(5,2) NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    referencia_tipo VARCHAR(50),
    referencia_id INT,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movimientos_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT fk_movimientos_sucursal
        FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
    CONSTRAINT fk_movimientos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- ============================================================
-- Compras
-- ============================================================

CREATE TABLE proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(30),
    email VARCHAR(150),
    direccion VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Cada producto es distribuido por un único proveedor principal. Sirve para
-- que, al elegir un proveedor en Compras, solo se ofrezcan los productos que
-- él distribuye.
ALTER TABLE productos
    ADD CONSTRAINT fk_productos_proveedor
        FOREIGN KEY (proveedor_id) REFERENCES proveedores(id);

CREATE TABLE ordenes_compra (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proveedor_id INT NOT NULL,
    sucursal_id INT NOT NULL,
    usuario_id INT NOT NULL,
    estado ENUM('pendiente', 'confirmada', 'recibida', 'cancelada') NOT NULL DEFAULT 'pendiente',
    plazo_pago_dias INT NOT NULL DEFAULT 0,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_recepcion DATETIME NULL,
    CONSTRAINT fk_ordenes_compra_proveedor
        FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    CONSTRAINT fk_ordenes_compra_sucursal
        FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
    CONSTRAINT fk_ordenes_compra_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE ordenes_compra_lineas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orden_compra_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad DECIMAL(5,2) NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    descuento DECIMAL(5,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_ordenes_compra_lineas_orden
        FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id),
    CONSTRAINT fk_ordenes_compra_lineas_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

-- ============================================================
-- Ventas
-- ============================================================

CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sucursal_id INT NOT NULL,
    usuario_id INT NOT NULL,
    numero_comprobante VARCHAR(50) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    descuento_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (numero_comprobante),
    CONSTRAINT fk_ventas_sucursal
        FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
    CONSTRAINT fk_ventas_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE ventas_lineas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad DECIMAL(5,2) NOT NULL,
    unidad_medida_id INT NOT NULL,
    cantidad_vendida DECIMAL(5,2) NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    descuento DECIMAL(5,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_ventas_lineas_venta
        FOREIGN KEY (venta_id) REFERENCES ventas(id),
    CONSTRAINT fk_ventas_lineas_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT fk_ventas_lineas_unidad_medida
        FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id)
) ENGINE=InnoDB;

-- ============================================================
-- Transferencias y logística entre sucursales
-- ============================================================

CREATE TABLE transferencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sucursal_origen_id INT NOT NULL,
    sucursal_destino_id INT NOT NULL,
    usuario_solicitante_id INT NOT NULL,
    estado ENUM(
        'solicitada',
        'en_preparacion',
        'en_transito',
        'recibida_completa',
        'recibida_parcial',
        'cancelada'
    ) NOT NULL DEFAULT 'solicitada',
    transportista VARCHAR(150),
    ruta VARCHAR(150),
    prioridad ENUM('baja', 'media', 'alta') NULL,
    costo_envio DECIMAL(12,2) NULL,
    fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_envio DATETIME NULL,
    fecha_estimada_llegada DATETIME NULL,
    fecha_recepcion DATETIME NULL,
    CONSTRAINT fk_transferencias_origen
        FOREIGN KEY (sucursal_origen_id) REFERENCES sucursales(id),
    CONSTRAINT fk_transferencias_destino
        FOREIGN KEY (sucursal_destino_id) REFERENCES sucursales(id),
    CONSTRAINT fk_transferencias_usuario
        FOREIGN KEY (usuario_solicitante_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE transferencias_lineas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transferencia_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad_solicitada DECIMAL(5,2) NOT NULL,
    cantidad_enviada DECIMAL(5,2) NOT NULL DEFAULT 0,
    cantidad_recibida DECIMAL(5,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_transferencias_lineas_transferencia
        FOREIGN KEY (transferencia_id) REFERENCES transferencias(id),
    CONSTRAINT fk_transferencias_lineas_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

-- ============================================================
-- Visitas: control de ingreso de visitantes por sucursal
-- ============================================================

-- Una visita = un grupo que ingresa junto (no una persona). cantidad_personas
-- es siempre >= 1. La fecha/hora la fija el backend (NOW()), nunca el usuario.
CREATE TABLE visitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sucursal_id INT NOT NULL,
    usuario_id INT NOT NULL,
    cantidad_personas INT NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_visitas_sucursal
        FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
    CONSTRAINT fk_visitas_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT chk_visitas_cantidad_personas CHECK (cantidad_personas >= 1)
) ENGINE=InnoDB;
