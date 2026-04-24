variable "aws_region" {
  description = "AWS region where all resources are created."
  type        = string
  default     = "eu-west-3"
}

variable "project_name" {
  description = "Short slug used to prefix resource names. Must be unique across an AWS account (S3 bucket names are global)."
  type        = string
  default     = "supnum-mlops-bank"
}

variable "instance_type" {
  description = "EC2 instance type. Spec allows t3.medium or t2.medium."
  type        = string
  default     = "t3.medium"

  validation {
    condition     = contains(["t3.medium", "t2.medium"], var.instance_type)
    error_message = "instance_type must be t3.medium or t2.medium per the project spec."
  }
}

variable "ebs_size_gb" {
  description = "Root EBS volume size. Spec suggests +10 GB if tight — we start at 30."
  type        = number
  default     = 30
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to reach port 22. Default is open for demo; restrict to your IP in practice."
  type        = string
  default     = "0.0.0.0/0"
}

variable "github_repo" {
  description = "GitHub repo in owner/name form. Used for the OIDC trust policy so only this repo can assume the deploy role."
  type        = string
  # Example: "supnum-group-x/mlops-bank-marketing"
}

variable "github_allowed_refs" {
  description = "Git refs allowed to assume the deploy role (main and staging only)."
  type        = list(string)
  default     = ["refs/heads/main", "refs/heads/staging"]
}
