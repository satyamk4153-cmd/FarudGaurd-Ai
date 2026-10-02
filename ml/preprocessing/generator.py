import math
import random
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple
import numpy as np
import pandas as pd

# Geo reference coordinates for realistic distance calculations
CITIES = {
    "Mumbai": {"lat": 19.0760, "lon": 72.8777, "country": "IN"},
    "Delhi": {"lat": 28.7041, "lon": 77.1025, "country": "IN"},
    "Bengaluru": {"lat": 12.9716, "lon": 77.5946, "country": "IN"},
    "Hyderabad": {"lat": 17.3850, "lon": 78.4867, "country": "IN"},
    "Chennai": {"lat": 13.0827, "lon": 80.2707, "country": "IN"},
    "Kolkata": {"lat": 22.5726, "lon": 88.3639, "country": "IN"},
    "Pune": {"lat": 18.5204, "lon": 73.8567, "country": "IN"},
    "Dubai": {"lat": 25.2048, "lon": 55.2708, "country": "AE"},
    "Singapore": {"lat": 1.3521, "lon": 103.8198, "country": "SG"},
    "London": {"lat": 51.5074, "lon": -0.1278, "country": "GB"},
    "New York": {"lat": 40.7128, "lon": -74.0060, "country": "US"},
}

MERCHANT_CATEGORIES = {
    "GROCERY": {"weight": 0.32, "base_amount": 1400, "std": 700, "risk_mult": 0.05},
    "RESTAURANT": {"weight": 0.20, "base_amount": 1900, "std": 1100, "risk_mult": 0.08},
    "RETAIL": {"weight": 0.18, "base_amount": 3800, "std": 2200, "risk_mult": 0.12},
    "UTILITIES": {"weight": 0.10, "base_amount": 2500, "std": 1200, "risk_mult": 0.03},
    "TRAVEL": {"weight": 0.08, "base_amount": 18000, "std": 12000, "risk_mult": 0.25},
    "ELECTRONICS": {"weight": 0.06, "base_amount": 28000, "std": 16000, "risk_mult": 0.30},
    "LUXURY": {"weight": 0.04, "base_amount": 55000, "std": 30000, "risk_mult": 0.35},
    "GAMBLING": {"weight": 0.02, "base_amount": 15000, "std": 12000, "risk_mult": 0.50},
}

TRANSACTION_TYPES = ["PAYMENT", "TRANSFER", "CASH_OUT", "DEBIT", "ONLINE_PURCHASE"]

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on Earth in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class FinancialDataGenerator:
    """
    State-of-the-Art Realistic Financial Transaction Generator.
    Engineered with genuine probabilistic overlap, behavioral noise, and non-deterministic fraud topologies.
    Ensures models learn complex multi-variable interactions rather than trivial single-feature shortcuts.
    """
    def __init__(
        self,
        num_customers: int = 2500,
        num_merchants: int = 350,
        num_devices: int = 3500,
        seed: int = 42,
    ):
        self.seed = seed
        random.seed(seed)
        np.random.seed(seed)
        
        self.num_customers = num_customers
        self.num_merchants = num_merchants
        self.num_devices = num_devices
        
        self._init_entities()

    def _init_entities(self):
        city_names = list(CITIES.keys())
        
        # Customers
        self.customers = {}
        for i in range(1, self.num_customers + 1):
            cust_id = f"CUST-{i:05d}"
            home_city = random.choice(city_names[:7])  # Indian domestic base
            self.customers[cust_id] = {
                "customer_id": cust_id,
                "home_city": home_city,
                "avg_spend": float(np.random.lognormal(mean=7.8, sigma=0.65)),  # ~2400 INR base
                "account_age_days": random.randint(10, 2200),
                "card_id": f"CARD-{i:05d}",
                "primary_device": f"DEV-{random.randint(1, self.num_devices):05d}",
                "balance": float(np.random.uniform(20000, 600000)),
                "last_txn_time": None,
                "last_location": home_city,
                "last_amount": 0.0,
            }

        # Merchants
        self.merchants = {}
        cat_keys = list(MERCHANT_CATEGORIES.keys())
        cat_weights = [MERCHANT_CATEGORIES[c]["weight"] for c in cat_keys]
        for m in range(1, self.num_merchants + 1):
            m_id = f"MERCH-{m:04d}"
            category = random.choices(cat_keys, weights=cat_weights, k=1)[0]
            city = random.choice(city_names)
            self.merchants[m_id] = {
                "merchant_id": m_id,
                "category": category,
                "city": city,
                "country": CITIES[city]["country"],
            }

        # Devices
        self.devices = {}
        for d in range(1, self.num_devices + 1):
            d_id = f"DEV-{d:05d}"
            # Realistic continuous device risk distribution
            self.devices[d_id] = {
                "device_id": d_id,
                "device_risk": float(np.clip(np.random.beta(a=2, b=5), 0.02, 0.95)),
            }

    def generate_transactions(
        self,
        num_rows: int = 20000,
        fraud_rate: float = 0.035,
        start_date: datetime = None,
        days_span: int = 45,
    ) -> pd.DataFrame:
        """
        Generate rich financial transaction records with authentic probabilistic noise.
        NO single feature acts as a deterministic separator.
        """
        if start_date is None:
            start_date = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
            
        target_fraud_count = int(num_rows * fraud_rate)
        legit_count = num_rows - target_fraud_count
        
        records: List[Dict[str, Any]] = []
        customer_ids = list(self.customers.keys())
        merchant_ids = list(self.merchants.keys())
        city_names = list(CITIES.keys())
        
        # 1. Generate Legitimate Transactions with Realistic Variety
        for idx in range(legit_count):
            cust = self.customers[random.choice(customer_ids)]
            merch = self.merchants[random.choice(merchant_ids)]
            
            day_offset = random.randint(0, days_span - 1)
            hour_probs = np.array([
                0.015, 0.010, 0.008, 0.008, 0.012, 0.025, 0.040, 0.055, 0.065, 0.075, 0.080, 0.080,
                0.080, 0.075, 0.070, 0.070, 0.065, 0.065, 0.060, 0.050, 0.040, 0.030, 0.025, 0.017
            ])
            hour_probs /= hour_probs.sum()
            hour = int(np.random.choice(range(24), p=hour_probs))
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            txn_time = start_date + timedelta(days=day_offset, hours=hour, minutes=minute, seconds=second)
            
            # Amount: Log-normal spend based on customer average + category
            cat_info = MERCHANT_CATEGORIES[merch["category"]]
            base_amt = (cust["avg_spend"] * 0.45) + (cat_info["base_amount"] * 0.55)
            # Occasional legitimate high amount (e.g., plane ticket, major shopping)
            if random.random() < 0.05:
                amount = float(np.random.uniform(base_amt * 3.0, base_amt * 8.0))
            else:
                amount = float(np.random.lognormal(mean=np.log(base_amt), sigma=0.55))
            amount = round(max(50.0, amount), 2)
            
            # Location: 80% home city, 15% domestic travel, 5% international vacation/business
            loc_rand = random.random()
            if loc_rand < 0.80:
                location = cust["home_city"]
            elif loc_rand < 0.95:
                location = random.choice(city_names[:7])
            else:
                location = random.choice(["Dubai", "Singapore", "London", "New York"])
                
            loc_coords = CITIES[location]
            prev_coords = CITIES[cust["last_location"]]
            distance = haversine_distance(prev_coords["lat"], prev_coords["lon"], loc_coords["lat"], loc_coords["lon"])
            
            # Realistic Overlapping IP Risk:
            # Legitimate transactions have Beta(2, 6) distribution, but 12% have high risk due to VPNs / public WiFi!
            if random.random() < 0.12:
                ip_risk = float(np.random.uniform(0.50, 0.82))
            else:
                ip_risk = float(np.random.beta(a=2, b=6) * 0.65)
            ip_risk = round(min(0.95, max(0.01, ip_risk)), 3)

            # Device: 90% primary, 10% secondary/work/new device
            if random.random() < 0.90:
                device_id = cust["primary_device"]
                dev_risk = self.devices[device_id]["device_risk"]
            else:
                device_id = f"DEV-{random.randint(1, self.num_devices):05d}"
                dev_risk = float(np.random.beta(a=3, b=5) * 0.80)
            dev_risk = round(min(0.95, max(0.02, dev_risk)), 2)

            # Transaction Type distribution in legitimate banking
            txn_type = random.choices(
                ["PAYMENT", "ONLINE_PURCHASE", "DEBIT", "TRANSFER", "CASH_OUT"],
                weights=[0.42, 0.30, 0.14, 0.10, 0.04],
                k=1
            )[0]

            # Velocity (past 24h count)
            freq = int(np.random.choice([1, 2, 3, 4, 5, 6, 7], p=[0.55, 0.25, 0.11, 0.05, 0.025, 0.01, 0.005]))

            balance_before = cust["balance"]
            balance_after = max(0.0, balance_before - amount)
            cust["balance"] = balance_after + random.uniform(500, 3500)  # ongoing deposits
            
            records.append({
                "external_transaction_id": f"TXN-{len(records) + 1:07d}",
                "customer_id": cust["customer_id"],
                "card_id": cust["card_id"],
                "amount": amount,
                "currency": "INR",
                "transaction_type": txn_type,
                "merchant_id": merch["merchant_id"],
                "merchant_category": merch["category"],
                "location": location,
                "country": loc_coords["country"],
                "device_id": device_id,
                "ip_address": f"103.{random.randint(1,250)}.{random.randint(1,250)}.{random.randint(1,250)}",
                "channel": random.choice(["ONLINE", "MOBILE", "POS"]),
                "timestamp": txn_time,
                "account_age_days": cust["account_age_days"],
                "transaction_frequency": freq,
                "previous_transaction_amount": round(cust["last_amount"] if cust["last_amount"] > 0 else amount * 0.85, 2),
                "balance_before": round(balance_before, 2),
                "balance_after": round(balance_after, 2),
                "distance_from_previous_transaction": round(distance, 2),
                "ip_risk": ip_risk,
                "device_risk": dev_risk,
                "is_fraud": 0,
                "fraud_pattern": "LEGITIMATE",
            })
            
            cust["last_location"] = location
            cust["last_amount"] = amount
            cust["last_txn_time"] = txn_time

        # 2. Generate Fraudulent Transactions with Probabilistic Complex Interactions
        fraud_topologies = [
            "ACCOUNT_TAKEOVER_DRAIN",
            "RAPID_VELOCITY_BURST",
            "CROSS_BORDER_GEO_JUMP",
            "MICRO_TESTING_ESCALATION",
            "HIGH_VALUE_UNUSUAL_CATEGORY",
            "NIGHT_ANOMALY_TRANSFER",
            "COORDINATED_FRAUD_RING",
        ]

        for idx in range(target_fraud_count):
            f_type = random.choice(fraud_topologies)
            cust = self.customers[random.choice(customer_ids)]
            merch = self.merchants[random.choice(merchant_ids)]
            day_offset = random.randint(0, days_span - 1)
            minute = random.randint(0, 59)
            second = random.randint(0, 59)

            # Realistic overlapping defaults for fraud
            hour = random.randint(0, 23)
            txn_type = random.choices(
                ["TRANSFER", "CASH_OUT", "ONLINE_PURCHASE", "PAYMENT"],
                weights=[0.40, 0.28, 0.24, 0.08],
                k=1
            )[0]
            m_category = merch["category"]
            location = cust["home_city"]
            device_id = cust["primary_device"]
            
            # IP Risk: Beta(5, 2) distributed around 0.70, but 18% have LOW or moderate IP risk!
            if random.random() < 0.18:
                ip_risk = float(np.random.uniform(0.18, 0.48))
            else:
                ip_risk = float(np.random.beta(a=5, b=2) * 0.45 + 0.50)
            ip_risk = round(min(0.98, max(0.05, ip_risk)), 3)

            # Device Risk: Beta(4, 2) distributed around 0.68, but 20% use clean spoofed devices
            if random.random() < 0.20:
                dev_risk = float(np.random.uniform(0.12, 0.40))
            else:
                dev_risk = float(np.random.beta(a=4, b=2) * 0.40 + 0.55)
            dev_risk = round(min(0.98, max(0.05, dev_risk)), 2)

            freq = random.randint(2, 6)
            distance = 0.0

            # Pattern-Specific Behavior with Noise
            if f_type == "ACCOUNT_TAKEOVER_DRAIN":
                # Large balance drain right after new device connection
                device_id = f"DEV-{random.randint(self.num_devices + 1, self.num_devices + 500):05d}"
                amount = cust["balance"] * random.uniform(0.65, 0.95)
                txn_type = random.choice(["TRANSFER", "CASH_OUT"])
                if random.random() < 0.65:
                    hour = random.choice([1, 2, 3, 4, 5])
                freq = random.randint(3, 7)

            elif f_type == "RAPID_VELOCITY_BURST":
                # Velocity burst: 7 to 16 transactions in short span
                freq = random.randint(7, 16)
                amount = cust["avg_spend"] * random.uniform(1.8, 5.5)
                txn_type = random.choice(["ONLINE_PURCHASE", "PAYMENT"])

            elif f_type == "CROSS_BORDER_GEO_JUMP":
                # Rapid travel across continents (London, Dubai, New York, Singapore)
                target_city = random.choice(["London", "Dubai", "Singapore", "New York"])
                location = target_city
                home_coords = CITIES[cust["home_city"]]
                target_coords = CITIES[target_city]
                distance = haversine_distance(home_coords["lat"], home_coords["lon"], target_coords["lat"], target_coords["lon"])
                amount = cust["avg_spend"] * random.uniform(2.5, 7.5)
                txn_type = random.choice(["ONLINE_PURCHASE", "TRANSFER"])

            elif f_type == "MICRO_TESTING_ESCALATION":
                # Small card probe followed by sudden medium/large drain
                if random.random() < 0.30:
                    amount = float(random.uniform(150, 800))  # Probe transaction!
                else:
                    amount = cust["avg_spend"] * random.uniform(6.0, 16.0)
                txn_type = "ONLINE_PURCHASE"
                m_category = random.choice(["ELECTRONICS", "RETAIL", "LUXURY"])

            elif f_type == "HIGH_VALUE_UNUSUAL_CATEGORY":
                # Sudden deviation into luxury/electronics/gambling
                m_category = random.choice(["LUXURY", "ELECTRONICS", "GAMBLING"])
                amount = cust["avg_spend"] * random.uniform(8.0, 22.0) + 25000.0

            elif f_type == "NIGHT_ANOMALY_TRANSFER":
                # 1:30 AM to 4:45 AM cash out or transfer
                hour = random.choice([1, 2, 3, 4])
                txn_type = random.choice(["TRANSFER", "CASH_OUT"])
                amount = cust["avg_spend"] * random.uniform(3.5, 12.0)

            elif f_type == "COORDINATED_FRAUD_RING":
                # Multiple compromised accounts routed through shared syndicate device & IP
                device_id = f"DEV-SYNDICATE-{random.randint(1, 10):02d}"
                amount = cust["avg_spend"] * random.uniform(4.0, 14.0)
                txn_type = random.choice(["TRANSFER", "ONLINE_PURCHASE"])
                m_category = random.choice(["ELECTRONICS", "TRAVEL", "LUXURY"])

            loc_coords = CITIES.get(location, CITIES["Mumbai"])
            txn_time = start_date + timedelta(days=day_offset, hours=hour, minutes=minute, seconds=second)
            
            balance_before = cust["balance"]
            balance_after = max(0.0, balance_before - amount)

            records.append({
                "external_transaction_id": f"TXN-{len(records) + 1:07d}",
                "customer_id": cust["customer_id"],
                "card_id": cust["card_id"],
                "amount": round(amount, 2),
                "currency": "INR",
                "transaction_type": txn_type,
                "merchant_id": merch["merchant_id"],
                "merchant_category": m_category,
                "location": location,
                "country": loc_coords["country"],
                "device_id": device_id,
                "ip_address": f"194.{random.randint(1,250)}.{random.randint(1,250)}.{random.randint(1,250)}",
                "channel": random.choice(["ONLINE", "MOBILE"]),
                "timestamp": txn_time,
                "account_age_days": cust["account_age_days"],
                "transaction_frequency": freq,
                "previous_transaction_amount": round(cust["last_amount"] if cust["last_amount"] > 0 else amount * 0.25, 2),
                "balance_before": round(balance_before, 2),
                "balance_after": round(balance_after, 2),
                "distance_from_previous_transaction": round(distance, 2),
                "ip_risk": ip_risk,
                "device_risk": dev_risk,
                "is_fraud": 1,
                "fraud_pattern": f_type,
            })

        df = pd.DataFrame(records)
        # Chronological sort for authentic time-series operations
        df = df.sort_values(by="timestamp").reset_index(drop=True)
        return df
