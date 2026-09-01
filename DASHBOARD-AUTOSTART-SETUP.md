# Dashboard Auto-Start Setup Guide

## Option 1: Using Windows Task Scheduler (RECOMMENDED)

### Step 1: Open Task Scheduler
1. Press `Win + R` to open Run dialog
2. Type: `taskschd.msc` and press Enter
3. Click "Task Scheduler" to open

### Step 2: Create a New Task
1. In the left pane, right-click "Task Scheduler Library"
2. Click "Create Basic Task"
3. Fill in the details:
   - **Name:** E2E Dashboard Auto-Start
   - **Description:** Automatically starts the Salesforce E2E Test Dashboard
   - Click **Next**

### Step 3: Set Trigger
1. Select: **At Startup**
2. Click **Next**

### Step 4: Set Action
1. Select: **Start a program**
2. Fill in:
   - **Program/script:** `C:\Users\Admin\Desktop\quick\start-dashboard.bat`
   - **Start in:** `C:\Users\Admin\Desktop\quick`
3. Click **Next**

### Step 5: Finish
1. Check: **Open the Properties dialog when I click Finish**
2. Click **Finish**

### Step 6: Configure Advanced Settings (Optional but Recommended)
In the Properties dialog:
1. **General Tab:**
   - ☑ Run with highest privileges
   - Select: Run whether user is logged in or not

2. **Triggers Tab:**
   - Edit the startup trigger
   - ☑ Delay task for: 30 seconds (to ensure system is ready)

3. **Conditions Tab:**
   - Uncheck: "Start the task only if the computer is on AC power"

4. Click **OK**

---

## Option 2: Using PowerShell Script (Admin Required)

Run the provided PowerShell script as Administrator:

```powershell
# Right-click PowerShell and select "Run as Administrator"
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
& 'C:\Users\Admin\Desktop\quick\Setup-DashboardAutoStart.ps1'
```

---

## Option 3: Windows Startup Folder (Simple but Less Reliable)

1. Press `Win + R` and type: `shell:startup`
2. Create a shortcut to: `C:\Users\Admin\Desktop\quick\start-dashboard.bat`
3. Place the shortcut in the Startup folder

**Note:** This method requires you to be logged in and may have delays.

---

## Verification

After setting up, verify the task:

### Check in Task Scheduler:
1. Open Task Scheduler (`taskschd.msc`)
2. Look for: **E2E Dashboard Auto-Start** in the Library
3. Status should show: **Ready** or **Running**

### Check if dashboard is running:
- Open browser and go to: `http://localhost:3000`
- Dashboard should be accessible

### View logs:
```powershell
# Check the dashboard startup log
Get-Content 'C:\Users\Admin\Desktop\quick\dashboard.log' -Tail 10
```

---

## Troubleshooting

### Dashboard doesn't start:
1. Check if Node.js is installed globally
2. Verify path: `C:\Users\Admin\Desktop\quick\start-dashboard.bat` exists
3. Run the batch file manually to test: 
   - Double-click `start-dashboard.bat`
   - Wait 5 seconds, then check `http://localhost:3000`

### Task Scheduler shows error:
1. Right-click the task → Properties
2. Check the "History" tab for error messages
3. Verify "Run with highest privileges" is enabled

### Port 3000 already in use:
1. Change PORT in `.env` file: `PORT=3001`
2. Update the dashboard URL accordingly

---

## Manual Start/Stop

### Start dashboard manually:
```powershell
cd C:\Users\Admin\Desktop\quick
node server.js
```

### Stop dashboard:
1. Press `Ctrl + C` in terminal
2. Or: `Get-Process node | Stop-Process -Force`

---

## Next Steps

✅ Run Option 1 (Task Scheduler) - Most Reliable
✅ Restart your computer to test auto-start
✅ Access dashboard at `http://localhost:3000`
✅ Tests will run with full environment from `.env` file

---

## Files Created

- `start-dashboard.bat` - Batch script to start dashboard
- `Setup-DashboardAutoStart.ps1` - PowerShell setup script
- `DASHBOARD-AUTOSTART-SETUP.md` - This guide
