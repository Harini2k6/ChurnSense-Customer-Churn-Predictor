import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score

# 1. Load dataset
df = pd.read_csv("2_b2b_saas_churn_ltv.csv")

# 2. Remove columns that should not be used for prediction
X = df.drop(columns=["Account_ID", "Churn_Next_30D"])
y = df["Churn_Next_30D"]

# 3. Identify categorical and numerical columns
categorical_features = ["Subscription_Plan"]

numerical_features = [
    "MRR_USD",
    "Tenure_Months",
    "Active_Features_Count",
    "Support_Tickets_Last_30D",
    "Days_Since_Last_Login",
    "NPS_Score",
    "Estimated_LTV_USD"
]

# 4. Preprocessing
preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        ),
        (
            "numerical",
            SimpleImputer(strategy="median"),
            numerical_features
        )
    ]
)

# 5. Create ML pipeline
model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(
            n_estimators=200,
            random_state=42,
            class_weight="balanced"
        ))
    ]
)

# 6. Split data
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# 7. Train model
model.fit(X_train, y_train)

# 8. Make predictions
y_pred = model.predict(X_test)

# 9. Evaluate
print("\nMODEL RESULTS")
print("=" * 50)

print("Accuracy:", round(accuracy_score(y_test, y_pred), 4))

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

y_prob = model.predict_proba(X_test)[:, 1]
roc_auc = roc_auc_score(y_test, y_prob)

print("ROC-AUC:", round(roc_auc, 4))

print("=" * 50)
print("MODEL TRAINING COMPLETED!")