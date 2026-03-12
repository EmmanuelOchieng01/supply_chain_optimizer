let map;
let deliveryPoints = [];
let routeLayers = [];
const colors = ['#C9A84C','#00BFA5','#E05252','#3b82f6','#8b5cf6'];

function initMap() {
    map = L.map('map').setView([-1.2921, 36.8219], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '© OpenStreetMap'}).addTo(map);
    addDepotMarker();
}

function addDepotMarker() {
    const lat  = parseFloat(document.getElementById('depot-lat').value);
    const lng  = parseFloat(document.getElementById('depot-lng').value);
    const name = document.getElementById('depot-name').value;
    const icon = L.divIcon({
        html: `<div style="background:#C9A84C;color:#0A0F17;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.75rem;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);">D</div>`,
        className: '', iconAnchor: [18,18]
    });
    L.marker([lat, lng], {icon}).bindPopup(`<b>${name}</b><br>Depot`).addTo(map);
}

function addDeliveryPoint() {
    const point = {
        id: deliveryPoints.length,
        name: `Location ${deliveryPoints.length + 1}`,
        lat: -1.2921 + (Math.random() - 0.5) * 0.12,
        lng: 36.8219 + (Math.random() - 0.5) * 0.12,
        demand: Math.floor(Math.random() * 150) + 50
    };
    deliveryPoints.push(point);
    renderDeliveryList();
    addPointMarker(point);
}

function addPointMarker(point) {
    const idx   = deliveryPoints.indexOf(point);
    const color = colors[idx % colors.length];
    const icon  = L.divIcon({
        html: `<div style="background:${color};color:#0A0F17;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.7rem;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${idx+1}</div>`,
        className: '', iconAnchor: [15,15]
    });
    L.marker([point.lat, point.lng], {icon})
     .bindPopup(`<b>${point.name}</b><br>Demand: ${point.demand} kg`)
     .addTo(map);
}

function renderDeliveryList() {
    document.getElementById('delivery-list').innerHTML = deliveryPoints.map((p, i) => `
        <div class="delivery-item">
            <span class="dl-num">${i+1}</span>
            <span class="dl-name">${p.name}</span>
            <span class="dl-demand">${p.demand} kg</span>
            <span class="dl-coords">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</span>
        </div>
    `).join('');
}

function generateSampleData() {
    deliveryPoints = [
        {id:0, name:'Westlands',  lat:-1.2636, lng:36.8078, demand:120},
        {id:1, name:'Eastleigh',  lat:-1.2815, lng:36.8428, demand:85},
        {id:2, name:'Karen',      lat:-1.3192, lng:36.7073, demand:95},
        {id:3, name:'Parklands',  lat:-1.2626, lng:36.8273, demand:110},
        {id:4, name:'South B',    lat:-1.3066, lng:36.8328, demand:140},
        {id:5, name:'Kilimani',   lat:-1.2892, lng:36.7836, demand:75},
        {id:6, name:'Kasarani',   lat:-1.2200, lng:36.8900, demand:160},
    ];
    renderDeliveryList();
    map.eachLayer(l => { if (l instanceof L.Marker || l instanceof L.Polyline) map.removeLayer(l); });
    addDepotMarker();
    deliveryPoints.forEach(p => addPointMarker(p));
    map.setView([-1.2700, 36.8100], 11);
}

async function optimizeRoutes() {
    if (deliveryPoints.length === 0) {
        showToast('Add delivery points first or click Load Sample Data.', 'warn');
        return;
    }
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('results').style.display = 'none';

    const depot       = {
        lat:  parseFloat(document.getElementById('depot-lat').value),
        lng:  parseFloat(document.getElementById('depot-lng').value),
        name: document.getElementById('depot-name').value
    };
    const numVehicles = parseInt(document.getElementById('num-vehicles').value);
    const capacity    = parseInt(document.getElementById('vehicle-capacity').value);
    const costPerKm   = parseFloat(document.getElementById('cost-per-km').value);
    const vehicles    = Array(numVehicles).fill(null).map(() => ({capacity, cost_per_km: costPerKm}));

    try {
        const response = await fetch('/api/optimize', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({depot, deliveries: deliveryPoints, vehicles,
                                  strategy: document.getElementById('strategy').value})
        });
        const result = await response.json();
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
        displayResults(result);
        drawRoutes(result.routes, depot);
        showToast('Optimisation complete.', 'success');
    } catch (error) {
        showToast('Request failed: ' + error.message, 'error');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function formatKes(amount) {
    if (amount >= 1000000) return 'KES ' + (amount/1000000).toFixed(2) + 'M';
    if (amount >= 1000)    return 'KES ' + (amount/1000).toFixed(1) + 'K';
    return 'KES ' + amount.toFixed(2);
}

function displayResults(result) {
    document.getElementById('results').style.display = 'block';

    // Convert USD costs to KES (1 USD = 130 KES approx)
    const rate = 130;
    const costs = {
        total:       result.costs.total       * rate,
        fuel:        result.costs.fuel        * rate,
        labor:       result.costs.labor       * rate,
        maintenance: result.costs.maintenance * rate,
        carbon:      result.costs.carbon      * rate,
    };

    document.getElementById('total-cost').textContent     = formatKes(costs.total);
    document.getElementById('total-distance').textContent = result.summary.total_distance.toFixed(1) + ' km';
    document.getElementById('total-time').textContent     = result.summary.total_time.toFixed(1) + ' hrs';
    document.getElementById('vehicles-used').textContent  = result.summary.vehicles_used;

    // Cost breakdown pie
    Plotly.newPlot('cost-chart', [{
        values: [costs.fuel, costs.labor, costs.maintenance, costs.carbon],
        labels: ['Fuel','Labor','Maintenance','Carbon'],
        type:   'pie', hole: 0.45,
        marker: {colors: ['#C9A84C','#00BFA5','#3b82f6','#E05252']},
        textfont: {color: '#C8D8E8', size: 11}
    }], {
        paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)',
        font: {color:'#C8D8E8', family:'DM Mono, monospace', size:11},
        margin:{t:10,b:10,l:10,r:10}, showlegend:true,
        legend:{orientation:'h', y:-0.15, font:{size:10}}
    }, {responsive:true, displayModeBar:false});

    // Vehicle utilisation bar
    Plotly.newPlot('efficiency-chart', [{
        x:    result.routes.map((_,i) => `Route ${i+1}`),
        y:    result.routes.map(r => r.load_utilization),
        type: 'bar',
        marker: {
            color: result.routes.map(r =>
                r.load_utilization > 80 ? '#E05252' :
                r.load_utilization > 50 ? '#C9A84C' : '#00BFA5'),
            line: {width:0}
        },
        text:         result.routes.map(r => r.load_utilization.toFixed(1)+'%'),
        textposition: 'outside',
        textfont:     {color:'#C8D8E8', size:11}
    }], {
        yaxis: {title:'Utilisation (%)', color:'#5A7090', range:[0,115], gridcolor:'#141E30'},
        xaxis: {color:'#5A7090'},
        paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)',
        font:  {color:'#C8D8E8', family:'DM Mono, monospace', size:11},
        margin:{t:20,b:40,l:55,r:20}
    }, {responsive:true, displayModeBar:false});

    // Route cards
    document.getElementById('route-list').innerHTML = result.routes.map((route, i) => {
        const stopNames = route.stops.map(idx =>
            idx === 0 ? 'Depot' : (deliveryPoints[idx-1]?.name || `Stop ${idx}`)
        );
        const routeCost = formatKes((route.distance * 0.65 + route.time * 15) * rate);
        return `
        <div class="route-card" style="border-left:3px solid ${colors[i%colors.length]}">
            <div class="route-header">
                <span class="route-label">Route ${i+1}</span>
                <span class="route-badge">${route.stops.length - 2} delivery stops</span>
                <span class="route-badge" style="color:#C9A84C;">${routeCost}</span>
            </div>
            <div class="route-path">${stopNames.join(' → ')}</div>
            <div class="route-stats">
                <span>${route.distance.toFixed(1)} km</span>
                <span>${route.time.toFixed(1)} hrs</span>
                <span>${route.load} kg loaded</span>
                <span>${route.load_utilization.toFixed(1)}% capacity used</span>
            </div>
        </div>`;
    }).join('');

    document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
}

function drawRoutes(routes, depot) {
    routeLayers.forEach(l => map.removeLayer(l));
    routeLayers = [];
    routes.forEach((route, i) => {
        const coords = route.stops.map(idx => {
            if (idx === 0) return [depot.lat, depot.lng];
            const p = deliveryPoints[idx-1];
            return p ? [p.lat, p.lng] : [depot.lat, depot.lng];
        });
        const line = L.polyline(coords, {
            color: colors[i % colors.length], weight: 4, opacity: 0.85
        }).addTo(map);
        routeLayers.push(line);
    });
    if (routeLayers.length) {
        const allBounds = routeLayers.map(l => l.getBounds());
        let combined = allBounds[0];
        allBounds.forEach(b => { combined = combined.extend(b); });
        map.fitBounds(combined, {padding:[30,30]});
    }
}

function showToast(msg, type='info') {
    const c = {success:'#00BFA5', warn:'#C9A84C', error:'#E05252', info:'#3b82f6'};
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:2rem;right:2rem;background:#0D1220;border:1px solid ${c[type]};
        color:#E2E8F0;padding:0.9rem 1.4rem;border-radius:8px;font-family:DM Mono,monospace;font-size:0.78rem;
        z-index:9999;box-shadow:0 8px 30px rgba(0,0,0,0.5);max-width:320px;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

window.onload = () => { initMap(); generateSampleData(); };
