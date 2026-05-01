const input = document.getElementById("command");
const output = document.getElementById("output");
let stats = { sent: 0, allowed: 0, blocked: 0 };

function print(text) {
  const line = document.createElement("div");
  line.style.color = color;
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}
function updateStats(remaining) {
  document.getElementById("sent").innerText = stats.sent;
  document.getElementById("allowed").innerText = stats.allowed;
  document.getElementById("blocked").innerText = stats.blocked;
  document.getElementById("remaining").innerText = remaining ?? "-";
}
window.onload = () => {
  print("Distributed Rate Limiter Simulator", "#00ff00");
  print("Simulates API rate limiting using Redis + Lua\n", "#00ff00");
  print("Type 'help' to explore commands", "#00ff00");
  print("Try: hit /test 5", "#00ff00");
  print("Type 'help debug' to learn about inspecting backend state", "#00ff00");
  print("Then: debug test (see Redis data)\n", "#00ff00");
};
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
    const delayArg = parts.find((p) => p.startsWith("delay="));
    const delay = delayArg ? parseInt(delayArg.split("=")[1]) : 0;
    stats = { sent: 0, allowed: 0, blocked: 0 };
    updateStats();
    document.getElementById("progress-bar").style.width = "0%";
    await sendRequests(route, count, {
      parallel: isParallel,
      delay,
    });
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
