#!/usr/bin/env bash
# One-shot: init git, create the 6 required branches, push to origin.
# Run ONCE, by whoever is the infra owner. After this, every teammate just
# `git clone` and `git checkout dev-MATRICULE`.
#
# Usage (from repo root):
#   bash scripts/init-repo.sh
set -euo pipefail

REMOTE="git@github.com:enaha76/mlops-m2.git"
BRANCHES=("staging" "dev-21076" "dev-21047" "dev-21012" "dev-24265")

if [ ! -d .git ]; then
  echo "==> git init"
  git init -b main
  git remote add origin "$REMOTE"
else
  echo "==> git already initialized — skipping init"
  # Make sure remote is correct
  if ! git remote get-url origin 2>/dev/null | grep -q "enaha76/mlops-m2"; then
    git remote add origin "$REMOTE" 2>/dev/null || git remote set-url origin "$REMOTE"
  fi
fi

# Optional: install pre-commit hooks now so no secret can leak in the first commit.
if command -v pre-commit >/dev/null 2>&1; then
  echo "==> installing pre-commit hooks (gitleaks + detect-private-key)"
  pre-commit install
else
  echo "==> pre-commit not installed — run: pip install pre-commit && pre-commit install"
fi

echo "==> staging initial commit"
git add .
git commit -m "chore: initial scaffold — terraform, dvc pipeline, fastapi, ci/cd" \
  || echo "    (nothing to commit)"

echo "==> pushing main"
git push -u origin main

echo "==> creating and pushing ${BRANCHES[*]}"
for b in "${BRANCHES[@]}"; do
  if git show-ref --verify --quiet "refs/heads/$b"; then
    echo "    branch $b already exists locally"
  else
    git branch "$b" main
  fi
  git push -u origin "$b"
done

cat <<'NEXT'

==========================================================================
 Repo bootstrapped. What's next:

 1. On GitHub → Settings → Branches → add protection for `main`:
      • Require PRs (no direct pushes)
      • (optional) Require status checks to pass

 2. Run Terraform to provision AWS:
      cd infra/terraform
      cp terraform.tfvars.example terraform.tfvars
      # edit terraform.tfvars — set github_repo = "enaha76/mlops-m2"
      terraform init
      terraform apply

 3. On GitHub → Settings → Secrets and variables → Actions:
      Variables:
        AWS_REGION            = eu-west-3
        AWS_DEPLOY_ROLE_ARN   = (from `terraform output github_deploy_role_arn`)
        S3_BUCKET             = (from `terraform output s3_bucket`)
        PROJECT_NAME          = supnum-mlops-bank
      Secrets:
        EC2_SSH_KEY           = contents of infra/terraform/.generated/id_rsa

 4. Each teammate clones and works on their dev branch:
      git clone git@github.com:enaha76/mlops-m2.git
      git checkout dev-21076   # or their own matricule
==========================================================================
NEXT
