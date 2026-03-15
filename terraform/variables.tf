variable "aws_region" {
  type        = string
}
 variable "ami" {
  description = "the aws machine image"
}
variable "instance_type" {
  description = "the type of the EC2 instance"
}
 variable "ssh_public_key" {
  description = "SSH public key for EC2 access"
} 
