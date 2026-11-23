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
      addWorkspaceActions(card.querySelector("article"), workspace);
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

function setSaving(saving) {
  // Crear reconstruye el listado: evitamos que se solape con un renombrado o borrado pendiente.
  workspaceName.disabled   = saving;
  workspaceButton.disabled = saving;

  for (const control of workspaceList.querySelectorAll("button, input")) {
    control.disabled = saving;
  }
}

function addWorkspaceActions(card, workspace) {
  const template = document.getElementById("workspace-actions");
  const actions  = template.content.cloneNode(true);

  const renameButton = actions.querySelector(".rename-button");
  const deleteButton = actions.querySelector(".delete-button");
  const renameForm   = actions.querySelector("form");
  const renameName   = actions.querySelector("input");
  const cancelButton = actions.querySelector(".cancel-button");
  const message      = actions.querySelector('[role="status"]');

  const deleteDialog        = actions.querySelector("dialog");
  const confirmDeleteButton = actions.querySelector(".confirm-delete-button");
  const cancelDeleteButton  = actions.querySelector(".cancel-delete-button");

  renameButton.addEventListener("click", function () {
    renameName.value    = workspace.name;
    message.textContent = "";
    renameButton.hidden = true;
    renameForm.hidden   = false;
    renameName.focus();
  });

  cancelButton.addEventListener("click", function () {
    renameForm.hidden   = true;
    renameButton.hidden = false;
    message.textContent = "";
    renameButton.focus();
  });

  renameForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const name = renameName.value.trim();

    if (name === "") {
      message.textContent = "Escribe un nombre para el espacio.";
      renameName.focus();
      return;
    }

    setSaving(true);
    message.textContent   = "Guardando nombre…";

    try {
      // El id identifica el espacio aunque su nombre haya cambiado.
      const response = await fetch(workspacesUrl + "/" + workspace.id, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name: name})
      });

      if (!response.ok) {
        throw new Error("No se ha podido renombrar el espacio");
      }

      // Usamos el nombre confirmado por la API sin reconstruir las otras tarjetas.
      const updatedWorkspace = await response.json();
      workspace.name = updatedWorkspace.name;
      card.querySelector("h3").textContent = workspace.name;
      renameForm.hidden   = true;
      renameButton.hidden = false;
      message.textContent = "Espacio renombrado.";
    } catch {
      message.textContent = "No se ha podido renombrar el espacio. Conservamos el nombre para que puedas reintentarlo.";
    }

    setSaving(false);
    if (renameForm.hidden) {
      renameButton.focus();
    } else {
      renameName.focus();
    }
  });

  deleteButton.addEventListener("click", function () {
    // Mostramos el nombre guardado, que también se actualiza al renombrar la tarjeta.
    deleteDialog.querySelector("p").textContent = "¿Eliminar el espacio «" + workspace.name + "»? Esta acción no se puede deshacer.";
    deleteDialog.showModal();
  });

  cancelDeleteButton.addEventListener("click", function () {
    deleteDialog.close();
  });

  confirmDeleteButton.addEventListener("click", async function () {
    deleteDialog.close();
    setSaving(true);
    message.textContent = "Eliminando espacio…";

    try {
      const response = await fetch(workspacesUrl + "/" + workspace.id, {
        method: "DELETE"
      });

      // El endpoint confirma el borrado con 204 y no devuelve JSON.
      if (response.status !== 204) {
        throw new Error("No se ha podido eliminar el espacio");
      }

      card.closest(".workspace-card").remove();
      workspaceMessage.textContent = "Espacio eliminado.";
      if (workspaceList.children.length === 0) {
        workspaceStatus.textContent = "Todavía no tienes espacios.";
      }
    } catch {
      message.textContent = "No se ha podido eliminar el espacio. Puedes volver a intentarlo.";
    }

    setSaving(false);
    // Si la tarjeta desaparece, devolvemos el foco al formulario de creación.
    if (card.isConnected) {
      deleteButton.focus();
    } else {
      workspaceName.focus();
    }
  });

  // Los controles son hermanos del enlace para editar sin abrir la página del espacio.
  card.append(actions);
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

  setSaving(true);

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

  setSaving(false);
  workspaceName.focus();
}

workspaceForm.addEventListener("submit", createWorkspace);
loadWorkspaces();
