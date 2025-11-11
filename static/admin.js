/**
 * @typedef {Object} Exchange
 * @property {string} id A UUID represented as a 36 character string.
 * @property {Date} date
 */

const supabaseUrl = "https://urcdmefagpuyluzzdqgl.supabase.co";
const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyY2RtZWZhZ3B1eWx1enpkcWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjI4NDYsImV4cCI6MjA3NDczODg0Nn0.WqXzT1HLImeRRJbd9VZZZHcpilKFZdRPzPvjmsMJOpY";
const client = supabase.createClient(supabaseUrl, supabaseKey);

/** @type HTMLDivElement */
const loginContainer = document.querySelector(".login-container");
/** @type HTMLDivElement */
const adminDashboardContainer = document.querySelector(
    ".admin-dashboard-container",
);
const qrCodeTitle = document.querySelector(".qr-code-title");
/** @type HTMLDivElement */
const qrCodeContainer = document.querySelector(".qr-code-container");
/** @type HTMLDivElement */
const qrCodeDisplay = document.querySelector(".qr-code-display");

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tagName
 * @param {Partial<HTMLElementTagNameMap[K]> & {children?: Iterable<HTMLElement | boolean | null | undefined>}?} options
 * @returns {HTMLElementTagNameMap[K]}
 */
function tag(tagName, options) {
    const element = document.createElement(tagName);
    if (options) {
        const { children, ...restOptions } = options;
        if (children) {
            for (const child of children) {
                if (child) {
                    element.appendChild(child);
                }
            }
        }
        Object.assign(element, restOptions);
    }
    return element;
}

// ==== LOGIN ====

/** @type HTMLInputElement */
const emailInput = document.querySelector(".email-input");
/** @type HTMLInputElement */
const passwordInput = document.querySelector(".password-input");
/** @type HTMLButtonElement */
const submitLoginButton = document.querySelector(".submit-login-button");
submitLoginButton.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
        // TODO: show error
        console.error("Failed to log the user in.", error);
        return;
    }
    showAdminDashboard();
});

// ==== ADMIN DASHBOARD ====

/** @type HTMLButtonElement */
const logoutButton = document.querySelector(".logout-button");
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
const createExchangeDateInput = document.querySelector(
    ".create-exchange-date-input",
);
/** @type HTMLButtonElement */
const createExchangeButton = document.querySelector(".create-exchange-button");
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

const lastExchangesContainer = document.querySelector(
    ".last-exchanges-container",
);

async function renderLastExchanges() {
    const { error, data: rawExchanges } = await client
        .from("exchanges")
        .select("id, date")
        .order("date", { ascending: false })
        .limit(3);
    if (error) {
        console.error("Failed to get the exchanges.", error);
        // TODO: show error
        return;
    }

    /** @type Exchange[] */
    const exchanges = rawExchanges.map((e) => ({
        id: e.id,
        date: new Date(e.date),
    }));

    lastExchangesContainer.innerHTML = "";

    /**
     * @param {number} index
     * @param {Exchange} exchange
     * @param {HTMLUListElement} listItem
     */
    function showTransferContainer(index, exchange, listItem) {
        const existingContainers = lastExchangesContainer.querySelectorAll(
            ".transfer-queue-to-exchange-container",
        );
        for (const existingContainer of existingContainers) {
            existingContainer.remove();
        }

        const numberInput = tag("input", {
            placeholder: "Last exchanged number",
            type: "number",
            min: 0,
            className: "input",
        });
        const exchangeSelect = tag("select", {
            placeholder: "New exchange",
            value: index === 0 ? "" : exchanges[0].id,
            className: "input",
            children: exchanges.entries().map(([innerIndex, exchange]) => {
                if (innerIndex === index) return;
                return tag("option", {
                    value: exchange.id,
                    text: exchange.date.toLocaleDateString(),
                });
            }),
        });

        const transferContainer = tag("div", {
            className: "transfer-queue-to-exchange-container",
            children: [
                numberInput,
                exchangeSelect,
                tag("button", {
                    innerText: "Transfer",
                    className: "button",
                    onclick: async () => {
                        let number;
                        try {
                            number = Number(numberInput.value);
                        } catch (_) {
                            console.log("Got invalid number.");
                            // TODO: show error
                            return;
                        }
                        if (exchangeSelect.value === "") {
                            console.log("Target exchange wasn't selected");
                            // TODO: show error
                            return;
                        }

                        let { error } = await client.rpc(
                            "transfer-exchange-queue",
                            {
                                last_exchanged_number: number,
                                source_exchange: exchange.id,
                                target_exchange: exchangeSelect.value,
                            },
                        );
                        if (error) {
                            console.error(error);
                            // TODO: show error
                            return;
                        }
                        renderLastExchanges();
                    },
                }),
                tag("button", {
                    innerText: "Cancel",
                    className: "button",
                    onclick: () => {
                        const lastListItemChild =
                            listItem.children[listItem.children.length - 1];
                        if (
                            lastListItemChild.classList.contains(
                                "transfer-queue-to-exchange-container",
                            )
                        ) {
                            lastListItemChild.remove();
                        }
                    },
                }),
            ],
        });

        listItem.appendChild(transferContainer);
    }

    for (const [index, exchange] of exchanges.entries()) {
        const listItem = tag("li", {
            className: "last-exchanges-entry",
            children: [
                tag("div", {
                    className: "last-exchanges-entry-upper",
                    children: [
                        tag("span", {
                            innerText: exchange.date.toLocaleDateString(),
                        }),
                        tag("button", {
                            innerText: "Print QR-Code",
                            className: "button",
                            onclick: () => showQrCode(exchange),
                        }),
                    ],
                }),
                exchanges.length > 1 &&
                    tag("button", {
                        innerText: "Transfer unexchanged numbers",
                        className: "last-exchanges-show-transfer-button button",
                        onclick: () =>
                            showTransferContainer(index, exchange, listItem),
                    }),
            ],
        });

        lastExchangesContainer.appendChild(listItem);
    }
}

// ==== QR CODE ====

const qrCodeBackButton = document.querySelector(".qr-code-back-button");
qrCodeBackButton.addEventListener("click", () => {
    showAdminDashboard();
});
const qrCodePrintButton = document.querySelector(".qr-code-print-button");
qrCodePrintButton.addEventListener("click", () => window.print());

const initialUser = await client.auth.getUser();

if (initialUser.data.user == null) {
    showLogin();
} else {
    showAdminDashboard();
}

// ==== PAGES ====

function showLogin() {
    logoutButton.classList.add("hide");
    adminDashboardContainer.classList.add("hide");
    qrCodeContainer.classList.add("hide");
    loginContainer.classList.remove("hide");
}
function showAdminDashboard() {
    logoutButton.classList.remove("hide");
    loginContainer.classList.add("hide");
    qrCodeContainer.classList.add("hide");
    adminDashboardContainer.classList.remove("hide");
    renderLastExchanges();
}
/** @param {Exchange} exchange  */
function showQrCode(exchange) {
    logoutButton.classList.remove("hide");

    qrCodeTitle.innerText = `Register for the Card Exchange on the ${exchange.date.toLocaleDateString()}`;

    loginContainer.classList.add("hide");
    adminDashboardContainer.classList.add("hide");

    const originSuffix = window.location.host.endsWith("github.io")
        ? window.location.pathname.split("/").slice(0, 2).join("/")
        : "";
    const origin = window.location.origin + originSuffix;
    const url = `${origin}?e=${exchange.id}`;

    qrCodeDisplay.innerHTML = "";
    new QRCode(qrCodeDisplay, url);

    qrCodeContainer.classList.remove("hide");

    renderLastExchanges();
}
