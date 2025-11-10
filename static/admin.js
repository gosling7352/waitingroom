const supabaseUrl = "https://urcdmefagpuyluzzdqgl.supabase.co";
const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyY2RtZWZhZ3B1eWx1enpkcWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjI4NDYsImV4cCI6MjA3NDczODg0Nn0.WqXzT1HLImeRRJbd9VZZZHcpilKFZdRPzPvjmsMJOpY";
const client = supabase.createClient(supabaseUrl, supabaseKey);

/** @type HTMLHeadingElement */
const welcomeSubheading = document.getElementById("welcome-subheading");

/** @type HTMLDivElement */
const loginContainer = document.getElementById("login-container");
/** @type HTMLDivElement */
const adminDashboardContainer = document.getElementById(
    "admin-dashboard-container",
);
/** @type HTMLDivElement */
const qrCodeContainer = document.getElementById("qr-code-container");
/** @type HTMLDivElement */
const qrCodeDisplay = document.getElementById("qr-code-display");

/**
 * @typedef {Object} Exchange
 * @property {string} id A UUID represented as a 36 character string.
 * @property {Date} date
 */

function showLogin() {
    welcomeSubheading.innerText = "Log in to see the Admin Page!";

    adminDashboardContainer.style.display = "none";
    qrCodeContainer.style.display = "none";
    loginContainer.style.display = "block";
}
function showAdminDashboard() {
    welcomeSubheading.innerText = "Welcome to the Admin Page!";

    loginContainer.style.display = "none";
    qrCodeContainer.style.display = "none";
    adminDashboardContainer.style.display = "block";
    renderLastExchanges();
}
/** @param {Exchange} exchange  */
function showQrCode(exchange) {
    welcomeSubheading.innerText = `Register for the Card Exchange on the ${exchange.date.toLocaleDateString()}`;

    loginContainer.style.display = "none";
    adminDashboardContainer.style.display = "none";

    const originSuffix = window.location.host.endsWith("github.io")
        ? window.location.pathname.split("/").slice(0, 2).join("/")
        : "";
    const origin = window.location.origin + originSuffix;
    const url = `${origin}?e=${exchange.id}`;

    qrCodeDisplay.innerHTML = "";
    new QRCode(qrCodeDisplay, url);

    qrCodeContainer.style.display = "block";

    renderLastExchanges();
}

// ==== LOGIN ====

/** @type HTMLInputElement */
const emailInput = document.getElementById("email-input");
/** @type HTMLInputElement */
const passwordInput = document.getElementById("password-input");
/** @type HTMLButtonElement */
const submitLoginButton = document.getElementById("submit-login-button");
submitLoginButton.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    const response = await client.auth.signInWithPassword({ email, password });
    console.log("response", response);
    if (response.error) {
        console.error("Failed to log the user in.", error);
        // TODO: show error
        return;
    }
    showAdminDashboard();
});

// ==== ADMIN DASHBOARD ====

/** @type HTMLButtonElement */
const logoutButton = document.getElementById("logout-button");
logoutButton.addEventListener("click", async () => {
    const { error } = await client.auth.signOut();
    if (error) {
        console.error("Failed to log the user out.", error);
        // TODO: show error
        return;
    }
    showLogin();
});

/** @type HTMLInputElement */
const createExchangeDateInput = document.getElementById(
    "create-exchange-date-input",
);
/** @type HTMLButtonElement */
const createExchangeButton = document.getElementById("create-exchange-button");
createExchangeButton.addEventListener("click", async () => {
    const dateString = createExchangeDateInput.value;
    // TODO: disable button
    if (dateString === "") {
        return;
    }
    const newExchangeDate = new Date(dateString);

    const { error } = await client.from("exchanges").insert([
        {
            date: newExchangeDate,
        },
    ]);
    if (error) {
        console.error("Failed to create an exchange.", error);
        // TODO: show error
        return;
    }
    renderLastExchanges();
});

const lastExchangesContainer = document.getElementById(
    "last-exchanges-container",
);

async function renderLastExchanges() {
    const { error, data: exchanges } = await client
        .from("exchanges")
        .select("id, date")
        .order("date", { ascending: false })
        .limit(3);
    if (error) {
        console.error("Failed to get the exchanges.", error);
        // TODO: show error
        return;
    }

    lastExchangesContainer.innerHTML = "";
    for (const exchange of exchanges) {
        const listItem = document.createElement("li");
        const date = new Date(exchange.date);
        listItem.classList.add("last-exchanges-entry");
        const span = document.createElement("span");
        span.innerText = date.toLocaleDateString();
        listItem.appendChild(span);
        const showQrCodeButton = document.createElement("button");
        showQrCodeButton.type = "button";
        showQrCodeButton.addEventListener("click", () =>
            showQrCode({
                id: exchange.id,
                date,
            }),
        );
        showQrCodeButton.innerText = "Print the QR-Code";
        listItem.appendChild(showQrCodeButton);
        lastExchangesContainer.appendChild(listItem);
    }
}

// ==== QR CODE ====

const backToDashboardButton = document.getElementById(
    "back-to-dashboard-button",
);
backToDashboardButton.addEventListener("click", () => {
    showAdminDashboard();
});

const initialUser = await client.auth.getUser();

if (initialUser.data.user == null) {
    showLogin();
} else {
    showAdminDashboard();
}
