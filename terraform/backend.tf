terraform {
  backend "s3" {
    bucket         = "todo-app-terraform-state-fella"
    key            = "todo-app/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "todo-app-state-lock"  
    encrypt        = true                   
  }
}