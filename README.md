# Smart Contract Vulnerability Scanner Frontend

This is the React/Next.js dashboard for the Smart Contract Vulnerability Scanner.  
It allows users to scan Ethereum smart contracts for vulnerabilities, view risk metrics, and explore scan history.

## Features

- Scan contracts by address or upload `.sol` files
- Risk dashboard with charts and metrics
- Comparative analysis and scan history
- Modern UI styled with Tailwind CSS and [v0.dev](https://v0.dev) components
- Responsive design for desktop and mobile

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Run locally:**
   ```sh
   npm run dev
   ```

3. **Build for production:**
   ```sh
   npm run build
   ```

4. **Start production server:**
   ```sh
   npm start
   ```

## Configuration

- Set your backend API URL in `.env.local`:
  ```
  NEXT_PUBLIC_API_BASE=https://smart-contract-scanner-backend-production.up.railway.app
  ```

## Deployment (Vercel)

1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com/), import your repository, and deploy.
3. Set your environment variable in Vercel dashboard:
   ```
   NEXT_PUBLIC_API_BASE=https://smart-contract-scanner-backend-production.up.railway.app
   ```
4. Your live site will be available at:  
   [https://smart-contract-scanner-frontend-pxk.vercel.app](https://smart-contract-scanner-frontend-pxk.vercel.app)

## UI Design

- UI components are enhanced using [v0.dev](https://v0.dev).
- You can further customize the dashboard by generating new components on v0.dev and integrating them into your React code.

## License

MIT

---
