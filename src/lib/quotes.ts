export type Quote = { text: string; ref: string };

/**
 * Quran verses: Malay translation (Abdullah Basmeih / JAKIM standard),
 * fetched from AlQuran Cloud API (edition "ms.basmeih") and verified against
 * https://api.alquran.cloud/v1/ayah/{surah}:{ayah}/ms.basmeih
 *
 * Hadith: English, sourced from the fawazahmed0/hadith-api mirror of
 * Sahih al-Bukhari, Sahih Muslim, Jami' at-Tirmidhi, Sunan an-Nasa'i, and
 * Sunan Abi Dawud, cited by book/hadith number as numbered in that dataset,
 * filtered to their actual prayer-related book chapters. No verified
 * Malay-translated hadith API exists at time of writing, so these remain
 * in English pending a checked Malay source.
 */
export const QUOTES: Quote[] = [
  {
    text: "Peliharalah kamu (kerjakanlah dengan tetap dan sempurna pada waktunya) segala sembahyang fardu, khasnya sembahyang Wusta (sembahyang Asar), dan berdirilah kerana Allah (dalam sembahyang kamu) dengan taat dan khusyuk.",
    ref: "Al-Quran, Al-Baqarah 2:238",
  },
  {
    text: "Dan mintalah pertolongan (kepada Allah) dengan jalan sabar dan mengerjakan sembahyang; dan sesungguhnya sembahyang itu amatlah berat kecuali kepada orang-orang yang khusyuk.",
    ref: "Al-Quran, Al-Baqarah 2:45",
  },
  {
    text: "Sesungguhnya sembahyang itu adalah satu ketetapan yang diwajibkan atas orang-orang yang beriman, yang tertentu waktunya.",
    ref: "Al-Quran, An-Nisa' 4:103",
  },
  {
    text: "Dan dirikanlah sembahyang pada dua bahagian siang (pagi dan petang), dan pada waktu-waktu yang berhampiran dengannya dari waktu malam. Sesungguhnya amal-amal kebajikan itu menghapuskan kejahatan.",
    ref: "Al-Quran, Hud 11:114",
  },
  {
    text: "Sesungguhnya Akulah Allah; tiada tuhan melainkan Aku; oleh itu, sembahlah akan Daku, dan dirikanlah sembahyang untuk mengingati Daku.",
    ref: "Al-Quran, Taha 20:14",
  },
  {
    text: "Sesungguhnya berjayalah orang-orang yang beriman, iaitu mereka yang khusyuk dalam sembahyangnya.",
    ref: "Al-Quran, Al-Mu'minun 23:1-2",
  },
  {
    text: "Sesungguhnya solat itu mencegah daripada perbuatan keji dan mungkar.",
    ref: "Al-Quran, Al-Ankabut 29:45",
  },
  {
    text: "“If there was a river at the door of anyone of you and he took a bath in it five times a day, would you notice any dirt on him?” They said, “Not a trace of dirt would be left.” The Prophet added, “That is the example of the five prayers with which Allah blots out evil deeds.”",
    ref: "Sahih al-Bukhari, Book 9, Hadith 7",
  },
  {
    text: "Indeed the first deed by which a servant will be called to account on the Day of Resurrection is his Salat. If it is complete, he is successful and saved, but if it is defective, he has failed and lost.",
    ref: "Jami' at-Tirmidhi, Book 2, Hadith 266",
  },
  {
    text: "The covenant between us and them is the Salat, so whoever abandons it has committed disbelief.",
    ref: "Jami' at-Tirmidhi, Book 40, Hadith 16",
  },
  {
    text: "Whoever misses the Asr prayer, then it is as if he was robbed of his family and his property.",
    ref: "Jami' at-Tirmidhi, Book 2, Hadith 27",
  },
  {
    text: "Iaitu orang-orang yang beriman kepada perkara-perkara yang ghaib, dan mendirikan (mengerjakan) sembahyang serta membelanjakan (mendermakan) sebahagian dari rezeki yang Kami berikan kepada mereka.",
    ref: "Al-Quran, Al-Baqarah 2:3",
  },
  {
    text: "Dan dirikanlah kamu akan sembahyang dan keluarkanlah zakat, dan rukuklah kamu semua (berjemaah) bersama-sama orang-orang yang rukuk.",
    ref: "Al-Quran, Al-Baqarah 2:43",
  },
  {
    text: "Dan (ingatlah wahai Muhammad), ketika Kami mengikat perjanjian setia dengan Bani Israil... dan dirikanlah sembahyang serta berilah zakat.",
    ref: "Al-Quran, Al-Baqarah 2:83",
  },
  {
    text: "Dan dirikanlah oleh kamu akan sembahyang dan tunaikanlah zakat dan apa jua yang kamu dahulukan dari kebaikan untuk diri kamu, tentulah kamu akan mendapat balasan pahalanya di sisi Allah.",
    ref: "Al-Quran, Al-Baqarah 2:110",
  },
  {
    text: "Wahai sekalian orang-orang yang beriman! Mintalah pertolongan (untuk menghadapi susah payah dalam menyempurnakan sesuatu perintah Tuhan) dengan bersabar dan dengan (mengerjakan) sembahyang; kerana sesungguhnya Allah menyertai (menolong) orang-orang yang sabar.",
    ref: "Al-Quran, Al-Baqarah 2:153",
  },
  {
    text: "...dan mengerjanya seseorang akan sembahyang serta mengeluarkan zakat; dan perbuatan orang-orang yang menyempurnakan janjinya apabila mereka membuat perjanjian... mereka itulah orang-orang yang benar (beriman dan mengerjakan kebajikan); dan mereka itulah juga orang-orang yang bertaqwa.",
    ref: "Al-Quran, Al-Baqarah 2:177",
  },
  {
    text: "Sesungguhnya orang-orang munafik itu... apabila berdiri hendak sembahyang, mereka berdiri dengan malas. Mereka (hanya bertujuan) riak (memperlihatkan sembahyangnya) kepada manusia, dan mereka pula tidak mengingati Allah (dengan mengerjakan sembahyang) melainkan sedikit sekali.",
    ref: "Al-Quran, An-Nisa' 4:142",
  },
  {
    text: "Sesungguhnya Penolong kamu hanyalah Allah, dan RasulNya, serta orang-orang yang beriman, yang mendirikan sembahyang, dan menunaikan zakat, sedang mereka rukuk (tunduk menjunjung perintah Allah).",
    ref: "Al-Quran, Al-Maidah 5:55",
  },
  {
    text: "Dan (diperintahkan): Hendaklah kamu mengerjakan sembahyang dan bertaqwa kepadaNya, dan Dia lah Tuhan yang kepadaNya kamu akan dihimpunkan (pada hari akhirat kelak).",
    ref: "Al-Quran, Al-An'am 6:72",
  },
  {
    text: "...dan orang-orang yang beriman kepada hari akhirat, mereka beriman kepada Al-Quran, dan mereka tetap mengerjakan dan memelihara sembahyangnya.",
    ref: "Al-Quran, Al-An'am 6:92",
  },
  {
    text: "Dan orang-orang yang berpegang teguh dengan Kitab Allah serta mendirikan sembahyang, sesungguhnya Kami tidak akan menghilangkan pahala orang-orang yang berusaha memperbaiki (keadaan hidupnya).",
    ref: "Al-Quran, Al-A'raf 7:170",
  },
  {
    text: "Iaitu orang-orang yang mendirikan sembahyang dan yang mendermakan sebahagian dari apa yang Kami kurniakan kepada mereka.",
    ref: "Al-Quran, Al-Anfal 8:3",
  },
  {
    text: "Hanyasanya yang layak memakmurkan (menghidupkan) masjid-masjid Allah itu ialah orang-orang yang beriman kepada Allah dan hari akhirat serta mendirikan sembahyang dan menunaikan zakat dan tidak takut melainkan kepada Allah.",
    ref: "Al-Quran, At-Taubah 9:18",
  },
  {
    text: "Dan orang-orang yang beriman, lelaki dan perempuan... mereka mendirikan sembahyang dan memberi zakat, serta taat kepada Allah dan RasulNya. Mereka itu akan diberi rahmat oleh Allah.",
    ref: "Al-Quran, At-Taubah 9:71",
  },
  {
    text: "Dan (setelah itu), Kami wahyukan kepada Nabi Musa serta saudaranya (Nabi Harun): \"Hendaklah kamu berdua mendirikan rumah-rumah... dan jadikanlah rumah-rumah kamu tempat sembahyang, serta dirikanlah sembahyang di dalamnya.\"",
    ref: "Al-Quran, Yunus 10:87",
  },
  {
    text: "Dan orang-orang yang sabar kerana mengharapkan keredaan Tuhan mereka semata-mata, dan mendirikan sembahyang, serta mendermakan dari apa yang Kami kurniakan kepada mereka, secara bersembunyi atau secara terbuka.",
    ref: "Al-Quran, Ar-Ra'd 13:22",
  },
  {
    text: "Katakanlah kepada hamba-hambaKu yang beriman hendaklah mereka mendirikan sembahyang dan mendermakan dari apa yang kami kurniakan kepada mereka, sama ada dengan merahsiakan pemberiannya itu atau dengan terbuka.",
    ref: "Al-Quran, Ibrahim 14:31",
  },
  {
    text: "\"Wahai Tuhan kami! Sesungguhnya aku telah menempatkan sebahagian dari zuriat keturunanku di sebuah lembah... supaya mereka mendirikan sembahyang (dan memakmurkannya dengan ibadat).\"",
    ref: "Al-Quran, Ibrahim 14:37",
  },
  {
    text: "Dirikanlah olehmu sembahyang ketika gelincir matahari hingga waktu gelap malam, dan (dirikanlah) sembahyang subuh sesungguhnya sembahyang subuh itu adalah disaksikan (keistimewaannya).",
    ref: "Al-Quran, Al-Isra' 17:78",
  },
  {
    text: "Dan bangunlah pada sebahagian dari waktu malam serta kerjakanlah \"sembahyang tahajjud\" padanya, sebagai sembahyang tambahan bagimu; semoga Tuhanmu membangkit dan menempatkanmu pada hari akhirat di tempat yang terpuji.",
    ref: "Al-Quran, Al-Isra' 17:79",
  },
  {
    text: "Kemudian mereka digantikan oleh keturunan-keturunan yang mencuaikan sembahyang serta menurut hawa nafsu (dengan melakukan maksiat); maka mereka akan menghadapi azab (dalam neraka).",
    ref: "Al-Quran, Maryam 19:59",
  },
  {
    text: "Dan perintahkanlah keluargamu serta umatmu mengerjakan sembahyang, dan hendaklah engkau tekun bersabar menunaikannya. Kami tidak meminta rezeki kepadamu, (bahkan) Kamilah yang memberi rezeki kepadamu.",
    ref: "Al-Quran, Taha 20:132",
  },
  {
    text: "Iaitu mereka (umat Islam) yang jika Kami berikan mereka kekuasaan memerintah di bumi nescaya mereka mendirikan sembahyang serta memberi zakat, dan mereka menyuruh berbuat kebaikan serta melarang dari melakukan kejahatan.",
    ref: "Al-Quran, Al-Hajj 22:41",
  },
  {
    text: "Dan mereka yang tetap memelihara sembahyangnya.",
    ref: "Al-Quran, Al-Mu'minun 23:9",
  },
  {
    text: "(Ibadat itu dikerjakan oleh) orang-orang yang kuat imannya yang tidak dilalaikan oleh perniagaan atau berjual-beli daripada menyebut serta mengingati Allah, dan mendirikan sembahyang serta memberi zakat; mereka takutkan hari (kiamat) yang padanya berbalik-balik hati dan pandangan.",
    ref: "Al-Quran, An-Nur 24:37",
  },
  {
    text: "Dan dirikanlah kamu akan sembahyang serta berilah zakat; dan taatlah kamu kepada Rasul Allah; supaya kamu beroleh rahmat.",
    ref: "Al-Quran, An-Nur 24:56",
  },
  {
    text: "\"Wahai anak kesayanganku, dirikanlah sembahyang, dan suruhlah berbuat kebaikan, serta laranglah daripada melakukan perbuatan yang mungkar, dan bersabarlah atas segala bala bencana yang menimpamu.\"",
    ref: "Al-Quran, Luqman 31:17",
  },
  {
    text: "Wahai orang-orang yang beriman! Apabila diserukan azan (bang) untuk mengerjakan sembahyang pada hari Jumaat, maka segeralah kamu pergi (ke masjid) untuk mengingati Allah dan tinggalkanlah berjual-beli (pada saat itu); yang demikian adalah baik bagi kamu.",
    ref: "Al-Quran, Al-Jumu'ah 62:9",
  },
  {
    text: "...maka dirikanlah sembahyang dan berikanlah zakat (sebagaimana yang sewajibnya), serta taatlah kamu kepada Allah dan RasulNya. Dan (ingatlah), Allah Maha Mendalam PengetahuanNya akan segala amalan yang kamu lakukan.",
    ref: "Al-Quran, Al-Mujadilah 58:13",
  },
  {
    text: "Maka kecelakaan besar bagi orang-orang Ahli Sembahyang, (laitu) mereka yang berkeadaan lalai daripada menyempurnakan sembahyangnya.",
    ref: "Al-Quran, Al-Ma'un 107:4-5",
  },
  {
    text: "\"Whoever built a mosque, intending Allah's pleasure, Allah would build for him a similar place in Paradise.\"",
    ref: "Sahih al-Bukhari, Book 8, Hadith 99",
  },
  {
    text: "\"Angels come to you in succession by night and day and all of them get together at the time of the Fajr and Asr prayers... The angels reply: 'When we left them they were praying and when we reached them, they were praying.'\"",
    ref: "Sahih al-Bukhari, Book 9, Hadith 32",
  },
  {
    text: "\"The reward of a prayer in congregation is twenty five times greater than that of a prayer offered by a person alone.\"",
    ref: "Sahih al-Bukhari, Book 10, Hadith 45",
  },
  {
    text: "\"The reward of the congregational prayer is twenty seven times greater than that of the prayer offered by a person alone.\"",
    ref: "Sahih al-Bukhari, Book 10, Hadith 46",
  },
  {
    text: "\"Allah will prepare for him who goes to the mosque morning and afternoon (for the congregational prayer) an honorable place in Paradise with good hospitality for every morning and afternoon going.\"",
    ref: "Sahih al-Bukhari, Book 10, Hadith 56",
  },
  {
    text: "\"Say 'Amin' when the Imam says it, and if the Amin of any one of you coincides with that of the angels, then all his past sins will be forgiven.\"",
    ref: "Sahih al-Bukhari, Book 10, Hadith 175",
  },
  {
    text: "\"Whoever prays the two cool prayers (Asr and Fajr) will go to Paradise.\"",
    ref: "Sahih al-Bukhari, Book 9, Hadith 50",
  },
  {
    text: "My friend (the Prophet) advised me to do three things and I shall not leave them till I die: to fast three days every month, to offer the Duha prayer, and to offer Witr before sleeping.",
    ref: "Sahih al-Bukhari, Book 19, Hadith 56",
  },
  {
    text: "\"As long as any one of you is waiting for the prayer, he is considered to be praying, and the angels say, 'O Allah! Be merciful to him and forgive him,' unless he leaves his place of praying or breaks his ablution.\"",
    ref: "Sahih al-Bukhari, Book 59, Hadith 40",
  },
  {
    text: "\"Any person who takes a bath on Friday and then goes early for the prayer, it is as if he had sacrificed a camel; and whoever goes in the second hour it is as if he had sacrificed a cow...\"",
    ref: "Sahih al-Bukhari, Book 11, Hadith 6",
  },
  {
    text: "\"When it is a Friday, the angels stand at the gate of the mosque and keep on writing the names of the persons coming to the mosque in succession according to their arrival.\"",
    ref: "Sahih al-Bukhari, Book 11, Hadith 53",
  },
  {
    text: "Jabir b. 'Abdullah narrated: Our houses were situated far away from the mosque; we decided to sell them to come near it. The Messenger of Allah forbade us and said: \"There is for every step (towards the mosque) a degree (of reward) for you.\"",
    ref: "Sahih Muslim, Book 5, Hadith 351",
  },
  {
    text: "\"The parts of land dearest to Allah are its mosques, and the parts most hateful to Allah are markets.\"",
    ref: "Sahih Muslim, Book 5, Hadith 361",
  },
  {
    text: "\"He who observed prayer at night during Ramadan, out of faith and seeking his reward from Allah, his previous sins would be forgiven.\"",
    ref: "Sahih Muslim, Book 6, Hadith 207",
  },
  {
    text: "\"Whoever calls the Adhan for seven years, seeking reward for it, salvation from the Fire is written for him.\"",
    ref: "Jami' at-Tirmidhi, Book 2, Hadith 58",
  },
  {
    text: "\"Whoever attends Isha in congregation, then he has the reward as if he had stood half of the night. And whoever prays Isha and Fajr in congregation, then he has the reward as if he had spent the entire night standing in prayer.\"",
    ref: "Jami' at-Tirmidhi, Book 2, Hadith 73",
  },
  {
    text: "\"If the people knew what reward is in the call to prayer and the first row, and they found no other way to get that except by drawing lots, then they would draw lots.\"",
    ref: "Jami' at-Tirmidhi, Book 2, Hadith 77",
  },
  {
    text: "\"The key to Salat is purification, its Tahrim is the Takbir, and its Tahlil is the Taslim.\"",
    ref: "Jami' at-Tirmidhi, Book 2, Hadith 90",
  },
  {
    text: "\"Whoever performs Salat for Allah for forty days in congregation, catching the first Takbir, two absolutions are written for him: absolution from the Fire, and absolution from hypocrisy.\"",
    ref: "Jami' at-Tirmidhi, Book 2, Hadith 93",
  },
  {
    text: "\"No worshipper performs a prostration to Allah except that by it Allah will raise him a level and erase a sin from him for it.\"",
    ref: "Jami' at-Tirmidhi, Book 2, Hadith 241",
  },
  {
    text: "\"The area between my house and my Minbar is one of the gardens of Paradise.\"",
    ref: "Sunan an-Nasa'i, Book 8, Hadith 8",
  },
  {
    text: "\"When a man goes out of his house to his Masjid, one foot records a good deed and the other erases a bad deed.\"",
    ref: "Sunan an-Nasa'i, Book 8, Hadith 18",
  },
  {
    text: "\"Whoever performs wudu and does it well, then sets out for the Masjid and finds that the people have already prayed, Allah will decree for him a reward like that of those who attended, without reducing anything from their reward.\"",
    ref: "Sunan an-Nasa'i, Book 10, Hadith 79",
  },
  {
    text: "\"Whoever does wudu properly, then walks to attend the prescribed prayer and prays with the congregation, Allah will forgive him his sins.\"",
    ref: "Sunan an-Nasa'i, Book 10, Hadith 80",
  },
  {
    text: "Allah, the Exalted, said: \"I made five times' prayers obligatory on My servants. I took a guarantee that if anyone observes them regularly at their times, I shall admit him to Paradise.\"",
    ref: "Sunan Abi Dawud, Book 2, Hadith 40",
  },
  {
    text: "\"The further one is from the mosque, the greater will be one's reward.\"",
    ref: "Sunan Abi Dawud, Book 2, Hadith 166",
  },
  {
    text: "\"Give good tidings to those who walk to the mosques in darkness, for having a perfect light on the Day of Judgment.\"",
    ref: "Sunan Abi Dawud, Book 2, Hadith 171",
  },
];
