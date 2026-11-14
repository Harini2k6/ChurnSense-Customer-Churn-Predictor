import streamlit as st
import pandas as pd
import joblib


# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="Dynamic B2B Customer Churn Predictor",
    page_icon="📊",
    layout="wide"
)


# ============================================================
# LOAD MODEL AND DATA
# ============================================================

@st.cache_resource
def load_model():
    return joblib.load("churn_model.pkl")


@st.cache_data
def load_data():
    return pd.read_csv("2_b2b_saas_churn_ltv.csv")


model = load_model()
df = load_data()


# ============================================================
# HELPER FUNCTION - PREDICT CHURN
# ============================================================

def predict_customer(customer):

    # Remove columns that were not used during model training
    input_data = customer.drop(
        labels=["Account_ID", "Churn_Next_30D"],
        errors="ignore"
    )

    input_data = pd.DataFrame([input_data])

    probability = model.predict_proba(input_data)[0][1] * 100

    if probability < 30:
        risk_level = "LOW"
    elif probability < 70:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    return probability, risk_level


# ============================================================
# CALCULATE RISK FOR ALL CUSTOMERS
# ============================================================

risk_results = []

for _, customer in df.iterrows():

    try:
        probability, risk_level = predict_customer(customer)

        risk_results.append({
            "Account_ID": customer["Account_ID"],
            "Churn_Probability": probability,
            "Risk_Level": risk_level
        })

    except Exception:
        pass


risk_df = pd.DataFrame(risk_results)


# ============================================================
# PAGE TITLE
# ============================================================

st.title("📊 Dynamic B2B Customer Churn Predictor")

st.markdown(
    "### AI-powered customer churn risk analysis and retention support"
)

st.markdown(
    """
    This system uses machine learning to estimate the probability that a
    B2B SaaS customer may churn within the next 30 days and provides
    risk signals and recommended retention actions.
    """
)

st.divider()


# ============================================================
# DASHBOARD METRICS
# ============================================================

total_customers = len(df)

high_risk = len(
    risk_df[risk_df["Risk_Level"] == "HIGH"]
)

medium_risk = len(
    risk_df[risk_df["Risk_Level"] == "MEDIUM"]
)

low_risk = len(
    risk_df[risk_df["Risk_Level"] == "LOW"]
)


col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(
        "👥 Total Customers",
        total_customers
    )

with col2:
    st.metric(
        "🔴 High Risk",
        high_risk
    )

with col3:
    st.metric(
        "🟡 Medium Risk",
        medium_risk
    )

with col4:
    st.metric(
        "🟢 Low Risk",
        low_risk
    )


st.divider()


# ============================================================
# CUSTOMER SELECTION
# ============================================================

st.subheader("🔎 Customer Churn Prediction")

customer_ids = df["Account_ID"].astype(str).tolist()

selected_customer = st.selectbox(
    "Select a Customer",
    customer_ids
)


# Get selected customer

customer = df[
    df["Account_ID"].astype(str) == selected_customer
].iloc[0]


# ============================================================
# CUSTOMER PREDICTION
# ============================================================

probability, risk_level = predict_customer(customer)


# ============================================================
# CUSTOMER RESULT
# ============================================================

st.markdown("### 📈 Prediction Result")

col1, col2, col3 = st.columns(3)

with col1:
    st.metric(
        "Customer ID",
        selected_customer
    )

with col2:
    st.metric(
        "Churn Probability",
        f"{probability:.1f}%"
    )

with col3:

    if risk_level == "HIGH":
        st.error(f"🔴 {risk_level} RISK")

    elif risk_level == "MEDIUM":
        st.warning(f"🟡 {risk_level} RISK")

    else:
        st.success(f"🟢 {risk_level} RISK")


st.divider()


# ============================================================
# CUSTOMER INFORMATION
# ============================================================

st.subheader("📋 Customer Information")


col1, col2, col3 = st.columns(3)

with col1:

    if "Subscription_Plan" in customer.index:

        st.metric(
            "Subscription Plan",
            str(customer["Subscription_Plan"])
        )

    if "Active_Features_Count" in customer.index:

        st.metric(
            "Active Features",
            int(customer["Active_Features_Count"])
        )


with col2:

    if "MRR_USD" in customer.index:

        st.metric(
            "Monthly Revenue",
            f"${customer['MRR_USD']:,.2f}"
        )

    if "Support_Tickets_Last_30D" in customer.index:

        st.metric(
            "Support Tickets (30D)",
            int(customer["Support_Tickets_Last_30D"])
        )


with col3:

    if "Tenure_Months" in customer.index:

        st.metric(
            "Customer Tenure",
            f"{int(customer['Tenure_Months'])} months"
        )

    if "Days_Since_Last_Login" in customer.index:

        st.metric(
            "Days Since Last Login",
            int(customer["Days_Since_Last_Login"])
        )


st.divider()


# ============================================================
# KEY RISK FACTORS
# ============================================================

st.subheader("⚠️ Key Risk Factors")

risk_factors = []


# ------------------------------------------------------------
# SUPPORT TICKETS
# ------------------------------------------------------------

if "Support_Tickets_Last_30D" in customer.index:

    support_tickets = customer["Support_Tickets_Last_30D"]

    if support_tickets >= 5:

        risk_factors.append(
            f"High support activity: {int(support_tickets)} tickets "
            "in the last 30 days."
        )


# ------------------------------------------------------------
# LOGIN ACTIVITY
# ------------------------------------------------------------

if "Days_Since_Last_Login" in customer.index:

    days_since_login = customer["Days_Since_Last_Login"]

    if days_since_login >= 14:

        risk_factors.append(
            f"Low recent activity: customer has not logged in "
            f"for {int(days_since_login)} days."
        )


# ------------------------------------------------------------
# FEATURE USAGE
# ------------------------------------------------------------

if "Active_Features_Count" in customer.index:

    active_features = customer["Active_Features_Count"]

    if active_features <= 3:

        risk_factors.append(
            f"Low product adoption: only {int(active_features)} "
            "features are currently active."
        )


# ------------------------------------------------------------
# NPS SCORE
# ------------------------------------------------------------

if "NPS_Score" in customer.index:

    nps = customer["NPS_Score"]

    if nps <= 0:

        risk_factors.append(
            f"Low customer satisfaction signal: NPS score is {int(nps)}."
        )


# ------------------------------------------------------------
# TENURE
# ------------------------------------------------------------

if "Tenure_Months" in customer.index:

    tenure = customer["Tenure_Months"]

    if tenure <= 3:

        risk_factors.append(
            "Early-stage customer with short account tenure."
        )


# ============================================================
# DISPLAY RISK FACTORS
# ============================================================

if len(risk_factors) == 0:

    st.success(
        "✅ No major risk signals detected from the available customer data."
    )

else:

    for factor in risk_factors:

        st.warning(
            "⚠️ " + factor
        )


st.divider()


# ============================================================
# RETENTION RECOMMENDATION
# ============================================================

st.subheader("💡 Recommended Retention Action")


if risk_level == "HIGH":

    action = """
    **Immediate customer-success intervention recommended.**

    • Contact the customer directly  
    • Investigate recent usage and support issues  
    • Offer personalized assistance or onboarding  
    • Review whether the customer is receiving sufficient value
    """

    st.error(action)


elif risk_level == "MEDIUM":

    action = """
    **Increase customer engagement.**

    • Monitor product usage  
    • Investigate support issues  
    • Encourage adoption of unused features  
    • Consider a customer-success follow-up
    """

    st.warning(action)


else:

    action = """
    **Continue regular customer engagement.**

    • Monitor customer activity  
    • Encourage continued product usage  
    • Maintain normal customer-success communication
    """

    st.info(action)


st.divider()


# ============================================================
# RISK DISTRIBUTION
# ============================================================

st.subheader("📊 Risk Distribution")


risk_counts = pd.DataFrame(
    {
        "Risk Level": [
            "Low",
            "Medium",
            "High"
        ],
        "Customers": [
            low_risk,
            medium_risk,
            high_risk
        ]
    }
)


st.bar_chart(
    risk_counts.set_index("Risk Level")
)


st.divider()


# ============================================================
# PROJECT INFORMATION
# ============================================================

st.subheader("ℹ️ About This System")

st.markdown(
    """
    **Dynamic B2B Customer Churn Predictor**

    This machine learning decision-support system analyzes customer
    information such as:

    - Subscription plan
    - Monthly recurring revenue
    - Customer tenure
    - Active feature usage
    - Support activity
    - Login activity
    - Customer satisfaction

    The Random Forest machine learning model estimates the customer's
    probability of churn within the next 30 days.

    The system then converts the prediction into a risk level and
    provides interpretable risk signals and a suggested retention action.
    """
)


# ============================================================
# FOOTER
# ============================================================

st.divider()

st.caption(
    "Dynamic B2B Customer Churn Predictor | "
    "Machine Learning Decision-Support System"
)