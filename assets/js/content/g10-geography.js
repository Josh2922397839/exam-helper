/* ExamForge content — Grade 10 Geography.
   Scope = current topics found in the study inventory: Earth's spheres and their interactions, the hydrologic (water) cycle
   and human impacts on it, types of rainfall with windward/leeward effects and Jamaican examples, and air masses / fronts.
   Explanations use standard physical-geography facts; no rainfall statistics are quoted. */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

EF.subjects.push({
  id: 'geography',
  name: 'Geography',
  short: 'Geography',
  grade: 10,
  icon: 'fa-earth-americas',
  color: '#84cc16',
  tagline: 'Earth’s spheres, the water cycle, types of rainfall and fronts',
  intro: 'How the four spheres interact, every stage of the water cycle and how people change it, why Portland is wet and Portmore is dry, and how air masses and cold fronts bring rain.',

  topics: [
    {
      id: 'spheres', title: 'Earth’s four spheres', nav: 'Earth’s Spheres', icon: 'fa-earth-americas',
      blocks: [
        {
          type: 'grid', cols: 4, items: [
            { icon: 'fa-wind', title: 'Atmosphere', color: '#38bdf8', html: 'The layer of <strong>gases</strong> around the Earth (air): nitrogen, oxygen, carbon dioxide, water vapour.' },
            { icon: 'fa-water', title: 'Hydrosphere', color: '#3b82f6', html: 'All the <strong>water</strong> on Earth: oceans, rivers, lakes, groundwater, ice and water vapour.' },
            { icon: 'fa-mountain', title: 'Lithosphere (geosphere)', color: '#a16207', html: 'The <strong>solid</strong> Earth: rocks, soil, mountains, the crust.' },
            { icon: 'fa-tree', title: 'Biosphere', color: '#22c55e', html: 'All <strong>living things</strong>: plants, animals, people and micro-organisms.' }
          ]
        },
        { type: 'heading', text: 'How the spheres interact' },
        {
          type: 'table', head: ['Interaction', 'Example'], rows: [
            ['Atmosphere → hydrosphere', 'wind creates waves; rain falls into rivers and the sea'],
            ['Hydrosphere → lithosphere', 'rivers and waves erode rock; rainwater dissolves limestone'],
            ['Lithosphere → atmosphere', 'volcanoes release ash and gases into the air'],
            ['Biosphere → atmosphere', 'plants give out oxygen and take in carbon dioxide; transpiration adds water vapour'],
            ['Biosphere → lithosphere', 'roots break up rock; dead plants form soil; people quarry and build'],
            ['Atmosphere → biosphere', 'hurricanes destroy crops and habitats']
          ]
        },
        {
          type: 'compare', items: [
            { title: 'Open system', color: '#84cc16', summary: [['Meaning', '<strong>energy and matter</strong> can enter and leave']], phases: [['Example', 'a drainage basin: rain comes in, water leaves by rivers and evaporation']] },
            { title: 'Closed system', color: '#3b82f6', summary: [['Meaning', 'energy enters and leaves but <strong>matter stays inside</strong>']], phases: [['Example', 'the global water cycle: the same water keeps moving around the Earth']] }
          ]
        }
      ]
    },
    {
      id: 'water-cycle', title: 'The hydrologic (water) cycle', nav: 'Water Cycle', icon: 'fa-droplet',
      blocks: [
        { type: 'lead', html: 'The <strong>water cycle</strong> is the continuous movement of water between the sea, the air and the land. It is powered by the <strong>Sun</strong> (heat for evaporation) and <strong>gravity</strong> (pulls rain down and makes water flow downhill).' },
        {
          type: 'steps', items: [
            { title: 'Evaporation', html: 'The Sun heats water in seas, rivers and lakes; it turns into <strong>water vapour</strong> and rises.' },
            { title: 'Transpiration', html: 'Plants lose water vapour through tiny pores (stomata) in their leaves. Evaporation + transpiration = <strong>evapotranspiration</strong>.' },
            { title: 'Condensation', html: 'Rising vapour cools and turns back into tiny water droplets, forming <strong>clouds</strong>.' },
            { title: 'Precipitation', html: 'Droplets join and become heavy, then fall as <strong>rain</strong>, hail or snow.' },
            { title: 'Interception', html: 'Leaves and branches catch rain before it reaches the ground.' },
            { title: 'Infiltration and percolation', html: 'Water <strong>soaks into</strong> the soil (infiltration) and then moves down into the rock below (percolation).' },
            { title: 'Surface runoff', html: 'Water that flows <strong>over</strong> the ground into streams and rivers, especially when the ground is saturated or paved.' },
            { title: 'Throughflow and groundwater flow', html: 'Water moving slowly sideways through soil (throughflow) and through rock (groundwater flow) towards rivers and the sea.' }
          ]
        },
        { type: 'components', title: 'Where water is stored', items: [['fa-water', 'oceans (most of it)'], ['fa-icicles', 'ice caps and glaciers'], ['fa-arrow-down', 'groundwater (aquifers)'], ['fa-bridge-water', 'lakes and rivers'], ['fa-cloud', 'the atmosphere'], ['fa-leaf', 'plants and animals']] },
        {
          type: 'grid', cols: 2, items: [
            { icon: 'fa-faucet-drip', title: 'Why it matters', list: ['Supplies <strong>fresh water</strong> for drinking, farming and industry', 'Drives <strong>weather</strong> and moves heat around the planet', 'Shapes the land through erosion', 'Supports all life'] },
            { icon: 'fa-person-digging', title: 'How people change it', list: ['<strong>Deforestation</strong>: less interception and transpiration → more runoff, flooding and soil erosion', '<strong>Urbanisation</strong>: concrete and roofs are impermeable → fast runoff and flash floods', '<strong>Dams and reservoirs</strong>: store water and change river flow', '<strong>Over-pumping groundwater</strong>: wells dry up; near the coast, sea water can seep in (saline intrusion)', '<strong>Pollution</strong>: dirty runoff contaminates rivers and the sea'] }
          ]
        },
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Exam tip', html: 'When asked to “explain” a process, say <strong>what happens</strong>, <strong>why</strong> (heat, cooling, gravity) and give an <strong>example</strong>.' }
      ]
    },
    {
      id: 'rainfall', title: 'Types of rainfall', nav: 'Rainfall Types', icon: 'fa-cloud-rain',
      blocks: [
        { type: 'lead', html: 'All rain forms the same way: <strong>moist air rises → cools → water vapour condenses into clouds → rain falls</strong>. The three types differ in <strong>what makes the air rise</strong>.' },
        {
          type: 'grid', cols: 3, expand: true, items: [
            { icon: 'fa-sun', title: 'Convectional rainfall', sub: 'Air rises because it is heated', color: '#f59e0b', more: '<ol><li>The Sun heats the ground strongly.</li><li>Air above it warms and <strong>rises</strong> in convection currents.</li><li>It cools, condenses and forms tall <strong>cumulonimbus</strong> clouds.</li><li>Heavy showers, often with thunder and lightning, usually in the <strong>afternoon</strong>.</li></ol><p>Common in Jamaica’s interior on hot summer afternoons.</p>' },
            { icon: 'fa-mountain', title: 'Relief (orographic) rainfall', sub: 'Air is forced over mountains', color: '#84cc16', more: '<ol><li>Moist wind from the sea meets a mountain range.</li><li>It is <strong>forced to rise</strong> up the windward slope.</li><li>It cools, condenses and rains on the <strong>windward</strong> side.</li><li>The air sinks and warms on the <strong>leeward</strong> side, so it is dry: a <strong>rain shadow</strong>.</li></ol>' },
            { icon: 'fa-temperature-arrow-down', title: 'Frontal (cyclonic) rainfall', sub: 'Warm air meets cold air', color: '#3b82f6', more: '<ol><li>A warm air mass meets a cold air mass.</li><li>The lighter <strong>warm air is forced to rise</strong> over the cold, dense air.</li><li>It cools and condenses, giving cloud and rain along the <strong>front</strong>.</li></ol><p>In Jamaica, <strong>cold fronts</strong> from North America in the winter months bring rain, mainly to the northern parishes.</p>' }
          ]
        },
        {
          type: 'compare', items: [
            { title: 'Windward side', color: '#22c55e', summary: [['Faces', 'the wind'], ['Air', 'rises and cools']], phases: [['Weather', 'cloudy and <strong>wet</strong>'], ['Vegetation', 'lush and green']] },
            { title: 'Leeward side', color: '#f59e0b', summary: [['Faces', 'away from the wind'], ['Air', 'sinks and warms']], phases: [['Weather', 'drier: the rain shadow'], ['Vegetation', 'drier scrub and grass']] }
          ]
        },
        {
          type: 'worked', label: 'Jamaican example', icon: 'fa-location-dot', q: 'Explain why Portland in north-east Jamaica is much wetter than Portmore in the south.',
          steps: ['Jamaica’s main winds are the <strong>north-east trade winds</strong>, which pick up moisture over the Caribbean Sea.', 'They meet the <strong>Blue Mountains and John Crow Mountains</strong>, so Portland is on the <strong>windward</strong> side.', 'The air is forced to rise, cools and condenses → heavy <strong>relief rainfall</strong> in Portland.', 'By the time the air crosses the mountains it has lost most of its moisture and it <strong>sinks and warms</strong>.', 'Portmore (and Kingston) lie on the <strong>leeward</strong> side in the <strong>rain shadow</strong>, so they get much less rain.'],
          answer: 'Portland is windward (relief rain); Portmore is leeward, in the rain shadow'
        }
      ]
    },
    {
      id: 'air-masses', title: 'Air masses and fronts', nav: 'Air Masses & Fronts', icon: 'fa-wind',
      blocks: [
        { type: 'lead', html: 'An <strong>air mass</strong> is a huge body of air with the <strong>same temperature and humidity</strong> throughout. It takes on the conditions of the area it formed over.' },
        {
          type: 'table', head: ['Type', 'Forms over', 'Conditions'], rows: [
            ['Maritime tropical', 'warm oceans (e.g. the Atlantic near the Caribbean)', 'warm and moist'],
            ['Continental tropical', 'hot deserts', 'hot and dry'],
            ['Maritime polar', 'cold oceans', 'cool and moist'],
            ['Continental polar', 'cold land (e.g. Canada in winter)', 'cold and dry']
          ]
        },
        { type: 'text', html: 'A <strong>front</strong> is the boundary where two air masses meet.' },
        {
          type: 'compare', items: [
            { title: 'Cold front', color: '#3b82f6', summary: [['What happens', 'cold air pushes <strong>under</strong> warm air and lifts it steeply'], ['Map symbol', 'blue line with triangles']], phases: [['Rain', 'heavy, short bursts; thunderstorms'], ['After it passes', 'cooler, clearer, windier']] },
            { title: 'Warm front', color: '#ef4444', summary: [['What happens', 'warm air <strong>slides up over</strong> cold air gently'], ['Map symbol', 'red line with semicircles']], phases: [['Rain', 'steady, long-lasting drizzle or rain'], ['After it passes', 'warmer and more humid']] }
          ]
        },
        { type: 'callout', tone: 'info', icon: 'fa-calendar', title: 'Fronts in Jamaica', html: 'Jamaica is usually under warm, moist <strong>maritime tropical</strong> air. In the cooler months, <strong>cold fronts</strong> moving south from North America sometimes reach the island, bringing cooler temperatures, stronger winds and rain, especially along the north coast.' }
      ]
    }
  ],

  quiz: [
    { q: 'The hydrosphere is made up of…', options: ['all the water on Earth', 'all the gases around Earth', 'all living things', 'rocks and soil'], answer: 0, why: 'Hydro = water.' },
    { q: 'The biosphere includes…', options: ['all living things', 'the oceans only', 'the air only', 'the Earth’s core'], answer: 0, why: 'Bio = life.' },
    { q: 'Volcanic ash entering the air is an interaction between the…', options: ['lithosphere and atmosphere', 'biosphere and hydrosphere', 'hydrosphere and atmosphere', 'biosphere and lithosphere'], answer: 0, why: 'Solid Earth → air.' },
    { q: 'What provides the energy for the water cycle?', options: ['The Sun', 'The Moon', 'Wind', 'Volcanoes'], answer: 0, why: 'Heat from the Sun drives evaporation.' },
    { q: 'Water vapour cooling to form clouds is…', options: ['condensation', 'evaporation', 'precipitation', 'infiltration'], answer: 0, why: 'Gas → liquid droplets.' },
    { q: 'Water lost from plant leaves is…', options: ['transpiration', 'precipitation', 'percolation', 'runoff'], answer: 0, why: 'It escapes through stomata.' },
    { q: 'Water soaking into the soil is called…', options: ['infiltration', 'runoff', 'condensation', 'interception'], answer: 0, why: 'Then percolation takes it deeper.' },
    { q: 'Why does urbanisation increase flooding?', options: ['Concrete is impermeable, so more water runs off', 'Buildings make it rain more', 'Cities have more rivers', 'Trees grow faster in towns'], answer: 0, why: 'Less infiltration means more, faster surface runoff.' },
    { q: 'Deforestation leads to…', options: ['more runoff and soil erosion', 'more interception', 'more transpiration', 'less flooding'], answer: 0, why: 'Fewer trees catch and use the rain.' },
    { q: 'Rainfall caused by the ground heating the air so it rises is…', options: ['convectional', 'relief', 'frontal', 'cyclonic'], answer: 0, why: 'Hot ground → rising air → afternoon storms.' },
    { q: 'Relief rainfall happens when moist air is…', options: ['forced to rise over mountains', 'heated by the ground', 'pushed up by a cold front', 'sinking over the sea'], answer: 0, why: 'Also called orographic rainfall.' },
    { q: 'The dry area on the leeward side of mountains is called a…', options: ['rain shadow', 'front', 'watershed', 'drainage basin'], answer: 0, why: 'The air sinks and warms there.' },
    { q: 'Why is Portmore drier than Portland?', options: ['It is on the leeward side of the mountains', 'It is higher up', 'It is further from the Sun', 'It has more trees'], answer: 0, why: 'The NE trade winds drop their rain on the windward side first.' },
    { q: 'Thunderstorms on hot summer afternoons are usually…', options: ['convectional rainfall', 'frontal rainfall', 'relief rainfall', 'drizzle'], answer: 0, why: 'Strong heating causes rising air and cumulonimbus clouds.' },
    { q: 'An air mass is a large body of air with the same…', options: ['temperature and humidity', 'speed and direction', 'colour and smell', 'height and pressure only'], answer: 0, why: 'It takes on the conditions of its source region.' },
    { q: 'A maritime tropical air mass is…', options: ['warm and moist', 'cold and dry', 'hot and dry', 'cool and moist'], answer: 0, why: 'Maritime = sea (moist); tropical = warm.' },
    { q: 'At a cold front…', options: ['cold air pushes under warm air', 'warm air slides gently over cold air', 'no rain falls', 'air masses mix evenly'], answer: 0, why: 'This lifts the warm air steeply, giving heavy short rain.' },
    { q: 'The global water cycle is a closed system because…', options: ['the same water stays on Earth and keeps moving', 'no energy enters it', 'no rain falls', 'it only happens on land'], answer: 0, why: 'Matter stays in; energy from the Sun enters and leaves.' }
  ],

  flashcards: [
    ['Atmosphere', 'Layer of gases around the Earth', 'Spheres'],
    ['Hydrosphere', 'All water on Earth: oceans, rivers, ice, groundwater, vapour', 'Spheres'],
    ['Lithosphere', 'The solid Earth: rocks, soil, crust', 'Spheres'],
    ['Biosphere', 'All living things', 'Spheres'],
    ['Open system', 'Energy and matter can enter and leave (e.g. a drainage basin)', 'Spheres'],
    ['Closed system', 'Only energy enters and leaves; matter stays (e.g. the global water cycle)', 'Spheres'],
    ['What drives the water cycle?', 'The Sun (energy) and gravity', 'Water cycle'],
    ['Evaporation', 'Liquid water turns into water vapour when heated', 'Water cycle'],
    ['Transpiration', 'Water vapour lost from plant leaves', 'Water cycle'],
    ['Condensation', 'Water vapour cools into droplets (clouds)', 'Water cycle'],
    ['Precipitation', 'Water falling from clouds as rain, hail or snow', 'Water cycle'],
    ['Interception', 'Rain caught by leaves before reaching the ground', 'Water cycle'],
    ['Infiltration', 'Water soaking into the soil', 'Water cycle'],
    ['Percolation', 'Water moving down from the soil into rock', 'Water cycle'],
    ['Surface runoff', 'Water flowing over the ground into rivers', 'Water cycle'],
    ['Groundwater', 'Water stored in rocks underground (aquifers)', 'Water cycle'],
    ['Saline intrusion', 'Sea water seeping into coastal groundwater when too much is pumped out', 'Water cycle'],
    ['How rain forms', 'Moist air rises, cools, condenses into clouds, then droplets fall', 'Rainfall'],
    ['Convectional rainfall', 'Ground heats air, it rises, cools and condenses: afternoon thunderstorms', 'Rainfall'],
    ['Relief rainfall', 'Moist air forced up over mountains; rain on the windward side', 'Rainfall'],
    ['Frontal rainfall', 'Warm air forced to rise over cold air at a front', 'Rainfall'],
    ['Windward', 'Side of a mountain facing the wind: wet', 'Rainfall'],
    ['Leeward / rain shadow', 'Side away from the wind: dry, because the air sinks and warms', 'Rainfall'],
    ['Jamaica’s main winds', 'North-east trade winds', 'Rainfall'],
    ['Air mass', 'Huge body of air with the same temperature and humidity', 'Fronts'],
    ['Maritime vs continental', 'Formed over sea (moist) vs over land (dry)', 'Fronts'],
    ['Front', 'Boundary between two air masses', 'Fronts'],
    ['Cold front', 'Cold air undercuts warm air: heavy, short rain, then cooler', 'Fronts'],
    ['Warm front', 'Warm air rises gently over cold air: long, steady rain', 'Fronts']
  ]
});
