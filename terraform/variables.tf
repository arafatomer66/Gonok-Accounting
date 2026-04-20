variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "ap-south-1" # Mumbai — closest to Bangladesh
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small" # 2 vCPU, 2GB RAM (~$15/month)
}

variable "ssh_key_name" {
  description = "Name of existing AWS key pair for SSH access"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH (e.g., your IP: 1.2.3.4/32)"
  type        = string
  default     = "0.0.0.0/0" # Restrict this to your IP in production
}

variable "volume_size" {
  description = "EBS volume size in GB"
  type        = number
  default     = 20
}
