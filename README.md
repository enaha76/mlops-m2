# Bank Marketing — MLOps Pipeline (SupNum M2 DEML)

Production-grade MLOps pipeline for predicting term-deposit subscription on the
UCI Bank Marketing dataset. Everything is declarative: infrastructure in
Terraform, ML pipeline in DVC, model registry in MLflow, delivery in GitHub
Actions with AWS OIDC (no long-lived keys).

> **Course:** MLOps II — Institut Supérieur du Numérique (SupNum), DEML M2
> **Professor:** Yehdhih ANNA
> **Presentation:** 2026-04-25

## Group

| Matricule | Branch       |
|-----------|--------------|
| 21076     | `dev-21076`  |
| 21047     | `dev-21047`  |
| 21012     | `dev-21012`  |
| 24265     | `dev-24265`  |

## Services

| Service        | URL                                     |
|----------------|-----------------------------------------|
| MLflow UI      | `http://<EC2_IP>:5000`                  |
| Prediction API | `http://<EC2_IP>:8000/`                 |
| Web UI         | `http://<EC2_IP>:8000/ui`               |

Public IP is printed by Terraform after `apply` — also available from
`terraform output ec2_public_ip`.

## Architecture

```
GitHub (main / staging / dev-MATRICULE)
  │
  ├── push to main ─────────► [Workflow 1: deploy] ─┐
  └── cron / data/** push ──► [Workflow 2: retrain]─┤  OIDC (no AK/SK)
                                                    ▼
                              ┌─────────── AWS EC2 (t3.medium) ───────────┐
                              │  MLflow :5000      Docker API :8000       │
                              │  (SQLite + S3      (FastAPI + HTML UI)    │
                              │   artifact root)                          │
                              └────────┬──────────────────┬───────────────┘
                                       │ IAM instance profile (no keys)
                                       ▼
                              ┌─────────────── AWS S3 ────────────────────┐
                              │  data/raw/   data/processed/              │
                              │  mlflow-artifacts/   dvc-store/           │
                              └───────────────────────────────────────────┘
```

## Repository layout

```
.
├── infra/terraform/          # EC2, S3, IAM, SG, OIDC  (section A)
├── src/pipeline/             # DVC stages: preprocess → train → evaluate → register  (section B)
├── src/api/                  # FastAPI + HTML UI       (section C)
├── docker/Dockerfile         # multi-stage build
├── .github/workflows/
│   ├── deploy.yml            # Workflow 1 — merge-to-main
│   └── retrain.yml           # Workflow 2 — data CI
├── dvc.yaml                  # pipeline definition
├── params.example.yaml       # copy → params.yaml (gitignored)
└── README.md
```

## Deployment — from zero to running

### 0. Prerequisites

- AWS account + AWS CLI configured locally (the infra owner only)
- Terraform ≥ 1.6
- GitHub repo (public or with access granted to the grader)

### 1. Provision AWS

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: set github_repo = "<org>/<repo>"
terraform init
terraform apply
```

After ~3 minutes you get:

- Running EC2 with MLflow already serving on :5000
- S3 bucket with the four required prefixes
- GitHub OIDC deploy role (ARN in outputs)
- A fresh SSH keypair at `infra/terraform/.generated/id_rsa` (gitignored)

Save the relevant outputs:

```bash
terraform output -raw ec2_public_ip
terraform output -raw s3_bucket
terraform output -raw github_deploy_role_arn
```

### 2. Configure GitHub

In the repo **Settings → Secrets and variables → Actions**:

**Variables** (not secret):
- `AWS_REGION` = `eu-west-3`
- `AWS_DEPLOY_ROLE_ARN` = output from step 1
- `S3_BUCKET` = output from step 1
- `PROJECT_NAME` = `supnum-mlops-bank` (matches `var.project_name`)

**Secrets** (one only):
- `EC2_SSH_KEY` = contents of `infra/terraform/.generated/id_rsa`

**Branch protection** on `main`:
- Require pull request, disallow direct pushes (Workflow 1 fires on merge).

### 3. Upload the dataset to S3

```bash
# Bank Marketing (UCI) — bank-full.csv is the full 45k-row version.
curl -O https://archive.ics.uci.edu/ml/machine-learning-databases/00222/bank.zip
unzip -o bank.zip bank-full.csv
aws s3 cp bank-full.csv "s3://$(terraform -chdir=infra/terraform output -raw s3_bucket)/data/raw/bank.csv"
```

### 4. Wire up DVC locally (one-time)

```bash
cp params.example.yaml params.yaml           # gitignored
# edit params.yaml: set s3_raw_uri, tracking_uri, and the bucket name

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

dvc init
dvc remote add -d s3remote "s3://$(terraform -chdir=infra/terraform output -raw s3_bucket)/dvc-store"
dvc import-url "$(terraform -chdir=infra/terraform output -raw s3_data_raw_uri)" data/raw/bank.csv
dvc repro
dvc push
```

At this point MLflow shows one experiment run and one registered model version.

### 5. First deploy

Merge any PR into `main`. Workflow 1 fires, SSHes to EC2, builds the image,
starts the container, and health-checks `GET /`. Visit:

```
http://<EC2_IP>:8000/ui
```

## Daily workflow

```bash
git checkout -b dev-21076
# …work…
git commit -m "feat(train): switch to xgboost, f1=0.56"
git push origin dev-21076

gh pr create --base staging --head dev-21076 --title "…" --body "…"
# review → merge into staging → merge into main → Workflow 1 auto-deploys
```

## Retrigger retraining

Three ways — all hit Workflow 2:

1. Actions → `retrain` → **Run workflow** (manual)
2. Wait for Monday 06:00 UTC cron
3. `git push origin data/2026-04-20` with an updated `data/raw/bank.csv.dvc`

After retraining, the workflow calls `POST /reload` so the API picks up the new
`Production` model without an image rebuild.

## Live demo checklist (soutenance day)

- [ ] `terraform output mlflow_url` opens in browser — experiments + registered model visible
- [ ] `terraform output api_url` + `/ui` loads, prediction returns
- [ ] Merge a trivial PR into `main` — Workflow 1 visible in Actions, turns green, health check passes
- [ ] Actions → `retrain` → Run — new model version appears in MLflow Registry
- [ ] Hit `/` after retrain — `model_version` field updates

## Security posture

- **Zero AWS keys on EC2** — IAM instance profile grants S3 rw on one bucket
- **Zero AWS keys in CI** — GitHub OIDC issues short-lived STS tokens, trust policy scoped to `main` and `staging` of this repo only
- **One SSH key** — generated by Terraform, private half lives in one GitHub Secret and one local file (gitignored)
- **Secret scanning** — `.pre-commit-config.yaml` runs `gitleaks` + `detect-private-key` before every commit
- **`params.yaml` is gitignored** (per spec E3) — rendered in CI from `params.example.yaml`

## Tearing down

```bash
cd infra/terraform
terraform destroy
```

Removes EC2, S3 (with versions — lifecycle rule already expired them), IAM role, OIDC provider, and SG. No orphans.
