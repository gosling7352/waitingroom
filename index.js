// TODO: create a type and a shared file
/**
 * @typedef {Object} Exchange
 * @property {string} id A UUID represented as a 36 character string.
 * @property {Date} date
 */
/**
 * @typedef {Object} QueueEntry
 * @property {number} number
 * @property {string} exchange A UUID represented as a 36 character string.
 * @property {string} deviceId A UUID represented as a 36 character string.
 * @property {Date} createdAt
 */

const supabaseUrl = "https://urcdmefagpuyluzzdqgl.supabase.co";
const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyY2RtZWZhZ3B1eWx1enpkcWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjI4NDYsImV4cCI6MjA3NDczODg0Nn0.WqXzT1HLImeRRJbd9VZZZHcpilKFZdRPzPvjmsMJOpY";
const client = supabase.createClient(supabaseUrl, supabaseKey);

/** @returns {string} */
function getDeviceId() {
    let id = localStorage.getItem("deviceId");
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("deviceId", id);
    }
    return id;
}

/** @returns {string | undefined} */
function getExchangeId() {
    const searchParams = new URLSearchParams(window.location.search);
    const exchangeParam = searchParams.get("e");

    return exchangeParam?.length === 36 ? exchangeParam : undefined;
}

/**
 * @param {string} exchangeId
 * @returns {Promise<{ exchange?: Exchange, error?: string }>}
 */
async function getExchange(exchangeId) {
    let { data, error } = await client.rpc("get-exchange", {
        exchange_id: exchangeId,
    });

    if (error) {
        console.error("Failed to fetch the exchange", error);
        return { error };
    }

    if (data.length === 0) {
        console.warn("The requested exchange doesn't exist");
        return {};
    }

    return {
        exchange: {
            id: data[0].id,
            date: new Date(data[0].date),
        },
    };
}

/**
 * @param {string} exchangeId
 * @param {string} deviceId
 * @returns {Promise<{ queueEntry?: QueueEntry, error?: string }>}
 */
async function getQueueEntry(exchangeId, deviceId) {
    let { data: queueEntries, error } = await client.rpc("get-queue-entry", {
        exchange_id: exchangeId,
        device_id: deviceId,
    });

    if (error) {
        console.error("Failed to fetch the queue entry", error);
        return { error };
    }

    if (queueEntries.length === 0) {
        console.warn("The requested queue entry doesn't exist");
        return {};
    }

    return {
        queueEntry: {
            number: queueEntries[0].number,
            exchange: queueEntries[0].exchange,
            deviceId: queueEntries[0].device_id,
            createdAt: new Date(queueEntries[0].created_at),
        },
    };
}

/**
 * @param {string} exchangeId
 * @param {string} deviceId
 * @returns {Promise<{ queueEntry?: QueueEntry, error?: string }>}
 */
async function drawQueueNumber(exchangeId, deviceId) {
    let { data: queueEntry, error } = await client.rpc("draw-queue-number", {
        exchange_id: exchangeId,
        device_id: deviceId,
    });

    if (error) {
        console.error("Failed to draw a queue number", error);
        return { error };
    }

    return {
        queueEntry: {
            number: queueEntry.number,
            exchange: queueEntry.exchange,
            deviceId: queueEntry.device_id,
            createdAt: new Date(queueEntry.created_at),
        },
    };
}

class State {
    constructor() {
        /** @type {string} */
        this.deviceId = getDeviceId();
        /** @type {string | undefined} */
        this.exchangeId = getExchangeId();
        /** @type {Promise<Exchange | undefined>} */
        this.exchangePromise = getExchange(this.exchangeId);
        // TODO: handle empty exchangeId
        /** @type {Promise<Exchange | undefined>} */
        this.queueEntryPromise = getQueueEntry(this.exchangeId, this.deviceId);
    }

    async init() {
        /** @type {HTMLDivElement} */
        this.ticketContent = document.querySelector(".ticket-content");
        /** @type {HTMLButtonElement} */
        this.drawButton = document.querySelector(".draw-button");
        /** @type {HTMLParagraphElement} */
        this.numberDisplay = document.querySelector(".number-display");
        /** @type {HTMLParagraphElement} */
        this.dateDisplay = document.querySelector(".date-display");
        /** @type {HTMLParagraphElement} */
        this.drawTimeLabel = document.querySelector(".draw-time-label");
        /** @type {HTMLParagraphElement} */
        this.drawTimeDisplay = document.querySelector(".draw-time-display");
        /** @type {HTMLParagraphElement} */
        this.errorDisplay = document.querySelector(".error-display");

        // TODO: show errors
        const [
            { exchange, error: exchangeError },
            { queueEntry, error: queueEntryError },
        ] = await Promise.all([this.exchangePromise, this.queueEntryPromise]);

        /** @type {Exchange | undefined} */
        this.exchange = exchange;
        /** @type {QueueEntry | undefined} */
        this.queueEntry = queueEntry;
    }

    render() {
        if (!this.exchange) {
            this.ticketContent.classList.add("hide");
            this.errorDisplay.classList.remove("hide");
        } else {
            this.errorDisplay.classList.add("hide");

            this.dateDisplay.textContent =
                this.exchange.date.toLocaleDateString();
            this.dateDisplay.classList.remove("hide");

            if (this.queueEntry) {
                this.drawButton.onclick = null;
                this.drawButton.classList.add("hide");

                this.numberDisplay.textContent = this.queueEntry.number;
                this.numberDisplay.classList.remove("hide");

                this.drawTimeDisplay.innerHTML = `${this.queueEntry.createdAt.toLocaleDateString()}<br/>${this.queueEntry.createdAt.toLocaleTimeString()}`;
                this.drawTimeLabel.classList.remove("hide");
                this.drawTimeDisplay.classList.remove("hide");
            } else {
                this.numberDisplay.classList.add("hide");
                this.drawTimeLabel.classList.add("hide");
                this.drawTimeDisplay.classList.add("hide");

                this.drawButton.onclick = () => this.drawNumber();
                this.drawButton.classList.remove("hide");
            }

            this.ticketContent.classList.remove("hide");
        }
    }

    async drawNumber() {
        // TODO: show error
        const { queueEntry, error } = await drawQueueNumber(
            this.exchange.id,
            this.deviceId,
        );

        if (queueEntry) {
            this.queueEntry = queueEntry;
            this.render();
            return;
        }

        // alert(
        //     "Fehler: Konnte keine eindeutige Nummer ziehen. Bitte erneut versuchen.",
        // );
    }
}

const state = new State();

window.onload = async () => {
    await state.init();
    state.render();
};
