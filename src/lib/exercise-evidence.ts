import type { Category } from "./types";

export type EvidenceReference = {
  id: string;
  title: string;
  organization: string;
  year: string;
  url: string;
  finding: string;
};

export const EXERCISE_REFERENCES: EvidenceReference[] = [
  {
    id: "nsca-youth",
    title: "Youth Resistance Training: Updated Position Statement",
    organization: "National Strength and Conditioning Association; Journal of Strength and Conditioning Research",
    year: "2009",
    url: "https://doi.org/10.1519/JSC.0b013e31819df407",
    finding: "Supports properly designed, supervised youth resistance training with technique-first instruction, light starting loads, gradual progression, and recovery between sessions. It does not endorse an unsupervised app routine.",
  },
  {
    id: "aap-youth",
    title: "Resistance Training for Children and Adolescents",
    organization: "American Academy of Pediatrics; Pediatrics clinical report",
    year: "2020",
    url: "https://publications.aap.org/pediatrics/article/145/6/e20201011/76942/Resistance-Training-for-Children-and-Adolescents",
    finding: "Supports age-appropriate, supervised youth resistance training with dynamic warm-ups, technique, and gradual progression. The app's age bands are conservative product heuristics, not AAP cutoffs.",
  },
  {
    id: "nsca-plyo",
    title: "Plyometric Exercises",
    organization: "National Strength and Conditioning Association",
    year: "2019",
    url: "https://www.nsca.com/education/articles/kinetic-select/plyometric-exercises/",
    finding: "Emphasizes movement mastery, a small number of exercise variations, low frequency and quality repetitions; total jumping load should account for sport practice as well as the gym.",
  },
  {
    id: "shred-basketball",
    title: "The SHRed Injuries Basketball Neuromuscular Training Warm-up Program",
    organization: "Journal of Orthopaedic & Sports Physical Therapy; indexed in PubMed",
    year: "2022",
    url: "https://pubmed.ncbi.nlm.nih.gov/34972488/",
    finding: "A quasi-experimental study of youth teams found the specific 10-minute SHRed program was associated with a 36% lower ankle/knee injury rate. This result does not establish that every warm-up, or CourtReady's warm-up, has the same effect.",
  },
  {
    id: "stretch-consensus",
    title: "Practical Recommendations on Stretching Exercise: Delphi Consensus Statement",
    organization: "Journal of Sport and Health Science; international research expert panel",
    year: "2025",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12305623/",
    finding: "Distinguishes flexibility training from preparation for explosive performance. Avoid long static holds immediately before maximal efforts; use dynamic preparation and reserve longer static stretching for separate flexibility work or later in a session.",
  },
  {
    id: "ioc-load",
    title: "How Much Is Too Much? (Part 1): IOC Consensus Statement on Load in Sport and Risk of Injury",
    organization: "British Journal of Sports Medicine; International Olympic Committee consensus",
    year: "2016",
    url: "https://pubmed.ncbi.nlm.nih.gov/27535989/",
    finding: "Training and competition loads should be interpreted in athlete context. No single workload number or universal acute-to-chronic ratio is a stand-alone injury prediction rule.",
  },
  {
    id: "session-rpe",
    title: "Session-RPE Method for Training Load Monitoring: Validity, Ecological Usefulness, and Influencing Factors",
    organization: "Frontiers in Neuroscience; peer-reviewed review",
    year: "2017",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5673663/",
    finding: "Session RPE multiplied by session duration is a practical estimate of internal training load, but it is an estimate for monitoring—not a diagnosis or a precise injury forecast.",
  },
];

export type CategoryEvidence = {
  note: string;
  referenceIds: string[];
};

/** Category-level evidence is deliberately not presented as validation of an individual drill or its exact dose. */
export const CATEGORY_EVIDENCE: Record<Category, CategoryEvidence> = {
  warmup: {
    note: "Favor a progressive, dynamic, basketball-relevant warm-up. A tested youth-basketball program supports neuromuscular warm-ups as a category; this library is not the tested SHRed protocol.",
    referenceIds: ["shred-basketball", "nsca-youth", "aap-youth"],
  },
  mobility: {
    note: "Use comfortable, controlled range. Dynamic mobility fits preparation; longer static holds are better placed away from immediately preceding maximal jumps or sprints. A stretch is not a treatment for injury.",
    referenceIds: ["stretch-consensus"],
  },
  plyo: {
    note: "Jumping is high-intent work: build landing skill first, keep repetitions crisp, allow recovery, and count basketball jumps/cuts toward the total. CourtReady limits the number of plyometric variations in a generated session, but its doses are starting suggestions—not a validated protocol.",
    referenceIds: ["nsca-plyo", "nsca-youth", "shred-basketball"],
  },
  power: {
    note: "Use loads and speeds the athlete can control; stop when technique or speed degrades. For youth, use qualified adult coaching and gradual progression. These cues do not certify an athlete's readiness for a lift.",
    referenceIds: ["nsca-youth", "aap-youth", "nsca-plyo"],
  },
  strength: {
    note: "Prioritize sound technique, a manageable effort, and gradual progression. Properly designed and supervised youth resistance training is supported; exact CourtReady sets and repetitions have not been clinically validated.",
    referenceIds: ["nsca-youth", "aap-youth"],
  },
  agility: {
    note: "Progress speed and direction-change complexity only while movement remains controlled. Treat practice, games, and conditioning as part of the same workload picture; an app score cannot predict injury.",
    referenceIds: ["shred-basketball", "ioc-load"],
  },
  conditioning: {
    note: "Choose a dose that fits the athlete's total practice and competition load. Session effort and duration can help track how hard a session felt, but there is no universal safe load threshold.",
    referenceIds: ["ioc-load", "session-rpe"],
  },
  skill: {
    note: "These are basketball skill-practice ideas. Their exact rep counts are coaching suggestions, not research-established optimal doses; keep quality high and adapt to the athlete and session.",
    referenceIds: ["nsca-youth", "ioc-load"],
  },
  core: {
    note: "Use controlled ranges and comfortable effort; progress gradually and stop if pain changes movement. The listed doses are practical starting points, not a proven injury-prevention prescription.",
    referenceIds: ["nsca-youth"],
  },
  recovery: {
    note: "Easy movement and flexibility may support comfort and routine, but should not be framed as repairing tissue or preventing injury. Adjust to symptoms and the wider weekly workload.",
    referenceIds: ["stretch-consensus", "ioc-load"],
  },
};

export function evidenceForCategory(category: Category) {
  const guidance = CATEGORY_EVIDENCE[category];
  return {
    ...guidance,
    references: guidance.referenceIds
      .map((id) => EXERCISE_REFERENCES.find((reference) => reference.id === id))
      .filter((reference): reference is EvidenceReference => Boolean(reference)),
  };
}
