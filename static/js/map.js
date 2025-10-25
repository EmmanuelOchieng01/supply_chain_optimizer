let map;
let deliveryPoints = [];
const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

function initMap() {
    map = L.map('map').setView([-1.2921, 36.8219], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    L.marker([-1.2921, 36.8219]).bindPopup('Main Depot').addTo(map);
}

function addDeliveryPoint() {
    const point = {
        id: deliveryPoints.length,
        name: `Location ${deliveryPoints.length + 1}`,
        lat: -1.2921 + (Math.random() - 0.5) * 0.1,
        lng: 36.8219 + (Math.random() - 0.5) * 0.1,
        demand: Math.floor(Math.random() * 150) + 50
    };

    deliveryPoints.push(point);
    renderDeliveryList();
    L.marker([point.lat, point.lng]).bindPopup(point.name).addTo(map);
}

function renderDeliveryList() {
    document.getElementById('delivery-list').innerHTML = deliveryPoints.map(p =>
        `<div class="delivery-item">${p.name} (${p.demand} kg)</div>`
    ).join('');
}

function generateSampleData() {
    deliveryPoints = [
        {id: 0, name: 'Westlands', lat: -1.2636, lng: 36.8078, demand: 120},
        {id: 1, name: 'Eastleigh', lat: -1.2815, lng: 36.8428, demand: 85},
        {id: 2, name: 'Karen', lat: -1.3192, lng: 36.7073, demand: 95},
        {id: 3, name: 'Parklands', lat: -1.2626, lng: 36.8273, demand: 110},
        {id: 4, name: 'South B', lat: -1.3066, lng: 36.8328, demand: 140}
    ];

    renderDeliveryList();
    map.eachLayer(l => { if (l instanceof L.Marker) map.removeLayer(l); });
    L.marker([-1.2921, 36.8219]).bindPopup('Depot').addTo(map);
    deliveryPoints.forEach(p => L.marker([p.lat, p.lng]).bindPopup(p.name).addTo(map));
}

async function optimizeRoutes() {
    if (deliveryPoints.length === 0) {
        alert('Add delivery points first!');
        return;
    }

    document.getElementById('loading').style.display = 'block';

    const depot = {
        lat: parseFloat(document.getElementById('depot-lat').value),
        lng: parseFloat(document.getElementById('depot-lng').value),
        name: document.getElementById('depot-name').value
    };

    const numVehicles = parseInt(document.getElementById('num-vehicles').value);
    const capacity = parseInt(document.getElementById('vehicle-capacity').value);
    const costPerKm = parseFloat(document.getElementById('cost-per-km').value);

    const vehicles = Array(numVehicles).fill(null).map(() => ({
        capacity: capacity,
        cost_per_km: costPerKm
    }));

    try {
        const response = await fetch('/api/optimize', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                depot: depot,
                deliveries: deliveryPoints,
                vehicles: vehicles,
                strategy: document.getElementById('strategy').value
            })
        });

        const result = await response.json();
        displayResults(result);
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function displayResults(result) {
    document.getElementById('results').style.display = 'block';

    document.getElementById('total-cost').textContent = ' + result.costs.total;
    document.getElementById('total-distance').textContent = result.summary.total_distance.toFixed(1) + ' km';
    document.getElementById('total-time').textContent = result.summary.total_time.toFixed(1) + ' hrs';
    document.getElementById('vehicles-used').textContent = result.summary.vehicles_used;

    const costData = [{
        values: [result.costs.fuel, result.costs.labor, result.costs.maintenance, result.costs.carbon],
        labels: ['Fuel', 'Labor', 'Maintenance', 'Carbon'],
        type: 'pie',
        marker: {colors: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b']}
    }];

    Plotly.newPlot('cost-chart', costData, {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {color: '#e2e8f0'},
        margin: {t: 0, b: 0, l: 0, r: 0}
    });

    const efficiencyData = [{
        x: result.routes.map((r, i) => `Route ${i+1}`),
        y: result.routes.map(r => r.load_utilization),
        type: 'bar',
        marker: {color: '#8b5cf6'}
    }];

    Plotly.newPlot('efficiency-chart', efficiencyData, {
        yaxis: {title: 'Utilization (%)', color: '#e2e8f0'},
        xaxis: {color: '#e2e8f0'},
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {color: '#e2e8f0'},
        margin: {t: 10, b: 40, l: 50, r: 10}
    });

    document.getElementById('route-list').innerHTML = result.routes.map((route, i) => `
        <div class="route-card">
            <div><strong>Route ${i + 1}</strong></div>
            <div>Stops: ${route.stops.length - 2} | Distance: ${route.distance.toFixed(1)} km</div>
            <div>Time: ${route.time.toFixed(1)} hrs | Load: ${route.load} kg (${route.load_utilization.toFixed(1)}%)</div>
        </div>
    `).join('');

    drawRoutes(result.routes);
}

function drawRoutes(routes) {
    const depot = {
        lat: parseFloat(document.getElementById('depot-lat').value),
        lng: parseFloat(document.getElementById('depot-lng').value)
    };

    routes.forEach((route, i) => {
        const coords = route.stops.map(stopIdx => {
            if (stopIdx === 0) return [depot.lat, depot.lng];
            return [deliveryPoints[stopIdx - 1].lat, deliveryPoints[stopIdx - 1].lng];
        });

        L.polyline(coords, {
            color: colors[i % colors.length],
            weight: 3,
            opacity: 0.7
        }).addTo(map);
    });
}

window.onload = () => {
    initMap();
    generateSampleData();
};
