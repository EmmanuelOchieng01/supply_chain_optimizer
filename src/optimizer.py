"""
Route optimization engine
"""

import numpy as np

class RouteOptimizer:

    def __init__(self, graph, vehicles, depot, deliveries):
        self.graph = graph
        self.vehicles = vehicles
        self.depot = depot
        self.deliveries = deliveries
        self.n_locations = len(deliveries) + 1

    def optimize(self, strategy='cost_optimized'):
        if strategy == 'cost_optimized':
            return self._cost_optimized_routing()
        elif strategy == 'time_optimized':
            return self._time_optimized_routing()
        elif strategy == 'balanced':
            return self._balanced_routing()
        elif strategy == 'green':
            return self._green_routing()
        else:
            return self._cost_optimized_routing()

    def _cost_optimized_routing(self):
        savings = []

        for i in range(1, self.n_locations):
            for j in range(i+1, self.n_locations):
                if self.graph.has_edge(0, i) and self.graph.has_edge(0, j) and self.graph.has_edge(i, j):
                    saving = (self.graph[0][i]['distance'] + 
                             self.graph[0][j]['distance'] - 
                             self.graph[i][j]['distance'])
                    savings.append((saving, i, j))

        savings.sort(reverse=True, key=lambda x: x[0])

        routes = []
        unassigned = set(range(1, self.n_locations))

        for vehicle in self.vehicles:
            if not unassigned:
                break

            route = self._build_route_greedy(vehicle, unassigned, savings)
            if route['stops']:
                routes.append(route)

        return routes

    def _build_route_greedy(self, vehicle, unassigned, savings):
        route = {
            'vehicle_id': len(unassigned),
            'stops': [0],
            'distance': 0,
            'time': 0,
            'load': 0,
            'load_utilization': 0
        }

        current = 0
        capacity = vehicle['capacity']

        while unassigned:
            best_loc = None
            best_dist = float('inf')

            for loc in unassigned:
                demand = self.deliveries[loc-1].get('demand', 50)

                if route['load'] + demand <= capacity:
                    if self.graph.has_edge(current, loc):
                        dist = self.graph[current][loc]['distance']
                        if dist < best_dist:
                            best_dist = dist
                            best_loc = loc

            if best_loc is None:
                break

            route['stops'].append(best_loc)
            route['distance'] += best_dist
            route['time'] += self.graph[current][best_loc]['time']
            route['load'] += self.deliveries[best_loc-1].get('demand', 50)

            unassigned.remove(best_loc)
            current = best_loc

        if current != 0 and self.graph.has_edge(current, 0):
            route['stops'].append(0)
            route['distance'] += self.graph[current][0]['distance']
            route['time'] += self.graph[current][0]['time']

        route['load_utilization'] = (route['load'] / capacity) * 100

        return route

    def _time_optimized_routing(self):
        return self._cost_optimized_routing()

    def _balanced_routing(self):
        return self._cost_optimized_routing()

    def _green_routing(self):
        routes = self._cost_optimized_routing()
        for route in routes:
            route['carbon_kg'] = route['distance'] * 2.68
        return routes
