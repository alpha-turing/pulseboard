# Production Deployment Guide

This guide walks you through deploying Pulseboard to production safely and securely.

## 🔐 Pre-Deployment Security Checklist

### Critical (Must Complete Before Launch)

- [ ] **Generate Strong JWT Secret**
  ```bash
  openssl rand -base64 32
  ```
  Add to `.env`: `JWT_SECRET="your-generated-secret"`

- [ ] **Set up PostgreSQL Database**
  - Replace SQLite with PostgreSQL for production
  - Update `DATABASE_URL` in `.env`
  - Run migrations: `npx prisma migrate deploy`

- [ ] **Configure Environment Variables**
  - Copy `.env.example` to `.env`
  - Fill in all required values
  - Never commit `.env` to git
  - Use your hosting provider's secret management

- [ ] **Enable HTTPS**
  - SSL certificate configured
  - Force HTTPS redirects
  - Update cookie settings: `secure: true`

- [ ] **Review Rate Limits**
  - Check `src/middleware.ts` rate limits
  - Adjust based on expected traffic
  - Consider upgrading to Redis for distributed rate limiting

### High Priority

- [ ] **Set up Redis** (optional but recommended)
  ```bash
  # Install Redis
  npm install ioredis
  
  # Update REDIS_URL in .env
  REDIS_URL="redis://your-redis-host:6379"
  ```

- [ ] **Configure Error Monitoring**
  ```bash
  npm install @sentry/nextjs
  # Follow Sentry setup guide
  ```

- [ ] **Set up Database Backups**
  - Automated daily backups
  - Test restoration process
  - Document backup locations

- [ ] **Add Monitoring**
  - Health check endpoint: `/api/health`
  - Set up uptime monitoring (UptimeRobot, Pingdom)
  - Log aggregation (Datadog, LogRocket)

## 🚀 Deployment Platforms

### Vercel (Recommended for Next.js)

1. **Connect Repository**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

2. **Configure Environment Variables**
   - Go to Project Settings > Environment Variables
   - Add all variables from `.env.example`
   - Set `NODE_ENV=production`

3. **Configure PostgreSQL**
   - Use Vercel Postgres or external provider
   - Update `DATABASE_URL`
   - Run migrations: `npx prisma migrate deploy`

4. **Deploy**
   ```bash
   vercel --prod
   ```

### Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npx prisma generate
   RUN npm run build
   
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and Run**
   ```bash
   docker build -t pulseboard .
   docker run -p 3000:3000 --env-file .env pulseboard
   ```

### Traditional VPS (Ubuntu)

1. **Install Dependencies**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs postgresql nginx
   ```

2. **Set up PostgreSQL**
   ```bash
   sudo -u postgres createdb pulseboard
   sudo -u postgres createuser pulseboard_user
   ```

3. **Clone and Install**
   ```bash
   git clone https://github.com/alpha-turing/pulseboard.git
   cd pulseboard
   npm install
   npx prisma migrate deploy
   npm run build
   ```

4. **Configure Nginx Reverse Proxy**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Set up PM2 for Process Management**
   ```bash
   npm install -g pm2
   pm2 start npm --name "pulseboard" -- start
   pm2 save
   pm2 startup
   ```

## 🔧 Post-Deployment

### 1. Verify Health Check
```bash
curl https://your-domain.com/api/health
```

Should return:
```json
{
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "polygonApiKey": "configured",
    "jwtSecret": "configured"
  }
}
```

### 2. Test Authentication
- Register a new user
- Verify strong password enforcement
- Test login/logout
- Check JWT token in cookies

### 3. Monitor Performance
- Check API response times
- Monitor polygon.io API usage (rate limits)
- Watch database connection pool
- Track cache hit rates

### 4. Security Scan
```bash
# Check for known vulnerabilities
npm audit

# Run security scanner
npx snyk test
```

## 📊 Recommended Production Setup

```
┌─────────────────┐
│   CloudFlare    │  ← CDN, DDoS protection, SSL
│   (Optional)    │
└────────┬────────┘
         │
┌────────▼────────┐
│   Load Balancer │  ← AWS ALB, Nginx
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│ App  │  │ App  │  ← Next.js instances (horizontal scaling)
│ Node │  │ Node │
└───┬──┘  └──┬───┘
    │         │
    └────┬────┘
         │
┌────────▼────────┐
│   PostgreSQL    │  ← Primary database (with replicas)
└─────────────────┘
         │
┌────────▼────────┐
│     Redis       │  ← Caching & rate limiting
└─────────────────┘
```

## 🔒 Security Best Practices

1. **Secrets Management**
   - Use environment variable injection
   - Never hardcode secrets
   - Rotate JWT_SECRET periodically
   - Use different secrets per environment

2. **Database Security**
   - Use connection pooling
   - Enable SSL for database connections
   - Restrict database access by IP
   - Regular security patches

3. **API Security**
   - Rate limiting enabled ✅
   - CORS configured properly
   - Input validation on all endpoints
   - SQL injection prevention (Prisma handles this)

4. **Monitoring**
   - Set up alerts for:
     - High error rates
     - API failures
     - Database connection issues
     - Unusual traffic patterns

## 📈 Scaling Considerations

### Small Scale (< 1000 users)
- Single Next.js instance
- SQLite or small PostgreSQL
- In-memory cache
- **Current setup is sufficient**

### Medium Scale (1000-10,000 users)
- Multiple Next.js instances
- PostgreSQL with connection pooling
- Redis for caching and rate limiting
- CDN for static assets

### Large Scale (10,000+ users)
- Auto-scaling Next.js instances
- PostgreSQL with read replicas
- Redis cluster
- Full CDN integration
- Dedicated monitoring stack

## 🆘 Troubleshooting

### Health Check Fails
```bash
# Check logs
pm2 logs pulseboard

# Verify database
npx prisma studio

# Test database connection
npx prisma db pull
```

### High Memory Usage
- Cache is growing unbounded
- Solution: Implement Redis or reduce cache size in `src/lib/cache-improved.ts`

### Rate Limit Issues
- Too many requests from single IP
- Adjust limits in `src/middleware.ts`
- Consider upgrading to Redis-based rate limiting

## 📞 Support

- **Issues**: https://github.com/alpha-turing/pulseboard/issues
- **Discussions**: https://github.com/alpha-turing/pulseboard/discussions
