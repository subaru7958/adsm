# Testing Guide: Game Scheduling Feature

## Prerequisites

Make sure your application is running:

### Terminal 1 - Backend Server
```bash
cd server
npm install  # If you haven't already
npm start    # or npm run dev
```

### Terminal 2 - Frontend Client
```bash
cd coach-crew-manager-main
npm install  # If you haven't already
npm run dev
```

The backend should be running on `http://localhost:5000`
The frontend should be running on `http://localhost:5173` (or similar)

---

## Test Scenario 1: Admin Creates a Game

### Steps:

1. **Login as Admin**
   - Go to `http://localhost:5173/login`
   - Use your admin credentials

2. **Navigate to Training Sessions**
   - Click on "Training" or "Sessions" in the sidebar
   - You should see the Training Sessions page

3. **Create a New Game**
   - Click the **"Schedule Session"** button (top right)
   - Fill in the form:
     ```
     Name: Championship Game
     Event Type: Game  ← SELECT THIS (not Training)
     Weekly: Unchecked
     Date: [Select tomorrow's date]
     Time: 15:00
     Location: City Stadium
     Group: [Select any group]
     Opponent: Lincoln High School  ← NEW FIELD
     Location Type: Home  ← NEW FIELD
     ```
   - Click **"Save"**

4. **Verify the Game Appears**
   - You should see the new game in the list
   - Look for:
     - ✅ Orange "GAME" badge
     - ✅ Orange-tinted card background
     - ✅ "vs Lincoln High School" displayed
     - ✅ "Location: Home" shown

### Expected Result:
```
✅ Game created successfully
✅ Orange badge visible
✅ Opponent name displayed
✅ Location type shown
```

---

## Test Scenario 2: Admin Creates a Training Session (Verify No Breaking Changes)

### Steps:

1. Click **"Schedule Session"** again
2. Fill in the form:
   ```
   Name: Regular Practice
   Event Type: Training  ← Keep as Training
   Date: [Tomorrow]
   Time: 17:00
   Location: Practice Field
   Group: [Select any group]
   ```
   - Notice: **No opponent or location type fields** (they're hidden for training)
3. Click **"Save"**

### Expected Result:
```
✅ Training session created normally
✅ No orange badge (regular styling)
✅ No opponent field shown
✅ Existing functionality works perfectly
```

---

## Test Scenario 3: Coach Submits Game Score

### Steps:

1. **Logout and Login as Coach**
   - Logout from admin
   - Login with coach credentials

2. **Navigate to Coach Dashboard**
   - You should see your assigned sessions

3. **Open the Game You Created**
   - Find "Championship Game" in the list
   - Click on it to open attendance page

4. **Verify Game Score Card Appears**
   - You should see:
     - ✅ Regular attendance section (mark players)
     - ✅ **Orange "Enter Final Score" card** (NEW!)
     - ✅ Shows "vs Lincoln High School"
     - ✅ Shows "Home Game"

5. **Submit Attendance and Score**
   - Mark some players as present/absent
   - In the score card:
     ```
     Our Score: 3
     Opponent Score: 2
     Game Summary: Great team effort! Strong defense in second half.
     ```
   - Click **"Submit All"**

### Expected Result:
```
✅ Success message appears
✅ Redirected to coach dashboard
✅ Score saved to database
```

---

## Test Scenario 4: Player Views Game and Score

### Steps:

1. **Logout and Login as Player**
   - Logout from coach
   - Login with player credentials

2. **View Player Dashboard**
   - You should see your schedule

3. **Verify Game Display**
   - Find "Championship Game" in the list
   - Look for:
     - ✅ Orange background/border
     - ✅ "GAME" badge
     - ✅ "vs Lincoln High School"
     - ✅ "Home Game"
     - ✅ **"Final Score: 3 - 2"** (if game date has passed)

### Expected Result:
```
✅ Game visually distinct from training
✅ Opponent name visible
✅ Location type shown
✅ Final score displayed (for past games)
```

---

## Test Scenario 5: Edit a Game

### Steps:

1. **Login as Admin**
2. **Go to Training Sessions**
3. **Find the game you created**
4. **Click "Edit" button**
5. **Modify fields:**
   ```
   Opponent: Change to "Riverside Academy"
   Location Type: Change to "Away"
   ```
6. **Click "Save"**

### Expected Result:
```
✅ Game updated successfully
✅ New opponent name displayed
✅ Location type changed to "Away"
```

---

## Test Scenario 6: Create a Swimming Meet

### Steps:

1. **As Admin, create new session:**
   ```
   Name: Regional Swimming Championship
   Event Type: Meet  ← Try this option
   Date: [Next week]
   Time: 09:00
   Location: Aquatic Center
   Group: [Swimming group]
   Opponent: Riverside Swim Club
   Location Type: Away
   ```
2. **Save and verify**

### Expected Result:
```
✅ Meet created with "MEET" badge
✅ Orange styling applied
✅ All game features work for meets too
```

---

## Quick Verification Checklist

### Backend API Tests (Optional - Use Postman or curl)

**Test 1: Create a game**
```bash
POST http://localhost:5000/api/sessions
Headers: Authorization: Bearer [your-admin-token]
Body:
{
  "title": "Test Game",
  "sessionType": "special",
  "eventType": "game",
  "group": "[group-id]",
  "opponent": "Test Opponent",
  "locationType": "home",
  "specialStartTime": "2024-12-01T15:00:00Z",
  "specialEndTime": "2024-12-01T17:00:00Z"
}
```

**Test 2: Submit game score**
```bash
POST http://localhost:5000/api/coach/game-score
Headers: Authorization: Bearer [your-coach-token]
Body:
{
  "sessionId": "[session-id]",
  "teamScore": "5",
  "opponentScore": "3",
  "gameNotes": "Excellent performance"
}
```

---

## Troubleshooting

### Issue: Opponent field not showing
**Solution:** Make sure Event Type is set to "Game", "Meet", or "Competition" (not "Training")

### Issue: Score card not appearing for coach
**Solution:** 
- Verify the session eventType is not "training"
- Check that you're viewing the correct session

### Issue: Player doesn't see final score
**Solution:**
- Coach must submit the score first
- Game date must be in the past
- Refresh the player dashboard

### Issue: Database validation error
**Solution:**
- For games, opponent and locationType are required
- Make sure these fields are filled in

---

## Browser Console Checks

Open browser DevTools (F12) and check:

1. **Network Tab:**
   - Look for POST/PUT requests to `/api/sessions`
   - Verify request payload includes `eventType`, `opponent`, `locationType`

2. **Console Tab:**
   - Should have no errors
   - Look for successful API responses

3. **React DevTools:**
   - Check component state includes new game fields

---

## Database Verification (Optional)

If you have MongoDB Compass or similar:

1. Connect to your database
2. Open `trainingsessions` collection
3. Find your created game
4. Verify fields exist:
   ```json
   {
     "_id": "...",
     "title": "Championship Game",
     "eventType": "game",
     "opponent": "Lincoln High School",
     "locationType": "home",
     "teamScore": "3",
     "opponentScore": "2",
     "isCompleted": true,
     "gameNotes": "Great team effort!",
     ...
   }
   ```

---

## Success Criteria

✅ **Admin can create games with opponent and location type**
✅ **Games display with orange styling and badges**
✅ **Coach can submit game scores**
✅ **Players see game information and final scores**
✅ **Training sessions still work normally (no breaking changes)**
✅ **Edit functionality works for games**
✅ **All event types (game/meet/competition) work**

---

## Next Steps After Testing

1. **Test with real data** - Create games for actual upcoming matches
2. **Train your users** - Share the QUICK_START_GUIDE.md
3. **Monitor usage** - Check if coaches are submitting scores
4. **Gather feedback** - Ask users what they think
5. **Consider enhancements** - Win/loss records, statistics, etc.

---

## Need Help?

If you encounter issues:
1. Check browser console for errors
2. Check server logs for backend errors
3. Verify all files were saved and server restarted
4. Review GAME_SCHEDULING_IMPLEMENTATION.md for technical details
