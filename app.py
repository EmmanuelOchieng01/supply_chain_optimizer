"""
Flask application for Supply Chain Optimizer
"""

from flask import Flask, render_template, request, jsonify
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'src'))

from optimizer import RouteOptimizer
from ml_models import DemandForecaster
from graph_builder import GraphBuilder
from cost_calculator import CostCalculator

app = Flask(__name__)

graph_builder = GraphBuilder()
demand_forecaster = DemandForecaster()
cost_calculator = CostCalculator()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/optimize', methods=['POST'])
def optimize_routes():
    try:
        data = request.json

        depot = data.get('depot')
        deliveries = data.get('deliveries', [])
        vehicles = data.get('vehicles', [])
        strategy = data.get('strategy', 'cost_optimized')

        graph = graph_builder.build_graph(depot, deliveries)

        for delivery in deliveries:
            if 'demand' not in delivery or delivery['demand'] == 0:
                delivery['demand'] = demand_forecaster.predict_demand(delivery)

        optimizer = RouteOptimizer(graph, vehicles, depot, deliveries)
        routes = optimizer.optimize(strategy=strategy)

        costs = cost_calculator.calculate_total_cost(routes, vehicles)

        result = {
            'routes': routes,
            'costs': costs,
            'summary': {
                'total_distance': sum(r['distance'] for r in routes),
                'total_time': sum(r['time'] for r in routes),
                'total_cost': costs['total'],
                'vehicles_used': len(routes),
                'deliveries_completed': sum(len(r['stops']) - 2 for r in routes),
                'avg_vehicle_utilization': sum(r['load_utilization'] for r in routes) / len(routes) if routes else 0
            }
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    print("🚚 Starting Supply Chain Optimizer...")
    print("✓ Server ready at http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
