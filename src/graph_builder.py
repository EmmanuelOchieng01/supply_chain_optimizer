"""
Graph construction from delivery locations
"""

import networkx as nx
import numpy as np
from math import radians, sin, cos, sqrt, atan2

class GraphBuilder:

    def __init__(self):
        self.earth_radius = 6371

    def haversine_distance(self, loc1, loc2):
        lat1, lng1 = radians(loc1['lat']), radians(loc1['lng'])
        lat2, lng2 = radians(loc2['lat']), radians(loc2['lng'])

        dlat = lat2 - lat1
        dlng = lng2 - lng1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))

        return self.earth_radius * c

    def build_graph(self, depot, deliveries):
        G = nx.Graph()

        G.add_node(0, **depot, node_type='depot')

        for i, delivery in enumerate(deliveries, start=1):
            G.add_node(i, **delivery, node_type='delivery')

        nodes = [depot] + deliveries
        n = len(nodes)

        for i in range(n):
            for j in range(i+1, n):
                distance = self.haversine_distance(nodes[i], nodes[j])
                traffic_factor = 1.0 + np.random.uniform(0, 0.2)
                actual_distance = distance * traffic_factor

                G.add_edge(i, j, 
                          distance=actual_distance,
                          time=actual_distance / 40)

        return G
