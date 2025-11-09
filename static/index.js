const supabaseUrl = "https://urcdmefagpuyluzzdqgl.supabase.co";
const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyY2RtZWZhZ3B1eWx1enpkcWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjI4NDYsImV4cCI6MjA3NDczODg0Nn0.WqXzT1HLImeRRJbd9VZZZHcpilKFZdRPzPvjmsMJOpY";
const client = supabase.createClient(supabaseUrl, supabaseKey);

function getDeviceId() {
    let id = localStorage.getItem("deviceId");
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("deviceId", id);
    }
    return id;
}

async function getExchange() {
    const searchParamss = new URLSearchParams(window.location.search);
    const exchangeParam = searchParamss.get("e");

    if (exchangeParam?.length !== 36) return;

    const response = await fetch(`${supabaseUrl}/functions/v1/get-exchange`, {
        method: "POST",
        body: JSON.stringify({ exchangeId: exchangeParam }),
    });

    let responseData;
    try {
        responseData = await response.json();
    } catch (_) {
        console.error("Failed to fetch the exchange");
        return;
    }

    if (response.status !== 200) {
        if (response.status === 400) {
            console.warn(
                "The requested exchange doesn't exist",
                responseData.message,
            );
        } else {
            console.error("Failed to fetch the exchange", responseData.message);
        }
        return;
    }

    return {
        id: responseData.exchange.id,
        date: new Date(responseData.exchange.date),
    };
}

/**
 * @param {string} exchangeId
 * @param {string} deviceId
 * @returns {Promise<{
 *     data?: { number: number, exchange: string, deviceId: string, createdAt: string },
 *     error?: string
 * }>}
 */
async function getQueueEntry(exchangeId, deviceId) {
    const response = await fetch(
        `${supabaseUrl}/functions/v1/get-queue-entry`,
        {
            method: "POST",
            body: JSON.stringify({ exchangeId, deviceId }),
        },
    );

    let responseData;
    try {
        responseData = await response.json();
    } catch (_) {
        console.error("Failed to fetch the queue entry");
        return;
    }

    if (response.status !== 200) {
        if (response.status === 400) {
            return { data: undefined };
        } else {
            console.error(
                "Failed to fetch the queue entry",
                responseData.message,
            );
            return { error: responseData.message };
        }
    }

    return {
        data: {
            number: responseData.queueEntry.number,
            exchange: responseData.queueEntry.exchange,
            deviceId: responseData.queueEntry.device_id,
            createdAt: new Date(responseData.queueEntry.created_at),
        },
    };
}

/**
 * @param {string} exchangeId
 * @param {string} deviceId
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function drawQueueNumber(exchangeId, deviceId) {
    const response = await fetch(
        `${supabaseUrl}/functions/v1/draw-queue-number`,
        {
            method: "POST",
            body: JSON.stringify({ exchangeId, deviceId }),
        },
    );

    let responseData;
    try {
        responseData = await response.json();
    } catch (_) {
        console.error("Failed to draw a queue number");
        return;
    }

    if (response.status !== 200) {
        // TODO: reimplement check for "You've already received a number today."
        console.error("Failed to draw a queue number", responseData.message);
        return { success: false, error: responseData.message };
    }

    return { success: true };
}

const exchangePromise = getExchange();

window.onload = async () => {
    const exchange = await exchangePromise;

    if (!exchange) {
        const drawButton = document.getElementById("draw-button");
        const numberDisplay = document.getElementById("number-display");
        const dateDisplay = document.getElementById("date-display");
        const drawTimeDisplay = document.getElementById("draw-time-display");
        const errorDisplay = document.getElementById("error-display");

        drawButton.style.display = "none";
        numberDisplay.style.display = "none";
        dateDisplay.style.display = "none";
        drawTimeDisplay.style.display = "none";
        errorDisplay.style.display = "block";
    } else {
        const drawButton = document.getElementById("draw-button");
        const numberDisplay = document.getElementById("number-display");
        const dateDisplay = document.getElementById("date-display");
        const drawTimeDisplay = document.getElementById("draw-time-display");
        const errorDisplay = document.getElementById("error-display");

        dateDisplay.textContent = `Date: ${exchange.date.toLocaleDateString()}`;

        const today = new Date().toISOString().split("T")[0];
        const deviceId = getDeviceId();

        async function updateUI() {
            // TODO: show error
            const { error, data } = await getQueueEntry(exchange.id, deviceId);

            if (!data) {
                numberDisplay.textContent = "--";
                drawTimeDisplay.textContent = "No number yet";
                drawButton.style.display = "block";
                return;
            }

            numberDisplay.textContent = data.number;
            drawTimeDisplay.textContent = `Drawn at: ${data.createdAt.toLocaleString()}`;
            drawButton.style.display = "none";
        }

        updateUI();

        async function drawNumber() {
            const deviceId = getDeviceId();

            // TODO: show error
            const { success, error } = await drawQueueNumber(
                exchange.id,
                deviceId,
            );

            if (success) {
                updateUI();
                return;
            }

            alert(
                "Fehler: Konnte keine eindeutige Nummer ziehen. Bitte erneut versuchen.",
            );
        }

        drawButton.addEventListener("click", drawNumber);
    }
};
