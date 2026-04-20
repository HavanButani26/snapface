import os

GB = 1024 * 1024 * 1024

PLANS = {
    "free": {
        "name": "Free",
        "storage_bytes": 2 * GB,
        "storage_label": "2 GB",
        "price_monthly": 0,
        "price_quarterly": 0,
        "price_yearly": 0,
        "features": [
            "2 GB storage",
            "Unlimited events",
            "AI face recognition",
            "QR code sharing",
            "Basic support",
        ],
        "razorpay_plans": {},
    },
    "starter": {
        "name": "Starter",
        "storage_bytes": 30 * GB,
        "storage_label": "30 GB",
        "price_monthly": 499,
        "price_quarterly": 1347,
        "price_yearly": 4788,
        "features": [
            "30 GB storage",
            "Unlimited events",
            "AI face recognition",
            "Emotion filter gallery",
            "Time capsule feature",
            "Story reel generation",
            "Priority support",
        ],
        "razorpay_plans": {
            "monthly": os.getenv("RAZORPAY_PLAN_STARTER_MONTHLY"),
            "quarterly": os.getenv("RAZORPAY_PLAN_STARTER_QUARTERLY"),
            "yearly": os.getenv("RAZORPAY_PLAN_STARTER_YEARLY"),
        },
    },
    "pro": {
        "name": "Pro",
        "storage_bytes": 150 * GB,
        "storage_label": "150 GB",
        "price_monthly": 1299,
        "price_quarterly": 3507,
        "price_yearly": 13188,
        "features": [
            "150 GB storage",
            "Unlimited events",
            "AI face recognition",
            "All unique features",
            "Invoice & billing system",
            "Custom watermark & branding",
            "Priority support",
        ],
        "razorpay_plans": {
            "monthly": os.getenv("RAZORPAY_PLAN_PRO_MONTHLY"),
            "quarterly": os.getenv("RAZORPAY_PLAN_PRO_QUARTERLY"),
            "yearly": os.getenv("RAZORPAY_PLAN_PRO_YEARLY"),
        },
    },
    "studio": {
        "name": "Studio",
        "storage_bytes": -1,  # -1 = unlimited
        "storage_label": "Unlimited",
        "price_monthly": 2999,
        "price_quarterly": 8097,
        "price_yearly": 29988,
        "features": [
            "Unlimited storage",
            "Unlimited events",
            "All AI features",
            "Full billing system",
            "White-label branding",
            "Dedicated support",
            "Early access to new features",
        ],
        "razorpay_plans": {
            "monthly": os.getenv("RAZORPAY_PLAN_STUDIO_MONTHLY"),
            "quarterly": os.getenv("RAZORPAY_PLAN_STUDIO_QUARTERLY"),
            "yearly": os.getenv("RAZORPAY_PLAN_STUDIO_YEARLY"),
        },
    },
}

CYCLE_MONTHS = {
    "monthly": 1,
    "quarterly": 3,
    "yearly": 12,
}

CYCLE_LABELS = {
    "monthly": "per month",
    "quarterly": "per quarter",
    "yearly": "per year",
}