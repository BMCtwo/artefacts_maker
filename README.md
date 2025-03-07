# Medidor de RAN (Rapidez Automática de Nombrado)

Esta aplicación está diseñada para medir la Rapidez Automática de Nombrado (RAN), evaluando el tiempo que tarda un sujeto en nombrar diferentes matrices compuestas por colores, objetos, letras y números.

## Descripción

La prueba RAN consiste en presentar al sujeto matrices de estímulos que debe leer en voz alta. Cada matriz contiene 6 elementos:
- **Colores:** negro, verde, azul, rojo, blanco y amarillo.
- **Objetos:** coche, estrella, lápiz, silla, paraguas y llave.
- **Letras:** D, S, A, P, O, L.
- **Números:** 1, 2, 3, 7, 9, 6.

Antes de cada matriz se muestra un **ejemplo de prueba** con los mismos 6 elementos. Este ejemplo tiene como objetivo verificar que el sujeto reconoce y puede nombrar correctamente cada uno de los elementos antes de que se realice la medición.

## Flujo de la Aplicación

1. **Ingreso de Datos del Sujeto:**  
   Al iniciar la aplicación se solicita la siguiente información:
   - Identificación del sujeto.
   - Clase y letra.
   - Edad.
   - Sexo (indicar si es niño o niña).

2. **Presentación de Estímulos:**  
   Los estímulos se muestran en el siguiente orden:
   - Ejemplo de colores.
   - Matriz de colores.
   - Ejemplo de objetos.
   - Matriz de objetos.
   - Ejemplo de letras.
   - Matriz de letras.
   - Ejemplo de números.
   - Matriz de números.

3. **Ejecución de la Prueba:**  
   - Cada matriz se debe leer de forma secuencial: iniciando por la fila superior y avanzando de izquierda a derecha.
   - Antes de la presentación de la matriz, el experimentador muestra un ejemplo para asegurarse de que el sujeto conoce los elementos.
   - Al iniciar la lectura de la matriz, el experimentador presiona el botón **"Iniciar"** para comenzar a registrar el tiempo.
   - Cuando el sujeto termina de nombrar todos los elementos de la matriz, el experimentador presiona **"Terminar"**, registrando así el tiempo total empleado en la tarea.
   - El proceso se repite para cada uno de los tipos de estímulos (colores, objetos, letras y números).

## Características

- **Interfaz intuitiva:** Diseño claro y fácil de usar, orientado para ser manejado por el experimentador.
- **Registro automático de tiempos:** Cada lectura es cronometrada con precisión para obtener resultados fiables.
- **Validación previa de conocimientos:** Se muestra un ejemplo antes de cada matriz para asegurar que el sujeto conoce los elementos a nombrar.
- **Presentación secuencial de estímulos:** Los estímulos se muestran en un orden preestablecido para mantener la coherencia en la prueba.

## Requisitos

- Sistema operativo: Windows, macOS o Linux.

## Instalación

1. **Clonar el repositorio:**

- Abre el archivo index.html en cualquier navegador moderno.
- También puedes alojar los archivos en un servidor web si deseas acceder a la aplicación de forma remota.
