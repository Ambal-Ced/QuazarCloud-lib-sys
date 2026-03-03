# Library User Utilization — Excel Automation

BatStateU Lipa Campus · Office of Library Services

Paste records from the source system → get a fully filled Excel report → download it.

---

## How It Works

1. Copy rows from the library log system (no header needed)
2. Paste into the web app
3. Click **Process Data**
4. Download the filled `.xlsx` file — all formulas recalculate automatically

The system reads **column 2** (date), **column 5** (sex: MALE/FEMALE), and **column 7** (course/program code) from the pasted data.

---

## Running Locally (No Internet)

### Requirements
- [Node.js v18+](https://nodejs.org/) (already installed)

### Steps

```bash
# 1. Go into the app folder
cd "D:\New folder (4)\libsys\app"

# 2. Install dependencies (first time only)
npm install

# 3. Start the development server
npm run dev
```

Open your browser at **http://localhost:3000**

To stop: press `Ctrl+C` in the terminal.

> **Tip:** Create a `run.bat` file in the app folder with this content for a one-click start:
> ```bat
> @echo off
> cd /d "D:\New folder (4)\libsys\app"
> npm run dev
> pause
> ```

---

## Deploying to Vercel (Online Access)

### Requirements
- GitHub account
- [Vercel account](https://vercel.com) (free)

### Steps

1. Push this project to a GitHub repository:
   ```bash
   cd "D:\New folder (4)\libsys\app"
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your GitHub repo

3. Vercel auto-detects Next.js. Click **Deploy** — no extra settings needed.

4. Your app is live at `https://your-project-name.vercel.app`

> **Note on Vercel templates:** Vercel has a read-only filesystem, so uploaded templates are stored temporarily per deployment. For permanent template changes, replace `data/template.xlsx` in the repo and redeploy.

---

## Updating Course Codes

If the course codes in the source system change, edit `lib/courseMap.ts`:

```typescript
const courseMap = {
  "NEW CODE HERE": {
    label: "Program Name (College)",
    maleRow: 14,    // row number in the February sheet
    femaleRow: 15,
  },
  // ...
};
```

The row numbers match the Excel template. Male row is always one row above female row for each program.

---

## Updating the Excel Template

When program names change in the Excel file:

1. Update your `.xlsx` template locally
2. In the web app, go to **Template Management** (bottom of page)
3. Upload the new `.xlsx` file

Or for a permanent update: replace `data/template.xlsx` in the project and redeploy to Vercel.

---

## File Structure

```
app/
├── app/
│   ├── api/
│   │   ├── process/route.ts          # Processes pasted data → fills xlsx
│   │   └── upload-template/route.ts  # Manages template file
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                      # Main UI
├── lib/
│   ├── courseMap.ts                  # Course code → Excel row mapping
│   └── processor.ts                  # Core parsing + Excel writing logic
├── data/
│   └── template.xlsx                 # Default Excel template
└── README.md
```
