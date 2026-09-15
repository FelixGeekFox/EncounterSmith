/**
 * Visitor-facing questions. Every answer speaks to a Game Master; nothing here
 * describes the business behind the site.
 *
 * Plain text, so the same strings can feed FAQPage structured data without
 * having to strip markup out of them.
 */
export interface FaqItem {
  readonly question: string;
  readonly answer: string;
  /** Also shown in the short home-page set. */
  readonly featured?: boolean;
}

export const faqs: readonly FaqItem[] = [
  {
    question: 'Are the generators free?',
    answer:
      'Yes. All three run in your browser with no account, no sign-up and no limit on how many results you pull. Nothing you generate is sent anywhere.',
    featured: true,
  },
  {
    question: 'Which roleplaying systems do they support?',
    answer:
      'All of them, and none in particular. The tables describe people, places and situations rather than statistics, so nothing needs converting. Drop a result into whichever game is already on your table and assign numbers the way you normally would.',
    featured: true,
  },
  {
    question: 'Can I use what I generate in my home campaign?',
    answer:
      'Please do. That is exactly what it is for. Take a result, change half of it, forget where it came from. No credit required.',
    featured: true,
  },
  {
    question: 'Can I publish generated material?',
    answer:
      'Sharing a result with your table, your group chat or your play-by-post thread is fine and always will be. Republishing the tables themselves, or packaging generated output as a product of your own, is not covered yet.',
    featured: true,
  },
  {
    question: 'Can I commercially reuse generated material?',
    answer:
      'Not yet, and we would rather say so plainly than leave it vague. A proper licence covering commercial reuse is being prepared. Until it is published here, treat generated results as free for home-game use. If you have a specific project in mind, write to us and we will tell you where the licence has got to.',
    featured: true,
  },
  {
    question: 'Is EncounterSmith affiliated with Wizards of the Coast?',
    answer:
      'No. EncounterSmith is independent, with no affiliation, sponsorship or endorsement from Wizards of the Coast or any other publisher. Every table is written from scratch, and nothing draws on another publisher’s settings, characters or trademarks.',
    featured: true,
  },
  {
    question: 'When will Smith+ launch?',
    answer:
      'There is no date. Smith+ is a planned subscription with deeper tables, saved results and printable exports, and none of it is built yet. The founding list is how you hear when there is something real to look at. Joining costs nothing and commits you to nothing.',
    featured: true,
  },
  {
    question: 'Do I need an account to save a result?',
    answer:
      'There are no accounts at all at the moment, so nothing carries between visits. Lock the fields you want to keep, copy the result as text or Markdown, and paste it into your own notes. Saved results are on the list for Smith+.',
  },
  {
    question: 'What do the lock buttons do?',
    answer:
      'Locking a field pins its value. Generate again and every unlocked field is redrawn while the locked ones stay exactly as they are. It is the quickest way to keep a name you like and shake the rest of the character loose.',
  },
  {
    question: 'Do the generators work on a phone at the table?',
    answer:
      'Yes. Everything is built to be usable one-handed on a phone, and the results print cleanly if you would rather have paper in front of you.',
  },
  {
    question: 'Do you track what I generate?',
    answer:
      'No. There is no analytics script, no advertising network and no third-party tracking on this site. The generators run entirely in your browser and results never leave your device.',
  },
  {
    question: 'Can I suggest an entry for a table?',
    answer:
      'Very much so. Send it through the contact address in the footer. Original writing only, please: anything lifted out of a published book cannot go in.',
  },
];

export const featuredFaqs = faqs.filter((item) => item.featured === true);
