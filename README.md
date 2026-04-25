# Bank Marketing — MLOps Pipeline

> **Course:** MLOps II — Institut Supérieur du Numérique (SupNum), DEML M2
> **Professor:** Yehdhih ANNA

Production-grade MLOps pipeline that predicts whether a client will subscribe to a term deposit, trained on the [UCI Bank Marketing dataset](https://archive.ics.uci.edu/dataset/222/bank+marketing) (45 k rows, 16 features). The entire stack is declarative and automated: infrastructure in Terraform, ML pipeline in DVC, model registry in MLflow, React frontend on S3, prediction API on EC2, and end-to-end delivery via GitHub Actions with AWS OIDC — no long-lived keys anywhere.

---

## Team

| Matricule | Branch        |
|-----------|---------------|
| 21076     | `dev-21076`   |
| 21047     | `dev-21047`   |
| 21012     | `dev-21012`   |
| 24265     | `dev-24265`   |

---

## Live Services

| Service | URL |
|---------|-----|
| React Frontend | `http://$(terraform output -raw frontend_url)` |
| Prediction API | `http://$(terraform output -raw api_url)` |
| API Health | `http://$(terraform output -raw api_url)/health` |
| API Docs | `http://$(terraform output -raw api_url)/docs` |
| MLflow UI | `http://$(terraform output -raw mlflow_url)` |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub                               │
│   main / staging / dev-MATRICULE branches                   │
│                                                             │
│   push to main ──────► [Workflow 1: deploy]                 │
│   cron / data push ──► [Workflow 2: retrain]                │
└────────────────┬──────────────────┬────────────────────────-┘
                 │ OIDC (no AK/SK)  │ OIDC (no AK/SK)
                 ▼                  ▼
  ┌──── AWS S3 (frontend) ┐  ┌──── AWS EC2 t3.medium ─────────┐
  │  React SPA            │  │  MLflow :5000  FastAPI :8000   │
  │  (static website)     │  │  (SQLite + S3 artifact root)   │
  └───────────────────────┘  └──────────────┬─────────────────┘
                                            │ IAM instance profile
                                            ▼
                             ┌──── AWS S3 (data) ─────────────┐
                             │  data/raw/      data/processed/ │
                             │  mlflow-artifacts/  dvc-store/  │
                             └─────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Infrastructure | Terraform, AWS EC2, S3, IAM, OIDC |
| ML Pipeline | DVC (preprocess → train → evaluate → register) |
| Model Training | XGBoost, scikit-learn |
| Experiment Tracking | MLflow 2.18 |
| Prediction API | FastAPI, Uvicorn, Pydantic |
| Frontend | React 19, Vite, Tailwind CSS |
| Containerization | Docker (multi-stage, rootless) |
| CI/CD | GitHub Actions (2 workflows) |
| Security | gitleaks, pre-commit, AWS OIDC |

---

## Model Performance

Trained on 80% of the dataset, evaluated on the held-out 20%:

| Metric | Score |
|--------|-------|
| Accuracy | 0.910 |
| Precision | 0.651 |
| Recall | 0.491 |
| **F1** | **0.560** |
| **ROC-AUC** | **0.931** |

Thresholds (in `params.yaml`): F1 ≥ 0.55, ROC-AUC ≥ 0.80 — model is only registered if both pass.

---

## Repository Layout

```
.
├── infra/terraform/          # EC2, S3 (data + frontend), IAM, SG, OIDC
│   ├── ec2.tf
│   ├── s3.tf                 # private data/mlflow bucket
│   ├── frontend.tf           # public frontend S3 website bucket
│   ├── iam.tf                # EC2 instance profile + GitHub OIDC deploy role
│   ├── network.tf
│   ├── variables.tf
│   └── outputs.tf
├── src/
│   ├── pipeline/             # DVC stages
│   │   ├── preprocess.py     # clean, split, fit sklearn preprocessor
│   │   ├── train.py          # fit model, log to MLflow
│   │   ├── evaluate.py       # score on test set, log metrics
│   │   ├── register.py       # promote to Production if thresholds pass
│   │   └── schema.py         # feature definitions (single source of truth)
│   ├── api/
│   │   └── main.py           # FastAPI — GET /, GET /health, POST /predict, POST /reload
│   └── common/
│       └── config.py         # params.yaml loader
├── frontend/                 # React 19 SPA
│   ├── src/
│   │   ├── pages/            # Dashboard, Predict, Batch, Worklist, Status, Help, Settings
│   │   ├── constants.ts      # API_BASE_URL + form options
│   │   └── types.ts          # TypeScript interfaces
│   ├── server.ts             # local dev mock API (not shipped)
│   └── vite.config.ts
├── docker/Dockerfile         # multi-stage: python builder → slim runtime
├── .github/workflows/
│   ├── deploy.yml            # Workflow 1 — backend deploy + frontend S3 upload
│   └── retrain.yml           # Workflow 2 — DVC pipeline + model reload
├── dvc.yaml                  # pipeline stage definitions
├── params.example.yaml       # template — copy to params.yaml (gitignored)
└── requirements.txt
```

---

## Deployment — From Zero to Running

### Prerequisites

- AWS account with CLI configured (`aws configure`)
- Terraform ≥ 1.6
- Node.js ≥ 20 (for local frontend development)
- Python 3.11

### 1. Provision AWS Infrastructure

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set github_repo = "enaha76/mlops-m2"
terraform init
terraform apply
```

After ~3 minutes, Terraform creates:
- EC2 instance (t3.medium, Ubuntu 22.04) with MLflow running as a systemd service on `:5000`
- Private S3 bucket for data, DVC store, and MLflow artifacts
- Public S3 bucket configured for React SPA static website hosting
- GitHub OIDC trust policy (no long-lived AWS keys in CI)
- SSH keypair at `infra/terraform/.generated/id_rsa` (gitignored)

Save outputs for the next steps:

```bash
terraform output ec2_public_ip
terraform output s3_bucket
terraform output frontend_bucket
terraform output github_deploy_role_arn
terraform output frontend_url
```

### 2. Configure GitHub Repository

**Settings → Secrets and variables → Actions**

**Variables** (not secret):

| Name | Value |
|------|-------|
| `AWS_REGION` | `eu-west-3` |
| `AWS_DEPLOY_ROLE_ARN` | from `terraform output github_deploy_role_arn` |
| `S3_BUCKET` | from `terraform output s3_bucket` |
| `FRONTEND_BUCKET` | from `terraform output frontend_bucket` |
| `PROJECT_NAME` | `supnum-mlops-bank` |

**Secrets:**

| Name | Value |
|------|-------|
| `EC2_SSH_KEY` | contents of `infra/terraform/.generated/id_rsa` |

**Branch protection on `main`:** require pull requests, disallow direct pushes.

### 3. Upload the Dataset to S3

```bash
# From the repo root
aws s3 cp bank-full.csv \
  "s3://$(cd infra/terraform && terraform output -raw s3_bucket)/data/raw/bank.csv"
```

### 4. Set Up DVC (one-time, local)

```bash
cp params.example.yaml params.yaml
# Edit params.yaml — fill in s3_raw_uri, tracking_uri, and bucket name

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

dvc remote add -d s3remote \
  "s3://$(cd infra/terraform && terraform output -raw s3_bucket)/dvc-store"
dvc import-url \
  "$(cd infra/terraform && terraform output -raw s3_data_raw_uri)" \
  data/raw/bank.csv
dvc repro
dvc push
```

MLflow now shows one experiment run and one registered `Production` model.

### 5. First Deploy

Merge any PR into `main`. Workflow 1 fires automatically and:
1. Builds and starts the Docker API container on EC2
2. Health-checks `GET /` until the API responds
3. Builds the React frontend with `VITE_API_URL` pointing to the EC2
4. Uploads the built SPA to the frontend S3 bucket

Visit the frontend:
```bash
cd infra/terraform && terraform output -raw frontend_url
```

---

## CI/CD Pipelines

### Workflow 1 — `deploy.yml` (push to `main`)

```
checkout
  → AWS OIDC auth
  → discover EC2 IP
  → SSH to EC2: git pull + docker build + docker run
  → health check GET /
  → build React (VITE_API_URL=http://<EC2_IP>:8000)
  → aws s3 sync dist/ → frontend S3 bucket
```

### Workflow 2 — `retrain.yml` (manual / cron Mon 06:00 UTC / `data/**` branch push)

```
checkout
  → AWS OIDC auth
  → discover EC2 IP
  → render params.yaml
  → dvc pull + dvc repro + dvc push
  → POST /reload  (API picks up new Production model, no rebuild)
  → upload metrics.json as GitHub artifact
```

---

## ML Pipeline Stages

```
preprocess  →  train  →  evaluate  →  register
```

| Stage | Input | Output |
|-------|-------|--------|
| `preprocess` | `data/raw/bank.csv` | `train.parquet`, `test.parquet`, `preprocessor.joblib` |
| `train` | `train.parquet` | MLflow run, `run_id.json` |
| `evaluate` | `test.parquet` + run | `metrics.json` (logged to MLflow) |
| `register` | `metrics.json` + run | Model promoted to `Production` in MLflow Registry |

The preprocessor is logged as an artifact on the **same MLflow run** as the model. The API loads both atomically on `/reload` — no version mismatch possible.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/health` | Health check (consumed by frontend) |
| `POST` | `/predict` | Single prediction — returns `prediction`, `probability_yes`, `model_version` |
| `POST` | `/reload` | Hot-reload model from MLflow Registry without container restart |
| `GET` | `/docs` | Auto-generated Swagger UI |

CORS is configurable via the `CORS_ORIGINS` environment variable (defaults to `*`).

---

## Frontend Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | System health + model status overview |
| Single Predictor | `/predict` | One-client prediction form with profile/campaign tabs |
| Batch Scoring | `/batch` | Upload CSV → run all rows through the model |
| Campaign Worklist | `/worklist` | Save and prioritize high-probability leads |
| System Status | `/status` | Live health telemetry + model reload control |
| Help & Glossary | `/help` | Feature definitions and FAQ |
| Settings | `/settings` | Theme, threshold, refresh interval |

`VITE_API_URL` is baked in at build time by CI. For local development, `server.ts` provides a mock API at `localhost:3000`.

---

## Daily Workflow

```bash
git checkout dev-21076
# make changes
git commit -m "feat(train): tune xgboost learning rate"
git push origin dev-21076

gh pr create --base staging --head dev-21076 --title "..." --body "..."
# review → merge to staging → merge to main → Workflow 1 auto-deploys
```

## Retrigger Retraining

```bash
# Option 1 — manual (GitHub UI)
# Actions → retrain → Run workflow

# Option 2 — push new data pointer
git checkout -b data/$(date +%Y-%m-%d)
# update data/raw/bank.csv.dvc
git push origin data/$(date +%Y-%m-%d)
# Workflow 2 fires automatically

# Option 3 — wait for Monday 06:00 UTC cron
```

---

## Security Posture

| Concern | Mitigation |
|---------|-----------|
| AWS keys on EC2 | IAM instance profile — no keys, ever |
| AWS keys in CI | GitHub OIDC — short-lived STS tokens, scoped to `main` and `staging` only |
| SSH access | One keypair generated by Terraform, private key in one GitHub Secret |
| Secret leakage | `gitleaks` + `detect-private-key` pre-commit hooks |
| `params.yaml` exposure | Gitignored — rendered in CI from `params.example.yaml` |
| Frontend bucket | Public read-only (`s3:GetObject`) — no write access from the browser |

---

## Tearing Down

```bash
cd infra/terraform
terraform destroy
```

Removes EC2, both S3 buckets, IAM roles, OIDC provider, and security group. No orphaned resources.
