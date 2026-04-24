output "ec2_public_ip" {
  description = "Public IPv4 of the EC2 instance."
  value       = aws_instance.main.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of the EC2 instance."
  value       = aws_instance.main.public_dns
}

output "mlflow_url" {
  description = "MLflow UI URL. Paste into a browser to confirm A1/A2/A3."
  value       = "http://${aws_instance.main.public_ip}:5000"
}

output "api_url" {
  description = "Prediction API URL (available after first CI/CD deploy)."
  value       = "http://${aws_instance.main.public_ip}:8000"
}

output "s3_bucket" {
  description = "Name of the shared S3 bucket."
  value       = aws_s3_bucket.main.bucket
}

output "s3_data_raw_uri" {
  description = "Value for params.yaml > data.s3_raw_uri after you upload bank.csv."
  value       = "s3://${aws_s3_bucket.main.bucket}/data/raw/bank.csv"
}

output "dvc_remote_uri" {
  description = "Run: dvc remote add -d s3remote <this-value>"
  value       = "s3://${aws_s3_bucket.main.bucket}/dvc-store"
}

output "github_deploy_role_arn" {
  description = "Add to GitHub repo variables as AWS_DEPLOY_ROLE_ARN."
  value       = aws_iam_role.github_deploy.arn
}

output "ssh_command" {
  description = "How the infra owner SSHes in after apply."
  value       = "ssh -i infra/terraform/.generated/id_rsa ubuntu@${aws_instance.main.public_ip}"
}

output "frontend_url" {
  description = "React SPA URL served from S3. Available after CI uploads the build."
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "frontend_bucket" {
  description = "Frontend S3 bucket name. Add to GitHub repo variables as FRONTEND_BUCKET."
  value       = aws_s3_bucket.frontend.bucket
}
