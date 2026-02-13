#!/bin/bash
# Generate attendance data for January 2026 using curl commands

BASE_URL="http://127.0.0.1:8000/api/attendance"

echo "======================================================================"
echo "🚀 GENERATING ATTENDANCE DATA VIA API - JANUARY 2026"
echo "======================================================================"

# Employee IDs (1-10)
EMPLOYEE_IDS=(1 2 3 4 5 6 7 8 9 10)

# Mumbai coordinates
MUMBAI_LAT=19.0760
MUMBAI_LNG=72.8777

# Function to generate random float
random_offset() {
    echo "scale=4; (($RANDOM % 200) - 100) / 10000" | bc
}

# Loop through January 2026 (1-31)
for day in {1..31}; do
    DATE=$(date -d "2026-01-$day" +%Y-%m-%d 2>/dev/null || date -j -f "%Y-%m-%d" "2026-01-$day" +%Y-%m-%d)
    DAY_OF_WEEK=$(date -d "$DATE" +%u 2>/dev/null || date -j -f "%Y-%m-%d" "$DATE" +%u)
    
    # Skip Sundays (day 7)
    if [ "$DAY_OF_WEEK" -eq 7 ]; then
        echo "⏭️  Skipping Sunday: $DATE"
        continue
    fi
    
    echo ""
    echo "📅 Processing $DATE..."
    
    SUCCESS=0
    ERRORS=0
    
    for emp_id in "${EMPLOYEE_IDS[@]}"; do
        # Random attendance (90% attendance rate)
        RAND=$((RANDOM % 100))
        
        if [ $RAND -lt 5 ]; then
            # 5% absent - skip
            continue
        elif [ $RAND -lt 10 ]; then
            # 5% on leave
            SIGN_IN_HOUR=9
            SIGN_IN_MIN=0
            SKIP_SIGNOUT=true
        elif [ $RAND -lt 20 ]; then
            # 10% late
            SIGN_IN_HOUR=$((9 + RANDOM % 2))
            SIGN_IN_MIN=$((16 + RANDOM % 44))
            SKIP_SIGNOUT=false
        else
            # 80% present
            SIGN_IN_HOUR=$((8 + RANDOM % 2))
            SIGN_IN_MIN=$((RANDOM % 15))
            SKIP_SIGNOUT=false
        fi
        
        # Sign-out time (5:30 PM - 7:00 PM)
        SIGN_OUT_HOUR=$((17 + RANDOM % 3))
        SIGN_OUT_MIN=$((RANDOM % 60))
        
        # Add random offset to coordinates
        LAT_OFFSET=$(random_offset)
        LNG_OFFSET=$(random_offset)
        LAT=$(echo "$MUMBAI_LAT + $LAT_OFFSET" | bc)
        LNG=$(echo "$MUMBAI_LNG + $LNG_OFFSET" | bc)
        
        # Sign-in API call
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/sign-in/" \
            -H "Content-Type: application/json" \
            -d "{
                \"employee_id\": $emp_id,
                \"device_id\": 1,
                \"latitude\": $LAT,
                \"longitude\": $LNG,
                \"auth_mode\": 1
            }")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        
        if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
            ((SUCCESS++))
            
            # Sign-out (if not on leave)
            if [ "$SKIP_SIGNOUT" = false ]; then
                sleep 0.1
                
                LAT_OFFSET=$(random_offset)
                LNG_OFFSET=$(random_offset)
                LAT=$(echo "$MUMBAI_LAT + $LAT_OFFSET" | bc)
                LNG=$(echo "$MUMBAI_LNG + $LNG_OFFSET" | bc)
                
                curl -s -X POST "$BASE_URL/sign-out/" \
                    -H "Content-Type: application/json" \
                    -d "{
                        \"employee_id\": $emp_id,
                        \"device_id\": 1,
                        \"latitude\": $LAT,
                        \"longitude\": $LNG,
                        \"auth_mode\": 1
                    }" > /dev/null
            fi
        else
            ((ERRORS++))
            echo "  ❌ Employee $emp_id failed (HTTP $HTTP_CODE)"
        fi
        
        # Small delay to avoid overwhelming server
        sleep 0.05
    done
    
    echo "  ✅ $SUCCESS successful | ❌ $ERRORS errors"
done

echo ""
echo "======================================================================"
echo "✅ ATTENDANCE DATA GENERATION COMPLETED!"
echo "======================================================================"
