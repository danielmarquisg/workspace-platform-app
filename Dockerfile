# El digest fija el contenido de la imagen base aunque cambie la etiqueta stable-alpine.
FROM nginx:stable-alpine@sha256:dc5069ad14f19660b141b21236140b91656bf89bbc3e2417c70ae650cd66104c

# Incluimos la web en la imagen: ninguna VM necesita una copia manual ni un volumen con estos archivos.
COPY index.html styles.css /usr/share/nginx/html/
COPY japan/ /usr/share/nginx/html/japan/
COPY recetas/ /usr/share/nginx/html/recetas/
COPY personal-library/ /usr/share/nginx/html/personal-library/

# Heredamos el arranque de Nginx y el puerto 80 de la imagen oficial.
