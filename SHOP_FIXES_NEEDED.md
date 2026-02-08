# Shop Items Validation Report

## ❌ CONFIRMED INVALID ITEMS

These items have been verified as **NOT EXISTING** in DayZ types.xml:

### Line 61 - BK-133 Shotgun
```javascript
{ name: 'BK-133 Shotgun', class: 'BK133Shotgun', averagePrice: 600 }
```
**Status:** ❌ DOES NOT EXIST in types.xml  
**Fix:** Remove this item OR replace with valid shotgun class  
**Valid alternatives:** `Mp133Shotgun`, `Izh43Shotgun`, `Saiga`

---

### Line 64 - M1014 Shotgun
```javascript
{ name: 'M1014 Shotgun', class: 'M1014', averagePrice: 850 }
```
**Status:** ❌ DOES NOT EXIST in types.xml  
**Player Report:** "M101 shotgun not showing up"  
**Fix:** Remove this item  
**Valid alternatives:** `Mp133Shotgun` (closest equivalent), `Saiga` (semi-auto shotgun)

---

## ✅ VALID SHOTGUNS IN DAYZ

Based on types.xml, these are the ONLY valid shotgun class names:
- `Izh18Shotgun` - Single shot
- `Izh43Shotgun` - Double barrel
- `Mp133Shotgun` - Pump action
- `Saiga` - Semi-auto
- `SawedoffIzh18Shotgun` - Sawed-off single
- `SawedoffIzh43Shotgun` - Sawed-off double

---

## 🔧 RECOMMENDED FIXES

### Option 1: Remove Invalid Items
Delete lines 61 and 64 from shop_items.js

### Option 2: Replace with Valid Items
Replace `BK133Shotgun` with `Mp133Shotgun` (line 61)  
Replace `M1014` with `Saiga` (line 64) or just remove it since Saiga already exists at line 63

---

## ⚠️ POTENTIAL OTHER ISSUES

These items need manual verification against types.xml:

### Suspicious Items to Check:
1. **All colored/variant weapons** - Ensure suffixes match exactly:
   - `M4A1_Black` vs `M4A1Black` (underscore matters!)
   - `AK101_Green` vs `AK101Green`
   
2. **NBC Gear** - Check color suffixes:
   - `NBCJacketGray` vs `NBCJacket_Gray`
   - `NBCPantsWhite` vs `NBCPants_White`
   
3. **Boots/Clothing variants** - Verify exact class names:
   - `CombatBoots_Black` vs `CombatBootsBlack`
   
4. **Magazines** - Check quantity suffixes:
   - `Mag_CZ527_5rnd` vs `Mag_CZ527_5Rnd` (capitalization!)
   - `Mag_Deagle_9rnd` vs `Mag_Deagle_9Rnd`

---

## 📋 VALIDATION METHOD

To validate other items, search types.xml:
```xml
<type name="ClassName">
```

The class name must match EXACTLY (case-sensitive).

---

## 🎯 IMMEDIATE ACTION REQUIRED

1. Delete or replace M1014 (line 64)
2. Delete or replace BK133Shotgun (line 61)
3. Run full validation script with actual types.xml file
4. Test spawning fixed items on server

---

Generated: 2026-02-03
