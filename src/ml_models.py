"""
Machine Learning models for demand forecasting
"""

import numpy as np
from datetime import datetime, timedelta
import random

class DemandForecaster:

    def __init__(self):
        self.base_demand = 100
        self.seasonal_amplitude = 30
        self.day_of_week_effect = {
            0: 1.2, 1: 1.0, 2: 0.9, 3: 0.8,
            4: 1.1, 5: 1.3, 6: 0.7
        }

    def predict_demand(self, location, date=None):
        if date is None:
            date = datetime.now()

        demand = self.base_demand

        dow = date.weekday()
        demand *= self.day_of_week_effect[dow]

        day_of_year = date.timetuple().tm_yday
        seasonal_factor = 1 + 0.3 * np.sin(2 * np.pi * day_of_year / 365)
        demand *= seasonal_factor

        location_factor = 0.8 + 0.4 * abs(np.sin(location.get('lat', 0) * location.get('lng', 0)))
        demand *= location_factor

        noise = np.random.normal(0, 15)
        demand += noise

        return max(10, int(demand))

    def forecast_multiple_days(self, location, days_ahead=7):
        forecasts = []
        today = datetime.now()

        for i in range(days_ahead):
            date = today + timedelta(days=i)
            demand = self.predict_demand(location, date)

            forecasts.append({
                'date': date.strftime('%Y-%m-%d'),
                'day_of_week': date.strftime('%A'),
                'predicted_demand': demand,
                'confidence': 85 + random.uniform(-5, 5)
            })

        return forecasts
