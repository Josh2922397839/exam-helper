/* ExamForge deck — Religious Education (Grade 9): extra cards.
   Each card: [question, answer, [three wrong answers], why]. Cards are grouped by topic.
   assets/js/core/deck.js merges them with the subject's flashcards and quiz. */
window.EF = window.EF || {};
(EF.decks = EF.decks || {}).religion = [
  { tag: 'Christianity', cards: [
    ['In Christianity, who is the Son of God who died for humanity’s sins and rose again?', 'Jesus Christ', ['Moses', 'Abraham', 'Muhammad'], 'Christians believe Jesus died for humanity’s sins and was resurrected.'],
    ['What is the holy book of Christianity?', 'The Bible (Old and New Testament)', ['The Quran', 'The Vedas', 'The Tripitaka'], 'The Bible has two parts: the Old Testament and the New Testament.'],
    ['Name two Christian sacraments.', 'Baptism and Holy Communion', ['Salat and Zakat', 'Puja and yoga', 'Sabbath and Kashrut'], 'Sacraments are special church rituals; baptism and communion are shared by most churches.'],
    ['Where and when did Christianity begin?', 'Judea, in the 1st century CE', ['Mecca, in the 7th century CE', 'India, in the 5th century BCE', 'Haran, in the time of Abraham'], 'It began in Judea and spread through the Roman Empire, then worldwide.'],
    ['Which two apostles helped spread early Christianity?', 'Peter and Paul', ['Esau and Jacob', 'Moses and Aaron', 'Rama and Krishna'], 'The notes list the Apostles Peter and Paul among Christianity’s key figures.'],
    ['According to Christian belief, how is a person saved?', 'Through faith in Jesus Christ', ['By keeping the Five Pillars', 'By escaping samsara', 'By keeping the food laws'], 'Salvation through faith in Jesus is a core Christian belief.']
  ] },
  { tag: 'Islam', cards: [
    ['What do Muslims call God?', 'Allah', ['Brahman', 'Vishnu', 'Siddhartha'], 'Islam teaches one indivisible God, called Allah in Arabic.'],
    ['Who do Muslims believe is the final prophet?', 'Muhammad', ['Moses', 'Abraham', 'Jesus'], 'Islam honours earlier prophets like Abraham, Moses and Jesus, but Muhammad is the last.'],
    ['In which city and century did Islam begin?', 'Mecca, 7th century CE', ['Judea, 1st century CE', 'India, 5th century BCE', 'Haran, around 2000 BCE'], 'Islam began in Mecca with the Prophet Muhammad.'],
    ['What is Salat?', 'Prayer five times a day', ['Giving to charity', 'Fasting in Ramadan', 'The pilgrimage to Mecca'], 'Salat is prayer; Zakat is charity, Sawm is fasting and Hajj is pilgrimage.'],
    ['What is Zakat?', 'Giving to charity', ['Prayer five times a day', 'The declaration of faith', 'Fasting in Ramadan'], 'Zakat is a set share of savings given to people in need.'],
    ['What is Sawm?', 'Fasting during Ramadan', ['The pilgrimage to Mecca', 'Prayer five times a day', 'Reading the Hadith'], 'During Ramadan, Muslims fast from dawn to sunset.'],
    ['What is the Hajj?', 'The pilgrimage to Mecca', ['The declaration of faith', 'Charity to the poor', 'The Friday prayer'], 'Muslims who are able should make the Hajj at least once in their lives.'],
    ['What is the Shahada?', 'The declaration of faith', ['Fasting in Ramadan', 'The pilgrimage to Mecca', 'Giving to charity'], 'It declares there is no god but Allah, and Muhammad is his messenger.'],
    ['Besides the Quran, which collection records the sayings and actions of Muhammad?', 'The Hadith', ['The Talmud', 'The Upanishads', 'The Sutras'], 'The notes list the Quran and the Hadith as Islam’s texts.']
  ] },
  { tag: 'Judaism', cards: [
    ['Judaism began with God’s covenant with which man?', 'Abraham', ['Moses', 'Jacob', 'Muhammad'], 'Judaism traces back to Abraham; Moses later received God’s Law.'],
    ['What is the Jewish day of rest called?', 'The Sabbath (Shabbat)', ['Ramadan', 'Diwali', 'Passover'], 'The Sabbath runs from Friday sunset to Saturday sunset.'],
    ['What are the Jewish food laws called?', 'Kashrut (kosher laws)', ['Zakat', 'Karma', 'Sawm'], 'Kashrut sets out which foods are kosher (allowed) and how to prepare them.'],
    ['Name two Jewish festivals.', 'Passover and Yom Kippur', ['Ramadan and Eid', 'Diwali and Holi', 'Christmas and Easter'], 'Passover remembers the escape from Egypt; Yom Kippur is the Day of Atonement.'],
    ['Besides the Torah, which text collects Jewish teaching and law?', 'The Talmud', ['The Hadith', 'The Bhagavad Gita', 'The Tripitaka'], 'The notes list the Torah and the Talmud as Judaism’s texts.'],
    ['What is the covenant in Judaism?', 'A special agreement between God and the Jewish people', ['A yearly pilgrimage that every Jew makes to Jerusalem', 'The cycle of birth, death and rebirth of the soul', 'A prayer that Jews say five times every day'], 'Jews keep their side of the covenant by following God’s laws in the Torah.'],
    ['Where are the largest Jewish populations today?', 'Israel and the United States', ['India and Nepal', 'Saudi Arabia and Egypt', 'China and Japan'], 'Judaism is historically centred in Israel, with a large community in the USA.'],
    ['Moses and the Prophets are key figures in which religion?', 'Judaism', ['Hinduism', 'Buddhism', 'Sikhism'], 'Moses received God’s Law, written in the Torah.']
  ] },
  { tag: 'Hinduism', cards: [
    ['Who founded Hinduism?', 'No single founder', ['Siddhartha Gautama', 'Krishna', 'Abraham'], 'Hinduism grew over thousands of years in the Indian subcontinent.'],
    ['What is Brahman in Hinduism?', 'The supreme being, shown through many deities', ['The duty each person has at their stage of life', 'The cycle of birth, death and rebirth', 'Liberation from the cycle of rebirth'], 'Hindus see Brahman in deities such as Vishnu, Shiva and Devi.'],
    ['Name three Hindu deities.', 'Vishnu, Shiva and Devi', ['Allah, Gabriel and Muhammad', 'Peter, Paul and John', 'Abraham, Isaac and Jacob'], 'Rama and Krishna are also important figures in Hindu stories.'],
    ['What is puja?', 'Hindu worship', ['A Hindu holy book', 'A Jewish festival', 'Buddhist meditation'], 'Puja often includes offerings at a shrine at home or in a temple.'],
    ['Name two Hindu holy texts.', 'The Vedas and the Bhagavad Gita', ['The Torah and the Talmud', 'The Quran and the Hadith', 'The Tripitaka and the Sutras'], 'Other Hindu texts include the Upanishads and the Puranas.'],
    ['In which countries do most Hindus live?', 'India and Nepal', ['Israel and the USA', 'Saudi Arabia and Egypt', 'China and Japan'], 'Hinduism began in the Indian subcontinent and has a worldwide diaspora.'],
    ['Krishna and Rama are important figures in which religion?', 'Hinduism', ['Buddhism', 'Islam', 'Judaism'], 'They appear in Hindu stories and are often seen as forms of Vishnu.']
  ] },
  { tag: 'Buddhism', cards: [
    ['Who founded Buddhism?', 'Siddhartha Gautama (the Buddha)', ['Krishna, a form of Vishnu', 'The Prophet Muhammad', 'Moses, the lawgiver'], 'He taught in ancient India in the 5th century BCE.'],
    ['Which path leads to enlightenment in Buddhism?', 'The Eightfold Path', ['The Five Pillars', 'The Ten Commandments', 'The caste system'], 'The fourth Noble Truth says the Eightfold Path ends suffering.'],
    ['What is Nirvana?', 'Enlightenment: the end of suffering', ['The Buddhist holy book', 'A Buddhist temple', 'The cycle of rebirth'], 'Buddhists aim for Nirvana, freedom from suffering and rebirth.'],
    ['According to the Second Noble Truth, what causes suffering?', 'Desire (craving)', ['The gods', 'Bad luck', 'Other people'], 'Suffering exists, is caused by desire, can end, and the Eightfold Path ends it.'],
    ['Do Buddhists worship a creator god?', 'No: Buddhism has no creator god', ['Yes: Brahman', 'Yes: Allah', 'Yes: the Trinity'], 'The compare table lists Buddhism with no creator god.'],
    ['When and where did Buddhism begin?', '5th century BCE, ancient India', ['1st century CE, Judea', '7th century CE, Mecca', '10th century CE, China'], 'It began with Siddhartha Gautama and spread throughout Asia.'],
    ['Name two Buddhist practices.', 'Meditation and mindfulness', ['Hajj and Zakat', 'Baptism and communion', 'Sabbath and Kashrut'], 'Buddhists also chant, study the teachings and try to live ethically.']
  ] },
  { tag: 'Compare religions', cards: [
    ['Which three religions believe in one God and trace back to Abraham?', 'Judaism, Christianity and Islam', ['Hinduism, Buddhism and Islam', 'Judaism, Hinduism and Buddhism', 'Christianity, Hinduism and Buddhism'], 'They are often called the Abrahamic faiths.'],
    ['Which of these religions began most recently?', 'Islam (7th century CE)', ['Christianity', 'Buddhism', 'Judaism'], 'Islam began after Christianity (1st century CE) and Buddhism (5th century BCE).'],
    ['The Vedas are holy texts of which religion?', 'Hinduism', ['Buddhism', 'Judaism', 'Islam'], 'The Vedas are among the oldest Hindu scriptures.'],
    ['Which religion believes in one God as a Trinity?', 'Christianity', ['Islam', 'Judaism', 'Hinduism'], 'The Trinity is the Father, the Son and the Holy Spirit.'],
    ['Which religion follows the Tripitaka?', 'Buddhism', ['Hinduism', 'Islam', 'Christianity'], 'The Tripitaka (Pali Canon) holds the Buddha’s teachings.']
  ] },
  { tag: 'Genesis 25', cards: [
    ['Whom did Abraham marry later in life, according to Genesis 25?', 'Keturah', ['Sarah', 'Rebekah', 'Leah'], 'Abraham took another wife, Keturah, and fathered more sons.'],
    ['How many sons of Ishmael became tribal leaders?', 'Twelve', ['Seven', 'Ten', 'Two'], 'Genesis 25 lists the twelve sons of Ishmael as tribal leaders.'],
    ['Who were the parents of Esau and Jacob?', 'Isaac and Rebekah', ['Abraham and Sarah', 'Jacob and Rachel', 'Laban and Leah'], 'Isaac prayed for Rebekah, who could not have children, and she conceived twins.'],
    ['What did God tell Rebekah about her twins?', 'Two nations are in her womb, and the older will serve the younger', ['Both of her sons will become priests in the temple', 'Two nations are in her womb, and the younger will serve the older', 'The twins will be separated at birth and never meet again'], 'Genesis 25:23: Esau (older) would serve Jacob (younger).'],
    ['How was Esau described at birth?', 'Red and hairy', ['Small and pale', 'Holding his brother’s heel', 'Silent and still'], 'Genesis 25:25: he came out red, his body like a hairy blanket.'],
    ['What was Jacob holding when he was born?', 'Esau’s heel', ['Esau’s hand', 'His mother’s hair', 'A lamb’s wool'], 'That is why he was named Jacob, “heel-grabber.”'],
    ['What did Esau trade his birthright for?', 'A bowl of red lentil stew', ['A flock of sheep', 'His father’s blessing', 'Seven years of work'], 'Hungry from hunting, Esau sold it to Jacob for stew and bread (Genesis 25:29–34).'],
    ['What is a birthright?', 'The special rights and larger inheritance of the firstborn son', ['A blessing every child receives on the day they are born', 'A gift of land given to the youngest child in a family', 'A new name that God gives to someone who obeys Him'], 'The firstborn usually inherited a double share and led the family.'],
    ['Esau became a skilled hunter. What kind of man was Jacob?', 'A quiet man who stayed among the tents', ['A fisherman', 'A soldier', 'A travelling trader'], 'Genesis 25:27.'],
    ['Which parent favoured Esau, and which favoured Jacob?', 'Isaac favoured Esau; Rebekah favoured Jacob', ['Rebekah favoured Esau; Isaac favoured Jacob', 'Both favoured Jacob', 'Both favoured Esau'], 'Their favourites fed the rivalry between the twins (Genesis 25:28).']
  ] },
  { tag: 'Genesis 27–28', cards: [
    ['Why could Jacob trick Isaac into blessing him?', 'Isaac was old and blind', ['Isaac was away hunting', 'Isaac was asleep', 'Isaac was angry with Esau'], 'Isaac couldn’t see, so Jacob pretended to be Esau.'],
    ['What did Jacob wear so his skin felt hairy like Esau’s?', 'Goat skins', ['Sheep’s wool', 'A camel-hair cloak', 'A lion skin'], 'Esau was hairy, so goat skins helped Jacob fool his blind father.'],
    ['Who planned the trick so Jacob would get Isaac’s blessing?', 'Rebekah, his mother', ['Laban', 'Esau', 'Rachel'], 'Rebekah overheard Isaac and planned for Jacob to receive the blessing.'],
    ['What did Esau vow after losing the blessing?', 'To kill Jacob', ['To leave home forever', 'To serve Jacob', 'To win a new blessing from God'], 'That is why Rebekah sent Jacob away to her brother.'],
    ['Where did Rebekah send Jacob to escape Esau?', 'To her brother Laban in Haran', ['To Egypt', 'To Seir', 'To the Jabbok River'], 'Jacob fled to Laban’s home in Haran.'],
    ['What did Jacob see in his dream at Bethel?', 'A ladder to heaven with angels going up and down', ['A bush that burned but was not burned up', 'A great flood covering the whole earth', 'Seven fat cows eaten by seven thin cows'], 'God stood above it and repeated His promises (Genesis 28).'],
    ['What did God promise Jacob at Bethel?', 'Many descendants, the land, and His presence and protection', ['Great riches, a long life and a palace in Egypt', 'That Esau would forgive him as soon as he returned', 'That he would one day become the king of Egypt'], 'God repeated the covenant He made with Abraham and Isaac.'],
    ['What did Jacob vow at Bethel if God protected him?', 'The Lord would be his God, and he would give a tenth of everything', ['He would build a great temple for God in Jerusalem', 'He would never return home to his father and mother', 'He would give the stolen blessing back to Esau'], 'Giving a tenth is called a tithe (Genesis 28:20–22).']
  ] },
  { tag: 'Genesis 29–30', cards: [
    ['Where did Jacob first meet Rachel?', 'At a well near Haran', ['At Bethel', 'At the Jabbok River', 'In Isaac’s tent'], 'Rachel, Laban’s daughter, was a shepherdess bringing sheep to water.'],
    ['How many years did Jacob first work to marry Rachel?', 'Seven years', ['Three years', 'Ten years', 'Fourteen years'], 'After Laban’s trick he worked seven more years: fourteen in all.'],
    ['Why is Genesis 29 called “the deceiver is deceived”?', 'Jacob, who tricked his father, was tricked by Laban into marrying Leah', ['Esau tricked Jacob back by stealing his flocks while he slept', 'Rachel lied to Jacob about her age so he would marry her first', 'Jacob tricked Laban out of his best sheep and goats at the well'], 'Jacob’s own trickery came back to him.'],
    ['Who was Leah?', 'Laban’s older daughter and Jacob’s first wife', ['Rachel’s servant, who had sons with Jacob', 'Esau’s wife from the land of Canaan', 'Jacob’s mother, who planned the trick'], 'Laban gave Leah to Jacob in place of Rachel.'],
    ['Who were Bilhah and Zilpah?', 'The servants of Rachel and Leah, who had sons with Jacob', ['Laban’s two younger daughters, who stayed in Haran', 'Esau’s two wives, who came from the land of Canaan', 'Isaac’s two sisters, who looked after Rebekah'], 'Bilhah was Rachel’s servant and Zilpah was Leah’s.'],
    ['How did Jacob grow his own flocks while working for Laban?', 'He put peeled branches at the watering troughs', ['He stole Laban’s best sheep at night', 'He traded with Esau', 'He bought them in Egypt'], 'His flocks grew and he became very wealthy (Genesis 30).']
  ] },
  { tag: 'Genesis 31–33', cards: [
    ['What did Rachel steal when Jacob’s family secretly left Laban?', 'Her father’s household idols', ['Laban’s sheep', 'Jacob’s blessing', 'A bag of silver'], 'Laban chased Jacob and accused him of stealing.'],
    ['Why did Jacob send livestock ahead before meeting Esau?', 'As gifts to make peace with Esau', ['To pay back Laban', 'As offerings at Bethel', 'To sell in Seir'], 'He feared Esau, so he split his people into two groups and sent gifts.'],
    ['Beside which river did Jacob wrestle until dawn?', 'The Jabbok River', ['The Jordan River', 'The Nile', 'The Euphrates'], 'Genesis 32: alone by the Jabbok, he wrestled a divine being.'],
    ['What reminded Jacob of his wrestle with God?', 'A limp from his injured hip', ['A scar on his face', 'A new staff', 'A ring from the angel'], 'The divine being touched his hip, and he walked with a limp.'],
    ['How did Esau greet Jacob when they met again?', 'He ran to him, hugged him and kissed him', ['He attacked him', 'He refused to speak to him', 'He demanded the blessing back'], 'Genesis 33 shows forgiveness and reconciliation.'],
    ['Where did Esau go after the brothers made peace?', 'Seir', ['Haran', 'Succoth', 'Bethel'], 'They agreed to travel separately; Esau went to Seir.'],
    ['Where did Jacob build a house and shelters for his animals?', 'Succoth', ['Seir', 'Haran', 'Peniel'], 'Later Jacob settled near Shechem.']
  ] },
  { tag: 'Key themes', cards: [
    ['In Genesis, what did blessings and birthrights stand for?', 'Inheritance, authority and God’s favour', ['Wealth from trading', 'The right to be a priest', 'Only a promise of long life'], 'They decided who led the family and received the inheritance.'],
    ['Which theme does Jacob’s new name, Israel, show?', 'Transformation: a new relationship with God', ['Revenge: Jacob finally defeats Esau', 'Trickery: Laban deceives Jacob again', 'Rivalry: the brothers compete for land'], 'Jacob changes from “supplanter” to “Israel.”'],
    ['What was one consequence of Jacob’s deception?', 'Years away from home and hardship', ['He lost God’s promises', 'He became king', 'Esau never forgave him'], 'Even so, God’s promises to Jacob still came true.'],
    ['How did God step into Jacob’s life in Genesis 27–33?', 'Through dreams and in person, repeating His promises', ['Only through prophets who visited Jacob', 'Through laws written on tablets of stone', 'He did not appear to Jacob at all'], 'The ladder dream at Bethel and the wrestle at Peniel are the clearest examples.']
  ] }
];
