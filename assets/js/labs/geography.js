/* Zing interactive tools — Geography (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(function () {
  'use strict';
  const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString('en-JM');
  const dashed = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="sv-ln" stroke-dasharray="5 4"/>`;
  const half = (cx, cy, r, cls) => `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z" class="${cls}"/>`;
  // Saffir–Simpson scale in km/h (sustained winds)
  const BANDS = [[0, 62, 'Tropical depression', 'TD'], [63, 118, 'Tropical storm', 'TS'], [119, 153, 'Category 1 hurricane', '1'], [154, 177, 'Category 2 hurricane', '2'], [178, 208, 'Category 3 hurricane', '3'], [209, 251, 'Category 4 hurricane', '4'], [252, 400, 'Category 5 hurricane', '5']];

  const EARTH = half(200, 215, 190, 'sv-rock') + half(200, 215, 180, 'sv-earth') + half(200, 215, 100, 'sv-lava') + half(200, 215, 52, 'sv-core') + '<line x1="0" y1="215" x2="400" y2="215" class="sv-ln"/>';
  const VOLCANO = `
    <rect x="0" y="0" width="400" height="210" class="sv-sky"/><rect x="0" y="210" width="400" height="90" class="sv-earth"/>
    <polygon points="60,210 175,70 225,70 340,210" class="sv-rock"/>
    <polyline points="92,210 180,98" class="sv-ln"/><polyline points="124,210 186,128" class="sv-ln"/><polyline points="308,210 220,98" class="sv-ln"/><polyline points="276,210 214,128" class="sv-ln"/>
    <polygon points="178,70 200,88 222,70" class="sv-sky"/>
    <ellipse cx="200" cy="262" rx="72" ry="26" class="sv-lava"/>
    <rect x="193" y="84" width="14" height="160" class="sv-lava"/>
    <polygon points="205,186 205,174 270,136 276,146" class="sv-lava"/><polygon points="262,150 278,124 296,152" class="sv-rock"/><rect x="273" y="124" width="8" height="14" class="sv-lava"/>
    <polygon points="180,74 152,110 122,152 96,204 110,204 134,154 162,112 186,78" class="sv-lava"/>
    <circle cx="200" cy="40" r="22" class="sv-ash"/><circle cx="176" cy="30" r="16" class="sv-ash"/><circle cx="226" cy="28" r="18" class="sv-ash"/><circle cx="202" cy="16" r="14" class="sv-ash"/>`;

  (EF.labs = EF.labs || {}).geography = [
    { id: 'water-cycle', kind: 'order', topic: 'water-cycle', title: 'One trip around the water cycle', desc: 'The water cycle has many routes. Follow one drop from the sea and back.',
      prompt: 'Follow one drop of water. Start with it evaporating from the sea.',
      steps: [
        ['Evaporation', 'The Sun heats the sea: liquid water becomes water vapour'],
        ['Condensation', 'Rising moist air cools: vapour becomes tiny droplets in clouds'],
        ['Precipitation', 'Rain, snow, sleet or hail falls from the clouds'],
        ['Infiltration', 'Water soaks into the soil at the surface'],
        ['Percolation', 'It moves deeper through soil and rock'],
        ['Groundwater flow', 'Below the water table it flows to springs, rivers and the sea']
      ] },
    { id: 'spheres', kind: 'sort', topic: 'earths-spheres', title: 'Earth’s spheres', desc: 'Sort each part of the Earth into its sphere.',
      buckets: ['Atmosphere', 'Hydrosphere', 'Geosphere', 'Biosphere'],
      items: [
        ['Nitrogen and oxygen gas', 0], ['The ozone layer', 0], ['The air we breathe', 0],
        ['Oceans and lakes', 1], ['Glaciers and ice caps', 1], ['Groundwater', 1],
        ['Rocks and minerals', 2], ['The mantle and core', 2], ['Mountains', 2],
        ['Plants and animals', 3], ['Bacteria in the soil', 3], ['Coral reefs', 3, 'Corals are living things']
      ] },
    { id: 'rock-types', kind: 'sort', topic: 'rocks', title: 'Igneous, sedimentary or metamorphic?', desc: 'Sort the rocks and clues by how the rock formed.',
      buckets: ['Igneous', 'Sedimentary', 'Metamorphic'],
      items: [
        ['Granite', 0, 'Intrusive: cooled slowly underground, so large crystals'], ['Basalt', 0, 'Extrusive: cooled fast at the surface, so small crystals'], ['Forms when magma or lava cools', 0], ['Glassy rock from very fast cooling', 0],
        ['Sandstone', 1], ['Shale', 1], ['Limestone', 1, 'Mostly calcium carbonate'], ['Compaction and cementation', 1], ['Often has layers and fossils', 1],
        ['Marble', 2, 'Limestone changed by heat and pressure'], ['Slate', 2, 'Shale changed by heat and pressure'], ['Gneiss', 2], ['Changed by heat and pressure without melting', 2]
      ] },
    { id: 'earth-layers', kind: 'label', topic: 'earths-structure', title: 'Inside the Earth', desc: 'Label the four layers, from the crust to the inner core.',
      viewBox: '0 0 400 230', svg: EARTH,
      spots: [
        [69, 84, 'Crust', 'Thin rocky outer layer: continental crust is thicker, oceanic crust is denser'],
        [101, 116, 'Mantle', 'Mostly solid rock that flows very slowly'],
        [200, 139, 'Outer core', 'Liquid iron and nickel: its motion helps make the magnetic field'],
        [200, 192, 'Inner core', 'Solid iron, kept solid by huge pressure']
      ] },
    { id: 'plate-boundaries', kind: 'sort', topic: 'plate-boundaries', title: 'Plate boundaries', desc: 'Divergent, convergent or transform? Sort the clues.',
      buckets: ['Divergent (constructive)', 'Convergent (destructive)', 'Transform (conservative)'],
      items: [
        ['Plates move apart', 0], ['Mid-ocean ridges', 0], ['New crust is created', 0],
        ['Plates move together', 1], ['One plate sinks under another (subduction)', 1], ['Trenches and volcanic island arcs', 1], ['The Lesser Antilles volcanic arc', 1],
        ['Plates slide past each other', 2], ['No crust is created or destroyed', 2], ['Plates lock, then slip suddenly: earthquakes', 2]
      ] },
    { id: 'volcano', kind: 'label', topic: 'volcanoes', title: 'Label a volcano', desc: 'Name the parts of a composite volcano.',
      viewBox: '0 0 400 300', svg: VOLCANO,
      spots: [
        [200, 34, 'Ash cloud', 'Fine rock and gas blasted into the air'],
        [200, 78, 'Crater', 'Bowl-shaped dip around the summit vent'],
        [200, 160, 'Main vent', 'The pipe (conduit) that magma rises through'],
        [200, 262, 'Magma chamber', 'Underground store of magma'],
        [126, 150, 'Lava flow', 'Erupted magma running down the side'],
        [279, 120, 'Secondary cone', 'Built by a side vent'],
        [300, 196, 'Layers of lava and ash', 'They build up a composite cone']
      ] },
    { id: 'magnitude', kind: 'lab', topic: 'earthquakes', title: 'Earthquake magnitude', desc: 'Compare two earthquakes and see how fast the numbers grow.',
      inputs: [
        { id: 'a', label: 'Earthquake A', min: 1, max: 9, step: 0.5, value: 6 },
        { id: 'b', label: 'Earthquake B', min: 1, max: 9, step: 0.5, value: 5 }
      ],
      calc: (v) => {
        const S = EF.svg, d = Math.abs(v.a - v.b), amp = 10 ** d, energy = 32 ** d, big = v.a >= v.b ? 'A' : 'B';
        const wave = (y, m) => { const h = m * 7; let pts = ''; for (let i = 0; i <= 28; i++) { const x = 20 + i * 10, k = Math.sin((i / 28) * Math.PI); pts += `${x},${(y + (i % 2 ? -1 : 1) * h * k).toFixed(1)} `; } return `<polyline points="${pts}" class="sv-lc"/>`; };
        const body = S.text(20, 22, 'A: magnitude ' + v.a, 'sv-t', 'start') + wave(78, v.a) + S.text(20, 158, 'B: magnitude ' + v.b, 'sv-t', 'start') + wave(214, v.b) + S.text(310, 276, '(heights on a log scale)', 'sv-ts', 'end');
        return {
          out: [['Difference', fmt(d)], ['Amplitude', d ? `${big}: ${fmt(amp)}× bigger` : 'The same'], ['Energy', d ? `${big}: about ${fmt(energy)}×` : 'The same']],
          svg: S.wrap(320, 284, body, 'Two seismograms'),
          note: 'Magnitude scales are logarithmic: each step up is 10 times the recorded amplitude and about 32 times the energy.'
        };
      },
      goal: { text: 'How many times bigger is the amplitude of a magnitude 7 than a magnitude 5? Set A to 7 and B to 5.', check: (v) => v.a === 7 && v.b === 5 } },
    { id: 'altitude', kind: 'lab', topic: 'temperature-factors', title: 'Cooler up high', desc: 'Climb a mountain and watch the temperature drop.',
      inputs: [
        { id: 't0', label: 'Temperature at sea level', min: 20, max: 35, value: 30, unit: '°C' },
        { id: 'h', label: 'Height above sea level', min: 0, max: 3000, step: 100, value: 1000, unit: 'm' },
        { id: 'r', label: 'Lapse rate (°C drop per 1,000 m)', min: 5, max: 10, step: 0.5, value: 6.5 }
      ],
      calc: (v) => {
        const S = EF.svg, T = v.t0 - (v.r * v.h) / 1000, Y = (h) => 220 - (h / 3000) * 190, y = Y(v.h), peak = Y(2256);
        const body = `<polygon points="20,220 120,${peak.toFixed(1)} 160,${(peak + 30).toFixed(1)} 300,220" class="sv-leaf"/>` +
          dashed(20, peak.toFixed(1), 300, peak.toFixed(1)) + S.text(300, peak - 6, 'Blue Mountain Peak 2,256 m', 'sv-ts', 'end') +
          S.line(20, y, 300, y, 'sv-lc') + S.circle(70, y, 7, 'sv-c') + S.text(84, y - 8, `${fmt(T)} °C at ${v.h.toLocaleString('en-JM')} m`, 'sv-t', 'start') +
          S.line(20, 220, 300, 220) + S.text(20, 238, 'Sea level: ' + v.t0 + ' °C', 'sv-ts', 'start');
        return {
          out: [['Temperature here', fmt(T) + ' °C'], ['Drop from sea level', fmt(v.t0 - T) + ' °C']],
          svg: S.wrap(320, 246, body, 'Mountain temperature'),
          note: `Drop = ${v.r} × ${v.h.toLocaleString('en-JM')} ÷ 1,000 = ${fmt((v.r * v.h) / 1000)} °C. Always use the lapse rate the question gives you: it is not the same everywhere.`
        };
      },
      goal: { text: 'Sea level is 30 °C and the lapse rate is 6.5 °C per 1,000 m. Find the temperature at 2,000 m.', check: (v) => v.t0 === 30 && v.h === 2000 && v.r === 6.5 } },
    { id: 'hurricane', kind: 'lab', topic: 'hurricanes', title: 'Hurricane strength', desc: 'Spin up the winds and see the storm’s category on the Saffir–Simpson scale.',
      inputs: [{ id: 'w', label: 'Sustained wind speed', min: 20, max: 300, value: 100, unit: 'km/h' }],
      calc: (v) => {
        const S = EF.svg, band = BANDS.find((b) => v.w >= b[0] && v.w <= b[1]), X = (k) => 10 + (Math.min(k, 300) / 300) * 300;
        let body = '';
        BANDS.forEach((b) => { const x1 = X(b[0]), x2 = X(Math.min(b[1] + 1, 300)); body += `<rect x="${x1.toFixed(1)}" y="60" width="${(x2 - x1).toFixed(1)}" height="40" class="${b === band ? 'sv-c' : 'sv-mut'}"/>` + S.text((x1 + x2) / 2, 85, b[3], 'sv-t'); });
        const px = X(v.w);
        body += `<polygon points="${px.toFixed(1)},56 ${(px - 8).toFixed(1)},40 ${(px + 8).toFixed(1)},40" class="sv-c"/>` + S.text(px, 32, v.w + ' km/h', 'sv-t') +
          S.text(10, 122, '0', 'sv-ts', 'start') + S.text(310, 122, '300 km/h', 'sv-ts', 'end') + S.text(160, 146, band[2], 'sv-t');
        return {
          out: [['Storm type', band[2]], ['Wind range', band[1] > 300 ? band[0] + ' km/h or more' : `${band[0]}–${band[1]} km/h`]],
          svg: S.wrap(320, 156, body, band[2]),
          note: 'A storm becomes a hurricane at 119 km/h. Higher categories mean stronger winds, but rain and storm surge can be deadly at any category.'
        };
      },
      goal: { text: 'Turn the storm into a Category 5 hurricane.', check: (v) => v.w >= 252 } },
    { id: 'karst', kind: 'sort', topic: 'caves', title: 'Limestone landscapes', desc: 'Is each feature on the surface or underground?',
      buckets: ['Surface features', 'Underground features'],
      items: [
        ['Limestone pavement', 0], ['Clints', 0, 'The blocks of a limestone pavement'], ['Grikes', 0, 'The widened cracks between clints'], ['Swallow hole', 0, 'Where a surface stream disappears underground'], ['Cockpit karst', 0],
        ['Cave or cavern', 1], ['Stalactite', 1, 'Hangs from the ceiling'], ['Stalagmite', 1, 'Grows up from the floor'], ['Pillar (column)', 1, 'Where a stalactite and stalagmite meet'], ['Underground stream', 1]
      ] }
  ];
})();
