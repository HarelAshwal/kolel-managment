
export const generateAndDownloadTemplate = () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
        alert('ספריית אקסל עדיין נטענת, אנא נסה שוב בעוד רגע.');
        return;
    }

    // 1. Setup Dates
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Format: MM/YY
    const shortYear = year.toString().slice(-2);
    const monthString = `${String(month + 1).padStart(2, '0')}/${shortYear}`; 

    // 2. Define Scholars
    const scholars = [
        { name: "ישראל ישראלי", id: "123456789", cardId: "1001" },
        { name: "משה כהן", id: "987654321", cardId: "1002" }
    ];

    const wb = XLSX.utils.book_new();
    const daysHebrew = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

    // 3. Generate Sheets
    scholars.forEach(scholar => {
        const wsData: any[][] = [];

        // --- Header Section (Exact match to APT/JBClock) ---
        // Row 1
        wsData.push(["ישיבה וכולל לדוגמא - מערכת נוכחות"]); 
        // Row 2
        wsData.push([`ישיבה וכולל לדוגמא - דוח שעות חודשי ${monthString}`]);
        // Row 3
        wsData.push([`שם עובד : ${scholar.name} קוד עובד:${scholar.cardId} מספר כרטיס:${scholar.cardId} מס. בתוכנת שכר:0`]);
        // Row 4
        wsData.push(["הסכם עבודה:שעות נוספות יומי"]);
        // Row 5 (Empty)
        wsData.push([]);

        // Row 6: Headers (Exact column mapping)
        // A: Errors, B: Day, C: In, D: Out, E: In, F: Out, G: In, H: Out, I: Break, J: Regular, ...
        const headerRow = [
            "שגיאות",   // A
            "יום",      // B
            "כניסה",    // C
            "יציאה",    // D
            "כניסה",    // E
            "יציאה",    // F
            "כניסה",    // G
            "יציאה",    // H
            "הפסקה",    // I
            "רגילות",   // J
            "125%",     // K
            "150%",     // L
            "200%",     // M
            "סה\"כ",    // N
            "+/-",      // O
            "הערות"     // P
        ];
        wsData.push(headerRow);

        // Dashed Line Row Template
        const dashedRow = Array(16).fill("------------");
        dashedRow[0] = ""; // Errors column usually empty on dash row in some formats, but let's keep consistent or match exactly.
        // Actually the example shows dash row after header is not present, only between weeks.
        // But let's follow the data loop logic.

        let totalHoursSum = 0;

        // --- Daily Rows ---
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            const dayOfWeekIndex = dateObj.getDay(); // 0 = Sunday
            const dayHebrew = daysHebrew[dayOfWeekIndex];
            
            // Format: DD/MM DayChar (e.g. 01/11 ש)
            const dayStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')} ${dayHebrew}`;

            const row: any[] = Array(16).fill("");
            row[1] = dayStr; // Column B

            // Determine content based on day
            if (dayOfWeekIndex === 6) { 
                // Shabbat
                row[0] = ""; 
                // Leave times empty
            } else if (dayOfWeekIndex === 5) {
                // Friday
                row[0] = "";
            } else {
                // Weekdays
                row[2] = "09:00"; // Entry 1
                row[3] = "13:00"; // Exit 1
                row[4] = "16:00"; // Entry 2
                row[5] = "19:00"; // Exit 2
                
                // Calculate hours for total (Rough estimate for template)
                row[9] = "07:00"; // Regular
                row[13] = "07:00"; // Total
                totalHoursSum += 7;

                // Add random "Missing Entry" error for demo
                if (day === 4) {
                    row[0] = "חסר כניסה";
                    row[2] = ""; // Remove entry
                    row[9] = "";
                    row[13] = "";
                }
            }

            wsData.push(row);

            // Add separator line after Saturday (Shabbat)
            if (dayOfWeekIndex === 6) {
                wsData.push([...dashedRow]);
            }
        }

        // --- Footer Section (Exact Layout) ---
        wsData.push([]); // Empty row
        
        // Total Row
        const totalRow = Array(16).fill("");
        totalRow[9] = "סה\"כ";
        totalRow[11] = `${totalHoursSum}:00`;
        totalRow[13] = `${totalHoursSum}:00`;
        wsData.push(totalRow);

        wsData.push([]); 
        wsData.push([]); 

        // Summary Block - mimicking the text layout
        // *שגיאות* | סה"כ שעות בחודש | ...
        const summaryHeader = Array(16).fill("");
        summaryHeader[0] = "*שגיאות*";
        summaryHeader[4] = "סה\"כ שעות בחודש";
        summaryHeader[9] = "סה\"כ שעות";
        summaryHeader[11] = "ימי עבודה";
        summaryHeader[13] = "דיווחים";
        wsData.push(summaryHeader);

        // Details Row 1
        const sumRow1 = Array(16).fill("");
        sumRow1[4] = "שעות 100%";
        sumRow1[6] = `${totalHoursSum}.00`;
        sumRow1[7] = "משולמות";
        sumRow1[9] = `${totalHoursSum}.00`;
        sumRow1[11] = "20"; // Approx working days
        sumRow1[13] = "ימי חופש";
        sumRow1[15] = "0";
        wsData.push(sumRow1);

        // Details Row 2
        const sumRow2 = Array(16).fill("");
        sumRow2[4] = "נוספות 125%";
        sumRow2[6] = "0.00";
        wsData.push(sumRow2);

        // Details Row 3
        const sumRow3 = Array(16).fill("");
        sumRow3[4] = "נוספות 150%";
        sumRow3[6] = "0.00";
        sumRow3[7] = "תקן";
        sumRow3[9] = "176.40";
        sumRow3[11] = "21";
        wsData.push(sumRow3);

        // Spacing
        wsData.push([]);
        wsData.push([]);
        
        // Add footer text
        const footerRow = Array(16).fill("");
        footerRow[4] = "הודפס בתאריך " + new Date().toLocaleDateString('he-IL') + " JBClock";
        footerRow[7] = "גירסה 2.55";
        wsData.push(footerRow);

        // Create Sheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths to match the look roughly
        ws['!cols'] = [
            { wch: 12 }, // A - Error
            { wch: 10 }, // B - Day
            { wch: 8 },  // C - In
            { wch: 8 },  // D - Out
            { wch: 8 },  // E - In
            { wch: 8 },  // F - Out
            { wch: 8 },  // G - In
            { wch: 8 },  // H - Out
            { wch: 8 },  // I - Break
            { wch: 8 },  // J - Regular
            { wch: 6 },  // K
            { wch: 6 },  // L
            { wch: 6 },  // M
            { wch: 8 },  // N - Total
            { wch: 6 },  // O
            { wch: 15 }  // P - Notes
        ];

        XLSX.utils.book_append_sheet(wb, ws, scholar.name);
    });

    // 4. Download
    XLSX.writeFile(wb, `דוח_שעות_לדוגמא.xlsx`);
};
