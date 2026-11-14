const workspaceList   = document.getElementById("workspaces");
const workspaceStatus = document.getElementById("workspaces-status");

async function loadWorkspaces() {
  workspaceList.textContent   = "";
  workspaceStatus.textContent = "Cargando espacios…";

  try {
    const response = await fetch("http://127.0.0.1:8000/workspaces");

    // Una respuesta HTTP de error, como un 503, también debe mostrar el aviso.
    if (!response.ok) {
      throw new Error("No se han podido consultar los espacios");
    }

    const workspaces = await response.json();

    for (const workspace of workspaces) {
      // Elegimos por id para conservar el enlace cuando cambie el nombre.
      let template = document.getElementById("workspace-" + workspace.id);

      // Los espacios nuevos usan la tarjeta de «Contenido pendiente».
      if (!template) {
        template = document.getElementById("workspace-card");
      }

      const card = template.content.cloneNode(true);

      // Mostramos el nombre como texto para evitar que se interprete como HTML.
      card.querySelector("h3").textContent = workspace.name;
      workspaceList.append(card);
    }

    workspaceStatus.textContent = "";
    if (workspaces.length === 0) {
      workspaceStatus.textContent = "Todavía no tienes espacios.";
    }
  } catch {
    workspaceStatus.textContent = "No se han podido cargar los espacios. Comprueba que la API esté disponible y recarga la página.";
  }
}

loadWorkspaces();
