/* Zing deck — Chemistry (Grade 9): extra cards.
   Each card: [question, answer, [three wrong answers], why]. Cards are grouped by topic. */
window.EF = window.EF || {};
(EF.decks = EF.decks || {}).chemistry = [
  { tag: 'Atomic structure', cards: [
    ['What are the three subatomic particles?', 'Protons, neutrons and electrons', ['Atoms, ions and molecules', 'Cations, anions and isotopes', 'Shells, subshells and orbitals'], 'Protons and neutrons are in the nucleus; electrons are in shells around it.'],
    ['What is the charge on an electron?', '−1', ['+1', '0', '+2'], 'Protons are +1, electrons −1 and neutrons have no charge.'],
    ['Where are protons and neutrons found?', 'In the nucleus', ['In the electron shells', 'Outside the atom', 'Only in ions'], 'The nucleus is the tiny, dense centre of the atom.'],
    ['Why is an atom neutral overall?', 'It has equal numbers of protons and electrons', ['It has no protons', 'It has more neutrons than protons', 'Its electrons have no charge'], 'The positive and negative charges cancel out.'],
    ['How many neutrons does sodium-23 have?', '12', ['11', '23', '34'], 'Neutrons = A − Z = 23 − 11 = 12.'],
    ['How many neutrons does chlorine-35 have?', '18', ['17', '35', '52'], 'Neutrons = 35 − 17 = 18.'],
    ['Carbon has Z = 6 and A = 12. How many electrons does a carbon atom have?', '6', ['12', '18', '3'], 'In a neutral atom, electrons = protons = Z.'],
    ['An atom has 19 protons and 20 neutrons. What is its mass number?', '39', ['19', '20', '1'], 'Mass number = protons + neutrons = 19 + 20.'],
    ['Oxygen has Z = 8 and A = 16. How many neutrons does it have?', '8', ['16', '24', '4'], 'Neutrons = 16 − 8 = 8.']
  ] },
  { tag: 'Electron configuration', cards: [
    ['How many electrons can an s subshell hold?', '2', ['6', '10', '14'], 's has 1 orbital, and each orbital holds 2 electrons.'],
    ['How many electrons can a d subshell hold?', '10', ['6', '2', '14'], 'd has 5 orbitals × 2 electrons.'],
    ['How many electrons can an f subshell hold?', '14', ['10', '6', '18'], 'f has 7 orbitals × 2 electrons.'],
    ['Which subshell fills straight after 3p?', '4s', ['3d', '4p', '3s'], '4s is lower in energy than 3d, so it fills first.'],
    ['What is the electron configuration of sodium (Z = 11)?', '1s² 2s² 2p⁶ 3s¹', ['1s² 2s² 2p⁷', '1s² 2s² 2p⁶ 3p¹', '1s² 2s⁸ 3s¹'], '2 + 2 + 6 + 1 = 11 electrons.'],
    ['What is the electron configuration of oxygen (Z = 8)?', '1s² 2s² 2p⁴', ['1s² 2s² 2p⁶', '1s² 2s⁴ 2p²', '1s² 2p⁶'], '2 + 2 + 4 = 8 electrons.'],
    ['What is the shell arrangement of chlorine (Z = 17)?', '2, 8, 7', ['2, 8, 8', '2, 7, 8', '8, 8, 1'], '2 + 8 + 7 = 17.'],
    ['What is the shell arrangement of calcium (Z = 20)?', '2, 8, 8, 2', ['2, 8, 10', '2, 8, 9, 1', '2, 10, 8'], 'After 18 electrons, the 4s subshell starts the fourth shell.'],
    ['Magnesium is 2, 8, 2. How many valence electrons does it have?', '2', ['8', '12', '10'], 'Valence electrons are the ones in the outermost shell.']
  ] },
  { tag: 'Ions', cards: [
    ['Sodium loses 1 electron. What ion forms?', 'Na⁺', ['Na⁻', 'Na²⁺', 'Na²⁻'], 'Losing a negative electron leaves a +1 charge.'],
    ['Chlorine gains 1 electron. What ion forms?', 'Cl⁻', ['Cl⁺', 'Cl²⁻', 'Cl²⁺'], 'Gaining an electron gives a −1 charge.'],
    ['What ion does magnesium form?', 'Mg²⁺', ['Mg⁺', 'Mg²⁻', 'Mg³⁺'], 'Group 2 metals lose 2 electrons.'],
    ['What ion does oxygen form?', 'O²⁻', ['O⁺', 'O⁻', 'O²⁺'], 'Oxygen gains 2 electrons to fill its outer shell.'],
    ['What ion does aluminium form?', 'Al³⁺', ['Al⁺', 'Al²⁺', 'Al³⁻'], 'Group 13 metals lose 3 electrons.'],
    ['An ion has 11 protons and 10 electrons. What is its charge?', '+1', ['−1', '0', '+21'], 'Charge = protons − electrons = 11 − 10.'],
    ['An ion has 17 protons and 18 electrons. What is its charge?', '−1', ['+1', '0', '−18'], '17 − 18 = −1: a chloride ion.'],
    ['Do metals usually form cations or anions?', 'Cations (positive ions)', ['Anions (negative ions)', 'Neither', 'Both equally'], 'Metals lose their valence electrons.']
  ] },
  { tag: 'Periodic table', cards: [
    ['What are the Group 1 elements called?', 'Alkali metals', ['Halogens', 'Noble gases', 'Transition metals'], 'They have 1 valence electron and are very reactive metals.'],
    ['What are the Group 17 elements called?', 'Halogens', ['Alkali metals', 'Noble gases', 'Alkaline earth metals'], 'They have 7 valence electrons and are very reactive non-metals.'],
    ['What are the Group 2 elements called?', 'Alkaline earth metals', ['Alkali metals', 'Halogens', 'Noble gases'], 'They have 2 valence electrons.'],
    ['Why are noble gases so unreactive?', 'They have a full outer shell', ['They have no electrons', 'They are metals', 'They have 1 valence electron'], 'A full shell is stable, so they rarely gain, lose or share electrons.'],
    ['Which groups hold the transition metals?', 'Groups 3–12', ['Groups 1–2', 'Group 17', 'Group 18'], 'They often form coloured compounds.'],
    ['Why do elements in the same group react in similar ways?', 'They have the same number of valence electrons', ['They have the same mass', 'They have the same number of shells', 'They have the same number of neutrons'], 'Valence electrons decide how an atom reacts.'],
    ['Sulfur has 3 occupied electron shells. Which period is it in?', 'Period 3', ['Period 6', 'Period 16', 'Period 2'], 'Period number = number of occupied shells.'],
    ['Which element is in Group 1, Period 3?', 'Sodium', ['Lithium', 'Potassium', 'Magnesium'], 'Sodium (2, 8, 1) has 3 shells and 1 valence electron.'],
    ['Which noble gas is in Period 3?', 'Argon', ['Neon', 'Helium', 'Krypton'], 'Argon (2, 8, 8) has a full outer shell.']
  ] },
  { tag: 'Ionic bonding', cards: [
    ['Ionic bonding usually happens between:', 'A metal and a non-metal', ['Two non-metals', 'Two metals', 'Two noble gases'], 'The metal gives electrons to the non-metal.'],
    ['In ionic bonding, what does the metal atom do?', 'Gives electrons to the non-metal', ['Takes electrons from the non-metal', 'Shares electrons', 'Loses protons'], 'The metal becomes a cation and the non-metal an anion.'],
    ['What holds ions together in an ionic bond?', 'The attraction between opposite charges', ['Shared pairs of electrons', 'Gravity', 'Magnetic poles'], 'It is an electrostatic attraction.'],
    ['In sodium chloride, which atom loses an electron?', 'Sodium', ['Chlorine', 'Both', 'Neither'], 'Sodium’s electron moves to chlorine: Na⁺ and Cl⁻.'],
    ['After bonding, why are Na⁺ and Cl⁻ more stable than the atoms?', 'Both now have full outer shells', ['Both have no electrons', 'Both gained protons', 'Both are neutral atoms again'], 'Na⁺ is 2, 8 and Cl⁻ is 2, 8, 8.'],
    ['In magnesium oxide, how many electrons does each Mg atom give to O?', '2', ['1', '3', '0'], 'That makes Mg²⁺ and O²⁻.']
  ] },
  { tag: 'Formulas and valency', cards: [
    ['What is the formula of sodium chloride?', 'NaCl', ['Na₂Cl', 'NaCl₂', 'SCl'], 'Na⁺ and Cl⁻ balance 1 : 1.'],
    ['What is the formula of calcium chloride?', 'CaCl₂', ['CaCl', 'Ca₂Cl', 'CaCl₃'], 'Ca²⁺ needs two Cl⁻ ions to balance.'],
    ['What is the formula of aluminium oxide?', 'Al₂O₃', ['AlO', 'Al₃O₂', 'AlO₃'], 'Swap and drop: Al³⁺ and O²⁻ give Al₂O₃ (+6 and −6).'],
    ['What is the formula of magnesium oxide?', 'MgO', ['Mg₂O₂', 'MgO₂', 'Mg₂O'], 'Mg²⁺ and O²⁻ balance 1 : 1.'],
    ['What is the formula of sodium oxide?', 'Na₂O', ['NaO', 'NaO₂', 'Na₂O₂'], 'Two Na⁺ ions balance one O²⁻ ion.'],
    ['In H₂O, what does the small 2 tell you?', 'There are 2 hydrogen atoms', ['There are 2 oxygen atoms', 'There are 2 molecules', 'Water has a charge of 2'], 'Subscripts give the number of atoms; no subscript means 1.'],
    ['In a neutral compound, the charges must add up to:', 'Zero', ['One', 'The group number', 'The mass number'], 'For MgCl₂: +2 + 2 × (−1) = 0.'],
    ['What is the valency of chlorine?', '1', ['7', '2', '17'], 'Chlorine forms Cl⁻, a charge of size 1.']
  ] },
  { tag: 'Ionic properties', cards: [
    ['Why do ionic compounds have high melting points?', 'Lots of energy is needed to break the strong forces between ions', ['Their ions are very light, so they move too fast to melt', 'They are made of small molecules with weak forces between them', 'Their electrons are shared, which makes them hard to separate'], 'The electrostatic forces in the lattice are strong.'],
    ['Why can’t solid ionic compounds conduct electricity?', 'The ions are fixed in place', ['They have no ions', 'Their electrons are shared', 'They are always wet'], 'They conduct when molten or dissolved, because then the ions can move.'],
    ['Why are ionic crystals brittle?', 'A force lines up like charges, which repel and split the crystal', ['The ions are soft, so they squash and crack under pressure', 'Water trapped inside the crystal expands and breaks it apart', 'Their bonds are weak, so a small force pulls the ions apart'], 'Shifting the layers puts + next to + and − next to −.'],
    ['What structure do ionic compounds form?', 'A giant 3D crystal lattice', ['Small separate molecules', 'Long chains', 'Single atoms'], 'The ions sit in a repeating pattern.'],
    ['Why do many ionic compounds dissolve in water?', 'Polar water molecules surround the ions and pull them apart', ['Water melts the ions because it is warmer than the crystal', 'The ions are lighter than water, so they float away', 'Water has no charges, so it slips between the ions'], 'The separated ions spread through the solution.']
  ] },
  { tag: 'Elements 1–20', cards: [
    ['Which element is the lightest and most abundant in the universe?', 'Hydrogen', ['Helium', 'Oxygen', 'Carbon'], 'It makes up about 75% of normal matter by mass.'],
    ['Which unreactive gas is used to fill balloons?', 'Helium', ['Neon', 'Argon', 'Chlorine'], 'Helium is light and, unlike hydrogen, does not burn.'],
    ['Which element was found on the Sun before it was found on Earth?', 'Helium', ['Hydrogen', 'Neon', 'Oxygen'], 'Its name comes from Helios, the Greek sun god.'],
    ['Which element is the most reactive non-metal?', 'Fluorine', ['Chlorine', 'Oxygen', 'Neon'], 'Fluorine (2, 7) needs just one electron to fill its outer shell, and grabs it very strongly.']
  ] }
];
