"""
Calculate total logistics costs
"""

class CostCalculator:

    def __init__(self):
        self.fuel_cost_per_km = 0.50
        self.driver_wage_per_hour = 15.0
        self.maintenance_per_km = 0.15
        self.vehicle_fixed_cost = 20.0
        self.carbon_cost_per_kg = 0.05
        self.co2_per_km = 2.68

    def calculate_total_cost(self, routes, vehicles):
        total_fuel = 0
        total_labor = 0
        total_maintenance = 0
        total_fixed = 0
        total_carbon = 0

        for route in routes:
            distance = route.get('distance', 0)
            time = route.get('time', 0)

            fuel = distance * self.fuel_cost_per_km
            total_fuel += fuel

            labor = time * self.driver_wage_per_hour
            total_labor += labor

            maintenance = distance * self.maintenance_per_km
            total_maintenance += maintenance

            total_fixed += self.vehicle_fixed_cost

            carbon_kg = distance * self.co2_per_km
            carbon_cost = carbon_kg * self.carbon_cost_per_kg
            total_carbon += carbon_cost

        total = total_fuel + total_labor + total_maintenance + total_fixed + total_carbon

        return {
            'fuel': round(total_fuel, 2),
            'labor': round(total_labor, 2),
            'maintenance': round(total_maintenance, 2),
            'fixed': round(total_fixed, 2),
            'carbon': round(total_carbon, 2),
            'total': round(total, 2),
            'breakdown_pct': {
                'fuel': round(total_fuel/total*100, 1) if total > 0 else 0,
                'labor': round(total_labor/total*100, 1) if total > 0 else 0,
                'maintenance': round(total_maintenance/total*100, 1) if total > 0 else 0,
                'fixed': round(total_fixed/total*100, 1) if total > 0 else 0,
                'carbon': round(total_carbon/total*100, 1) if total > 0 else 0
            }
        }
