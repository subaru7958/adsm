# Troubleshooting: Event Type Dropdown Not Showing

## Issue: Can't see the new "Event Type" dropdown in the form

### Solution Steps (Try in order):

## Step 1: Hard Refresh Your Browser ⚡
The most common issue - browser cache!

**Windows/Linux:**
- Press `Ctrl + Shift + R` or `Ctrl + F5`

**Mac:**
- Press `Cmd + Shift + R`

**Or manually:**
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

---

## Step 2: Restart the Frontend Development Server 🔄

1. **Stop the frontend server:**
   - Go to the terminal running `npm run dev`
   - Press `Ctrl + C`

2. **Start it again:**
   ```bash
   cd coach-crew-manager-main
   npm run dev
   ```

3. **Wait for it to fully start:**
   - Look for: `Local: http://localhost:5173/` or similar
   - Make sure there are no errors

4. **Open browser in incognito/private mode:**
   - This ensures no cache issues
   - Go to the URL shown in terminal

---

## Step 3: Check Browser Console for Errors 🔍

1. Open browser DevTools (F12)
2. Go to "Console" tab
3. Look for any red errors
4. Common errors and fixes:

**Error: "Cannot read property 'eventType' of undefined"**
→ The form state might not be initialized. Restart frontend server.

**Error: "Unexpected token"**
→ Syntax error in the file. Check if Training.tsx was saved properly.

**No errors but still not showing:**
→ Continue to Step 4

---

## Step 4: Verify File Was Saved Correctly 💾

Let's make sure the changes are actually in the file:

1. Open `coach-crew-manager-main/src/pages/admin/Training.tsx`
2. Search for "Event Type" (Ctrl+F)
3. You should find this code around line 460:

```tsx
<div>
  <Label>Event Type</Label>
  <select 
    className="w-full border rounded px-3 py-2 text-sm"
    value={form.eventType} 
    onChange={(e) => setForm({ ...form, eventType: e.target.value as any })}
  >
    <option value="training">Training</option>
    <option value="game">Game</option>
    <option value="meet">Meet</option>
    <option value="competition">Competition</option>
  </select>
</div>
```

**If you DON'T see this code:**
- The file wasn't saved properly
- Re-save the file (Ctrl+S)
- Restart the frontend server

**If you DO see this code:**
- Continue to Step 5

---

## Step 5: Check Form State Initialization 🎯

1. In the same file, search for `const [form, setForm] = useState`
2. Around line 100, you should see:

```tsx
const [form, setForm] = useState({
  name: "",
  type: "special",
  eventType: "training" as "training" | "game" | "meet" | "competition",  // ← This line
  date: "",
  time: "",
  location: "",
  group: "",
  weekly: false,
  days: [] as string[],
  opponent: "",  // ← This line
  locationType: "home" as "home" | "away" | "neutral",  // ← This line
});
```

**If missing:**
- The file wasn't updated correctly
- Let me know and I'll help fix it

---

## Step 6: Clear All Cache and Restart Everything 🔥

Nuclear option - start fresh:

1. **Stop both servers** (Ctrl+C in both terminals)

2. **Clear browser cache:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Firefox: Settings → Privacy → Clear Data → Cached Web Content

3. **Delete node_modules/.vite cache (if exists):**
   ```bash
   cd coach-crew-manager-main
   rm -rf node_modules/.vite  # or manually delete the folder
   ```

4. **Restart frontend:**
   ```bash
   npm run dev
   ```

5. **Open in incognito mode**

---

## Step 7: Verify You're on the Right Page 📍

Make sure you're actually on the form:

1. Login as **Admin** (not coach or player)
2. Navigate to **"Training"** or **"Sessions"** page
3. Click the **"Schedule Session"** button (top right, blue button with + icon)
4. A form should pop up in a card

**The Event Type dropdown should be the SECOND field** (right after "Name")

---

## Quick Visual Check ✅

When the form opens, you should see fields in this order:

```
1. Name [text input]
2. Event Type [dropdown] ← YOU SHOULD SEE THIS
3. Weekly [checkbox]
4. Date [date picker] (if not weekly)
5. Time [time picker]
6. Location [text input]
7. Group [dropdown]
```

If you see "Event Type" dropdown, select "Game" and you should see:
```
8. Opponent [text input] ← APPEARS WHEN GAME SELECTED
9. Location Type [dropdown] ← APPEARS WHEN GAME SELECTED
```

---

## Still Not Working? 🆘

### Check if TypeScript is compiling:

Look at your terminal running `npm run dev`. You should see:
```
✓ built in XXXms
```

If you see errors like:
```
✗ Error: ...
```

Then there's a compilation error. Share the error message.

---

## Alternative: Manual Verification

If nothing works, let's verify the code manually:

1. Open `coach-crew-manager-main/src/pages/admin/Training.tsx`
2. Find line ~460 (in the form section)
3. Take a screenshot of lines 455-475
4. Share it so I can verify the code is correct

---

## Common Mistakes ❌

1. **Looking at the wrong page** - Make sure you're on Admin → Training Sessions
2. **Not clicking "Schedule Session"** - The form only appears after clicking the button
3. **Browser cache** - Most common issue, always try hard refresh first
4. **Old tab open** - Close all tabs and open a fresh one
5. **Wrong user role** - Must be logged in as Admin

---

## Expected Behavior ✅

**When form opens:**
- Event Type dropdown is visible (second field)
- Default value is "Training"

**When you select "Game":**
- Opponent field appears below Group
- Location Type dropdown appears below Opponent

**When you select "Training":**
- Opponent and Location Type fields disappear

---

## Debug Mode 🐛

Add this temporarily to see what's happening:

1. Open Training.tsx
2. Find the form section (around line 453)
3. Add this line right after `<CardContent>`:

```tsx
<div className="p-2 bg-yellow-100 text-xs">
  Debug: eventType = {form.eventType} | opponent = {form.opponent}
</div>
```

4. Save and refresh
5. Open the form
6. You should see a yellow debug box showing the current values

If you see the debug box but not the dropdown, there's a rendering issue.

---

## Last Resort: Re-apply Changes

If absolutely nothing works, I can re-apply the changes to the file. Let me know!
