# Latest Ubuntu 22.04 LTS AMI, from Canonical's official account.
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Generate an SSH keypair locally. Private key is written to a file the
# infra owner keeps off git (see .gitignore). Upload the same private key
# to GitHub Secrets as EC2_SSH_KEY so CI can ssh in.
resource "tls_private_key" "ssh" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "main" {
  key_name   = "${var.project_name}-key"
  public_key = tls_private_key.ssh.public_key_openssh
}

resource "local_sensitive_file" "ssh_private_key" {
  content         = tls_private_key.ssh.private_key_pem
  filename        = "${path.module}/.generated/id_rsa"
  file_permission = "0600"
}

resource "local_file" "ssh_public_key" {
  content  = tls_private_key.ssh.public_key_openssh
  filename = "${path.module}/.generated/id_rsa.pub"
}

resource "aws_instance" "main" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  key_name                    = aws_key_pair.main.key_name
  vpc_security_group_ids      = [aws_security_group.ec2.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2.name
  associate_public_ip_address = true

  root_block_device {
    volume_size           = var.ebs_size_gb
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  user_data = templatefile("${path.module}/scripts/bootstrap.sh.tftpl", {
    aws_region = var.aws_region
    s3_bucket  = aws_s3_bucket.main.bucket
  })

  # Replacing the instance on user_data change would kill our MLflow state.
  # We intentionally ignore user_data changes — re-provision only if we want to.
  lifecycle {
    ignore_changes = [user_data, ami]
  }

  tags = {
    Name = "${var.project_name}-ec2"
  }
}
