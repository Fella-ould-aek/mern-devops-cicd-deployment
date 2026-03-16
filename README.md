# mern-devops-cicd-deployment
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-623CE4?logo=terraform&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?logo=amazonaws&logoColor=white)
![GitLab](https://img.shields.io/badge/GitLab-FC6D26?logo=gitlab&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)

A production-ready MERN (MongoDB, Express, React, Node.js) Todo application, containerized with Docker and deployed to AWS EC2 through a fully automated GitLab CI/CD pipeline provisioned with Terraform.

The project implements a complete automated pipeline that:
1-Runs automated tests
2-Builds Docker image
3-Provisions infrastructure with Terraform
4-Deploys the application to AWS EC2

## DevOps Skills Demonstrated
This project demonstrates practical experience with:
+ CI/CD pipeline design using GitLab
+ Containerization using Docker
+ Infrastructure as Code using Terraform
+ Cloud infrastructure provisioning on Amazon Web Services
+ Remote Terraform state management with S3 + DynamoDB locking
+ Secure secret management in CI/CD pipelines
+ Automated backend testing using Jest
+ Reverse proxy architecture with Nginx
+ Production debugging and system troubleshooting
  
## Architecture Overview
The system follows a CI/CD driven infrastructure workflow where code changes automatically trigger testing, building, infrastructure provisioning, and deployment.
![alt text](docks\architecture.png)

## CI/CD Pipeline
The pipeline has 4 stages :
```
test → build → provision → deploy
```

### Stage 1 — Test
- Runs 9 Jest + Supertest unit tests against all API endpoints
- Uses a **real MongoDB container** as a GitLab service (not mocks)
- Uses an **isolated test database** , never touches the production Atlas cluster
- Generates JUnit XML reports visible directly in the GitLab UI
- Caches `node_modules` using `package-lock.json` as cache key

### Stage 2 — Build
- Builds backend and frontend Docker images
- Uses `--cache-from` to reuse unchanged Docker layers (faster builds)
- Tags images with both `:latest` and `:$CI_COMMIT_SHA` for traceability
- Pushes images to Docker Hub

### Stage 3 — Provision (manual trigger)
- Runs `terraform init`, `validate`, `plan`, and `apply`
- Creates EC2 instance, Security Group, and Key Pair on AWS
- Remote state stored in **S3** with **DynamoDB locking** for state locking.
- Saves EC2 public IP as a GitLab artifact for the deploy stage
  ![Terraform State](docs\terraform-state.png)

### Stage 4 — Deploy
- SSHs into EC2 using a private key stored as a masked GitLab variable
- Copies `docker-compose.prod.yaml` to EC2
- Runs `docker-compose pull && docker-compose up -d`
- Prints container logs to verify MongoDB Atlas connection
  ![alt text](docks\pipJobs.png)
  ![alt text](docks\deploy.png)


  
## Infrastructure Verification (AWS CLI)
Infrastructure Verification (AWS CLI)
EC2 Instance
```
aws ec2 describe-instances --output table
```
S3 Backend Storage
```
aws s3 ls
```
DynamoDB State Lock Table
```
aws dynamodb list-tables
```
![alt text](aws cli architecture.png)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + Nginx |
| Backend | Node.js + Express |
| Database | MongoDB Atlas |
| Containerization | Docker + Docker Compose |
| CI/CD | GitLab CI/CD |
| Infrastructure as Code | Terraform |
| Cloud | AWS EC2 |
| State Management | AWS S3 + DynamoDB |
| Testing | Jest + Supertest |
| Image Registry | Docker Hub |

##  Project Structure
```
mern-todo-devops/
│
├── README.md
│
├── docs/
│   ├── architecture.png
│   ├── gitlab-pipeline.png
│   ├── aws-cli.png
│   └── pipJobs.png ...
│
├── docker/
├── terraform/
├── TODO/
└── docker-compose.prod.yaml
```

## Engineering Challenges & Solutions
### Problem 1 Using the production database in tests

**The problem:** My backend tests were connecting to MongoDB Atlas (production). This meant:
- Tests could corrupt real data
- Tests would fail if Atlas was unreachable
- Credentials would need to be exposed to the test environment

**How I thought about it:** I needed a real MongoDB instance for testing (not just mocks), but completely isolated from production.

**Solution:** Used GitLab CI **services** to spin up a real `mongo:8.0` container that lives only for the duration of the test job:

```yaml
services:
  - name: mongo
    alias: mongo

variables:
  MONGO_URI: "mongodb://mongo:27017/todo_test"
```

The test database is created fresh for every pipeline run and destroyed automatically when the job ends. Production Atlas credentials are never used in tests.

---

### Problem 2 — Terraform state conflicts between local and CI

**The problem:** I ran `terraform apply` locally to test, then pushed to GitLab. The CI job tried to create the same resources (EC2, Security Group, Key Pair) and got duplicate errors because GitLab had no knowledge of what was already created.

**The root cause:** Local state (`terraform.tfstate`) existed only on my machine. GitLab CI had no state file, so it thought nothing existed.

**How I thought about it:** I needed a state backend that both my local machine and GitLab CI could access — a single source of truth.

**Solution:** Set up **S3 remote state with DynamoDB locking**:

```hcl
terraform {
  backend "s3" {
    bucket         = "todo-app-terraform-state"
    key            = "todo-app/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "todo-app-state-lock"
    encrypt        = true
  }
}
```

The S3 bucket itself was created with a **separate Terraform project** (`s3-backend/`) to solve the chicken-and-egg problem:
- Can't use Terraform to create the S3 bucket if Terraform needs S3 to store its state
- Solution: `s3-backend/` uses local state (simple, one-time), creates the bucket, then the main project uses that bucket for remote state

DynamoDB locking prevents two concurrent `terraform apply` runs from corrupting the state file.

---

### Problem 3 — Frontend calling `localhost:5000` in production

**The problem:** The app worked perfectly locally but API calls failed in production. Adding tasks did nothing, existing tasks never loaded.

**How I debugged it:**
1. Checked both containers were running — 
2. Checked MONGO_URI was set — 
3. Checked MongoDB connection —  (`MongoDB connected` in logs)
4. Tested Nginx proxy from inside the container — 
5. Opened browser DevTools — found the real issue

**Root cause:** React code had hardcoded `http://localhost:5000` API calls. In production, `localhost` in the browser means the **user's own machine**, not the EC2 server.

**Solution:** Changed all Axios calls to use relative `/api/` paths and configured Nginx to proxy `/api/` requests to the backend container:

## Security Practices

| Practice | Implementation |
|---|---|
| No credentials in code | All secrets in GitLab CI/CD masked variables |
| No credentials in Git | `.gitignore` covers `.terraform/`, `*.tfvars`, SSH keys |
| SSH key authentication | RSA 4096-bit key pair, private key masked in GitLab |
| Docker login | Access token used instead of password |
| State file encrypted | S3 server-side encryption (AES256) |
| State file private | S3 bucket has all public access blocked |
| Production DB isolated | Tests use separate MongoDB service container |


## Future Improvements
+ Possible improvements for future iterations:
+ Deploy using Kubernetes instead of a single EC2 instance
+ Implement HTTPS with Let's Encrypt
+ Add monitoring with Prometheus + Grafana
+ Implement centralized logging (ELK or Loki)
+ Introduce blue-green deployment strategy

## How to Run Locally
### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- MongoDB Atlas account
- aws account

### Steps
```bash
# 1. clone the repo
git clone https://gitlab.com/gitlabprojs/mern-todo-app.git
cd mern-todo-app

# 2. create .env file
echo "MONGO_URI=your_atlas_connection_string" > TODO/todo_backend/.env

# 3. run with docker compose
docker-compose -f docker-compose.dev.yaml up

# 4. open browser
http://localhost
```
### Run tests
```bash
cd TODO/todo_backend
npm install
npm test
```
---
## Infrastructure Setup (one time)

```bash
# 1. create S3 bucket and DynamoDB table for state
cd terraform/s3-backend
terraform init
terraform apply

# 2. generate SSH key pair for the ec2
ssh-keygen -t rsa -b 4096 -f terraform/todo-app-key

# 3. initialize main terraform
cd ../
terraform init
```
---

## GitLab CI/CD Variables Required

| Variable | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_DEFAULT_REGION` | AWS region (e.g. us-east-1) |
| `EC2_SSH_PUBLIC_KEY` | Content of `todo-app-key.pub` |
| `EC2_SSH_PRIVATE_KEY` | Content of `todo-app-key` |
| `MONGO_URI` | MongoDB Atlas connection string |
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_PASS` | Docker Hub access token |
| `TF_VAR_aws_region` | Terraform region variable |
| `TF_VAR_ami` | EC2 AMI ID |
| `TF_VAR_instance_type` | EC2 instance type |

---

##  Cost Management

This project uses AWS free tier resources:
- EC2 `t2.micro` — free tier eligible
- S3 — minimal cost for state file storage
- DynamoDB — PAY_PER_REQUEST, essentially free for low usage

**Always destroy resources when not in use:**

```bash
cd terraform
terraform destroy
```
---

##  What I Learned

- How to structure a production CI/CD pipeline with multiple stages
- Why remote Terraform state (S3 + DynamoDB) is essential for team and CI/CD workflows
- How to use GitLab services for isolated test databases
- How Docker layer caching works and how to optimize build times
- How environment variables flow from CI/CD through SSH, Docker Compose, into containers
- How Nginx acts as a reverse proxy between React and Express in production
- Why `localhost` in frontend code breaks in production and how to fix it
- How RSA asymmetric cryptography enables SSH authentication
- Security best practices for secrets management in CI/CD

---

##  Author

**Fella Ould Abdelkader**
