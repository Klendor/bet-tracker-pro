# Bet Tracker Pro - Google Sheets Template Plan

## Overview
This document outlines the complete design and implementation plan for the Bet Tracker Pro Google Sheets template. The template will be pre-designed and automatically copied to each user's Google Drive when they connect their Google Sheets account.

## Core Principles
- **Pre-made template approach**: Beautiful, fully-formatted template that gets copied to user's Drive
- **Automatic bookmaker detection**: Extension detects bookmaker from website domain
- **Smart status management**: Auto-detect bet status from screenshots, allow manual updates
- **Mobile-responsive**: Optimized for both desktop and mobile viewing
- **Focus on essentials**: Profit/loss tracking, bankroll management, pending bet alerts

---

## Template Structure

### Sheet 1: Bet Tracker (Main Data)

#### Visible Columns
| Column | Field | Type | Description | Example |
|--------|-------|------|-------------|---------|
| A | ID | Auto-number | Unique bet identifier | 001, 002, 003 |
| B | Status | Dropdown | Current bet status | PENDING, WON, LOST, VOID, PUSH, CASHED OUT |
| C | Match DateTime | DateTime | When the match/event occurs | Aug 30, 7:00 PM |
| D | Sport | Text/Dropdown | Sport category | NBA, NFL, Soccer |
| E | Teams/Event | Text | Teams or event description | Lakers vs Celtics |
| F | Market | Dropdown | Type of bet | Moneyline, Spread, Total, Props, Other |
| G | Selection | Text | What was bet on | Lakers -5.5 |
| H | Odds | Number | Betting odds (any format) | -110, 2.50, 3/2 |
| I | Stake | Currency | Amount wagered | $50 |
| J | To Win | Currency | Potential profit | $45.45 |
| K | Return | Currency | Actual return (for cashouts) | $35 |
| L | P/L | Formula | Profit/Loss calculation | +$45.45, -$50 |
| M | Bookmaker | Text | Auto-detected from URL | DraftKings, FanDuel |
| N | Type | Dropdown | When bet was placed | PRE-MATCH, LIVE |
| O | Added | DateTime | When bet was captured | Aug 30, 3:30 PM |
| P | Days Pending | Formula | Days since match if pending | 2 days overdue |
| Q | Actions | Checkbox | Delete marker | ☐ Delete |

#### Hidden Columns (Data Integrity)
| Column | Field | Purpose |
|--------|-------|---------|
| R | Bet URL | Full URL where bet was placed |
| S | Original Data | Raw JSON data from extension |
| T | Last Modified | Timestamp of last edit |
| U | Duplicate Check | Formula to detect duplicates |

#### Status Color Coding
- **PENDING**: #FFC107 (Amber) - Active bet awaiting result
- **WON**: #4CAF50 (Green) - Profitable bet
- **LOST**: #F44336 (Red) - Lost bet
- **VOID**: #9E9E9E (Gray) - Cancelled/voided bet
- **PUSH**: #607D8B (Blue-Gray) - Stake returned
- **CASHED OUT**: #2196F3 (Blue) - Early exit

#### Conditional Formatting Rules
1. **P/L Column**:
   - Positive values: Green background
   - Negative values: Red background
   - Zero: Gray background

2. **Days Pending Column**:
   - 0 days: Yellow (match today/ongoing)
   - 1-2 days: Orange (needs attention)
   - 3+ days: Red (overdue for update)

3. **Duplicate Detection**:
   - Highlight row if duplicate detected

---

### Sheet 2: Dashboard

#### Layout Structure
```
┌────────────────────────────────────────────────────────┐
│                BET TRACKER PRO DASHBOARD               │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 🔔 NOTIFICATIONS                                       │
│ ⚠️ You have X pending bets older than 2 days          │
│ 📊 Week performance: +$XXX (XX% win rate)             │
│                                                        │
├────────────────────────────────────────────────────────┤
│  Key Metrics (4 cards)                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │Total P/L │ │This Month│ │ Pending  │ │Win Rate  ││
│  │ +$1,250  │ │  +$320   │ │  5 bets  │ │   58%    ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│                                                        │
├────────────────────────────────────────────────────────┤
│ QUICK FILTERS                                          │
│ [Show Pending] [Today] [This Week] [This Month] [All] │
├────────────────────────────────────────────────────────┤
│                                                        │
│ PENDING BETS REQUIRING ATTENTION                      │
│ (Table showing overdue pending bets)                  │
│                                                        │
│ PERFORMANCE CHARTS                                    │
│ • P/L Timeline (Last 30 days)                        │
│ • Bankroll Progression                               │
│                                                        │
│ BOOKMAKER BREAKDOWN                                   │
│ • Performance by bookmaker table                     │
└────────────────────────────────────────────────────────┘
```

#### Key Formulas

**Total P/L:**
```excel
=SUMIF('Bet Tracker'!B:B,"<>PENDING",'Bet Tracker'!L:L)
```

**This Month P/L:**
```excel
=SUMIFS('Bet Tracker'!L:L,
        'Bet Tracker'!B:B,"<>PENDING",
        'Bet Tracker'!O:O,">="&EOMONTH(TODAY(),-1)+1)
```

**Pending Count:**
```excel
=COUNTIF('Bet Tracker'!B:B,"PENDING")
```

**Win Rate:**
```excel
=IFERROR(COUNTIF('Bet Tracker'!B:B,"WON")/
         COUNTIFS('Bet Tracker'!B:B,"<>PENDING",
                  'Bet Tracker'!B:B,"<>VOID")*100,0)
```

**Notification - Pending Bets Alert:**
```excel
=IF(COUNTIFS('Bet Tracker'!B:B,"PENDING",
             'Bet Tracker'!P:P,">2")>0,
    "⚠️ You have " & COUNTIFS('Bet Tracker'!B:B,"PENDING",
                              'Bet Tracker'!P:P,">2") & 
    " pending bets older than 2 days","")
```

---

### Sheet 3: Bankroll Manager

#### Components
1. **Summary Section**
   - Current Bankroll: $X,XXX
   - Starting Bankroll: $X,XXX
   - Total P/L: +/-$XXX
   - ROI: XX%
   - Suggested Unit Size: $XX (2% of bankroll)

2. **Transaction Log Table**
   | Date | Type | Amount | Balance | Notes |
   |------|------|--------|---------|-------|
   | Aug 30 | Deposit | +$1,000 | $1,000 | Initial bankroll |
   | Aug 30 | P/L | -$50 | $950 | Daily betting |
   | Aug 31 | P/L | +$150 | $1,100 | Daily betting |

3. **Bankroll Chart**
   - Line chart showing bankroll progression over time

#### Key Formulas

**Current Bankroll:**
```excel
=Starting_Bankroll + SUMIF('Bet Tracker'!B:B,"<>PENDING",'Bet Tracker'!L:L)
```

**ROI Calculation:**
```excel
=IFERROR((Current_Bankroll - Starting_Bankroll) / Starting_Bankroll * 100, 0)
```

**Suggested Unit Size:**
```excel
=Current_Bankroll * 0.02
```

---

### Sheet 4: Settings & Info

#### Sections
1. **User Preferences**
   - Odds Format: [American/Decimal/Fractional]
   - Currency: [USD/EUR/GBP]
   - Default Stake: $XX
   - Time Zone: [EST/PST/GMT]

2. **Reference Lists** (for dropdowns)
   - Sports: NFL, NBA, MLB, NHL, Soccer, Tennis, Golf, MMA, Boxing, Other
   - Markets: Moneyline, Spread, Total, Props, Other
   - Common Bookmakers: (auto-populated from captured bets)

3. **Instructions**
   - How to update pending bets
   - Understanding the dashboard
   - Using filters
   - Interpreting metrics

4. **Manual Backup Options**
   - [Download as CSV] button
   - [Export to PDF] button
   - [Create Backup Copy] button

5. **Template Info**
   - Version: 1.0.0
   - Last Updated: Date
   - Support Contact: email@example.com

---

### Sheet 5: Mobile View (Hidden on Desktop)

Simplified view for mobile devices with essential columns only:

| ID | Status | Teams | Stake | P/L | ℹ️ |
|----|--------|-------|-------|-----|-----|
| 001 | ✅ | Lakers | $50 | +$45 | [i] |
| 002 | ❌ | Yankees | $30 | -$30 | [i] |
| 003 | ⏳ | Man Utd | $25 | - | [i] |

- Tap [i] for full details
- Swipe for more options

---

## Data Flow

### 1. Bet Capture Process
```
User captures screenshot
    ↓
Extension extracts data:
- Teams/Event
- Odds
- Stake
- Potential Return
- Auto-detects STATUS from screenshot text
- Auto-detects BOOKMAKER from domain
    ↓
Data sent to Google Sheets:
- Visible: Clean bookmaker name (e.g., "DraftKings")
- Hidden: Full URL for reference
- All bet details populated
```

### 2. Bookmaker Detection Logic
```javascript
// Domain cleaning and mapping
www.draftkings.com → "DraftKings"
sportsbook.fanduel.com → "FanDuel"
mobile.bet365.co.uk → "Bet365"
www.epicbet.com → "Epicbet" (unknown, but cleaned)
```

### 3. Status Detection Keywords
- **PENDING**: "Pending", "Unsettled", "Active", "Open"
- **WON**: "Won", "Winner", "✓", "Winning"
- **LOST**: "Lost", "Loser", "✗", "Losing"
- **VOID**: "Void", "Cancelled", "Refunded"
- **CASHED OUT**: "Cashed Out", "Early Payout"

---

## Key Features

### 1. Pending Bet Management
- **Automatic aging**: Days counter shows how long bet has been pending
- **Color alerts**: Visual indicators for overdue bets
- **Quick update**: Dropdown to change status when bet settles
- **Dashboard alerts**: Notification bar for pending bets needing attention

### 2. Duplicate Detection
- **Smart detection**: Same teams + same odds + same stake within 5 minutes
- **User confirmation**: Warning shown but user can override
- **Visual indicator**: Duplicate column shows warning

### 3. Cash Out Handling
- **Two scenarios supported**:
  1. Screenshot shows already cashed out → Auto-populate
  2. Manual cash out later → User updates status and return amount
- **P/L calculation**: Adjusts based on actual return vs stake

### 4. Quick Filters (Dashboard)
- **Filter buttons**: One-click filters for common views
- **Options**: Show Pending | Today | This Week | This Month | Clear
- **Persistent**: Filters remain until manually cleared

### 5. Delete Functionality
- **Soft delete**: Checkbox in Actions column
- **Confirmation**: Requires confirmation before deletion
- **Alternative**: Option to archive instead of delete

---

## Formulas Reference

### Days Pending Calculation
```excel
=IF(B2="PENDING",
    IF(C2<NOW(),
        ROUNDDOWN(NOW()-C2,0) & " days overdue",
        "Not started"),
    "")
```

### P/L Calculation with All Scenarios
```excel
=IF(B2="WON", J2,
    IF(B2="LOST", -I2,
        IF(B2="CASHED OUT", K2-I2,
            IF(OR(B2="VOID", B2="PUSH"), 0, ""))))
```

### Duplicate Detection
```excel
=IF(COUNTIFS(E:E, E2,          // Same teams
             H:H, H2,          // Same odds
             I:I, I2,          // Same stake
             O:O, ">="&O2-TIME(0,5,0),  // Within 5 minutes
             O:O, "<="&O2+TIME(0,5,0))>1,
    "⚠️ Possible duplicate", "")
```

### Running Balance
```excel
=Starting_Bankroll + SUMIF($B$2:B2,"<>PENDING",$L$2:L2)
```

---

## Visual Design Specifications

### Color Palette
- **Primary Background**: #0a0b0d
- **Secondary Background**: #141519
- **Accent Primary**: #00d4ff (Cyan)
- **Accent Secondary**: #00ff88 (Green)
- **Success**: #4CAF50
- **Danger**: #F44336
- **Warning**: #FFC107
- **Neutral**: #9E9E9E

### Typography
- **Headers**: Bold, 14-16pt
- **Data**: Regular, 10-11pt
- **Emphasis**: Bold or colored text
- **Mobile**: Minimum 12pt for readability

### Cell Formatting
- **Headers**: Dark background with white text
- **Data rows**: Alternating light/dark for readability
- **Borders**: Subtle borders for structure
- **Padding**: Adequate cell padding for touch targets on mobile

---

## Implementation Steps

### Phase 1: Template Creation
1. Create master Google Sheet with all formatting
2. Implement all formulas and conditional formatting
3. Add sample data for demonstration
4. Test on desktop and mobile views

### Phase 2: Extension Integration
1. Store template ID in extension
2. Implement copy functionality
3. Add bookmaker detection logic
4. Test data insertion into copied template

### Phase 3: User Features
1. Add quick filter functionality
2. Implement delete confirmation
3. Add notification system
4. Test pending bet workflows

### Phase 4: Polish & Testing
1. Optimize mobile view
2. Add help documentation
3. Test with various bookmaker sites
4. Performance optimization

---

## Future Enhancements (Post-MVP)
- API integration for automatic result updates
- Advanced analytics (CLV, EV calculations)
- Multi-currency support
- Parlay/accumulator tracking
- Social features (compare with friends)
- Automated backup system
- Email notifications for pending bets
- Integration with odds comparison sites

---

## Notes
- Template will be view-only public Google Sheet
- Each user gets their own copy in their Drive
- Extension handles all data insertion
- Manual updates allowed for flexibility
- Focus on simplicity and usability over complex features
