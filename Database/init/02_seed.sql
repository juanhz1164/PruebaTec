USE inventario;

-- ============================================================
-- Unidades de medida
-- ============================================================

INSERT INTO unidades_medida (nombre, abreviatura) VALUES
    ('Unidad', 'un'),
    ('Kilogramo', 'kg'),
    ('Litro', 'lt'),
    ('Caja', 'caja');

-- ============================================================
-- Sucursales
-- ============================================================

INSERT INTO sucursales (nombre, direccion, ciudad, telefono, activa) VALUES
    ('Sucursal Centro', 'Calle 10 # 5-20', 'Bogotá', '6011234567', TRUE),
    ('Sucursal Norte', 'Av. 19 # 100-30', 'Bogotá', '6017654321', TRUE),
    ('Sucursal Medellín', 'Cra 43A # 20-15', 'Medellín', '6042223344', TRUE);

-- ============================================================
-- Usuarios (uno por rol; gerentes/operadores atados a una sucursal)
-- NOTA: password_hash abajo es un PLACEHOLDER, no un hash real.
-- Debe reemplazarse generando el hash real con la librería que uses
-- en el backend (p. ej. BCrypt.Net-Next) antes de usarlo para login.
-- ============================================================

INSERT INTO usuarios (sucursal_id, nombre, email, password_hash, rol, activo) VALUES
    (NULL, 'Admin General', 'admin@inventario.com', 'PENDIENTE_HASH_BCRYPT', 'administrador_general', TRUE),
    (1, 'Gerente Centro', 'gerente.centro@inventario.com', 'PENDIENTE_HASH_BCRYPT', 'gerente_sucursal', TRUE),
    (1, 'Operador Centro', 'operador.centro@inventario.com', 'PENDIENTE_HASH_BCRYPT', 'operador_inventario', TRUE),
    (2, 'Gerente Norte', 'gerente.norte@inventario.com', 'PENDIENTE_HASH_BCRYPT', 'gerente_sucursal', TRUE),
    (3, 'Gerente Medellín', 'gerente.medellin@inventario.com', 'PENDIENTE_HASH_BCRYPT', 'gerente_sucursal', TRUE);

-- ============================================================
-- Productos (catálogo base)
-- unidad_medida_id: 1=Unidad, 2=Kilogramo, 3=Litro, 4=Caja
-- ============================================================

INSERT INTO productos (unidad_medida_id, sku, nombre, descripcion, categoria, activo) VALUES
    (1, 'PROD-001', 'Cuaderno 100 hojas', 'Cuaderno cuadriculado tamaño carta', 'Papelería', TRUE),
    (1, 'PROD-002', 'Lapicero azul', 'Lapicero de tinta azul punta fina', 'Papelería', TRUE),
    (4, 'PROD-003', 'Caja de resmas A4', 'Caja con 5 resmas de papel A4', 'Papelería', TRUE),
    (2, 'PROD-004', 'Café en grano', 'Café tostado en grano, bolsa por kg', 'Cafetería', TRUE),
    (3, 'PROD-005', 'Leche entera', 'Leche entera UHT por litro', 'Cafetería', TRUE);

-- ============================================================
-- Unidades de medida alternativas por producto
-- Ej: el Lapicero azul (base "un") también se maneja por "Caja" (1 caja = 12 un)
-- ============================================================

INSERT INTO producto_unidades_medida (producto_id, unidad_medida_id, factor_conversion) VALUES
    (2, 4, 12);

-- ============================================================
-- Inventario inicial por sucursal
-- producto_id: 1..5 en el mismo orden de arriba
-- sucursal_id: 1=Centro, 2=Norte, 3=Medellín
-- ============================================================

INSERT INTO inventario (producto_id, sucursal_id, cantidad, stock_minimo, costo_promedio) VALUES
    (1, 1, 120, 20, 2500.00),
    (2, 1, 300, 50, 800.00),
    (3, 1, 15, 5, 45000.00),
    (4, 1, 40, 10, 18000.00),
    (5, 1, 60, 15, 3200.00),

    (1, 2, 80, 20, 2500.00),
    (2, 2, 200, 50, 800.00),
    (4, 2, 25, 10, 18000.00),

    (1, 3, 50, 20, 2500.00),
    (3, 3, 10, 5, 45000.00),
    (5, 3, 30, 15, 3200.00);

-- ============================================================
-- Proveedores (para poder probar el módulo de compras)
-- ============================================================

INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, activo) VALUES
    ('Distribuidora Papelera S.A.S.', 'Laura Gómez', '6015551111', 'ventas@papelera.com', 'Zona Industrial, Bogotá', TRUE),
    ('Café y Más Ltda.', 'Carlos Ruiz', '6015552222', 'pedidos@cafeymas.com', 'Cra 50 # 10-05, Medellín', TRUE);
