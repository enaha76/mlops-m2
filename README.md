# Bank Marketing MLOps Pipeline 

> **Course:** MLOps II — Institut Supérieur du Numérique (SupNum), DEML M2
> **Professor:** Yehdhih ANNA
> **Team:** Matricules 21076 · 21047 · 21012 · 24265

A **production-grade, end-to-end MLOps system** built from scratch for the UCI Bank Marketing dataset. Every layer of the stack — infrastructure, data versioning, model training, serving, frontend, and delivery — is automated, reproducible, and follows real-world engineering standards. No manual steps, no long-lived credentials, no configuration drift.

---

## What Was Built

This project is not a notebook or a script. It is a fully operational machine learning system with the same architecture patterns used in production at technology companies:

- **Declarative cloud infrastructure** provisioned by Terraform in under 3 minutes
- **Versioned, reproducible ML pipeline** orchestrated by DVC — any teammate can reproduce every result from any commit
- **Experiment tracking and model registry** via MLflow — every training run is logged, every model version is promoted through stages with quality gates
- **Production API** served inside Docker with zero-downtime hot-reload — a new model version is picked up by the running container without a restart
- **React single-page application** deployed to S3 static hosting, completely decoupled from the backend
- **Two automated CI/CD pipelines** on GitHub Actions using AWS OIDC — not a single AWS access key exists anywhere in the system
- **Pre-commit security hooks** that prevent secrets from ever reaching the repository

---

## Team

| Matricule | Branch | Contribution |
|-----------|--------|--------------|
| 21076 | `dev-21076` | Infrastructure (Terraform), CI/CD, API, security |
| 21047 | `dev-21047` | Frontend wiring, API integration, CORS |
| 21012 | `dev-21012` | React frontend — all pages and components |
| 24265 | `dev-24265` | ML pipeline (DVC), MLflow tracking, model registry |

---

## Live Services

After `terraform apply` and a first merge to `main`:

```bash
terraform output frontend_url     # React SPA on S3
terraform output api_url          # FastAPI on EC2 :8000
terraform output mlflow_url       # MLflow UI on EC2 :5000
```

| Service | Description |
|---------|-------------|
| `<frontend_url>` | React dashboard — predictions, batch scoring, system status |
| `<api_url>/health` | API health check — model load status, version, run ID |
| `<api_url>/docs` | Auto-generated Swagger/OpenAPI documentation |
| `<mlflow_url>` | Experiment tracker — runs, metrics, registered models |

---

## Architecture

The system is designed around a clean separation of concerns: infrastructure is immutable and versioned, the ML pipeline is reproducible, the API is stateless and hot-reloadable, and the frontend is fully decoupled from the backend.

```
┌─────────────────────────── GitHub ──────────────────────────────┐
│                                                                  │
│  dev-MATRICULE ──► PR ──► staging ──► main                      │
│                                  │                              │
│           push to main ──────────┤──► Workflow 1: deploy        │
│           cron / data push ───────────► Workflow 2: retrain     │
└──────────────────────────────────┼──────────────────────────────┘
                                   │ AWS OIDC  (short-lived tokens,
                                   │ no access keys)
              ┌────────────────────┴──────────────────────┐
              │                                           │
              ▼                                           ▼
  ┌─── AWS S3 (frontend) ──────┐     ┌─── AWS EC2 t3.medium ────────────────┐
  │                            │     │                                      │
  │  React SPA                 │     │  ┌─ MLflow :5000 ─────────────────┐  │
  │  • Dashboard               │     │  │  SQLite backend                │  │
  │  • Single Predictor        │     │  │  S3 artifact root              │  │
  │  • Batch Scoring           │     │  │  Experiment runs + registry    │  │
  │  • Campaign Worklist       │     │  └────────────────────────────────┘  │
  │  • System Status           │     │                                      │
  │  • Help & Glossary         │     │  ┌─ Docker: FastAPI :8000 ─────────┐  │
  │  • Settings                │◄────┼──┤  GET  /health                  │  │
  │                            │     │  │  POST /predict                 │  │
  │  VITE_API_URL baked in     │     │  │  POST /reload  (hot-swap)      │  │
  │  at CI build time          │     │  │  CORS — configurable origins   │  │
  └────────────────────────────┘     │  └────────────────────────────────┘  │
                                     │            │ IAM instance profile     │
                                     └────────────┼─────────────────────────┘
                                                  │ (no keys on disk)
                                                  ▼
                             ┌─── AWS S3 (data) ───────────────────────────┐
                             │  data/raw/           ← source dataset       │
                             │  data/processed/     ← DVC pipeline output  │
                             │  mlflow-artifacts/   ← models, preprocessor │
                             │  dvc-store/          ← DVC cache            │
                             └─────────────────────────────────────────────┘
```

### Key Design Decisions

**Why OIDC instead of access keys?**
GitHub Actions assumes an AWS IAM role via a short-lived JWT signed by GitHub. The trust policy is scoped to `main` and `staging` branches of this specific repository only. There is nothing to rotate, nothing to leak, and nothing to revoke manually.

**Why two S3 buckets?**
The data bucket is fully private — no public access, server-side encryption, versioning enabled. The frontend bucket is a separate, public-read-only static website. Mixing public and private content in one bucket is a common security mistake; this design eliminates that risk entirely.

**Why is the preprocessor stored alongside the model in MLflow?**
The `train` stage logs `preprocessor.joblib` as an artifact on the same run as the model. When `POST /reload` is called, the API downloads both from the same run atomically. This guarantees the feature transformer always matches the model — version mismatch between preprocessing and inference is a subtle but common production bug.

**Why hot-reload instead of container restart?**
The `retrain` workflow calls `POST /reload` after registering a new model. The API reloads the model in-memory under a thread lock, without dropping the container or interrupting in-flight requests. Zero downtime, no re-pull, no re-image.

---

## ML Pipeline

The pipeline is defined in `dvc.yaml` and runs as four sequential stages. Every stage is cached by DVC: if inputs and parameters haven't changed, the stage is skipped.

```
Raw CSV (S3)
    │
    ▼
┌─────────────── preprocess ───────────────────────────────────────┐
│  • Drop duplicates                                               │
│  • Stratified train/test split (80/20)                          │
│  • Numeric: median imputation + StandardScaler                  │
│  • Categorical: mode imputation + OneHotEncoder                 │
│  Output: train.parquet, test.parquet, preprocessor.joblib       │
└──────────────────────────────────────┬───────────────────────────┘
                                       │
                                       ▼
┌─────────────── train ────────────────────────────────────────────┐
│  • Model: XGBoost (n_estimators=300, max_depth=6, lr=0.1)       │
│  • Logs params, model artifact, and preprocessor to MLflow      │
│  • Supports: logistic regression, random forest, xgboost        │
│  Output: MLflow run, run_id.json                                │
└──────────────────────────────────────┬───────────────────────────┘
                                       │
                                       ▼
┌─────────────── evaluate ─────────────────────────────────────────┐
│  • Loads model from MLflow by run_id                            │
│  • Computes: accuracy, precision, recall, F1, ROC-AUC           │
│  • Logs all metrics back to the same MLflow run                 │
│  Output: metrics.json (tracked by DVC, visible in dvc metrics)  │
└──────────────────────────────────────┬───────────────────────────┘
                                       │
                                       ▼
┌─────────────── register ─────────────────────────────────────────┐
│  • Checks metrics against thresholds (F1 ≥ 0.55, AUC ≥ 0.80)  │
│  • If thresholds pass: registers model, promotes to Production  │
│  • If thresholds fail: exits 0 (no registration, no failure)   │
│  Output: new Production version in MLflow Model Registry        │
└──────────────────────────────────────────────────────────────────┘
```

### Current Model Metrics

| Metric | Score | Threshold |
|--------|-------|-----------|
| Accuracy | 0.910 | — |
| Precision | 0.651 | — |
| Recall | 0.491 | — |
| **F1** | **0.560** | ≥ 0.55 ✓ |
| **ROC-AUC** | **0.931** | ≥ 0.80 ✓ |

---

## CI/CD Pipelines

### Workflow 1 — Code Deploy (`deploy.yml`)

Triggered on every push to `main` (i.e., every merged PR).

```
1. Checkout code
2. Assume AWS deploy role via OIDC
3. Discover EC2 public IP from AWS tags
4. SSH to EC2:
     git pull origin/main
     docker build -f docker/Dockerfile -t bank-api:latest .
     docker run -d ... -p 8000:8000 bank-api:latest
5. Health-check GET / — retry 30× every 5s
6. Install Node 20, npm ci
7. npm run build  (VITE_API_URL=http://<EC2_IP>:8000 injected at build)
8. aws s3 sync frontend/dist/ s3://<FRONTEND_BUCKET>/ --delete
```

Steps 6–8 run as a separate job (`deploy-frontend`) that starts only after the backend health check passes. The frontend is always built against a confirmed-healthy API URL.

### Workflow 2 — Data Retrain (`retrain.yml`)

Triggered manually, on schedule (Monday 06:00 UTC), or on `data/**` branch push.

```
1. Checkout code
2. Assume AWS deploy role via OIDC
3. Discover EC2 public IP
4. Render params.yaml from params.example.yaml
5. dvc pull (restore cached outputs if unchanged)
6. dvc repro  (re-runs only stages whose inputs changed)
7. dvc push   (cache new outputs to S3)
8. POST /reload  →  API hot-swaps to new Production model
9. Upload metrics.json as GitHub Actions artifact
```

---

## Repository Structure

```
.
├── infra/terraform/
│   ├── ec2.tf              # Ubuntu 22.04, t3.medium, SSH keypair
│   ├── s3.tf               # Private bucket: data, DVC, MLflow artifacts
│   ├── frontend.tf         # Public bucket: React SPA static website
│   ├── iam.tf              # EC2 instance profile + GitHub OIDC deploy role
│   ├── network.tf          # Security group: ports 22, 5000, 8000
│   ├── variables.tf        # Region, instance type, github_repo, allowed refs
│   ├── outputs.tf          # IPs, URLs, bucket names, SSH command
│   └── scripts/
│       └── bootstrap.sh.tftpl  # EC2 first-boot: Docker, MLflow systemd service
│
├── src/
│   ├── pipeline/
│   │   ├── schema.py       # NUMERIC_FEATURES, CATEGORICAL_FEATURES, TARGET
│   │   ├── preprocess.py   # Clean, split, fit sklearn ColumnTransformer
│   │   ├── train.py        # Fit model, log to MLflow, save run_id
│   │   ├── evaluate.py     # Score test set, log metrics to same run
│   │   └── register.py     # Quality gate → promote to Production
│   ├── api/
│   │   └── main.py         # FastAPI: /health, /predict, /reload + CORS
│   └── common/
│       └── config.py       # params.yaml loader, MLFLOW_TRACKING_URI resolver
│
├── frontend/
│   ├── src/
│   │   ├── pages/          # Home, Predict, Batch, Worklist, Status, Help, Settings
│   │   ├── hooks/          # useSettings (localStorage theme/threshold/interval)
│   │   ├── constants.ts    # API_BASE_URL (from VITE_API_URL), form options, glossary
│   │   └── types.ts        # HealthResponse, PredictRequest/Response, WorklistEntry
│   ├── server.ts           # Express mock API for local dev (not deployed)
│   └── vite.config.ts      # VITE_API_URL env passthrough, Tailwind, React plugin
│
├── docker/
│   └── Dockerfile          # Stage 1: pip wheel builder — Stage 2: slim runtime, appuser
│
├── .github/workflows/
│   ├── deploy.yml          # Workflow 1: backend Docker + frontend S3
│   └── retrain.yml         # Workflow 2: DVC repro + POST /reload
│
├── dvc.yaml                # Pipeline stage graph
├── params.example.yaml     # Config template (params.yaml is gitignored)
├── requirements.txt        # Python deps — pinned versions
└── .pre-commit-config.yaml # gitleaks + detect-private-key on every commit
```

---

## Security Architecture

Every security decision was deliberate and follows the principle of least privilege.

| Threat | Control |
|--------|---------|
| AWS credentials leaked via GitHub | **OIDC** — GitHub gets a JWT, never an access key |
| OIDC role abused by forks or other repos | Trust policy scoped to `refs/heads/main` and `refs/heads/staging` of this repo only |
| AWS credentials on EC2 disk | **IAM instance profile** — credentials are fetched from metadata endpoint, never stored |
| EC2 instance accessing wrong bucket | Instance role limited to `s3:GetObject/PutObject/DeleteObject` on one specific bucket ARN |
| Secrets committed to git | `gitleaks` + `detect-private-key` run on every `git commit` via pre-commit |
| `params.yaml` exposing S3 URIs | File is gitignored — CI renders it from `params.example.yaml` with `sed` substitution |
| Frontend accessing private data | Frontend bucket is **read-only** (`s3:GetObject` only) — no write path from the browser |
| Cross-origin API abuse | CORS origins configurable via `CORS_ORIGINS` env var — locked to frontend URL in production |

---

## Deployment Guide

### Prerequisites

- AWS CLI configured (`aws configure`)
- Terraform ≥ 1.6
- Python 3.11, Node.js ≥ 20

### Step 1 — Provision Infrastructure

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# set github_repo = "enaha76/mlops-m2"
terraform init && terraform apply
```

### Step 2 — Configure GitHub

**Settings → Secrets and variables → Actions**

| Type | Name | Value |
|------|------|-------|
| Variable | `AWS_REGION` | `eu-west-3` |
| Variable | `AWS_DEPLOY_ROLE_ARN` | `terraform output -raw github_deploy_role_arn` |
| Variable | `S3_BUCKET` | `terraform output -raw s3_bucket` |
| Variable | `FRONTEND_BUCKET` | `terraform output -raw frontend_bucket` |
| Variable | `PROJECT_NAME` | `supnum-mlops-bank` |
| Secret | `EC2_SSH_KEY` | contents of `infra/terraform/.generated/id_rsa` |

### Step 3 — Upload Dataset

```bash
aws s3 cp bank-full.csv \
  "s3://$(cd infra/terraform && terraform output -raw s3_bucket)/data/raw/bank.csv"
```

### Step 4 — Run the ML Pipeline

```bash
cp params.example.yaml params.yaml   # fill in bucket + EC2 IP
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
dvc remote add -d s3remote \
  "s3://$(cd infra/terraform && terraform output -raw s3_bucket)/dvc-store"
dvc repro && dvc push
```

### Step 5 — Deploy

Merge any PR into `main`. Workflow 1 handles everything:
- Builds and starts the API container on EC2
- Builds the React app and uploads it to S3

```bash
# Check results
terraform output frontend_url   # open in browser
terraform output api_url        # append /health or /docs
```

---

## Daily Development Workflow

```bash
# Start from your branch
git checkout dev-21076

# Work, commit
git add -p
git commit -m "feat(train): add early stopping to xgboost"
git push origin dev-21076

# Open PR to staging
gh pr create --base staging --head dev-21076 --title "feat: ..." --body "..."

# After review: merge staging → main → Workflow 1 auto-deploys
```

## Trigger Retraining

```bash
# Manual — via GitHub UI
# Actions → retrain → Run workflow

# Via new data
git checkout -b data/$(date +%Y-%m-%d)
# update DVC pointer: dvc import-url <new-s3-uri> data/raw/bank.csv
git push origin data/$(date +%Y-%m-%d)

# Automatic — every Monday 06:00 UTC
```

---

## Teardown

```bash
cd infra/terraform
terraform destroy
# Removes: EC2, both S3 buckets, IAM roles, OIDC provider, security group
```
