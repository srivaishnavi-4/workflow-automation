# ⚡ Workflow Automation System

A full-stack project for designing, managing, and executing automated workflows with a dynamic rule engine, live execution tracking, and audit logging.

---

## 📦 Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | HTML5, Tailwind CSS (CDN), Bootstrap 5 (CDN), Vanilla JS (AJAX) |
| Backend  | Node.js, Express.js                 |
| Database | MongoDB (via MongoDB Compass / local) |
| ODM      | Mongoose                            |

---

## 🗂 Project Structure

```
workflow-automation/
├── server.js                  ← Entry point
├── seed.js                    ← Sample data seeder
├── .env                       ← Environment config
├── package.json
│
├── models/
│   ├── Workflow.js
│   ├── Step.js
│   ├── Rule.js
│   └── Execution.js
│
├── routes/
│   ├── workflows.js           ← /api/workflows (+ steps + execute)
│   ├── steps.js               ← /api/steps
│   ├── rules.js               ← /api/rules
│   └── executions.js          ← /api/executions
│
├── middleware/
│   └── ruleEngine.js          ← Condition evaluator
│
└── public/
    ├── css/style.css
    ├── js/
    │   ├── app.js             ← Shared AJAX client + utilities
    │   └── sidebar.js         ← Sidebar component
    └── pages/
        ├── index.html         ← Dashboard / Workflow List
        ├── workflow-editor.html ← Create/Edit workflow + steps + rules
        ├── execute.html       ← Execute workflow + live progress
        ├── audit.html         ← Audit log (all executions)
        └── execution-detail.html ← Detailed execution logs
```

---

## ⚙️ Setup Instructions

### Prerequisites
- **Node.js** v18+ 
- **MongoDB** running locally (default: `mongodb://localhost:27017`)
- MongoDB Compass (optional, for GUI browsing)

### Step 1 – Clone / Download
```bash
cd workflow-automation
```

### Step 2 – Install Dependencies
```bash
npm install
```

### Step 3 – Configure Environment
Edit `.env` if needed:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/workflow_automation
NODE_ENV=development
```

### Step 4 – Seed Sample Data (Optional but Recommended)
```bash
node seed.js
```
This creates 2 ready-to-use workflows: **Expense Approval** and **Employee Onboarding**.

### Step 5 – Start the Server
```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

### Step 6 – Open the App
Visit: **http://localhost:3000**

---

## 🧭 Features & Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | Lists all workflows with stats, search, pagination |
| Workflow Editor | `/workflows/new` | Create new workflow with schema + steps |
| Edit Workflow | `/workflows/:id/edit` | Edit name, schema, steps, rules |
| Execute | `/workflows/:id/execute` | Input data form + live execution tracking |
| Audit Log | `/executions` | History of all executions |
| Execution Detail | `/executions/:id` | Full step-by-step rule evaluation log |

---

## 🔌 REST API Reference

### Workflows
```
POST   /api/workflows                        Create workflow
GET    /api/workflows?search=&page=&limit=   List workflows
GET    /api/workflows/:id                    Get with steps & rules
PUT    /api/workflows/:id                    Update (auto-increments version)
DELETE /api/workflows/:id                    Delete cascade
```

### Steps
```
POST   /api/workflows/:workflow_id/steps     Add step
GET    /api/workflows/:workflow_id/steps     List steps
PUT    /api/steps/:id                        Update step
DELETE /api/steps/:id                        Delete step + its rules
```

### Rules
```
POST   /api/steps/:step_id/rules             Add rule
GET    /api/steps/:step_id/rules             List rules
PUT    /api/rules/:id                        Update rule
DELETE /api/rules/:id                        Delete rule
```

### Executions
```
POST   /api/workflows/:id/execute            Start execution
GET    /api/executions                       List all (audit log)
GET    /api/executions/:id                   Get status & logs
POST   /api/executions/:id/cancel            Cancel execution
POST   /api/executions/:id/retry             Retry from failed step
```

---

## ⚡ Rule Engine

Rules are evaluated at runtime against the workflow input data. Each step has ordered rules; **the first matching rule wins**.

### Supported Operators

| Operator | Example |
|----------|---------|
| `==`, `!=` | `country == 'US'` |
| `<`, `>`, `<=`, `>=` | `amount > 100` |
| `&&`, `\|\|` | `amount > 100 && priority == 'High'` |
| `contains()` | `contains(department, "Fin")` |
| `startsWith()` | `startsWith(role, "Senior")` |
| `endsWith()` | `endsWith(email, ".com")` |
| `DEFAULT` | Matches when no other rule matches |

### Loop Prevention
Max **20 iterations** per execution. If exceeded, execution is marked **failed** with an error message.

---

## 📋 Sample Workflow 1 – Expense Approval

**Input Schema:** `amount (number)`, `country (string)`, `department (string)`, `priority (High|Medium|Low)`

**Steps & Rules:**

| Step | Priority | Condition | Next Step |
|------|----------|-----------|-----------|
| Manager Approval | 1 | `amount > 100 && country == 'US' && priority == 'High'` | Finance Notification |
| Manager Approval | 2 | `amount <= 100 \|\| department == 'HR'` | CEO Approval |
| Manager Approval | 3 | `priority == 'Low' && country != 'US'` | Task Rejection |
| Manager Approval | 4 | `DEFAULT` | Task Rejection |
| Finance Notification | 1 | `amount > 500 && priority == 'High'` | CEO Approval |
| Finance Notification | 2 | `DEFAULT` | End |
| CEO Approval | 1 | `DEFAULT` | End |

**Sample Input:**
```json
{ "amount": 250, "country": "US", "department": "Finance", "priority": "High" }
```
**Expected path:** Manager Approval → Finance Notification → CEO Approval → End ✅

---

## 📋 Sample Workflow 2 – Employee Onboarding

**Input Schema:** `employee_name`, `department`, `role`, `start_date`, `is_remote (Yes|No)`

**Steps:** HR Notification → IT Setup → Manager Welcome → Compliance Training

**Sample Input:**
```json
{ "employee_name": "Priya S", "department": "Engineering", "role": "Backend Dev", "start_date": "2026-04-01", "is_remote": "Yes" }
```

---

## 🏗 Workflow Engine Design

```
Execution Start
     │
     ▼
Load Workflow + start_step_id
     │
     ▼
┌─────────────────────────────┐
│  Fetch Current Step         │
│  Load its Rules (sorted)    │
│  Evaluate each condition    │
│  First match → next_step_id │
│  Log result                 │
└────────────┬────────────────┘
             │
     next_step_id == null?
             │
         YES ▼          NO ──► Repeat with next step
     Workflow Complete
```

- All evaluations are **logged** with pass/fail per rule
- **Async execution** — API returns immediately, workflow runs in background
- **Polling** — Frontend polls `/api/executions/:id` every 2 seconds for live updates
- **Retry** — Restarts only from the failed step, not the beginning

---

## 📸 MongoDB Compass

After running, connect Compass to `mongodb://localhost:27017` and browse:
- `workflow_automation.workflows`
- `workflow_automation.steps`
- `workflow_automation.rules`
- `workflow_automation.executions`
