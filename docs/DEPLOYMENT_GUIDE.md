# 🚀 Deployment Guide

## Overview

This deployment guide provides comprehensive instructions for deploying the web application to production environments. The application is built with Go backend and React frontend, supporting multiple deployment strategies.

## 🏗️ **Architecture Overview**

### **Production Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (Nginx)                    │
│                    Port: 80/443                             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Web Server (Nginx)                       │
│                    Static Files & API Proxy                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Go API    │  │   React UI  │  │   Workers   │        │
│  │   Port:8080 │  │   Port:3000 │  │   Port:8081 │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ PostgreSQL  │  │    Redis    │  │   Storage   │        │
│  │   Port:5432 │  │   Port:6379 │  │   (S3/etc)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## 📋 **Prerequisites**

### **System Requirements**
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2
- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 4GB+ (8GB+ recommended)
- **Storage**: 20GB+ available space
- **Network**: Public IP with ports 80, 443, 8080 open

### **Software Requirements**
- **Go**: 1.21+
- **Node.js**: 18+
- **PostgreSQL**: 13+
- **Redis**: 6+
- **Nginx**: 1.18+
- **Docker**: 20.10+ (optional)
- **Git**: Latest version

### **SSL Certificate**
- **Domain**: Valid domain name
- **SSL**: Let's Encrypt or commercial certificate
- **DNS**: Proper DNS configuration

## 🔧 **Installation Methods**

### **Method 1: Manual Installation**

#### **Step 1: System Preparation**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git build-essential software-properties-common

# Install Go
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx
```

#### **Step 2: Database Setup**
```bash
# Create database and user
sudo -u postgres psql

CREATE DATABASE webapp;
CREATE USER webapp_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE webapp TO webapp_user;
\q

# Enable PostgreSQL to start on boot
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

#### **Step 3: Redis Setup**
```bash
# Configure Redis
sudo nano /etc/redis/redis.conf

# Add/modify these settings:
bind 127.0.0.1
port 6379
maxmemory 256mb
maxmemory-policy allkeys-lru

# Enable Redis to start on boot
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

#### **Step 4: Application Deployment**
```bash
# Clone repository
git clone <repository-url>
cd webapp

# Build backend
go mod download
go build -o bin/webapp cmd/webapp/main.go

# Build frontend
cd web
npm install
npm run build
cd ..

# Create application directory
sudo mkdir -p /opt/webapp
sudo cp -r bin/ /opt/webapp/
sudo cp -r web/build/ /opt/webapp/static/
sudo cp -r docs/ /opt/webapp/
sudo cp -r internal/ /opt/webapp/

# Set permissions
sudo chown -R www-data:www-data /opt/webapp
sudo chmod +x /opt/webapp/bin/webapp
```

#### **Step 5: Configuration**
```bash
# Create configuration file
sudo nano /opt/webapp/config.env

# Add configuration
DB_DRIVER=postgres
DB_DSN=postgres://webapp_user:secure_password@localhost:5432/webapp?sslmode=disable
REDIS_URL=redis://localhost:6379
SERVER_PORT=8080
SERVER_HOST=0.0.0.0
LOG_LEVEL=info
ENVIRONMENT=production
```

#### **Step 6: Systemd Service**
```bash
# Create systemd service file
sudo nano /etc/systemd/system/webapp.service

[Unit]
Description=WebApp Go Application
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/webapp
EnvironmentFile=/opt/webapp/config.env
ExecStart=/opt/webapp/bin/webapp
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable webapp
sudo systemctl start webapp
```

### **Method 2: Docker Deployment**

#### **Step 1: Docker Compose Setup**
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DB_DRIVER=postgres
      - DB_DSN=postgres://webapp_user:secure_password@db:5432/webapp?sslmode=disable
      - REDIS_URL=redis://redis:6379
      - SERVER_PORT=8080
      - SERVER_HOST=0.0.0.0
      - LOG_LEVEL=info
      - ENVIRONMENT=production
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=webapp
      - POSTGRES_USER=webapp_user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./web/build:/usr/share/nginx/html
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### **Step 2: Dockerfile**
```dockerfile
# Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o bin/webapp cmd/webapp/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/bin/webapp .
COPY --from=builder /app/web/build ./static
COPY --from=builder /app/docs ./docs

EXPOSE 8080
CMD ["./webapp"]
```

#### **Step 3: Deploy with Docker**
```bash
# Build and deploy
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

## 🌐 **Nginx Configuration**

### **Production Nginx Config**
```nginx
# /etc/nginx/sites-available/webapp
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Static Files
    location / {
        root /opt/webapp/static;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health Check
    location /healthz {
        proxy_pass http://localhost:8080/healthz;
        access_log off;
    }

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
```

### **Enable Site**
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/webapp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 🔐 **SSL Certificate Setup**

### **Let's Encrypt (Recommended)**
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Commercial Certificate**
```bash
# Place certificate files
sudo mkdir -p /etc/nginx/ssl
sudo cp your-certificate.crt /etc/nginx/ssl/
sudo cp your-private-key.key /etc/nginx/ssl/

# Update Nginx config with correct paths
sudo nano /etc/nginx/sites-available/webapp
```

## 📊 **Monitoring Setup**

### **Application Monitoring**
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Create monitoring script
sudo nano /opt/webapp/monitor.sh

#!/bin/bash
echo "=== System Status ==="
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.2f%%", $3/$2 * 100.0)}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{print $5}')"

echo "=== Application Status ==="
systemctl status webapp --no-pager

echo "=== Database Status ==="
systemctl status postgresql --no-pager

echo "=== Redis Status ==="
systemctl status redis-server --no-pager

# Make executable
sudo chmod +x /opt/webapp/monitor.sh
```

### **Log Management**
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/webapp

/opt/webapp/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload webapp
    endscript
}
```

## 🔄 **Deployment Automation**

### **CI/CD Pipeline (GitHub Actions)**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Go
      uses: actions/setup-go@v3
      with:
        go-version: '1.21'
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Build Backend
      run: |
        go mod download
        go build -o bin/webapp cmd/webapp/main.go
    
    - name: Build Frontend
      run: |
        cd web
        npm install
        npm run build
    
    - name: Deploy to Server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /opt/webapp
          git pull origin main
          go mod download
          go build -o bin/webapp cmd/webapp/main.go
          cd web && npm install && npm run build
          sudo systemctl restart webapp
```

## 🚀 **Performance Optimization**

### **Database Optimization**
```sql
-- Create indexes for better performance
CREATE INDEX idx_expenses_year_month ON expense(year, month);
CREATE INDEX idx_expenses_category ON expense(category);
CREATE INDEX idx_expenses_created_at ON expense(created_at);

-- Analyze tables
ANALYZE expense;
ANALYZE income_sources;
ANALYZE budget_sources;
```

### **Application Optimization**
```bash
# Set environment variables for performance
export GOMAXPROCS=4
export GOGC=100
export GOMEMLIMIT=512MiB

# Add to systemd service
sudo nano /etc/systemd/system/webapp.service

[Service]
Environment=GOMAXPROCS=4
Environment=GOGC=100
Environment=GOMEMLIMIT=512MiB
```

### **Nginx Optimization**
```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
client_max_body_size 10M;

# Enable caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **Application Won't Start**
```bash
# Check logs
sudo journalctl -u webapp -f

# Check configuration
sudo systemctl status webapp

# Test database connection
psql -h localhost -U webapp_user -d webapp
```

#### **Database Connection Issues**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-13-main.log

# Test connection
sudo -u postgres psql -c "SELECT version();"
```

#### **Nginx Issues**
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### **Performance Issues**
```bash
# Check system resources
htop
iotop
nethogs

# Check application metrics
curl http://localhost:8080/healthz

# Check database performance
sudo -u postgres psql -d webapp -c "SELECT * FROM pg_stat_activity;"
```

## 📈 **Scaling Considerations**

### **Horizontal Scaling**
```bash
# Load balancer configuration
upstream webapp_backend {
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
    server 192.168.1.12:8080;
}

server {
    location /api/ {
        proxy_pass http://webapp_backend;
    }
}
```

### **Database Scaling**
```bash
# Read replicas
# Master: 192.168.1.20:5432
# Replica: 192.168.1.21:5432

# Connection pooling with PgBouncer
sudo apt install -y pgbouncer
```

### **Caching Strategy**
```bash
# Redis cluster setup
# Master: 192.168.1.30:6379
# Replica: 192.168.1.31:6379
# Replica: 192.168.1.32:6379
```

## 🔒 **Security Hardening**

### **Firewall Configuration**
```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### **Application Security**
```bash
# Run application as non-root user
sudo useradd -r -s /bin/false webapp

# Set proper file permissions
sudo chown -R webapp:webapp /opt/webapp
sudo chmod 755 /opt/webapp
sudo chmod 600 /opt/webapp/config.env
```

### **Database Security**
```sql
-- Create read-only user for monitoring
CREATE USER monitor_user WITH PASSWORD 'monitor_password';
GRANT CONNECT ON DATABASE webapp TO monitor_user;
GRANT USAGE ON SCHEMA public TO monitor_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitor_user;
```

## 📚 **Additional Resources**

### **Documentation**
- **API Reference**: See `docs/API_REFERENCE.md`
- **Developer Guide**: See `docs/DEVELOPER_GUIDE.md`
- **Performance Results**: See `docs/PERFORMANCE_BENCHMARK_RESULTS.md`

### **Monitoring Tools**
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **ELK Stack**: Log management
- **Sentry**: Error tracking

### **Backup Strategy**
```bash
# Database backup script
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U webapp_user webapp > $BACKUP_DIR/webapp_$DATE.sql
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

---

**🚀 This deployment guide provides comprehensive instructions for production deployment.**