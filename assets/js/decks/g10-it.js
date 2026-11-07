/* Zing deck — Information Technology (Grade 10): extra cards.
   Each card: [question, answer, [three wrong answers], why]. Cards are grouped by topic. */
window.EF = window.EF || {};
(EF.decks = EF.decks || {}).it = [
  { tag: 'Hardware', cards: [
    ['Which is fastest: RAM, an SSD or a hard disk?', 'RAM', ['An SSD', 'A hard disk', 'An optical disc'], 'RAM is primary memory: very fast, but it loses data when the power is off.'],
    ['Name two examples of secondary storage.', 'A hard disk and a flash drive', ['RAM and cache', 'The CPU and the ALU', 'A monitor and a printer'], 'Secondary storage keeps data when the power is off.'],
    ['What does the ALU do?', 'Carries out arithmetic and logic operations', ['Stores files permanently', 'Displays output', 'Connects to the internet'], 'The ALU is part of the CPU, with the control unit and registers.'],
    ['Name two input devices.', 'A keyboard and a scanner', ['A monitor and a speaker', 'A printer and a projector', 'A plotter and headphones'], 'Input devices send data into the computer.'],
    ['Name two output devices.', 'A printer and a monitor', ['A mouse and a microphone', 'A scanner and a webcam', 'A keyboard and a barcode reader'], 'Output devices present the results.']
  ] },
  { tag: 'Software', cards: [
    ['Which of these is system software?', 'An operating system, like Windows', ['A word processor', 'A spreadsheet', 'A photo editor'], 'System software runs the computer; application software does the user’s tasks.'],
    ['What is open-source software?', 'Software whose source code anyone can see and change', ['Software you must pay for each month', 'Software that only works offline', 'Software with no licence at all'], 'LibreOffice and Firefox are open source.'],
    ['What is a GUI?', 'A graphical user interface, with windows, icons, menus and a pointer', ['A command-line interface where every instruction must be typed', 'A type of network that links computers in one small building', 'A storage device that keeps data even when the power is off'], 'A command-line interface needs typed commands instead.']
  ] },
  { tag: 'Networks', cards: [
    ['What is a LAN?', 'A network covering a small area, like a school', ['A network covering a whole country', 'A single computer', 'Only the internet'], 'A WAN covers a large area.'],
    ['What sits at the centre of a star network?', 'A switch (or hub)', ['A printer', 'One long shared cable', 'A ring of computers'], 'If one cable fails, only that one computer is cut off.'],
    ['What is bandwidth?', 'The amount of data that can be sent each second', ['The length of a cable', 'The number of computers on a network', 'The size of a hard disk'], 'It is measured in bits per second, such as Mbps.'],
    ['Which transmission medium uses light?', 'Fibre-optic cable', ['Twisted-pair cable', 'Coaxial cable', 'Radio waves'], 'It is fast and not affected by electrical interference.']
  ] },
  { tag: 'Problem solving', cards: [
    ['Which data type holds whole numbers?', 'Integer', ['Real', 'String', 'Boolean'], 'Real (floating-point) numbers have decimals.'],
    ['Which data type holds True or False?', 'Boolean', ['String', 'Integer', 'Character'], 'A Boolean holds one of two values.'],
    ['In a flowchart, what does a diamond mean?', 'A decision', ['Start or stop', 'Input or output', 'A process'], 'A decision has Yes and No branches.'],
    ['In a flowchart, which shape shows input or output?', 'A parallelogram', ['A diamond', 'A rectangle', 'An oval'], 'Rectangles are processes; ovals are start and stop.'],
    ['What is pseudocode?', 'Plain-language steps that look like code, used to plan an algorithm', ['A real programming language that the computer can run directly', 'A type of computer virus that pretends to be a useful program', 'A spreadsheet formula used to look up values in a table'], 'Pseudocode is not run by a computer.'],
    ['What is an algorithm?', 'A finite set of clear steps that solves a problem', ['A piece of hardware that carries out instructions', 'A type of chart used to show data in a spreadsheet', 'An error message shown when a program crashes'], 'It can be written as pseudocode or a flowchart.']
  ] },
  { tag: 'Health and safety', cards: [
    ['How can you prevent repetitive strain injury (RSI)?', 'Take regular breaks and use an ergonomic keyboard and mouse', ['Type faster so your hands spend less time on the keyboard', 'Sit closer to the screen so your arms do not stretch', 'Lower your chair so your wrists bend up to reach the keys'], 'RSI comes from repeating the same movements.'],
    ['How can you reduce eye strain at a computer?', 'Take screen breaks and adjust the screen’s brightness', ['Turn off all the room lights so the screen looks brighter', 'Sit as close to the screen as you can to see clearly', 'Stare at the screen without blinking to stay focused'], 'Try 20-20-20: every 20 minutes, look 20 feet away for 20 seconds.'],
    ['Why is e-waste harmful?', 'It contains toxic materials like lead and mercury', ['It is too heavy for rubbish trucks to collect', 'It uses up large amounts of paper when recycled', 'It makes the computers still in use run slower'], 'Old devices should be recycled properly.']
  ] }
];
