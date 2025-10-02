# Cloudflare Machine Learning Model scores
A minimalist web utility to inspect WAF and Bot security scores by submitting sample HTTP payloads to a Cloudflare Worker backend.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/adz80/cloudflare-ml-scorer)

## Description
Cloudflare Machine Learning Model scores is a sleek, minimalist web utility designed for developers and security professionals to analyze the security scores of HTTP payloads as processed by a Web Application Firewall (WAF). The application features a clean, single-page interface where a user can input a sample JSON payload, select an HTTP method (POST or PUT), and submit it for inspection.
Upon submission, the frontend sends the payload to a dedicated Cloudflare Worker backend API. The worker inspects the incoming request for specific security-related headers added by Cloudflare's WAF (e.g., Bot Score, WAF Attack Score). It then returns these values to the frontend, which displays them in a clear, organized, and aesthetically pleasing table. The entire experience is designed to be fast, intuitive, and visually uncluttered, focusing on the core task without distractions.
## Key Features
-   **Payload Analysis**: Submit any JSON payload to inspect its security scores.
-   **HTTP Method Selection**: Choose between POST or PUT methods for the request.
-   **Real-time Header Inspection**: View security headers added by Cloudflare's edge network.
-   **Minimalist UI**: A clean, single-page application built for focus and ease of use.
-   **Edge-Powered**: The entire application runs on the Cloudflare network for optimal performance.
-   **Responsive Design**: Flawless experience across desktop, tablet, and mobile devices.
## Technology Stack
-   **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Framer Motion
-   **Backend**: Hono on Cloudflare Workers
-   **Language**: TypeScript
-   **Package Manager**: Bun
## Getting Started
Follow these instructions to get a local copy up and running for development and testing purposes.
### Prerequisites
-   [Bun](https://bun.sh/) installed on your machine.
-   A [Cloudflare account](https://dash.cloudflare.com/sign-up).
-   [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) authenticated with your Cloudflare account.
```bash
bun pm i -g wrangler
wrangler login
```
## Configuration
To view the security scores in the application, you need to configure Cloudflare Transform Rules to expose the necessary data as request headers. The Cloudflare Worker can only read headers from the incoming request, and these security scores are not exposed by default.
Follow these steps to set up the required Transform Rules in your Cloudflare dashboard:
1.  Navigate to your website's dashboard on Cloudflare.
2.  Go to **Rules** > **Transform Rules**.
3.  Under the **Modify Request Header** tab, click **Create rule**.
4.  Give your rule a descriptive name (e.g., "Expose Security Scores").
5.  Under "When incoming requests match...", select a filter. To apply it to all requests, choose **Custom filter expression** and use a simple expression like `(http.host eq "yourdomain.com")`.
6.  Under "Then...", select **Set dynamic** for the header modification.
7.  Add the following headers one by one:
```
# Header Name        # Value
Bot-Score            cf.bot_management.score
Waf-Attack-Score     cf.waf.score
Waf-Rce-Score        cf.waf.score.rce
Waf-Sqi-Score        cf.waf.score.sqli
Waf-Xss-Score        cf.waf.score.xss
```
Save and deploy the rule. The headers will now be attached to incoming requests and visible in the Cloudflare Machine Learning Model scores application.


### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/edge_inspector.git
    cd edge_inspector
    ```
2.  **Install dependencies:**
    ```bash
    bun install
    ```
### Running Locally
To start the development server, which includes the Vite frontend and a local instance of the Cloudflare Worker, run:
```bash
bun dev
```
This will start the application on `http://localhost:3000` (or another available port). The Vite development server will automatically proxy requests from `/api/*` to your local Worker.


## Development
-   **Frontend**: All React components and pages are located in the `src/` directory.
-   **Backend**: The Cloudflare Worker API logic is in the `worker/` directory. New API routes should be added to `worker/userRoutes.ts`.
The application is built with a focus on visual excellence and maintainability. When adding new components, please adhere to the existing design system provided by `shadcn/ui` and Tailwind CSS.
## Deployment
This project is designed for a one-click deployment to Cloudflare Pages.
1.  **Build the application:**
    ```bash
    bun run build
    ```
2.  **Deploy to Cloudflare:**
    The `deploy` script in `package.json` handles both the frontend build and the worker deployment.
    ```bash
    bun run deploy
    ```
    Wrangler will guide you through the deployment process.
Alternatively, you can deploy directly from your GitHub repository.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/adz80/cloudflare-ml-scorer)

## API Endpoint
The application uses a single backend endpoint to process requests.
### `POST /api/inspect`
-   **Method**: `POST`
-   **Description**: Accepts a request with a JSON payload and returns the security headers of the incoming request as seen by the Cloudflare Worker.
-   **Request Body**: Any valid JSON payload. The content of the body is not processed, but its presence and structure may influence WAF scores.
-   **Success Response (200)**:
    ```json
    {
      "Bot-Score": "29",
      "Waf-Attack-Score": "N/A",
      "Waf-Rce-Score": "N/A",
      "Waf-Sqi-Score": "N/A",
      "Waf-Xss-Score": "N/A"
    }
    ```
    *Note: 'N/A' is returned if a specific header is not present on the request.*
