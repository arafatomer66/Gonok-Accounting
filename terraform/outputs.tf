output "public_ip" {
  description = "Public IP address of the Gonok server"
  value       = aws_eip.gonok.public_ip
}

output "ssh_command" {
  description = "SSH command to connect to the server"
  value       = "ssh -i ~/.ssh/${var.ssh_key_name}.pem ubuntu@${aws_eip.gonok.public_ip}"
}

output "app_url" {
  description = "URL to access the Gonok application"
  value       = "http://${aws_eip.gonok.public_ip}"
}
