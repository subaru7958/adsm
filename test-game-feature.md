# Quick Test Commands

## Start Your Application

### Option 1: Manual Start (Recommended for first time)

**Terminal 1 - Backend:**
```bash
cd server
npm start
```
Wait for: `Server running on port 5000` or similar

**Terminal 2 - Frontend:**
```bash
cd coach-crew-manager-main
npm run dev
```
Wait for: `Local: http://localhost:5173/` or similar

---

## Quick Visual Test

Once both are running:

### 1. Test Admin View (2 minutes)
1. Open browser: `http://localhost:5173`
2. Login as admin
3. Go to Training/Sessions page
4. Click "Schedule Session"
5. **Change "Event Type" dropdown** - you should see:
   - Training
   - Game ← NEW
   - Meet ← NEW
   - Competition ← NEW
6. Select "Game"
7. **New fields should appear:**
   - Opponent (text input)
   - Location Type (dropdown: Home/Away/Neutral)

✅ **If you see these new fields, the feature is working!**

### 2. Create a Test Game (3 minutes)
Fill in:
- Name: "Test Game"
- Event Type: "Game"
- Date: Tomorrow
- Time: 15:00
- Group: Any group
- **Opponent: "Test Opponent"**
- **Location Type: "Home"**
- Location: "Test Stadium"

Click Save

✅ **Look for orange badge and "vs Test Opponent" in the card**

### 3. Test Coach View (2 minutes)
1. Logout
2. Login as coach
3. Find "Test Game" in your sessions
4. Click to open it
5. **Look for orange "Enter Final Score" card**

✅ **If you see the score entry form, coach feature works!**

### 4. Test Player View (1 minute)
1. Logout
2. Login as player
3. Check dashboard schedule
4. **Look for orange-styled game card**

✅ **If game has orange background/badge, player view works!**

---

## Total Test Time: ~8 minutes

If all checkmarks pass, your feature is fully functional! 🎉

---

## Troubleshooting

**Problem: Server won't start**
```bash
cd server
npm install
npm start
```

**Problem: Frontend won't start**
```bash
cd coach-crew-manager-main
npm install
npm run dev
```

**Problem: Changes not showing**
- Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Restart both servers

**Problem: "Opponent is required" error**
- This is correct! Opponent field is required for games
- Make sure you filled it in

---

## What to Look For

### ✅ Success Indicators:
- New "Event Type" dropdown in admin form
- "Opponent" and "Location Type" fields appear for games
- Orange badges on game cards
- Orange score entry card for coaches
- Orange game cards for players
- No errors in browser console

### ❌ Failure Indicators:
- No "Event Type" dropdown
- Form looks exactly the same as before
- Console errors about missing fields
- Server crashes when creating games

---

## Quick Database Check (Optional)

If you want to verify data is saved correctly:

**Using MongoDB Compass:**
1. Connect to your database
2. Find `trainingsessions` collection
3. Look for your test game
4. Check it has: `eventType: "game"`, `opponent: "Test Opponent"`, `locationType: "home"`

**Using MongoDB Shell:**
```bash
mongosh
use [your-database-name]
db.trainingsessions.findOne({ eventType: "game" })
```

Should return your game with all the new fields.

---

## After Testing

Once everything works:
1. ✅ Delete test data if needed
2. ✅ Create real games for your team
3. ✅ Share QUICK_START_GUIDE.md with your users
4. ✅ Enjoy the new feature!
