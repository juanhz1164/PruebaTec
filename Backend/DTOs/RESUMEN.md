# DTOs — en general

Esta carpeta define **los formularios** que viajan entre el frontend y el backend.

Cuando el frontend quiere crear algo (como una venta o una transferencia), le manda al
backend un "formulario" con solo la información necesaria para esa acción — no toda la
información interna del sistema. Y cuando el backend responde, también arma un
"formulario" de respuesta con lo que el frontend necesita ver, sin exponer datos internos o
sensibles (por ejemplo, nunca se envía la contraseña de un usuario, aunque exista guardada
internamente).

En pocas palabras: esta carpeta es el "empaque" con el que la información entra y sale del
sistema — protege los datos internos y asegura que cada petición traiga exactamente lo que
se necesita.
