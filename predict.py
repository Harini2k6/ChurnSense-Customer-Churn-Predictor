import pandas as pd
import joblib

# Load dataset and trained model
df = pd.read_csv("2_b2b_saas_churn_ltv.csv")
model = joblib.load("churn_model.pkl")


# --------------------------------------------------
# SELECT CUSTOMER
# --------------------------------------------------

print()
print("=" * 55)
print("       DYNAMIC B2B CUSTOMER CHURN PREDICTOR")
print("=" * 55)

customer_id = input("Enter Customer ID: ").strip()

customer_rows = df[df["Account_ID"] == customer_id]

if customer_rows.empty:
    print()
    print("Customer ID not found.")
    print("Please check the Customer ID and try again.")
    exit()

customer = customer_rows.iloc[0]


# --------------------------------------------------
# PREPARE DATA FOR PREDICTION
# --------------------------------------------------

X_customer = customer.drop(
    labels=["Account_ID", "Churn_Next_30D"],
    errors="ignore"
).to_frame().T


# --------------------------------------------------
# CHURN PREDICTION
# --------------------------------------------------

churn_probability = model.predict_proba(X_customer)[0][1] * 100


# --------------------------------------------------
# RISK LEVEL
# --------------------------------------------------

if churn_probability < 30:
    risk_level = "LOW"

elif churn_probability < 70:
    risk_level = "MEDIUM"

else:
    risk_level = "HIGH"


# --------------------------------------------------
# IDENTIFY RISK FACTORS
# --------------------------------------------------

risk_factors = []

if customer["Days_Since_Last_Login"] > 14:
    risk_factors.append(
        "Customer has not logged in recently"
    )

if customer["Support_Tickets_Last_30D"] >= 3:
    risk_factors.append(
        "High number of support tickets"
    )

if customer["Active_Features_Count"] <= 3:
    risk_factors.append(
        "Low feature usage"
    )

if customer["NPS_Score"] < 6:
    risk_factors.append(
        "Low customer satisfaction (NPS)"
    )

if customer["Tenure_Months"] < 6:
    risk_factors.append(
        "Customer has short tenure"
    )

if not risk_factors:
    risk_factors.append(
        "No major risk signals detected"
    )


# --------------------------------------------------
# SMART RECOMMENDATIONS
# --------------------------------------------------

recommendations = []

if customer["Days_Since_Last_Login"] > 14:
    recommendations.append(
        "Send a re-engagement message and encourage the customer to return."
    )

if customer["Support_Tickets_Last_30D"] >= 3:
    recommendations.append(
        "Contact the customer success team and investigate support issues."
    )

if customer["Active_Features_Count"] <= 3:
    recommendations.append(
        "Provide feature training or onboarding to increase product adoption."
    )

if customer["NPS_Score"] < 6:
    recommendations.append(
        "Contact the customer to understand dissatisfaction and collect feedback."
    )

if customer["Tenure_Months"] < 6:
    recommendations.append(
        "Provide additional onboarding and early-stage customer support."
    )


# If there are no specific issues
if not recommendations:

    if risk_level == "HIGH":
        recommendations.append(
            "Prioritize this customer for immediate customer-success review."
        )

    elif risk_level == "MEDIUM":
        recommendations.append(
            "Increase customer engagement and monitor account activity."
        )

    else:
        recommendations.append(
            "Continue regular customer engagement and monitor activity."
        )


# --------------------------------------------------
# DISPLAY RESULT
# --------------------------------------------------

print()
print("=" * 55)
print("             CUSTOMER CHURN PREDICTION")
print("=" * 55)

print("Customer ID:", customer["Account_ID"])
print("Subscription Plan:", customer["Subscription_Plan"])

print()
print("Churn Probability:", round(churn_probability, 2), "%")
print("Risk Level:", risk_level)


print()
print("KEY RISK FACTORS")
print("-" * 55)

for factor in risk_factors:
    print("•", factor)


print()
print("RECOMMENDED ACTIONS")
print("-" * 55)

for recommendation in recommendations:
    print("→", recommendation)

print("=" * 55)