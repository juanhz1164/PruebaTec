SET NAMES utf8mb4;
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
-- NOTA: password_hash es el hash BCrypt de la contraseña de prueba
-- "Password123!" para TODOS estos usuarios (solo entorno de desarrollo/seed,
-- nunca reutilizar esta contraseña ni este hash en un entorno real).
-- ============================================================

INSERT INTO usuarios (sucursal_id, nombre, email, password_hash, rol, activo) VALUES
    (NULL, 'Admin General', 'admin@inventario.com', '$2a$11$HO0dWUpZ4W6aXRlbINi4t.MT2fJKWdAGm7.rKaJgBPrBHUjbomtAC', 'administrador_general', TRUE),
    (1, 'Gerente Centro', 'gerente.centro@inventario.com', '$2a$11$HO0dWUpZ4W6aXRlbINi4t.MT2fJKWdAGm7.rKaJgBPrBHUjbomtAC', 'gerente_sucursal', TRUE),
    (1, 'Operador Centro', 'operador.centro@inventario.com', '$2a$11$HO0dWUpZ4W6aXRlbINi4t.MT2fJKWdAGm7.rKaJgBPrBHUjbomtAC', 'operador_inventario', TRUE),
    (2, 'Gerente Norte', 'gerente.norte@inventario.com', '$2a$11$HO0dWUpZ4W6aXRlbINi4t.MT2fJKWdAGm7.rKaJgBPrBHUjbomtAC', 'gerente_sucursal', TRUE),
    (2, 'Operador Norte', 'operador.norte@inventario.com', '$2a$11$HO0dWUpZ4W6aXRlbINi4t.MT2fJKWdAGm7.rKaJgBPrBHUjbomtAC', 'operador_inventario', TRUE),
    (3, 'Gerente Medellín', 'gerente.medellin@inventario.com', '$2a$11$HO0dWUpZ4W6aXRlbINi4t.MT2fJKWdAGm7.rKaJgBPrBHUjbomtAC', 'gerente_sucursal', TRUE),
    (3, 'Operador Medellín', 'operador.medellin@inventario.com', '$2a$11$HO0dWUpZ4W6aXRlbINi4t.MT2fJKWdAGm7.rKaJgBPrBHUjbomtAC', 'operador_inventario', TRUE);

-- ============================================================
-- Proveedores (para poder probar el módulo de compras)
-- Cada uno distribuye una familia de productos: papelería, abarrotes o aseo.
-- Se insertan antes de productos porque cada producto referencia a su
-- proveedor principal (proveedor_id).
-- ============================================================

INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, activo) VALUES
    ('Distribuidora Papelera S.A.S.', 'Laura Gómez', '6015551111', 'ventas@papelera.com', 'Zona Industrial, Bogotá', TRUE),
    ('Abarrotes del Valle Ltda.', 'Carlos Ruiz', '6015552222', 'pedidos@abarrotesvalle.com', 'Cra 50 # 10-05, Medellín', TRUE),
    ('Distribuidora de Aseo y Limpieza S.A.S.', 'Marcela Torres', '6015553333', 'ventas@aseoylimpieza.com', 'Cra 30 # 15-40, Bogotá', TRUE);

-- ============================================================
-- Productos (catálogo base — tienda / minimercado de barrio)
-- unidad_medida_id: 1=Unidad, 2=Kilogramo, 3=Litro, 4=Caja
-- proveedor_id: 1=Papelera, 2=Abarrotes del Valle, 3=Aseo y Limpieza
-- ============================================================

INSERT INTO productos (unidad_medida_id, proveedor_id, sku, nombre, descripcion, categoria, activo) VALUES
    (1, 1, 'PROD-001', 'Lapicero', 'Lapicero de tinta azul punta fina', 'Papelería', TRUE),
    (2, 2, 'PROD-002', 'Arroz', 'Arroz blanco, venta a granel por kilo', 'Abarrotes', TRUE),
    (3, 2, 'PROD-003', 'Aceite vegetal', 'Aceite vegetal comestible, venta por litro', 'Abarrotes', TRUE),
    (3, 3, 'PROD-004', 'Detergente líquido', 'Detergente líquido para ropa, venta por litro', 'Aseo', TRUE),
    (1, 3, 'PROD-005', 'Jabón de baño', 'Jabón de tocador en barra', 'Aseo', TRUE),
    (3, 3, 'PROD-006', 'Detergente líquido 3L', 'Detergente líquido para ropa, presentación de 3 litros', 'Aseo', TRUE),
    (3, 3, 'PROD-007', 'Detergente líquido 5L', 'Detergente líquido para ropa, presentación de 5 litros', 'Aseo', TRUE),
    (3, 3, 'PROD-008', 'Detergente líquido 7L', 'Detergente líquido para ropa, presentación de 7 litros', 'Aseo', TRUE),
    (4, 1, 'PROD-009', 'Caja de lapiceros', 'Caja con 12 lapiceros azules, más económica que comprarlos sueltos', 'Papelería', TRUE),
    (1, 1, 'PROD-010', 'Cuaderno', 'Cuaderno cuadriculado de 100 hojas', 'Papelería', TRUE);

-- ============================================================
-- Inventario inicial por sucursal
-- producto_id: 1..10 en el mismo orden de arriba
-- sucursal_id: 1=Centro, 2=Norte, 3=Medellín
-- Costo de los detergentes 3L/5L/7L (productos 6-8): proporcional al litro
-- del detergente base (~$7.800/L) con descuento por tamaño de envase.
-- "Caja de lapiceros" (producto 9) es un producto independiente con su propio
-- stock: no descuenta del stock de "Lapicero" al venderse.
-- ============================================================

INSERT INTO inventario (producto_id, sucursal_id, cantidad, stock_minimo, costo_promedio) VALUES
    (1, 1, 300, 50, 800.00),
    (2, 1, 120, 20, 3200.00),
    (3, 1, 60, 15, 9500.00),
    (4, 1, 40, 10, 7800.00),
    (5, 1, 150, 30, 1800.00),
    (6, 1, 30, 8, 21000.00),
    (7, 1, 25, 6, 33000.00),
    (8, 1, 15, 5, 44000.00),
    (9, 1, 25, 5, 8400.00),
    (10, 1, 120, 30, 2500.00),

    (1, 2, 200, 50, 800.00),
    (2, 2, 80, 20, 3200.00),
    (4, 2, 25, 10, 7800.00),
    (6, 2, 20, 8, 21000.00),
    (7, 2, 15, 6, 33000.00),
    (8, 2, 10, 5, 44000.00),
    (9, 2, 15, 5, 8400.00),
    (10, 2, 90, 30, 2500.00),

    (1, 3, 150, 50, 800.00),
    (3, 3, 30, 15, 9500.00),
    (5, 3, 90, 30, 1800.00),
    (9, 3, 10, 5, 8400.00),
    (10, 3, 60, 30, 2500.00);
