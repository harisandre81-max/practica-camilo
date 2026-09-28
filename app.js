import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================

const SUPABASE_URL = "https://lpohihdwgbtoeninjmfo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dKQNRdFPpvmM6WpjSVQWrQ_LOsNMHQO";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

let intentosFallidos = Number(
    sessionStorage.getItem("intentosFallidos") || 0
);

// ==========================================
// LOGIN
// ==========================================

const loginForm = document.getElementById("login-form");

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const message = document.getElementById("login-message");

        message.textContent = "Iniciando sesión...";
        message.style.color = "#555";

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {

            console.error("Error de Supabase:", error);

            intentosFallidos++;

            sessionStorage.setItem(
                "intentosFallidos",
                intentosFallidos
            );

            if (intentosFallidos >= 3) {

                message.textContent =
                    "❌ Se detectaron demasiados intentos fallidos. " +
                    "Reinicia la aplicación.";

                message.style.color = "#d32f2f";

                document.getElementById("email").disabled = true;
                document.getElementById("password").disabled = true;
                document.querySelector(".login-button").disabled = true;

                alert(
                    "ERROR DE LA APLICACIÓN\n\n" +
                    "Se detectaron demasiados intentos incorrectos.\n\n" +
                    "Reinicia la aplicación para continuar."
                );

                return;
            }

            message.textContent =
                `Credenciales incorrectas. Intento ${intentosFallidos} de 3.`;

            message.style.color = "#d32f2f";

            return;
        }

        console.log("Sesión iniciada:", data.user);

        message.textContent = "Inicio de sesión correcto.";
        message.style.color = "#16803c";

        window.location.href = "panel.html";
    });
}


// ==========================================
// PANEL
// ==========================================

async function cargarPanel() {

    const panel = document.getElementById("users-list");

    if (!panel) {
        return;
    }

    // ==========================================
    // COMPROBAR SESIÓN
    // ==========================================

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (!user) {

        window.location.href = "index.html";

        return;
    }


    // ==========================================
    // OBTENER PERFIL
    // ==========================================

    const {
        data: perfil,
        error: perfilError
    } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();


    if (perfilError) {

        console.error(
            "Error al cargar perfil:",
            perfilError
        );

        panel.innerHTML =
            "<p>No se pudo cargar tu perfil.</p>";

        return;
    }

    if (perfil.configuracion_predeterminada && perfil.color_fondo) {
        document.body.style.background = perfil.color_fondo;
    }


    // ==========================================
    // CONFIGURACIÓN
    // ==========================================

    if (!sessionStorage.getItem("configuracion")) {

        await mostrarConfiguracionPredeterminada(
            user.id
        );

        // Volver a consultar el perfil
        // porque acabamos de modificarlo

        const {
            data: perfilActualizado,
            error: errorActualizado
        } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();


        if (errorActualizado) {

            console.error(
                "Error actualizando perfil:",
                errorActualizado
            );

            return;
        }

        // Reemplazar el perfil anterior

        Object.assign(
            perfil,
            perfilActualizado
        );
    }


    // ==========================================
    // APLICAR COLOR
    // ==========================================

    if (
        perfil.configuracion_predeterminada &&
        perfil.color_fondo
    ) {

        document.body.style.background =
            perfil.color_fondo;
    }


    // ==========================================
    // MOSTRAR USUARIO ACTUAL
    // ==========================================

    const currentUser =
        document.getElementById("current-user");

    if (currentUser) {

        currentUser.textContent =
            `${perfil.nombre} — ${perfil.rol}`;
    }

    const supervisorButton = document.getElementById("supervisor-button");

    if (supervisorButton) {

        if (perfil.rol === "supervisor") {

            supervisorButton.style.display = "block";

            supervisorButton.addEventListener("click", () => {
                window.location.href = "supervisor.html";
            });

        }
    }


    // ==========================================
    // OBTENER USUARIOS
    // ==========================================

    const {
        data: usuarios,
        error: usuariosError
    } = await supabase
        .from("profiles")
        .select("*")
        .order("creado_en", {
            ascending: true
        });


    if (usuariosError) {

        console.error(
            "Error al cargar usuarios:",
            usuariosError
        );

        panel.innerHTML =
            "<p>No se pudieron cargar los usuarios.</p>";

        return;
    }


    panel.innerHTML = "";


    // ==========================================
    // MOSTRAR USUARIOS
    // ==========================================

    usuarios.forEach((usuario) => {

        const row =
            document.createElement("div");

        row.className = "user-row";


        const information =
            document.createElement("div");


        information.innerHTML = `
            <div class="user-name">
                ${usuario.nombre}
            </div>

            <div class="user-email">
                ${usuario.email}
            </div>
        `;


        const actions =
            document.createElement("div");


        const role =
            document.createElement("span");

        role.className = "user-role";

        role.textContent = usuario.rol;


        actions.appendChild(role);

        // ==========================================
        // BOTÓN ELIMINAR
        // ==========================================

        const deleteButton =
            document.createElement("button");

        deleteButton.className =
            "delete-button";

        deleteButton.textContent =
            "Eliminar";


        // ==========================================
        // COMPROBAR PERMISOS
        // ==========================================

        deleteButton.addEventListener(
            "click",
            () => {

                // El supervisor está protegido
                if (usuario.rol === "supervisor") {

                    alert(
                        "🔒 No puedes eliminar al supervisor."
                    );

                    return;
                }


                // Comprobar quién está conectado
                if (
                    perfil.rol !== "admin" &&
                    perfil.rol !== "supervisor"
                ) {

                    alert(
                        "❌ No puedes eliminar al usuario.\n\n" +
                        "No tienes permisos de administrador."
                    );

                    return;
                }


                // Si es admin o supervisor
                const confirmar = confirm(
                    `¿Estás seguro de eliminar a ${usuario.nombre}?`
                );

                if (!confirmar) {
                    return;
                }


                // Por ahora solo mostramos el resultado
                alert(
                    `✅ ${usuario.nombre} puede ser eliminado.\n\n` +
                    "Aquí implementaremos la eliminación."
                );

            }
        );

        // Agregar botón
        actions.appendChild(deleteButton);

        row.appendChild(information);

        row.appendChild(actions);

        panel.appendChild(row);

    });

}

// ==========================================
// VENTANA EMERGENTE
// ==========================================

async function mostrarConfiguracionPredeterminada(userId) {

    const continuar = confirm(
        "⚠️ CONFIGURACIÓN PREDETERMINADA\n\n" +
        "¿Quieres continuar con esta configuración?"
    );


    const {
        error
    } = await supabase
        .from("profiles")
        .update({
            configuracion_predeterminada: continuar
        })
        .eq("id", userId);


    if (error) {

        console.error(
            "Error guardando configuración:",
            error
        );

        return false;
    }


    if (continuar) {

        console.log(
            "Usuario aceptó la configuración."
        );

    } else {

        console.log(
            "Usuario rechazó la configuración."
        );
    }


    // Evita que vuelva a aparecer durante esta sesión

    sessionStorage.setItem(
        "configuracion",
        continuar ? "predeterminada" : "alternativa"
    );


    return continuar;
}

// ==========================================
// PANEL DEL SUPERVISOR
// ==========================================

async function cargarPanelSupervisor() {

    const boton = document.getElementById(
        "random-color-button"
    );

    if (!boton) {
        return;
    }


    // Comprobar usuario

    const {
        data: { user }
    } = await supabase.auth.getUser();


    if (!user) {

        window.location.href = "index.html";

        return;
    }


    // Obtener perfil

    const {
        data: perfil,
        error: perfilError
    } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();


    if (perfilError) {

        console.error(perfilError);

        alert("No se pudo cargar tu perfil.");

        return;
    }


    // Comprobar que realmente sea supervisor

    if (perfil.rol !== "supervisor") {

        alert(
            "Acceso denegado.\n\n" +
            "Esta sección es exclusiva del supervisor."
        );

        window.location.href = "panel.html";

        return;
    }


    // Contar usuarios con configuración predeterminada

    await actualizarContador();


    // Botón de color aleatorio

    boton.addEventListener(
        "click",
        async () => {

            const color = generarColorAleatorio();


            const {
                error
            } = await supabase
                .from("profiles")
                .update({
                    color_fondo: color
                })
                .eq(
                    "configuracion_predeterminada",
                    true
                );


            if (error) {

                console.error(error);

                document.getElementById(
                    "color-message"
                ).textContent =
                    "No se pudo cambiar el color.";

                return;
            }


            document.getElementById(
                "color-message"
            ).textContent =
                `Nuevo color: ${color}`;


            await actualizarContador();

        }
    );
}


// ==========================================
// COLOR ALEATORIO
// ==========================================

function generarColorAleatorio() {

    const caracteres =
        "0123456789ABCDEF";

    let color = "#";

    for (let i = 0; i < 6; i++) {

        color += caracteres[
            Math.floor(
                Math.random() *
                caracteres.length
            )
        ];
    }

    return color;
}


// ==========================================
// CONTADOR
// ==========================================

async function actualizarContador() {

    const {
        data,
        error
    } = await supabase
        .from("profiles")
        .select("id")
        .eq(
            "configuracion_predeterminada",
            true
        );


    if (error) {

        console.error(error);

        return;
    }


    const contador =
        document.getElementById(
            "users-count"
        );


    if (contador) {

        contador.textContent =
            `Usuarios afectados: ${data.length}`;
    }
}


// ==========================================
// INICIAR PANEL SUPERVISOR
// ==========================================

cargarPanelSupervisor();

// ==========================================
// CERRAR SESIÓN
// ==========================================

const logoutButton = document.getElementById("logout-button");

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        await supabase.auth.signOut();

        window.location.href = "index.html";
    });
}

// ==========================================
// VOLVER AL PANEL
// ==========================================

const backButton =
    document.getElementById("back-button");

if (backButton) {

    backButton.addEventListener("click", () => {

        window.location.href = "panel.html";

    });

}

// ==========================================
// EJECUTAR PANEL
// ==========================================

cargarPanel();