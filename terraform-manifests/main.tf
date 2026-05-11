provider "aws" {
  region = "us-east-1"
}

resource "aws_ecr_repository" "ecr" {
  name                 = "nodejsapp"
  image_tag_mutability = "MUTABLE"

  
}

resource "aws_security_group" "app_sg" {
  name = "docker-app-sg"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "docker_server" {
  ami           = "ami-0a59ec92177ec3fad" # Amazon Linux 2023
  instance_type = "t3.micro"

  security_groups = [aws_security_group.app_sg.name]

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install docker -y
              service docker start
              usermod -aG docker ec2-user

              aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${aws_ecr_repository.ecr.repository_url}

              docker pull ${aws_ecr_repository.ecr.repository_url}:latest

              docker run -d -p 80:5000 ${aws_ecr_repository.ecr.repository_url}:latest
              EOF

  tags = {
    Name = "docker-app-server"
  }
}

