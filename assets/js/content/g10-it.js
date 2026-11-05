/* ExamForge content — Grade 10 Information Technology: spreadsheets.
   Scope = the current spreadsheet topics in the study inventory (Thea "Spreadsheet Management Review" and the G10 Info Tech deck).
   Explanations use standard Excel / Google Sheets behaviour. */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

EF.subjects.push({
  id: 'it',
  name: 'Information Technology',
  short: 'IT',
  grade: 10,
  icon: 'fa-table-cells',
  color: '#06b6d4',
  tagline: 'Spreadsheets: formulas, functions, references, filters, charts and errors',
  intro: 'The whole spreadsheet unit, from what a cell is to VLOOKUP, IF, Advanced Filter and error codes. Try every formula in the live mini-spreadsheet.',

  data: {
    sheet: {
      head: ['Student', 'Maths', 'English', 'IT'],
      rows: [
        ['Kemar', 78, 64, 85],
        ['Aaliyah', 92, 88, 79],
        ['Jordan', 45, 52, 61],
        ['Tia', 66, 71, 90],
        ['Andre', 38, 49, 55],
        ['Shanice', 84, 95, 72]
      ]
    }
  },

  topics: [
    {
      id: 'basics', title: 'What is a spreadsheet?', nav: 'Basics', icon: 'fa-table-cells',
      blocks: [
        { type: 'lead', html: 'A <strong>spreadsheet</strong> is application software that organises data in <strong>rows and columns</strong> and does calculations automatically.' },
        { type: 'components', title: 'Examples', items: [['fa-file-excel', 'Microsoft Excel'], ['fa-table-list', 'Google Sheets'], ['fa-table', 'LibreOffice Calc'], ['fa-table-columns', 'Apple Numbers']] },
        {
          type: 'grid', cols: 3, items: [
            { icon: 'fa-wallet', title: 'Budgets', html: 'Household or school club income and spending.' },
            { icon: 'fa-graduation-cap', title: 'Grade books', html: 'Marks, averages and ranks for a class.' },
            { icon: 'fa-money-check-dollar', title: 'Payroll', html: 'Hours × rate, deductions and net pay.' },
            { icon: 'fa-boxes-stacked', title: 'Stock / inventory', html: 'Items in stock, reorder levels, values.' },
            { icon: 'fa-chart-column', title: 'Statistics & charts', html: 'Survey results turned into graphs.' },
            { icon: 'fa-wand-magic-sparkles', title: '“What-if” analysis', html: 'Change one value and see every result update.' }
          ]
        },
        {
          type: 'terms', title: 'Spreadsheet parts', items: [
            ['Workbook', 'the whole spreadsheet <strong>file</strong>; it can hold many worksheets'],
            ['Worksheet', 'one sheet (tab) in a workbook'],
            ['Row', 'runs across, numbered 1, 2, 3…'],
            ['Column', 'runs down, lettered A, B, C…'],
            ['Cell', 'the box where a row and column meet'],
            ['Cell address (reference)', 'column letter + row number, e.g. <strong>B4</strong>'],
            ['Active cell', 'the selected cell (thick border); its address shows in the <strong>Name Box</strong>'],
            ['Range', 'a block of cells written first:last, e.g. <strong>A1:C5</strong>'],
            ['Name Box', 'shows the active cell’s address; you can also name a range here'],
            ['Formula bar', 'shows and edits what is really in the active cell'],
            ['Fill handle', 'the small square at the bottom-right of a selection; drag it to copy']
          ]
        },
        {
          type: 'worked', q: 'How many cells are in the range B2:E7?',
          steps: ['Columns B, C, D, E = <strong>4</strong> columns', 'Rows 2 to 7 = 7 − 2 + 1 = <strong>6</strong> rows', 'Cells = 4 × 6 = <strong>24</strong>'],
          answer: '24 cells'
        }
      ]
    },
    {
      id: 'formulas', title: 'Entries, formulas and operators', nav: 'Formulas', icon: 'fa-calculator',
      blocks: [
        {
          type: 'grid', cols: 3, items: [
            { icon: 'fa-font', title: 'Label', sub: 'Text', html: 'Words used as headings or names, e.g. “Student”, “Total”. Lines up on the <strong>left</strong>.' },
            { icon: 'fa-hashtag', title: 'Value', sub: 'Number or date', html: 'Data that can be calculated, e.g. 78 or 05/11/2026. Lines up on the <strong>right</strong>.' },
            { icon: 'fa-equals', title: 'Formula', sub: 'Starts with =', html: 'An instruction to calculate, e.g. <strong>=B2+C2</strong>. The cell shows the <strong>result</strong>; the formula bar shows the formula.' }
          ]
        },
        {
          type: 'table', title: 'Arithmetic operators', head: ['Operator', 'Meaning', 'Example', 'Result if B2 = 10, C2 = 4'], rows: [
            ['+', 'add', '=B2+C2', '14'], ['−', 'subtract', '=B2-C2', '6'], ['*', 'multiply', '=B2*C2', '40'], ['/', 'divide', '=B2/C2', '2.5'], ['^', 'power', '=C2^2', '16']
          ]
        },
        { type: 'callout', tone: 'info', icon: 'fa-list-ol', title: 'Order of operations', html: 'Spreadsheets follow BODMAS: <strong>brackets → ^ → * and / → + and −</strong>.<br><strong>=2+3*4</strong> gives 14, but <strong>=(2+3)*4</strong> gives 20.' },
        {
          type: 'worked', q: 'Cell B2 holds 50 and C2 holds 30. Write a formula in D2 for the average of the two, and give the result.',
          steps: ['Average = total ÷ how many', 'Brackets are needed so the adding happens first: <strong>=(B2+C2)/2</strong>', 'Result: (50 + 30) ÷ 2 = <strong>40</strong>', 'Without brackets, =B2+C2/2 would give 50 + 15 = 65 ✗'],
          answer: '=(B2+C2)/2 → 40'
        },
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Why use cell references, not numbers?', html: 'Write <strong>=B2+C2</strong>, not =50+30. If the data changes, the answer <strong>updates automatically</strong> (automatic recalculation). That is what makes “what-if” questions easy.' }
      ]
    },
    {
      id: 'functions', title: 'Functions', nav: 'Functions', icon: 'fa-code',
      blocks: [
        { type: 'lead', html: 'A <strong>function</strong> is a ready-made formula. Syntax: <strong>=NAME(arguments)</strong>, with arguments separated by commas.' },
        {
          type: 'table', title: 'Functions you must know', head: ['Function', 'What it does', 'Example'], rows: [
            ['SUM', 'adds a range', '=SUM(B2:B7)'],
            ['AVERAGE', 'mean of a range', '=AVERAGE(B2:B7)'],
            ['MAX / MIN', 'largest / smallest value', '=MAX(B2:B7)'],
            ['COUNT', 'counts cells with <strong>numbers</strong>', '=COUNT(B2:B7)'],
            ['COUNTA', 'counts cells that are <strong>not empty</strong> (text too)', '=COUNTA(A2:A7)'],
            ['COUNTIF', 'counts cells that meet a condition', '=COUNTIF(B2:B7,">=50")'],
            ['IF', 'one result if a test is true, another if false', '=IF(B2>=50,"Pass","Fail")'],
            ['RANK', 'position of a number in a list (1 = highest)', '=RANK(B2,$B$2:$B$7)'],
            ['VLOOKUP', 'finds a value in the first column of a table and returns a value from another column', '=VLOOKUP("Tia",A2:D7,3,FALSE)'],
            ['TODAY', 'today’s date (updates each day)', '=TODAY()'],
            ['DATE', 'builds a date from year, month, day', '=DATE(2026,11,5)'],
            ['DAY', 'the day number of a date', '=DAY(A2)']
          ]
        },
        { type: 'widget', name: 'sheet' },
        {
          type: 'accordion', items: [
            { badge: 'IF', title: '=IF(logical_test, value_if_true, value_if_false)', sub: 'Makes a decision', points: [['Test', 'B2>=50 is either TRUE or FALSE'], ['Text in quotes', '"Pass" and "Fail" must be in double quotes'], ['Numbers too', '=IF(C2>100,C2*0.1,0) gives a 10% discount only on sales over 100']] },
            { badge: 'VLOOKUP', title: '=VLOOKUP(lookup_value, table_array, col_index_num, range_lookup)', sub: 'Looks something up in a table', points: [['lookup_value', 'what you are searching for, e.g. "Tia"'], ['table_array', 'the table; the search happens in its FIRST column'], ['col_index_num', 'which column of the table to return (1 = first column)'], ['range_lookup', 'FALSE = exact match (use this in exams); TRUE = approximate']] },
            { badge: 'RANK', title: '=RANK(number, ref, [order])', sub: 'Position in a list', points: [['number', 'the value you want ranked'], ['ref', 'the whole list, made absolute ($B$2:$B$7) so it does not move when copied'], ['order', '0 or left out = highest is 1st; 1 = lowest is 1st']] },
            { badge: 'COUNTIF', title: '=COUNTIF(range, criteria)', sub: 'Counts matching cells', points: [['Number criteria', '">=50" in quotes'], ['Text criteria', '"Pass" counts cells that say Pass'], ['Difference from COUNT', 'COUNT counts all numbers; COUNTIF only those that match']] }
          ]
        }
      ]
    },
    {
      id: 'references', title: 'Relative and absolute references', nav: 'References', icon: 'fa-dollar-sign',
      blocks: [
        {
          type: 'compare', items: [
            { title: 'Relative reference (A1)', color: '#06b6d4', summary: [['When copied', 'it <strong>changes</strong> to match its new position']], phases: [['D2 has', '=B2+C2'], ['Copied down to D3', '=B3+C3'], ['Use for', 'doing the same calculation on every row']] },
            { title: 'Absolute reference ($A$1)', color: '#f59e0b', summary: [['When copied', 'it <strong>stays fixed</strong> because of the $ signs']], phases: [['D2 has', '=C2*$B$1 (B1 = tax rate)'], ['Copied down to D3', '=C3*$B$1'], ['Use for', 'one special cell everyone uses: rates, prices, totals']] }
          ]
        },
        { type: 'text', html: '<strong>Mixed references</strong> lock only one part: <strong>$A1</strong> locks the column, <strong>A$1</strong> locks the row. In Excel, pressing <strong>F4</strong> while editing a reference cycles through them.' },
        {
          type: 'worked', q: 'B1 holds the GCT rate 15%. Prices are in C2:C10. What formula in D2 can be copied down to work out GCT for every item?',
          steps: ['GCT = price × rate', 'The price changes on each row → relative: <strong>C2</strong>', 'The rate is always in B1 → absolute: <strong>$B$1</strong>', 'Formula: <strong>=C2*$B$1</strong>; drag the fill handle down to D10'],
          answer: '=C2*$B$1'
        },
        { type: 'callout', tone: 'warn', icon: 'fa-triangle-exclamation', title: 'Classic mistake', html: 'If you write =C2*B1 and copy it down, D3 becomes =C3*<strong>B2</strong>, the wrong cell, so the answers are wrong or 0.' }
      ]
    },
    {
      id: 'sort-filter', title: 'Sorting and filtering', nav: 'Sort & Filter', icon: 'fa-filter',
      blocks: [
        {
          type: 'grid', cols: 2, items: [
            { icon: 'fa-arrow-down-a-z', title: 'Sorting', html: 'Puts rows in order: <strong>ascending</strong> (A→Z, 0→9) or <strong>descending</strong> (Z→A, 9→0). Select the <strong>whole table</strong> so each row stays together. You can sort by more than one column (e.g. by Class, then by Name).' },
            { icon: 'fa-filter', title: 'Filtering (AutoFilter)', html: 'Shows only the rows that meet a condition and <strong>hides</strong> the rest. Nothing is deleted: clear the filter to see everything again.' }
          ]
        },
        { type: 'heading', text: 'Advanced Filter' },
        {
          type: 'steps', items: [
            { title: 'List range', html: 'The whole table, <strong>including headings</strong>.' },
            { title: 'Criteria range', html: 'Copy the column headings somewhere else and type the conditions under them.' },
            { title: 'Copy to (extract range)', html: 'Choose “Copy to another location” and pick where the matching rows should go.' }
          ]
        },
        {
          type: 'compare', items: [
            { title: 'AND: same row', color: '#22c55e', summary: [['Rule', 'conditions on the <strong>same row</strong> must ALL be true']], phases: [['Maths', '>=50'], ['IT', '>=80'], ['Finds', 'students with Maths ≥ 50 AND IT ≥ 80']] },
            { title: 'OR: different rows', color: '#a855f7', summary: [['Rule', 'conditions on <strong>different rows</strong>: ANY can be true']], phases: [['Row 1 · Maths', '>=90'], ['Row 2 · English', '>=90'], ['Finds', 'students with Maths ≥ 90 OR English ≥ 90']] }
          ]
        }
      ]
    },
    {
      id: 'charts', title: 'Charts', nav: 'Charts', icon: 'fa-chart-pie',
      blocks: [
        {
          type: 'grid', cols: 4, items: [
            { icon: 'fa-chart-column', title: 'Column chart', html: 'Compares amounts between categories using vertical bars.' },
            { icon: 'fa-chart-bar', title: 'Bar chart', html: 'Same idea with horizontal bars: good for long category names.' },
            { icon: 'fa-chart-line', title: 'Line graph', html: 'Shows a <strong>trend over time</strong> (e.g. monthly sales).' },
            { icon: 'fa-chart-pie', title: 'Pie chart', html: 'Shows <strong>parts of a whole</strong> as percentages; uses only one data series.' }
          ]
        },
        { type: 'components', title: 'Every good chart has', items: [['fa-heading', 'chart title'], ['fa-arrows-left-right', 'x-axis title'], ['fa-arrows-up-down', 'y-axis title'], ['fa-list', 'legend (key)'], ['fa-tag', 'data labels (optional)']] },
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Picking the right chart', html: 'Comparing → column/bar. Changing over time → line. Share of a total → pie.' }
      ]
    },
    {
      id: 'errors', title: 'Error codes and troubleshooting', nav: 'Errors', icon: 'fa-triangle-exclamation',
      blocks: [
        {
          type: 'table', title: 'Spreadsheet errors', head: ['Error', 'What it means', 'Typical fix'], rows: [
            ['#####', 'column too narrow to show the number or date', 'widen the column'],
            ['#DIV/0!', 'dividing by zero or by an empty cell', 'check the divisor cell has a value'],
            ['#NAME?', 'function name spelled wrong, or text without quotes', 'fix the spelling (SUMM → SUM) or add "quotes"'],
            ['#VALUE!', 'wrong type of data, e.g. adding text to a number', 'make sure the cells hold numbers'],
            ['#REF!', 'the formula refers to a cell that was deleted', 'rewrite the reference'],
            ['#N/A', 'a lookup could not find the value', 'check the spelling of the lookup value / table'],
            ['#NUM!', 'impossible number, e.g. square root of a negative', 'check the inputs'],
            ['Circular reference', 'a formula refers to its own cell', 'remove the self-reference']
          ]
        },
        { type: 'callout', tone: 'tip', icon: 'fa-screwdriver-wrench', title: 'Troubleshooting checklist', html: '<ol><li>Click the cell and read the <strong>formula bar</strong>.</li><li>Does it start with <strong>=</strong>?</li><li>Are the right cells / ranges used, and are the $ signs where they should be?</li><li>Are text values in “quotes”?</li><li>Are brackets in matching pairs?</li></ol>' }
      ]
    }
  ],

  quiz: [
    { q: 'What is the address of the cell in column D, row 12?', options: ['D12', '12D', 'D:12', 'R12C4D'], answer: 0, why: 'Column letter first, then row number.' },
    { q: 'How many cells are in A1:C4?', options: ['12', '7', '3', '4'], answer: 0, why: '3 columns × 4 rows = 12.' },
    { q: 'A workbook is…', options: ['the whole spreadsheet file', 'a single cell', 'one column', 'a chart'], answer: 0, why: 'A workbook can contain several worksheets.' },
    { q: 'Every formula must start with…', options: ['=', '+', '#', '$'], answer: 0, why: 'The = sign tells the program to calculate.' },
    { q: 'What does =2+3*4 give?', options: ['14', '20', '24', '9'], answer: 0, why: 'Multiplication first: 3 × 4 = 12, then + 2.' },
    { q: 'Which function counts only cells that contain numbers?', options: ['COUNT', 'COUNTA', 'SUM', 'MAX'], answer: 0, why: 'COUNTA counts non-empty cells including text.' },
    { q: 'Which formula counts marks of 50 or more in B2:B20?', options: ['=COUNTIF(B2:B20,">=50")', '=COUNT(B2:B20>=50)', '=IF(B2:B20>=50)', '=SUMIF(B2:B20)'], answer: 0, why: 'COUNTIF(range, criteria) with the criteria in quotes.' },
    { q: 'What does =IF(B2>=50,"Pass","Fail") show when B2 is 49?', options: ['Fail', 'Pass', 'FALSE', '#VALUE!'], answer: 0, why: '49 >= 50 is false, so the third argument is shown.' },
    { q: 'In =VLOOKUP("Tia",A2:D7,3,FALSE), the 3 means…', options: ['return a value from the 3rd column of the table', 'search the 3rd row', 'find 3 matches', 'round to 3 places'], answer: 0, why: 'col_index_num picks which column to return.' },
    { q: 'Which reference stays the same when copied?', options: ['$B$1', 'B1', 'B$1 (column changes)', 'B 1'], answer: 0, why: 'Both the column and row are locked with $.' },
    { q: 'D2 contains =B2*C2. It is copied to D3. D3 now contains…', options: ['=B3*C3', '=B2*C2', '=B3*C2', '=D3*C3'], answer: 0, why: 'Relative references move with the formula.' },
    { q: 'A filter…', options: ['hides rows that do not meet the condition', 'deletes rows permanently', 'sorts data A to Z', 'creates a chart'], answer: 0, why: 'Clearing the filter shows all rows again.' },
    { q: 'In an Advanced Filter criteria range, conditions on the same row mean…', options: ['AND', 'OR', 'NOT', 'SUM'], answer: 0, why: 'Same row = all must be true; different rows = OR.' },
    { q: 'Which chart best shows parts of a whole?', options: ['Pie chart', 'Line graph', 'Column chart', 'Scatter graph'], answer: 0, why: 'Each slice is a share of the total.' },
    { q: 'Which chart best shows a trend over 12 months?', options: ['Line graph', 'Pie chart', 'Bar chart', 'Table'], answer: 0, why: 'Lines show change over time.' },
    { q: 'A cell shows #DIV/0!. The cause is…', options: ['dividing by zero or an empty cell', 'column too narrow', 'misspelled function', 'deleted cell'], answer: 0, why: '#DIV/0! = division by zero.' },
    { q: 'A cell shows #NAME?. The most likely cause is…', options: ['a misspelled function name', 'dividing by zero', 'a deleted reference', 'a narrow column'], answer: 0, why: 'e.g. =SUMM(B2:B7) or text without quotes.' },
    { q: 'A cell shows #####. What should you do?', options: ['Widen the column', 'Delete the formula', 'Add quotes', 'Use $ signs'], answer: 0, why: 'The number is too wide to display.' },
    { q: 'Where can you see the address of the active cell?', options: ['Name Box', 'Fill handle', 'Status bar only', 'Legend'], answer: 0, why: 'The Name Box is to the left of the formula bar.' },
    { q: '=RANK(B2,$B$2:$B$7) uses $ signs because…', options: ['the list must not move when the formula is copied', 'it makes the answer a currency', 'RANK needs money values', 'it sorts the list'], answer: 0, why: 'Absolute references keep the range fixed.' }
  ],

  flashcards: [
    ['Spreadsheet', 'Application software that organises data in rows and columns and calculates automatically', 'Basics'],
    ['Workbook vs worksheet', 'Workbook = the file; worksheet = one sheet/tab inside it', 'Basics'],
    ['Cell', 'Where a row and a column meet', 'Basics'],
    ['Cell address', 'Column letter + row number, e.g. C5', 'Basics'],
    ['Active cell', 'The selected cell; its address shows in the Name Box', 'Basics'],
    ['Range', 'A block of cells, e.g. A1:C5', 'Basics'],
    ['Fill handle', 'Small square at the corner of a selection; drag to copy data or formulas', 'Basics'],
    ['Label vs value', 'Label = text (left-aligned); value = number or date (right-aligned)', 'Formulas'],
    ['Formula', 'A calculation that starts with =', 'Formulas'],
    ['Operators', '+ add, − subtract, * multiply, / divide, ^ power', 'Formulas'],
    ['Automatic recalculation', 'Results update instantly when the data they use changes', 'Formulas'],
    ['What-if analysis', 'Changing values to see how results change', 'Formulas'],
    ['SUM', 'Adds a range: =SUM(B2:B7)', 'Functions'],
    ['AVERAGE', 'Mean of a range: =AVERAGE(B2:B7)', 'Functions'],
    ['MAX / MIN', 'Largest / smallest value in a range', 'Functions'],
    ['COUNT vs COUNTA', 'COUNT = cells with numbers; COUNTA = all non-empty cells', 'Functions'],
    ['COUNTIF', 'Counts cells meeting a condition: =COUNTIF(B2:B7,">=50")', 'Functions'],
    ['IF', '=IF(test, value_if_true, value_if_false)', 'Functions'],
    ['VLOOKUP', '=VLOOKUP(value, table, column number, FALSE) finds a value in the first column and returns another column', 'Functions'],
    ['RANK', 'Position of a number in a list: =RANK(B2,$B$2:$B$7)', 'Functions'],
    ['TODAY()', 'Returns today’s date', 'Functions'],
    ['Relative reference', 'A1: changes when copied', 'References'],
    ['Absolute reference', '$A$1: stays fixed when copied', 'References'],
    ['Mixed reference', '$A1 (column fixed) or A$1 (row fixed)', 'References'],
    ['Comparison operators', '= equal, <> not equal, > greater, < less, >= at least, <= at most', 'Functions'],
    ['Sorting', 'Arranging rows in ascending or descending order', 'Sort & filter'],
    ['Filtering', 'Showing only rows that meet a condition (others are hidden, not deleted)', 'Sort & filter'],
    ['Advanced Filter: same row', 'AND: all conditions must be true', 'Sort & filter'],
    ['Advanced Filter: different rows', 'OR: any condition can be true', 'Sort & filter'],
    ['Pie chart', 'Parts of a whole (one data series)', 'Charts'],
    ['Line graph', 'Trends over time', 'Charts'],
    ['#DIV/0!', 'Dividing by zero or an empty cell', 'Errors'],
    ['#NAME?', 'Misspelled function or text without quotes', 'Errors'],
    ['#VALUE!', 'Wrong data type in a calculation', 'Errors'],
    ['#REF!', 'Reference to a deleted cell', 'Errors'],
    ['#N/A', 'Lookup value not found', 'Errors'],
    ['#####', 'Column too narrow', 'Errors']
  ]
});
