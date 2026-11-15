const workspacesUrl    = "http://127.0.0.1:8000/workspaces";
const workspaceList    = document.getElementById("workspaces");
const workspaceStatus  = document.getElementById("workspaces-status");
const workspaceForm    = document.getElementById("workspace-form");
const workspaceName    = document.getElementById("workspace-name");
const workspaceButton  = document.getElementById("workspace-button");
const workspaceMessage = document.getElementById("workspace-message");

async function loadWorkspaces() {
  // Esperamos al listado antes de permitir crear para no solapar las dos consultas.
  workspaceButton.disabled = true;
  workspaceList.textContent   = "";
  workspaceStatus.textContent = "Cargando espacios…";

  try {
    const response = await fetch(workspacesUrl);

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

  workspaceButton.disabled = false;
}

async function createWorkspace(event) {
  // Enviamos el nombre con JavaScript sin que el formulario recargue la página.
  event.preventDefault();
  const name = workspaceName.value.trim();

  if (name === "") {
    workspaceMessage.textContent = "Escribe un nombre para el espacio.";
    workspaceName.focus();
    return;
  }

  workspaceName.disabled   = true;
  workspaceButton.disabled = true;

  workspaceMessage.textContent = "Guardando espacio…";

  try {
    const response = await fetch(workspacesUrl, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({name: name})
    });

    if (!response.ok) {
      throw new Error("No se ha podido crear el espacio");
    }

    // Limpiamos el campo cuando la API confirma la creación y consultamos la lista guardada.
    workspaceForm.reset();
    workspaceMessage.textContent = "Espacio creado.";
    await loadWorkspaces();
  } catch {
    workspaceMessage.textContent = "No se ha podido crear el espacio. Comprueba la conexión e inténtalo de nuevo.";
  }

  workspaceName.disabled   = false;
  workspaceButton.disabled = false;
  workspaceName.focus();
}

workspaceForm.addEventListener("submit", createWorkspace);
loadWorkspaces();
