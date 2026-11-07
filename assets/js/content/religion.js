/* ExamForge content — Religious Education
   Edit the text here and the whole site updates. HTML tags like <strong> are allowed. */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

EF.subjects.push({
  id: 'religion',
  name: 'Religious Education',
  short: 'Religion',
  grade: 9,
  icon: 'fa-hands-praying',
  emoji: '🙏',
  color: '#e8a317',
  tagline: 'World religions, Genesis 25–33 and Jacob’s journey',
  intro: 'Explore five world religions and follow Jacob’s story from Genesis 25 to 33 — with flip cards, timelines and key verses.',

  topics: [
    {
      id: 'world-religions',
      title: 'World Religions',
      icon: 'fa-earth-americas',
      blocks: [
        { type: 'text', html: 'Tap a card to flip it and see the beliefs, practices, key figures, holy texts, history and where each religion is followed today.' },
        {
          type: 'flip',
          items: [
            {
              icon: 'fa-cross', color: '#4f7cff', title: 'Christianity', sub: 'Began 1st century CE, Judea',
              rows: [
                ['Beliefs', 'One God as Trinity (Father, Son, Holy Spirit). Jesus Christ is the Son of God, died for humanity’s sins and was resurrected. Salvation through faith in Jesus.'],
                ['Practices', 'Prayer, church services, sacraments (baptism, communion), Bible reading, living by Christian teachings.'],
                ['Key figures', 'Jesus Christ, the Apostles (Peter, Paul), various saints.'],
                ['Texts', 'The Bible (Old & New Testament).'],
                ['History', 'Originated in Judea, 1st century CE. Spread through the Roman Empire and worldwide.'],
                ['Where', 'Global — Europe, the Americas, Africa, parts of Asia.']
              ]
            },
            {
              icon: 'fa-star-and-crescent', color: '#2fbf71', title: 'Islam', sub: 'Began 7th century CE, Mecca',
              rows: [
                ['Beliefs', 'One God (Allah), indivisible. Muhammad is the final prophet. The Quran is the literal word of Allah. Belief in angels, divine books, prophets, the Day of Judgment and divine decree.'],
                ['Practices', 'The Five Pillars: Shahada (declaration of faith), Salat (prayer 5× daily), Zakat (charity), Sawm (fasting in Ramadan), Hajj (pilgrimage to Mecca).'],
                ['Key figures', 'Prophet Muhammad, Abraham, Moses, Jesus.'],
                ['Texts', 'The Quran, Hadith.'],
                ['History', 'Originated in Mecca, 7th century CE with the Prophet Muhammad.'],
                ['Where', 'Middle East, North Africa, Central/South/Southeast Asia, global presence.']
              ]
            },
            {
              icon: 'fa-star-of-david', color: '#e8a317', title: 'Judaism', sub: 'Ancient religion of Abraham',
              rows: [
                ['Beliefs', 'One God, creator and sustainer of the universe. A central covenant between God and the Jewish people. Following God’s laws in the Torah.'],
                ['Practices', 'Keeping the Sabbath, dietary laws (Kashrut), prayer, festivals (Passover, Yom Kippur), studying religious texts.'],
                ['Key figures', 'Abraham, Moses, the Prophets.'],
                ['Texts', 'The Torah (first 5 books of the Hebrew Bible), the Talmud.'],
                ['History', 'Ancient religion beginning with Abraham. Long history of diaspora and rebuilding.'],
                ['Where', 'Historically centred in Israel; large populations in Israel and the United States.']
              ]
            },
            {
              icon: 'fa-om', color: '#f0743a', title: 'Hinduism', sub: 'One of the world’s oldest religions',
              rows: [
                ['Beliefs', 'A supreme being (Brahman) shown through many deities. Dharma (duty), Karma (action and consequence), Samsara (cycle of rebirth), Moksha (liberation from Samsara).'],
                ['Practices', 'Puja (worship), meditation, yoga, pilgrimage, festivals; historically the caste system.'],
                ['Key figures', 'No single founder. Deities: Vishnu, Shiva, Devi. Figures: Rama, Krishna.'],
                ['Texts', 'The Vedas, Upanishads, Puranas, Bhagavad Gita.'],
                ['History', 'Origins in the Indian subcontinent, thousands of years old.'],
                ['Where', 'Mainly India and Nepal, with a worldwide diaspora.']
              ]
            },
            {
              icon: 'fa-dharmachakra', color: '#9b6bff', title: 'Buddhism', sub: '5th century BCE, ancient India',
              rows: [
                ['Beliefs', 'The Four Noble Truths: suffering exists, suffering is caused by desire, suffering can end, and the path to end it. The Eightfold Path leads to enlightenment (Nirvana).'],
                ['Practices', 'Meditation, mindfulness, ethical living, studying Buddhist teachings, chanting.'],
                ['Key figures', 'Siddhartha Gautama (the Buddha).'],
                ['Texts', 'Tripitaka (Pali Canon), various Sutras.'],
                ['History', 'Began in ancient India in the 5th century BCE with Siddhartha Gautama. Spread throughout Asia.'],
                ['Where', 'East and Southeast Asia, parts of South Asia, growing in the West.']
              ]
            }
          ]
        },
        {
          type: 'table',
          title: 'Quick compare',
          head: ['Religion', 'God(s)', 'Holy text', 'Founder / key figure', 'Began'],
          rows: [
            ['Christianity', 'One God (Trinity)', 'Bible', 'Jesus Christ', '1st c. CE, Judea'],
            ['Islam', 'One God (Allah)', 'Quran', 'Prophet Muhammad', '7th c. CE, Mecca'],
            ['Judaism', 'One God', 'Torah, Talmud', 'Abraham, Moses', 'Ancient, Abraham'],
            ['Hinduism', 'Brahman, many deities', 'Vedas, Bhagavad Gita', 'No single founder', 'Thousands of years ago, India'],
            ['Buddhism', 'No creator god', 'Tripitaka', 'Siddhartha Gautama', '5th c. BCE, India']
          ]
        }
      ]
    },

    {
      id: 'genesis-25',
      title: 'Genesis 25: The Generations of Abraham',
      nav: 'Genesis 25',
      icon: 'fa-scroll',
      blocks: [
        { type: 'text', html: 'This chapter focuses on the descendants of Abraham, especially the birth of the twins <strong>Esau</strong> and <strong>Jacob</strong>.' },
        {
          type: 'timeline',
          items: [
            { label: 'Event 1', title: 'Abraham’s later life & death', html: 'Abraham takes another wife, Keturah, and fathers several more sons. He divides his possessions and dies at a ripe old age.' },
            { label: 'Event 2', title: 'Ishmael’s descendants', html: 'The chapter lists the twelve sons of Ishmael, who became tribal leaders.' },
            { label: 'Event 3', title: 'The struggle in the womb', html: 'Rebekah cannot have children; Isaac prays for her. She conceives twins who struggle inside her. God reveals she carries two nations, and the older will serve the younger.' },
            { label: 'Event 4', title: 'Birth of Esau & Jacob', html: 'Esau is born first, red and hairy. Jacob is born right after, holding Esau’s heel. Jacob means “heel-grabber” or “supplanter.”' }
          ]
        },
        {
          type: 'callout', tone: 'verse', icon: 'fa-book-bible', title: 'Important verses',
          html: '<p><strong>Genesis 25:21–23</strong> — “Isaac pleaded with the Lord for his wife, because she was unable to have children. The Lord answered his prayer, and Rebekah became pregnant and gave birth to twins. The babies jostled each other in her womb… The Lord said to her, ‘Two nations are in your womb, and two peoples from within you will be separated; one people will be stronger than the other, and the older will serve the younger.’”</p><p><strong>Genesis 25:25–26</strong> — “The first one came out red, and his whole body was like a hairy blanket. So he was named Esau. After this, his brother came out, with his hand grasping Esau’s heel; so he was named Jacob.”</p>'
        }
      ]
    },

    {
      id: 'genesis-27-33',
      title: 'Genesis 27–33: Jacob’s Journey',
      nav: 'Genesis 27–33',
      icon: 'fa-route',
      blocks: [
        { type: 'text', html: 'Tap each chapter to open the key points.' },
        {
          type: 'accordion',
          items: [
            { badge: '27', color: '#f0506e', title: 'The Deception and the Blessing', sub: 'Jacob steals the blessing', points: [
              ['Isaac’s weakness', 'Isaac is old and blind and believes his death is near. He plans to bless his favourite son, Esau.'],
              ['Rebekah’s plan', 'Rebekah overhears and plans for Jacob to receive the blessing instead.'],
              ['Jacob’s deception', 'Jacob disguises himself as Esau (goat skins on his hands and arms to copy Esau’s hairy skin) and tricks his blind father.'],
              ['Esau’s reaction', 'Esau realises he has been tricked and cries out. Isaac can only give him a lesser blessing, and Esau vows to kill Jacob.'],
              ['Rebekah steps in', 'Rebekah sends Jacob to her brother Laban in Haran to escape Esau’s anger.']
            ]},
            { badge: '28', color: '#4f7cff', title: 'Jacob’s Dream at Bethel', sub: 'The ladder to heaven', points: [
              ['Jacob’s flight', 'Jacob leaves home, carrying the stolen blessing.'],
              ['The dream', 'Sleeping at a place he later names Bethel (“House of God”), Jacob sees a ladder from earth to heaven with angels going up and down.'],
              ['God’s promise', 'God repeats the covenant made with Abraham and Isaac: many descendants, land, and His presence and protection.'],
              ['Jacob’s vow', 'If God stays with him and protects him, the Lord will be his God and he will give a tenth of everything he receives.']
            ]},
            { badge: '29', color: '#e255b4', title: 'Jacob in Haran and His Marriages', sub: 'The deceiver is deceived', points: [
              ['Meeting Rachel', 'At a well near Haran, Jacob meets Rachel, Laban’s daughter, a shepherdess.'],
              ['Seven years of work', 'Jacob loves Rachel and agrees to work for Laban for seven years to marry her.'],
              ['Laban’s trick', 'After seven years, Laban tricks Jacob into marrying his older daughter Leah instead.'],
              ['Marriages', 'Jacob works another seven years for Rachel. He marries both but loves Rachel more. God lets Leah have children while Rachel cannot.']
            ]},
            { badge: '30', color: '#2fbf71', title: 'Jacob’s Children and Wealth', sub: 'A growing family and fortune', points: [
              ['Rachel’s jealousy', 'Rachel gives Jacob her servant Bilhah, who has sons. Leah gives her servant Zilpah, who also has sons.'],
              ['More children', 'Leah has more sons and a daughter. God remembers Rachel; she gives birth to Joseph.'],
              ['Jacob’s wealth', 'Jacob uses peeled branches at the watering troughs to grow his own flocks and becomes very wealthy.']
            ]},
            { badge: '31', color: '#e8a317', title: 'Jacob Leaves Laban', sub: 'Secret escape and the covenant at Mizpah', points: [
              ['God’s command', 'God tells Jacob to return to the land of his fathers.'],
              ['Secret departure', 'Jacob secretly leaves with his family and possessions. Rachel steals her father’s household idols.'],
              ['Laban chases him', 'Laban finds out, chases Jacob and accuses him of stealing.'],
              ['Covenant at Mizpah', 'They make a covenant marked by a heap of stones (Galeed). Laban blesses Jacob and warns him not to mistreat his daughters.']
            ]},
            { badge: '32', color: '#9b6bff', title: 'Wrestling with God', sub: 'Jacob becomes Israel', points: [
              ['Jacob’s fear', 'Jacob is afraid of meeting Esau. He splits his people into two groups and sends gifts of livestock as peace offerings.'],
              ['The wrestle', 'Alone by the Jabbok River, Jacob wrestles with a divine being (often seen as God or an angel) until dawn.'],
              ['New name: Israel', 'The being blesses Jacob and renames him Israel — “he struggles with God.” Jacob names the place Peniel (“Face of God”).'],
              ['Jacob’s limp', 'Jacob walks with a limp as a reminder of the encounter.']
            ]},
            { badge: '33', color: '#14b8a6', title: 'Reconciliation with Esau', sub: 'Brothers reunited', points: [
              ['The meeting', 'Jacob approaches Esau, bowing low. Esau runs to meet him, hugs him and kisses him.'],
              ['Esau forgives', 'Esau says he has plenty and doesn’t need gifts. Jacob insists and Esau accepts.'],
              ['Separate paths', 'They agree to travel separately. Esau goes to Seir.'],
              ['Jacob settles', 'Jacob travels to Succoth, builds a house and shelters for his animals, and later settles near Shechem.']
            ]}
          ]
        },
        { type: 'heading', text: 'Key themes' },
        {
          type: 'grid', cols: 3,
          items: [
            { title: 'Blessings & birthrights', html: 'Represent inheritance, authority and God’s favour in families of that time.' },
            { title: 'Family conflict', html: 'Rivalry, deception, and eventually reconciliation between family members.' },
            { title: 'God steps in', html: 'God acts in Jacob’s life through dreams and in person, repeating His covenant promises.' },
            { title: 'Consequences', html: 'Jacob’s deception leads to years away from home and hardship — but God’s promises still come true.' },
            { title: 'Transformation', html: 'Wrestling with God changes Jacob from “supplanter” to “Israel,” showing a new relationship with God.' }
          ]
        }
      ]
    }
  ],

  quiz: [
    { q: 'What are the Five Pillars of Islam?', options: ['Shahada, Salat, Zakat, Sawm, Hajj', 'Prayer, Fasting, Pilgrimage, Charity, Study', 'Faith, Hope, Love, Grace, Mercy', 'Meditation, Yoga, Chanting, Fasting, Giving'], answer: 0, why: 'Shahada (faith), Salat (prayer), Zakat (charity), Sawm (fasting) and Hajj (pilgrimage).' },
    { q: 'In Christianity, the Trinity is made up of:', options: ['God, Jesus, Mary', 'Father, Son, Holy Spirit', 'Creator, Preserver, Destroyer', 'Prophet, Angel, Spirit'], answer: 1, why: 'Christians believe in one God in three persons: Father, Son and Holy Spirit.' },
    { q: 'What does Jacob’s name mean?', options: ['Hairy one', 'Blessed by God', 'Heel-grabber / supplanter', 'Strong warrior'], answer: 2, why: 'Jacob was born holding Esau’s heel, so his name means “heel-grabber” or “supplanter.”' },
    { q: 'Where did Jacob dream of the ladder to heaven?', options: ['Jerusalem', 'Bethel', 'Haran', 'Shechem'], answer: 1, why: 'He named the place Bethel, meaning “House of God” (Genesis 28).' },
    { q: 'Jacob’s name was changed to:', options: ['Abraham', 'Moses', 'Israel', 'David'], answer: 2, why: 'After wrestling with God (Genesis 32) he was renamed Israel — “he struggles with God.”' },
    { q: 'The Four Noble Truths are central to which religion?', options: ['Hinduism', 'Christianity', 'Islam', 'Buddhism'], answer: 3, why: 'The Four Noble Truths and the Eightfold Path are the core of Buddhism.' },
    { q: 'The main Jewish holy text is called:', options: ['The Quran', 'The New Testament', 'The Torah', 'The Vedas'], answer: 2, why: 'The Torah is the first five books of the Hebrew Bible.' },
    { q: 'In Hinduism, Moksha means:', options: ['Duty', 'Action and consequence', 'Liberation from the cycle of rebirth', 'Meditation'], answer: 2, why: 'Dharma = duty, Karma = action/consequence, Samsara = rebirth cycle, Moksha = liberation from it.' },
    { q: 'Who tricked Jacob into marrying Leah instead of Rachel?', options: ['Isaac', 'Esau', 'Laban', 'Rebekah'], answer: 2, why: 'Laban, Rachel and Leah’s father, swapped the brides — the deceiver was deceived (Genesis 29).' },
    { q: 'Which son of Rachel was born in Genesis 30?', options: ['Joseph', 'Benjamin', 'Reuben', 'Judah'], answer: 0, why: 'God “remembered Rachel” and she gave birth to Joseph.' }
  ],

  flashcards: [
    ['Five Pillars of Islam', 'Shahada, Salat, Zakat, Sawm, Hajj'],
    ['The Trinity', 'Father, Son and Holy Spirit (Christianity)'],
    ['Dharma', 'Duty (Hinduism)'],
    ['Karma', 'Action and its consequences (Hinduism)'],
    ['Samsara', 'The cycle of rebirth (Hinduism)'],
    ['Moksha', 'Liberation from Samsara (Hinduism)'],
    ['Four Noble Truths', 'Suffering exists, is caused by desire, can end, and the Eightfold Path ends it (Buddhism)'],
    ['Torah', 'First five books of the Hebrew Bible (Judaism)'],
    ['Quran', 'Holy book of Islam — the word of Allah'],
    ['Tripitaka', 'Holy texts of Buddhism (Pali Canon)'],
    ['Jacob means…', '“Heel-grabber” or “supplanter”'],
    ['Bethel', '“House of God” — where Jacob dreamed of the ladder'],
    ['Israel', '“He struggles with God” — Jacob’s new name'],
    ['Peniel', '“Face of God” — where Jacob wrestled'],
    ['Galeed / Mizpah', 'Heap of stones marking the covenant between Jacob and Laban'],
    ['Laban', 'Rachel and Leah’s father; tricked Jacob into marrying Leah']
  ]
});
