const supabaseUrl = "https://urcdmefagpuyluzzdqgl.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyY2RtZWZhZ3B1eWx1enpkcWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjI4NDYsImV4cCI6MjA3NDczODg0Nn0.WqXzT1HLImeRRJbd9VZZZHcpilKFZdRPzPvjmsMJOpY";
const client = supabase.createClient(supabaseUrl, supabaseKey);

/*** @param {string} deviceId  */
async function fetchDbQueueEntry(deviceId) {
  const today = new Date().toISOString().split("T")[0];

  const { error, data } = await client
    .from("queue")
    .select("number, date, created_at")
    .eq("device_id", deviceId)
    .eq("date", today)
    .limit(1);

  return {
    error,
    data:
      data && data.length > 0
        ? {
            number: data[0].number,
            date: new Date(data[0].date),
            createdAt: new Date(data[0].created_at),
          }
        : undefined,
  };
}

const urlParams = new URLSearchParams(window.location.search);
const dateParam = urlParams.get("date");
const dateRegex = new RegExp("^\\d{4}-\\d{2}-\\d{2}$");
if (!dateParam || !dateRegex.test(dateParam)) {
  window.onload = () => {
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
  };
} else {
  const date = new Date(dateParam);

  window.onload = async () => {
    const drawButton = document.getElementById("draw-button");
    const numberDisplay = document.getElementById("number-display");
    const dateDisplay = document.getElementById("date-display");
    const drawTimeDisplay = document.getElementById("draw-time-display");
    const errorDisplay = document.getElementById("error-display");

    dateDisplay.textContent = "Date: " + date.toLocaleDateString();

    function getToday() {
      return new Date().toISOString().split("T")[0];
    }

    function getDeviceId() {
      let id = localStorage.getItem("deviceId");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("deviceId", id);
      }
      return id;
    }

    const today = getToday();
    const deviceId = getDeviceId();

    async function updateUI() {
      const { data } = await fetchDbQueueEntry(deviceId);

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

      const { data: existing, error: checkError } = await client
        .from("queue")
        .select("*")
        .eq("date", today)
        .eq("device_id", deviceId)
        .limit(1);

      if (checkError) {
        alert("Error bei der Prüfung: " + checkError.message);
        return;
      }

      if (existing.length > 0) {
        alert("You've already received a number today.");
        return;
      }

      let success = false;
      let attempts = 0;

      while (!success && attempts < 5) {
        attempts++;

        const { data: latest, error: readError } = await client
          .from("queue")
          .select("number")
          .eq("date", today)
          .order("number", { ascending: false })
          .limit(1);

        if (readError) {
          alert("Fehler beim Lesen der letzten Nummer: " + readError.message);
          return;
        }

        const lastNumber = latest && latest.length > 0 ? latest[0].number : 0;
        const newNumber = lastNumber + 1;
        const timestamp = new Date();
        const isoString = timestamp.toISOString();

        const { error: insertError } = await client.from("queue").insert([
          {
            number: newNumber,
            date: today,
            created_at: isoString,
            device_id: deviceId,
          },
        ]);

        if (!insertError) {
          updateUI();
          success = true;
        } else if (insertError.code === "23505") {
          await new Promise((r) => setTimeout(r, 100));
        } else {
          alert("Fehler beim Einfügen: " + insertError.message);
          return;
        }
      }

      if (!success) {
        alert(
          "Fehler: Konnte keine eindeutige Nummer ziehen. Bitte erneut versuchen.",
        );
      }
    }

    drawButton.addEventListener("click", drawNumber);
  };
}
