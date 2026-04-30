const input = document.getElementById("command");
const output = document.getElementById("output");
let stats = { sent: 0, allowed: 0, blocked: 0 };

function print(text) {
  const line = document.createElement("div");
  line.textContent = text;
  output.appendChild(line);
}

async function handleCommand(cmd) {
  const parts = cmd.split(" ");
  const command = parts[0];
  if (command === "hit") {
    const route = parts[1];
    const count = parseInt(parts[2]);
    if (!route || !count) {
      print("Usage: hit /<route> number [parallel] [delay=ms]");
      return;
    }
    const isParallel = parts.includes("parallel");

    for (let i = 1; i <= count; i++) {
      const res = await fetch(route);
      stats.sent++;
      if (res.status === 200) stats.allowed++;
      else stats.blocked++;
      print(`[${i}] ${res.status}`);
    }
  }
}

input.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    const cmd = input.value.trim();
    input.value = "";
    await handleCommand(cmd);
  }
});
