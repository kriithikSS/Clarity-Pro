document.addEventListener("DOMContentLoaded", () => {
  function formatMs(ms) {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  chrome.storage.local.get("scrollHistory", (result) => {
    const stats = result.scrollHistory || {};
    const tbody = document.getElementById("statsBody");

    let totalTime = 0;
    let siteTotals = {};

    for (const [date, sites] of Object.entries(stats)) {
      let dayTotal = 0;

      for (const [site, time] of Object.entries(sites)) {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${date}</td><td>${site}</td><td>${formatMs(time)}</td>`;
        tbody.appendChild(row);

        totalTime += time;
        dayTotal += time;
        siteTotals[site] = (siteTotals[site] || 0) + time;
      }

      const summaryRow = document.createElement("tr");
      summaryRow.style.fontWeight = "bold";
      summaryRow.innerHTML = `<td>${date}</td><td>Total</td><td>${formatMs(dayTotal)}</td>`;
      tbody.appendChild(summaryRow);
    }

    // Most Scrolled Site & Average
    const mostScrolled = Object.entries(siteTotals).sort((a, b) => b[1] - a[1])[0];
    const avgTime = totalTime / Object.keys(stats).length;

    document.getElementById("metrics").innerHTML = `
      <p><strong>Most Scrolled Site:</strong> ${mostScrolled ? mostScrolled[0] : "N/A"} (${mostScrolled ? formatMs(mostScrolled[1]) : "0m 0s"})</p>
      <p><strong>Average Scroll Time per Day:</strong> ${formatMs(avgTime || 0)}</p>
    `;
  });

  
});
