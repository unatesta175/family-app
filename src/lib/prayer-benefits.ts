import type { Prayer, Status } from "@/lib/db/schema";

export type PrayerVirtue = {
  quote: string;
  reference: string;
};

/**
 * A pool of well-known hadith and ayat on the virtue of each prayer, weighted toward that specific
 * prayer but also drawing on general prayer virtues where they apply. `nextPrayerVirtue` cycles
 * through these in order (per prayer) so repeat visits to the same prayer don't show the same
 * quote every time.
 */
export const PRAYER_VIRTUES: Record<Prayer, PrayerVirtue[]> = {
  fajr: [
    {
      quote: "“Whoever prays the two cool prayers (Fajr and Asr) will enter Paradise.”",
      reference: "Prophet Muhammad, Sahih al-Bukhari 574",
    },
    {
      quote:
        "“The most burdensome prayers for the hypocrites are Isha and Fajr. If they knew what reward lies in them, they would come even if they had to crawl.”",
      reference: "Prophet Muhammad, Sahih al-Bukhari 657",
    },
    {
      quote: "“Two rak’ahs of Fajr are better than the world and everything in it.”",
      reference: "Prophet Muhammad, Sahih Muslim 725",
    },
    {
      quote:
        "“Establish prayer at the decline of the sun until the darkness of the night, and [also] the Qur’an of dawn. Indeed, the recitation of dawn is ever witnessed.”",
      reference: "Qur’an 17:78",
    },
  ],
  dhuhr: [
    {
      quote: "“Indeed, prayer has been decreed upon the believers a decree of specified times.”",
      reference: "Qur’an 4:103",
    },
    {
      quote:
        "“The first of his deeds for which a person will be brought to account on the Day of Resurrection is his prayer. If it is complete, he is successful; if it is incomplete, he is a loser.”",
      reference: "Prophet Muhammad, Jami at-Tirmidhi 413",
    },
    {
      quote: "“Whoever guards four rak’ahs before Dhuhr and four after it, Allah forbids him to the Fire.”",
      reference: "Prophet Muhammad, Jami at-Tirmidhi 428",
    },
    {
      quote: "“Prayer is light.”",
      reference: "Prophet Muhammad, Sahih Muslim 223",
    },
  ],
  asr: [
    {
      quote: "“Whoever prays the two cool prayers (Fajr and Asr) will enter Paradise.”",
      reference: "Prophet Muhammad, Sahih al-Bukhari 574",
    },
    {
      quote: "“Whoever misses the Asr prayer, it is as if he lost his family and his property.”",
      reference: "Prophet Muhammad, Sahih al-Bukhari 552",
    },
    {
      quote:
        "“You will surely see your Lord with your own eyes... if you are able to avoid missing a prayer before the sun rises and a prayer before it sets, then do so.”",
      reference: "Prophet Muhammad, Sahih al-Bukhari 554",
    },
    {
      quote: "“Maintain with care the prayers, and [in particular] the middle prayer.”",
      reference: "Qur’an 2:238",
    },
  ],
  maghrib: [
    {
      quote: "“And establish prayer at the two ends of the day.”",
      reference: "Qur’an 11:114",
    },
    {
      quote: "“The time for Maghrib prayer lasts as long as the twilight has not yet vanished.”",
      reference: "Prophet Muhammad, Sahih Muslim 612",
    },
    {
      quote: "“Prayer is light.”",
      reference: "Prophet Muhammad, Sahih Muslim 223",
    },
    {
      quote:
        "“Whoever prays Isha in congregation, it is as if he prayed half the night.” Maghrib opens that same door of reward each evening.",
      reference: "Prophet Muhammad, Sahih Muslim 656",
    },
  ],
  isha: [
    {
      quote:
        "“Whoever prays Isha in congregation, it is as if he prayed half the night; and whoever prays Fajr in congregation, it is as if he prayed the whole night.”",
      reference: "Prophet Muhammad, Sahih Muslim 656",
    },
    {
      quote:
        "“The most burdensome prayers for the hypocrites are Isha and Fajr. If they knew what reward lies in them, they would come even if they had to crawl.”",
      reference: "Prophet Muhammad, Sahih al-Bukhari 657",
    },
    {
      quote:
        "“There are three times of privacy for you: before the Fajr prayer, when you lay aside your garments for the noon heat, and after the Isha prayer.”",
      reference: "Qur’an 24:58",
    },
    {
      quote: "“Prayer is light.”",
      reference: "Prophet Muhammad, Sahih Muslim 223",
    },
  ],
};

const virtueCursor: Record<Prayer, number> = {
  fajr: 0,
  dhuhr: 0,
  asr: 0,
  maghrib: 0,
  isha: 0,
};

/** Returns the next virtue for a prayer, cycling through its pool in order on each call. */
export function nextPrayerVirtue(prayer: Prayer): PrayerVirtue {
  const pool = PRAYER_VIRTUES[prayer];
  const index = virtueCursor[prayer] % pool.length;
  virtueCursor[prayer] = index + 1;
  return pool[index];
}

/** Looping messages shown over the "Pray Now" particle overlay. */
export const PRAY_NOW_MESSAGES: string[] = [
  "Gaining the love of Allah",
  "Prioritizing Akhirah over dunya",
  "Having a date with the Almighty",
  "Climbing the stairs to Jannah",
  "Removing your sins, drop by drop",
  "Finding peace for your heart",
  "Strengthening your bond with your Creator",
  "Standing before the King of kings",
  "Leaving the dunya at the door, if only for a moment",
  "Choosing what truly lasts over what merely feels urgent",
  "Whispering to the One who never stops listening",
  "Trading a few minutes of dunya for treasure in the akhirah",
  "This moment is worth more than everything you're chasing today",
  "The world can wait. This can't",
  "Every sajdah brings you closer to Him than anything else ever could",
  "Nothing you own is more valuable than this conversation with Allah",
  "This is the best appointment of your entire day",
  "Let go of everything else. He is all that matters right now",
  "Your Lord is waiting to hear from you",
  "This is the moment your soul was created for",
  "Nothing on your phone deserves this moment more than He does",
  "You are being given a direct line to the Creator of the universe",
  "Every second here is a second well spent for eternity",
  "This is the one meeting you should never want to rush",
  "Let your heart feel small before Him and find peace in it",
  "The dunya is temporary. This moment with Allah is not",
  "You're not just praying. You're being seen, heard, and loved",
  "This is your reset button. Use it fully",
  "Whatever is waiting for you outside can wait a little longer",
  "Right now, you are the most fortunate person alive",
  "This is where real strength comes from",
  "Let this be the best part of your day, not just a task to finish",
  "Give this moment your full heart, not just your body",
  "You were made for this exact moment of surrender",
  "This is your quiet rebellion against a world that never stops",
  "Nothing you're worried about matters more than this right now",
  "This is your soul breathing again",
  "Treat this like the most important appointment you'll have today",
];

export type PrayerBenefit = {
  title: string;
  body: string;
};

/** What the user reads right after marking a status. Null means no reward copy for that status. */
export function benefitForStatus(status: Status): PrayerBenefit | null {
  switch (status) {
    case "on_time_jamaah":
      return {
        title: "MashaAllah! Full reward earned",
        body: "Praying on time and in congregation earns the highest reward, up to 27 times the reward of praying alone, plus the virtue of answering the call the moment it came.",
      };
    case "on_time":
      return {
        title: "A deed most beloved to Allah",
        body: "Praying at its earliest time is one of the most beloved deeds to Allah. You chose Him over every distraction waiting for you.",
      };
    case "jamaah":
      return {
        title: "27 times the reward earned",
        body: "Praying in congregation multiplies your reward 27 times over praying alone, and unites your heart with your brothers and sisters in worship.",
      };
    case "late":
      return {
        title: "Reward earned, still recorded",
        body: "Your prayer still counts and is written for you. Next time, try to answer the call a little sooner, since the earliest time is the most beloved to Allah.",
      };
    case "qada":
      return {
        title: "A missed prayer, made whole",
        body: "Allah loves those who turn back to Him. Making up a missed prayer is an act of sincere repentance, and your slate for this prayer is now clean.",
      };
    case "excused":
      return {
        title: "A valid excuse, full credit",
        body: "Allah does not burden a soul beyond what it can bear. Your excusal is written as if the prayer was performed.",
      };
    default:
      return null;
  }
}
