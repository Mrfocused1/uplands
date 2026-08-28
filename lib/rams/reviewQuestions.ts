export type RamsReviewAnswer = "Yes" | "No" | "N/A";

export interface RamsReviewQuestion {
  key: string;
  text: string;
  searchPrompt: string;
}

export const ramsReviewQuestions: RamsReviewQuestion[] = [
  {
    key: "q1",
    text: "1. Are appropriate controls contained in the RAMS?",
    searchPrompt: "method statement risk assessment controls measures precautions safe system of work",
  },
  {
    key: "q2",
    text: "2. Do they cover all likely significant hazards?",
    searchPrompt: "significant hazards risk assessment hazard controls dust noise manual handling work at height substances",
  },
  {
    key: "q2p",
    text: "2. Are Uplands Permits to Work required?",
    searchPrompt: "permit to work hot works electrical isolation work at height confined space lifting operations",
  },
  {
    key: "q3",
    text: "3. Is the area of work and scope clearly defined?",
    searchPrompt: "scope of works work area site location project description sequence method statement",
  },
  {
    key: "q4",
    text: "4. Are supervisory and communication arrangements clearly defined?",
    searchPrompt: "supervisor site manager communication responsibilities contacts briefings reporting monitoring",
  },
  {
    key: "q5",
    text: "5. Is responsibility for monitoring operations clearly defined?",
    searchPrompt: "monitoring inspections supervisor checks responsibility daily checks review stop work",
  },
  {
    key: "q6",
    text: "6. Are training requirements identified?",
    searchPrompt: "training competency competence CSCS IPAF PASMA asbestos awareness manual handling first aider SMSTS SSSTS",
  },
  {
    key: "q7",
    text: "7. Non-English speaking operative arrangements",
    searchPrompt: "non English speaking language translation interpreter briefings understood communication",
  },
  {
    key: "q8",
    text: "8. Impact on contractors, visitors and public areas",
    searchPrompt: "other contractors visitors public segregation barriers exclusion zones pedestrians customers",
  },
  {
    key: "q9",
    text: "9. Are emergency arrangements adequately addressed?",
    searchPrompt: "emergency arrangements first aid hospital fire evacuation accident incident rescue",
  },
  {
    key: "q10",
    text: "10. Has appropriate PPE been identified?",
    searchPrompt: "PPE personal protective equipment hard hat hi vis safety boots gloves eye protection RPE",
  },
  {
    key: "q11",
    text: "11. Are environmental aspects adequately addressed?",
    searchPrompt: "environmental waste disposal spill COSHH pollution recycling storage substances",
  },
  {
    key: "q12",
    text: "12. Does the RAMS need anything else addressed?",
    searchPrompt: "missing incomplete blank to be confirmed site specific review comments further information",
  },
];

export const ramsReviewQuestionText = Object.fromEntries(ramsReviewQuestions.map((question) => [question.key, question.text]));
