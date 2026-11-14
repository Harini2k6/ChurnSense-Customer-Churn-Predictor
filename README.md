# ChurnSense – Dynamic B2B Customer Churn Predictor

A Machine Learning-based application that predicts customer churn probability for B2B SaaS businesses and classifies customers into different risk categories.

## 1. Project Overview

Customer churn occurs when customers stop using or cancel a company's subscription services. Identifying customers who are likely to leave helps businesses take preventive retention measures.

**ChurnSense** uses a trained Random Forest classification model to predict the probability of customer churn within the next 30 days.

## 2. Objectives

- Predict the probability of customer churn.
- Identify customers with high, medium, and low churn risk.
- Help businesses identify customers who may require attention.
- Support customer retention decisions using machine learning predictions.

## 3. Technologies Used

| Technology | Purpose |
|---|---|
| Python | Machine Learning and backend |
| Pandas | Data processing |
| Scikit-learn | Model training and evaluation |
| Joblib | Saving and loading the trained model |
| FastAPI | Backend API |
| Next.js | Frontend application |
| JavaScript | Frontend functionality |
| Tailwind CSS | User interface styling |

## 4. Dataset Description

The project uses a B2B SaaS customer churn dataset obtained from Kaggle.

- Total records: 3,000
- Input features: 8
- Target variable: `Churn_Next_30D`

### Input Features

- Subscription Plan
- Monthly Recurring Revenue (MRR)
- Tenure in Months
- Active Features Count
- Support Tickets in the Last 30 Days
- Days Since Last Login
- Net Promoter Score (NPS)
- Estimated Customer Lifetime Value (LTV)

The dataset CSV is not included in this repository. Download the dataset from its original Kaggle source and place it in the project root folder as `2_b2b_saas_churn_ltv.csv`.

## 5. Machine Learning Algorithm

**Random Forest Classifier**

The model uses 200 decision trees to classify customers based on their subscription and engagement information.

### Data Preprocessing

- One-Hot Encoding for categorical data.
- Median imputation for missing numerical values.
- 80% training data and 20% testing data.
- Stratified train-test splitting.

## 6. Model Evaluation

The model was evaluated using a test dataset containing 600 records.

| Evaluation Metric | Result |
|---|---:|
| Accuracy | 97.17% |
| ROC-AUC | 0.9799 |
| Precision (Churn Class) | 92.5% |
| Recall (Churn Class) | 83.8% |
| F1-Score (Churn Class) | 87.9% |

## 7. Risk Classification

ChurnSense classifies customers into three risk categories based on predicted churn probability.

| Risk Category | Probability |
|---|---|
| Low Risk | Below 30% |
| Medium Risk | 30% to below 70% |
| High Risk | 70% and above |

## 8. Main Features

- Interactive dashboard displaying customer risk distribution.
- Customer search and details.
- Individual customer churn probability prediction.
- Low, medium, and high-risk classification.
- Risk signals and suggested retention actions.
- Model evaluation metrics.

## 9. System Architecture

The application follows a frontend-backend architecture:

1. The user interacts with the Next.js frontend.
2. The frontend sends customer information to the FastAPI backend.
3. The backend loads the trained Random Forest model.
4. The model generates a churn probability.
5. The backend returns the prediction to the frontend.
6. The frontend displays the prediction and risk category.

## 10. Project Structure

```text
ChurnSense/
│
├── backend/
│   ├── main.py
│   └── churn_service.py
│
├── websites/
│   ├── app/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── train_model.py
├── predict.py
├── app.py
├── churn_model.pkl
├── requirements.txt
├── requirements-streamlit.txt
├── render.yaml
└── DEPLOY.md
```

## 11. How to Run the Project

### Prerequisites

- Python
- Node.js and npm
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/Harini2k6/ChurnSense-Customer-Churn-Predictor.git
cd ChurnSense-Customer-Churn-Predictor
```

### Step 2: Set Up Python Environment

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Ensure the Kaggle dataset CSV is placed in the project root before running any workflow that requires it.

### Step 3: Start the Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Backend API documentation:

`http://127.0.0.1:8000/docs`

### Step 4: Start the Frontend

Open a second terminal:

```bash
cd websites
npm install
npm run dev
```

Open the application:

`http://localhost:3000`

## 12. Future Enhancements

- Integration with live customer data.
- Automated model retraining.
- Improved model explainability.
- Deployment to a cloud platform.
- Advanced customer retention analytics.

## 13. Conclusion

ChurnSense demonstrates how machine learning can help businesses identify customers who may discontinue their subscriptions. By providing churn probability predictions, risk classifications, and retention suggestions, the application supports data-driven customer retention decisions.

---

**Developed as an academic Machine Learning project.**

**GitHub Repository:**  
https://github.com/Harini2k6/ChurnSense-Customer-Churn-Predictor
