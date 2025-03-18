let agvData = [
    { id: 1, status: "Active", battery: "80%", location: "Warehouse A", details: "Carrying goods to section B", x: 100, y: 100, floor: 1, trajectory: [[100, 100], [150, 150]] },
    { id: 2, status: "Charging", battery: "50%", location: "Charging Station", details: "Charging since 10:00 AM", x: 200, y: 200, floor: 1, trajectory: [[200, 200], [250, 250]] },
    { id: 3, status: "Inactive", battery: "100%", location: "Docking Bay", details: "Idle", x: 300, y: 300, floor: 2, trajectory: [[300, 300], [350, 350]] },
    // Add more AGV data as needed
];

let selectedAGV = null;

document.addEventListener("DOMContentLoaded", () => {
    const agvTableBody = document.querySelector("#agv-table tbody");
    const agvInfo = document.querySelector("#agv-info");

    agvData.forEach(agv => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${agv.id}</td>
            <td>${agv.status}</td>
            <td>${agv.battery}</td>
            <td>${agv.location}</td>
            <td>${agv.floor}</td>
            <td><button onclick="showDetails(${agv.id})">View Details</button></td>
        `;
        agvTableBody.appendChild(row);
    });

    initCanvas();
});

function showDetails(id) {
    selectedAGV = agvData.find(agv => agv.id === id);
    const agvInfo = document.querySelector("#agv-info");
    agvInfo.innerHTML = `
        <h3>AGV ${selectedAGV.id} Details</h3>
        <p>Status: ${selectedAGV.status}</p>
        <p>Battery Level: ${selectedAGV.battery}</p>
        <p>Location: ${selectedAGV.location}</p>
        <p>Floor: ${selectedAGV.floor}</p>
        <p>Details: ${selectedAGV.details}</p>
    `;
    updateCanvas();
}

function initCanvas() {
    const canvas = document.getElementById("mapCanvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    window.ctx = canvas.getContext("2d");

    drawMap();
}

function drawMap() {
    const ctx = window.ctx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw floors
    drawFloor(ctx, 1, 50, 50, 400, 200);
    drawFloor(ctx, 2, 50, 300, 400, 200);

    // Draw elevator
    drawElevator(ctx, 250, 150, 50, 200);

    // Draw workstations
    drawWorkstations(ctx, 1, 50, 50, 400, 200, 8);
    drawWorkstations(ctx, 2, 50, 300, 400, 200, 8);

    // Draw AGVs
    agvData.forEach(agv => {
        if (agv.floor === selectedAGV?.floor) {
            // Draw trajectory
            ctx.beginPath();
            ctx.moveTo(agv.trajectory[0][0], agv.trajectory[0][1]);
            agv.trajectory.forEach(point => {
                ctx.lineTo(point[0], point[1]);
            });
            ctx.strokeStyle = 'blue';
            ctx.stroke();

            // Draw AGV
            ctx.beginPath();
            ctx.arc(agv.x, agv.y, 10, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
            ctx.strokeText(`AGV ${agv.id}`, agv.x + 12, agv.y + 4);
        }
    });
}

function drawFloor(ctx, floor, x, y, width, height) {
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.stroke();
    ctx.fillText(`Floor ${floor}`, x + 10, y + 20);
}

function drawElevator(ctx, x, y, width, height) {
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.stroke();
    ctx.fillText('Elevator', x + 10, y + 20);
}

function drawWorkstations(ctx, floor, x, y, width, height, numWorkstations) {
    const spacing = width / numWorkstations;
    for (let i = 0; i < numWorkstations; i++) {
        ctx.beginPath();
        ctx.rect(x + i * spacing, y + height + 10, spacing - 10, 20);
        ctx.stroke();
        ctx.fillText(`WS ${floor}-${i + 1}`, x + i * spacing + 5, y + height + 25);
    }
}

function updateCanvas() {
    drawMap();
}

function moveAGVUp() {
    if (selectedAGV) {
        selectedAGV.floor += 1;
        showDetails(selectedAGV.id);
    }
}

function moveAGVDown() {
    if (selectedAGV && selectedAGV.floor > 1) {
        selectedAGV.floor -= 1;
        showDetails(selectedAGV.id);
    }
}

function moveAGV() {
    if (selectedAGV) {
        const newX = parseFloat(prompt("Enter new X position:"));
        const newY = parseFloat(prompt("Enter new Y position:"));
        if (!isNaN(newX) && !isNaN(newY)) {
            selectedAGV.x = newX;
            selectedAGV.y = newY;
            selectedAGV.trajectory.push([newX, newY]);
            showDetails(selectedAGV.id);
        }
    }
}

// Simulate real-time updates
setInterval(() => {
    // Fetch updated AGV data (replace with actual data fetching logic)
    agvData = agvData.map(agv => ({
        ...agv,
        battery: `${Math.max(0, parseInt(agv.battery) - 1)}%`
    }));
    const agvTableBody = document.querySelector("#agv-table tbody");
    agvTableBody.innerHTML = "";
    agvData.forEach(agv => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${agv.id}</td>
            <td>${agv.status}</td>
            <td>${agv.battery}</td>
            <td>${agv.location}</td>
            <td>${agv.floor}</td>
            <td><button onclick="showDetails(${agv.id})">View Details</button></td>
        `;
        agvTableBody.appendChild(row);
    });
    updateCanvas();
}, 5000); // Update every 5 seconds