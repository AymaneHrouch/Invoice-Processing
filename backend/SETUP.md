# Invoice Processing App — Local Setup Guide

## Prerequisites

- Python 3.10+
- pip
- Git
- A MongoDB instance (local, Railway, or Atlas — see options below)

---

## 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd backend
pip install -r requirements.txt
```

---

## 2. Create Your `.env` File

Copy the example file:

```bash
cp .env.example .env
```

Then fill in each variable following the sections below.

---

## 3. MongoDB — Choose One Option

### Option A: Local MongoDB (quickest for dev)

Install MongoDB Community Edition from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community), start it, then set:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=invoice_processing
```

### Option B: MongoDB Atlas (recommended for sharing / testing with real data)

1. Create a free account at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Click **"Create"** → choose **M0 Free Tier** → pick **AWS eu-west-1 (Ireland)**
3. Create a database user: **Security → Database Access → Add New Database User**
   - Username + strong password → Role: **Read and Write to Any Database**
4. Whitelist your IP: **Security → Network Access → Add IP Address**
   - For local dev: click **"Add Current IP Address"**
   - For Railway: use `0.0.0.0/0` (allow all) during testing, then restrict later
5. Get your connection string: **Database → Connect → Drivers → Python**
   - It looks like: `mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/`

```env
MONGO_URL=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/
DB_NAME=invoice_processing
```

### Option C: Railway Integrated MongoDB (for Railway deployments only)

In your Railway project dashboard:
1. Click **"+ New"** → **Database** → **MongoDB**
2. Once created, click on the MongoDB service → **Variables** tab
3. Copy the `MONGO_URL` value Railway auto-generates

```env
MONGO_URL=<paste Railway's MONGO_URL here>
DB_NAME=invoice_processing
```

> ⚠️ Railway's MongoDB is a plain Docker container with no automatic backups. Use it only for development/demo, not for storing real client data. Use Atlas for that.

---

## 4. Azure Document Intelligence

This is used to extract data from invoice PDFs and scanned documents.

1. Go to [portal.azure.com](https://portal.azure.com) → **Create a resource**
2. Search for **"Document Intelligence"** → **Create**
3. Fill in:
   - **Region**: France Central (closest to Morocco)
   - **Pricing tier**: Free F0 (500 pages/month, enough for MVP)
4. Once deployed, go to the resource → **Keys and Endpoint** (left sidebar)
5. Copy **KEY 1** and **Endpoint**

```env
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_key_here
```

---

## 5. Google Cloud Document AI (Optional)

Only needed if the app uses Google Cloud as an alternative extraction provider. Skip if you're using Azure only.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project
2. Enable the **Document AI API**: APIs & Services → Library → search "Document AI" → Enable
3. Create a processor: **Document AI → Processors → Create Processor** → choose **Invoice Parser**
   - Note the **Processor ID** from the processor details page
4. Create a service account: **IAM & Admin → Service Accounts → Create**
   - Grant role: **Document AI API User**
   - Create a JSON key: Actions → Manage Keys → Add Key → JSON
   - Download the `.json` file and place it in the project folder (do NOT commit it to git)
5. Set the location where you created the processor (usually `us` or `eu`)

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/credentials.json
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_PROJECT_LOCATION=us
GOOGLE_CLOUD_PROCESSOR_ID=your-processor-id
```

---

## 6. AWS (Optional)

Only needed if the app uses Amazon Textract as an alternative extraction provider. Skip if not needed.

1. Go to [console.aws.amazon.com](https://console.aws.amazon.com) → **IAM → Users → Create User**
2. Attach policy: **AmazonTextractFullAccess**
3. Create access keys: User → Security credentials → Create access key → CLI
4. Install the AWS CLI and configure a named profile:

```bash
aws configure --profile aws-profile-name
# Enter: Access Key ID, Secret Access Key, Region (e.g. us-east-1)
```

```env
AWS_PROFILE_NAME=aws-profile-name
AWS_REGION_NAME=us-east-1
```

---

## 7. Admin Account & JWT Secret (Optional)

These have safe defaults — the app starts fine without them.

**JWT_SECRET** — if not set, the app auto-generates a random secret on startup. This is fine for local dev, but in production you must set a fixed value, otherwise all tokens are invalidated every time the server restarts.

```bash
# Generate a secure value for production:
python -c "import secrets; print(secrets.token_hex(32))"
```

**ADMIN_\* variables** — if all three are provided, the app creates a seed admin user on first startup. If any one of them is missing, admin creation is simply skipped — it is not an error.

```env
JWT_SECRET=paste_generated_value_here   # optional locally, required in production
ADMIN_FULL_NAME=Your Name               # optional
ADMIN_EMAIL=admin@yourdomain.com        # optional
ADMIN_PASSWORD=choose_a_strong_password # optional
```

---

## 8. Run the App

```bash
cd backend
python -m uvicorn app.main:app --reload
```

The API is available at:
- **API**: [http://localhost:8000](http://localhost:8000)
- **Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 9. Deploy to Railway

1. Push your code to GitHub
2. In Railway: **New Project → Deploy from GitHub repo**
3. Add all environment variables from your `.env` under the **Variables** tab
4. For MongoDB, use Atlas (recommended) or Railway's integrated MongoDB (see Option B/C above)
5. Railway auto-detects the `uvicorn` start command. If not, set manually:
   ```
   cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

---

## Minimal `.env` to Get Started

The absolute minimum to have a working app with invoice processing:

```env
MONGO_URL=mongodb+srv://...
DB_NAME=invoice_processing
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_key_here
```

The app will start without Azure keys, but the `/invoices/upload` endpoint will fail when called. Everything else (auth, health check) works fine without them.

Google Cloud and AWS variables can be left unset — they are only needed if you switch the OCR provider away from Azure.
