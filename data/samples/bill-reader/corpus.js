// Full bill text keyed by "STATE:BILL". Raw text as pasted from the legislature site; parsed at runtime.
export const BILL_TEXTS = {
"CA:SB 243": {
digest: { Vote: "MAJORITY", Appropriation: "NO", "Fiscal Committee": "YES", "Local Program": "NO" },
// Plain-English layer. Illustrative; to be replaced by AI-generated + reviewed annotations. See BILL-ANNOTATION-SPEC.md.
title: "Companion chatbot safeguards for minors",
officialTitle: "An act to add Chapter 22.6 (commencing with Section 22601) to Division 8 of the Business and Professions Code, relating to artificial intelligence.",
gist: "Companion chatbots in California must say they're AI, step in when a user talks about suicide, protect minors, and report to the state every year. People harmed can sue for at least $1,000 per violation.",
gistDetail: "It applies to companies that offer companion chatbots to Californians: AI that holds human-like conversations and can act like a friend over time. Customer-service bots, in-game characters that stick to the game, and voice assistants like smart speakers are excluded. Operators must publish their suicide-prevention protocol, and reporting to the Office of Suicide Prevention begins July 1, 2027. The duties stack on top of existing law rather than replacing it.",
// Policies this bill touches. Each has a plain-English summary of how the bill moves that policy,
// and takeaways whose ids point at the subdivisions that support them.
policies: {
  chatbots: {
    summary: "Sets California's first rules for companion chatbots: disclose they're AI, run a suicide-prevention protocol, add guardrails for minors, and let people sue.",
    detail: "Covers disclosure, self-harm response, and age-specific protections, which lands California at Strong on this policy. There is no audit requirement, so it stops short of Comprehensive. Enforcement is private: anyone injured can sue for at least $1,000 per violation plus fees.",
    takeaways: [
      { title: "The bot has to admit it's a bot", text: "If a reasonable person might think they're talking to a human, the operator must clearly say the chatbot is AI.", ids: ["c22602-a"] },
      { title: "A suicide-prevention protocol is mandatory", text: "Operators can't run a companion chatbot without a protocol that stops self-harm content and points users to a crisis line. The protocol must be published online.", ids: ["c22602-b-1", "c22602-b-2"] },
      { title: "Extra guardrails for known minors", text: "Disclose it's AI, remind them every three hours to take a break, and take reasonable steps to block sexual content.", ids: ["c22602-c", "c22602-c-1", "c22602-c-2", "c22602-c-3"] },
      { title: "Anyone harmed can sue", text: "Injunctions, at least $1,000 per violation (or actual damages if higher), plus attorney's fees.", ids: ["c22605", "c22605-a", "c22605-b", "c22605-c"] }
    ]
  },
  transparency: {
    summary: "Adds one narrow disclosure duty: platforms must warn that companion chatbots may not be suitable for some minors.",
    detail: "The warning must appear on every surface where the platform is reached, including apps and browsers. It does not add general AI-disclosure duties beyond companion chatbots.",
    takeaways: [
      { title: "A warning that chatbots may not suit some minors", text: "The notice must appear wherever the platform can be accessed: app, browser, or otherwise.", ids: ["c22604"] }
    ]
  },
  gov: {
    summary: "Gives the Office of Suicide Prevention a new reporting stream from chatbot operators and requires it to publish the data.",
    detail: "Reports start July 1, 2027 and cover crisis-referral counts and the protocols in place, with no user identifiers. This is a reporting duty on private operators, not a rule on how state agencies use AI.",
    takeaways: [
      { title: "Annual reports to the Office of Suicide Prevention", text: "Starting July 2027: how many crisis referrals were issued and what protocols are in place. No personal data. The Office publishes the numbers.", ids: ["c22603-a", "c22603-a-1", "c22603-a-2", "c22603-a-3", "c22603-b", "c22603-c"] }
    ]
  }
},
// Section-by-section translations, keyed by parsed section id.
plain: {
  "s1": "Adds a new chapter on companion chatbots to the Business and Professions Code.",
  "c22601": "Definitions. The key one: a “companion chatbot” is AI that talks like a person, meets social needs, and remembers you across conversations. Customer-service bots, game characters, and smart speakers are excluded.",
  "c22602": "The core duties: disclose you're AI when it's unclear, run a suicide-prevention protocol, and add extra protections for users known to be minors.",
  "c22603": "Annual reporting to the Office of Suicide Prevention starting July 2027, without user identifiers. The Office publishes the data.",
  "c22604": "Platforms must warn users that companion chatbots may not be suitable for some minors.",
  "c22605": "Private right of action: anyone injured can sue for an injunction, at least $1,000 per violation, and legal fees.",
  "c22606": "These duties stack on top of any other law; they don't replace it.",
  "s2": "Severability: if one part is struck down, the rest still stands."
},
text: `The people of the State of California do enact as follows:

SECTION 1. Chapter 22.6 (commencing with Section 22601) is added to Division 8 of the Business and Professions Code, to read:
CHAPTER  22.6. Companion Chatbots
22601. As used in this chapter:
(a) “Artificial intelligence” means an engineered or machine-based system that varies in its level of autonomy and that can, for explicit or implicit objectives, infer from the input it receives how to generate outputs that can influence physical or virtual environments.
(b) (1) “Companion chatbot” means an artificial intelligence system with a natural language interface that provides adaptive, human-like responses to user inputs and is capable of meeting a user’s social needs, including by exhibiting anthropomorphic features and being able to sustain a relationship across multiple interactions.
(2) “Companion chatbot” does not include any of the following:
(A) A bot that is used only for customer service, a business’ operational purposes, productivity and analysis related to source information, internal research, or technical assistance.
(B) A bot that is a feature of a video game and is limited to replies related to the video game that cannot discuss topics related to mental health, self-harm, sexually explicit conduct, or maintain a dialogue on other topics unrelated to the video game.
(C) A stand-alone consumer electronic device that functions as a speaker and voice command interface, acts as a voice-activated virtual assistant, and does not sustain a relationship across multiple interactions or generate outputs that are likely to elicit emotional responses in the user.
(c) “Companion chatbot platform” means a platform that allows a user to engage with companion chatbots.
(d) “Office” means the Office of Suicide Prevention established pursuant to Section 131300 of the Health and Safety Code.
(e) “Operator” means a person who makes a companion chatbot platform available to a user in the state.
(f) “Sexually explicit conduct” has the meaning defined in Section 2256 of Title 18 of the United States Code.
(g) “Video game” means a game played on an electronic amusement device that utilizes a computer, microprocessor, or similar electronic circuitry and its own monitor, or is designed to be used with a television set or a computer monitor, that interacts with the user of the device.
22602. (a) If a reasonable person interacting with a companion chatbot would be misled to believe that the person is interacting with a human, an operator shall issue a clear and conspicuous notification indicating that the companion chatbot is artificially generated and not human.
(b) (1) An operator shall prevent a companion chatbot on its companion chatbot platform from engaging with users unless the operator maintains a protocol for preventing the production of suicidal ideation, suicide, or self-harm content to the user, including, but not limited to, by providing a notification to the user that refers the user to crisis service providers, including a suicide hotline or crisis text line, if the user expresses suicidal ideation, suicide, or self-harm.
(2) The operator shall publish details on the protocol required by this subdivision on the operator’s internet website.
(c) An operator shall, for a user that the operator knows is a minor, do all of the following:
(1) Disclose to the user that the user is interacting with artificial intelligence.
(2) Provide by default a clear and conspicuous notification to the user at least every three hours for continuing companion chatbot interactions that reminds the user to take a break and that the companion chatbot is artificially generated and not human.
(3) Institute reasonable measures to prevent its companion chatbot from producing visual material of sexually explicit conduct or directly stating that the minor should engage in sexually explicit conduct.
22603. (a) Beginning July 1, 2027, an operator shall annually report to the office all of the following:
(1) The number of times the operator has issued a crisis service provider referral notification pursuant to Section 22602 in the preceding calendar year.
(2) Protocols put in place to detect, remove, and respond to instances of suicidal ideation by users.
(3) Protocols put in place to prohibit a companion chatbot response about suicidal ideation or actions with the user.
(b) The report required by this section shall include only the information listed in subdivision (a) and shall not include any identifiers or personal information about users.
(c) The office shall post data from a report required by this section on its internet website.
(d) An operator shall use evidence-based methods for measuring suicidal ideation.
22604. An operator shall disclose to a user of its companion chatbot platform, on the application, the browser, or any other format that a user can use to access the companion chatbot platform, that companion chatbots may not be suitable for some minors.
22605. A person who suffers injury in fact as a result of a violation of this chapter may bring a civil action to recover all of the following relief:
(a) Injunctive relief.
(b) Damages in an amount equal to the greater of actual damages or one thousand dollars ($1,000) per violation.
(c) Reasonable attorney’s fees and costs.
22606. The duties, remedies, and obligations imposed by this chapter are cumulative to the duties, remedies, or obligations imposed under other law and shall not be construed to relieve an operator from any duties, remedies, or obligations imposed under any other law.
SEC. 2. The provisions of this act are severable. If any provision of this act or its application is held invalid, that invalidity shall not affect other provisions or applications that can be given effect without the invalid provision or application.`
},

// Source: LegiScan, chaptered text, https://legiscan.com/CA/text/SB53/id/3271094. Chapter 138, Statutes of 2025.
"CA:SB 53": {
digest: { Vote: "MAJORITY", Appropriation: "NO", "Fiscal Committee": "YES", "Local Program": "NO" },
title: "Safety transparency for frontier AI developers",
officialTitle: "An act to add Chapter 25.1 (commencing with Section 22757.10) to Division 8 of the Business and Professions Code, to add Section 11546.8 to the Government Code, and to add Chapter 5.1 (commencing with Section 1107) to Part 3 of Division 2 of the Labor Code, relating to artificial intelligence.",
gist: "The biggest AI developers in California must publish a safety framework, post a transparency report before releasing each new model, and report critical safety incidents to the state. Employees who raise safety alarms are protected from retaliation.",
gistDetail: "It applies to frontier developers: companies that train models with more than 10^26 operations of compute. The heaviest duties fall on large frontier developers, those with over $500 million in annual revenue. The Office of Emergency Services runs the incident-reporting channel, and the Attorney General can fine a large developer up to $1 million per violation. A separate section sets up a consortium to plan CalCompute, a public cloud cluster, but only once the Legislature funds it. Local governments cannot pass their own frontier-model rules.",
policies: {
  frontier: {
    summary: "California's first binding duties on frontier developers: publish a safety framework, report catastrophic-risk assessments and incidents, and protect whistleblowers, enforced by the Attorney General.",
    detail: "The duties are transparency and reporting duties, not pre-approval or testing mandates, so the state lands at Strong rather than Comprehensive. There is no requirement to pause or withdraw a model. Penalties reach $1 million per violation and apply only to large frontier developers.",
    takeaways: [
      { title: "Large developers must publish a safety framework", text: "It has to explain how the company sets risk thresholds, applies mitigations, secures model weights, and handles incidents. It is reviewed at least yearly.", ids: ["c22757.12-a", "c22757.12-b-1"] },
      { title: "A transparency report before each new model", text: "Every frontier developer posts release date, intended uses, and restrictions. Large developers add summaries of their catastrophic-risk assessments and third-party evaluation.", ids: ["c22757.12-c-1", "c22757.12-c-2"] },
      { title: "Critical incidents reported within 15 days", text: "Incidents with an imminent risk of death or serious injury go to authorities within 24 hours. Reports are exempt from public-records requests.", ids: ["c22757.13-c-1", "c22757.13-c-2", "c22757.13-f"] },
      { title: "Safety staff can't be silenced", text: "No contract or policy may stop a covered employee from reporting catastrophic risk to the Attorney General, and large developers must run an anonymous internal channel.", ids: ["c1107.1-a", "c1107.1-e-1"] },
      { title: "Up to $1 million per violation", text: "Only the Attorney General can sue, and only large frontier developers are liable for penalties.", ids: ["c22757.15-a", "c22757.15-b"] }
    ]
  },
  transparency: {
    summary: "Adds public disclosure duties for frontier developers: a posted safety framework, per-model transparency reports, and a ban on misleading statements about risk.",
    detail: "The disclosures are about model-level safety practices, not about telling consumers when AI is used in a decision. Developers may redact trade secrets and security details but must say what was redacted and why.",
    takeaways: [
      { title: "The framework goes on the public website", text: "Material changes must be republished with a justification within 30 days.", ids: ["c22757.12-a", "c22757.12-b-2"] },
      { title: "No misleading statements about catastrophic risk", text: "A developer can't make materially false claims about its risks or its compliance with its own framework. Good-faith statements are excused.", ids: ["c22757.12-e-1-A", "c22757.12-e-1-B", "c22757.12-e-2"] },
      { title: "Redactions must be explained and kept", text: "Anything cut for trade secrets or security has to be described in the published version, and the unredacted copy kept for five years.", ids: ["c22757.12-f-1", "c22757.12-f-2"] }
    ]
  },
  gov: {
    summary: "Gives the Office of Emergency Services an incident-reporting role, tasks a consortium with planning the CalCompute public cloud, and preempts local frontier-model rules.",
    detail: "These are new state functions rather than rules on how agencies use AI. The Office publishes an anonymized annual report starting 2027. CalCompute planning only becomes operative when the Legislature appropriates money for it.",
    takeaways: [
      { title: "A state channel for safety incidents", text: "The Office of Emergency Services must build a reporting mechanism for developers and the public, and publish aggregated numbers each year from 2027.", ids: ["c22757.13-a", "c22757.13-g-1"] },
      { title: "A 14-member consortium plans CalCompute", text: "It reports a framework for a public cloud cluster to the Legislature by January 1, 2027, then dissolves. Nothing happens until funding is appropriated.", ids: ["c11546.8-a", "c11546.8-f-1", "c11546.8-k"] },
      { title: "Cities and counties can't regulate frontier developers", text: "Local rules on catastrophic-risk management adopted after January 1, 2025 are preempted.", ids: ["s5-f"] }
    ]
  }
},
plain: {
  "s1": "Findings: why the Legislature thinks frontier AI needs transparency rules.",
  "c22757.11": "Definitions. Frontier model: trained with more than 10^26 operations. Large frontier developer: over $500 million in revenue. Catastrophic risk: an incident killing or seriously injuring more than 50 people or causing over $1 billion in damage.",
  "c22757.12": "The core duties: publish a safety framework, post a transparency report before deploying each model, send internal-use risk summaries to the state, and don't mislead about risk.",
  "c22757.13": "Incident reporting to the Office of Emergency Services: within 15 days, or 24 hours if lives are at imminent risk. Reports are confidential.",
  "c22757.14": "The Department of Technology revisits the definitions every year and the Attorney General reports on whistleblower complaints.",
  "c22757.15": "Penalties: up to $1 million per violation, Attorney General only.",
  "c11546.8": "CalCompute: a consortium designs a public cloud cluster and reports to the Legislature by 2027, if funded.",
  "c1107.1": "Whistleblower protections for employees who assess AI risk, with an anonymous internal reporting channel at large developers.",
  "s5": "Severability, and preemption of local frontier-model rules."
},
text: `The people of the State of California do enact as follows:

SECTION 1. The Legislature finds and declares all of the following:
(a) California is leading the world in artificial intelligence innovation and research through companies large and small and through the state’s remarkable public and private universities.
(b) Artificial intelligence, including new advances in foundation models, has the potential to catalyze innovation and the rapid development of a wide range of benefits for Californians and the California economy, including advances in medicine, wildfire forecasting and prevention, and climate science, and to push the bounds of human creativity and capacity.
(c) The Joint California Policy Working Group on AI Frontier Models has recommended sound principles for policy in artificial intelligence.
(d) Targeted interventions to support effective artificial intelligence governance should balance the technology’s benefits and the potential for material risks.
(e) In building a robust and transparent evidence environment, policymakers can align incentives to simultaneously protect consumers, leverage industry expertise, and recognize leading safety practices.
(f) As industry actors conduct internal research on their technologies’ impacts, public trust in these technologies would significantly benefit from access to information regarding, and increased awareness of, frontier AI capabilities.
(g) Greater transparency can also advance accountability, competition, and public trust.
(h) Whistleblower protections and public-facing information sharing are key instruments to increase transparency.
(i) Incident reporting systems enable monitoring of the post-deployment impacts of artificial intelligence.
(j) Unless they are developed with careful diligence and reasonable precaution, there is concern that advanced artificial intelligence systems could have capabilities that pose catastrophic risks from both malicious uses and malfunctions, including artificial intelligence-enabled hacking, biological attacks, and loss of control.
(k) With the frontier of artificial intelligence rapidly evolving, there is a need for legislation to track the frontier of artificial intelligence research and alert policymakers and the public to serious risks and harms from the very most advanced artificial intelligence systems, while avoiding burdening smaller companies behind the frontier.
(l) While the major artificial intelligence developers have already voluntarily established the creation, use, and publication of frontier AI frameworks as an industry best practice, not all developers are providing reporting that is consistent and sufficient to ensure necessary transparency and protection of the public. Mandatory, standardized, and objective reporting by frontier developers is required to provide the government and the public with timely and accurate information.
(m) Timely reporting of critical safety incidents to the government is essential to ensure that public authorities are promptly informed of ongoing and emerging risks to public safety. This reporting enables the government to monitor, assess, and respond effectively in the event that advanced capabilities emerge in frontier artificial intelligence models that may pose a threat to the public.
(n) In the future, foundation models developed by smaller companies or that are behind the frontier may pose significant catastrophic risk, and additional legislation may be needed at that time.
(o) The recent release of the Governor’s California Report on Frontier AI Policy and testimony from legislative hearings on artificial intelligence before the Legislature reflect the advances in AI model capabilities that could pose potential catastrophic risk in frontier artificial intelligence, which this act aims to address.
(p) It is the intent of the Legislature to create more transparency, but collective safety will depend in part on frontier developers taking due care in their development and deployment of frontier models proportional to the scale of the foreseeable risks.
SEC. 2. Chapter 25.1 (commencing with Section 22757.10) is added to Division 8 of the Business and Professions Code, to read:
CHAPTER 25.1. Transparency in Frontier Artificial Intelligence Act
22757.10. This chapter shall be known as the Transparency in Frontier Artificial Intelligence Act.
22757.11. For purposes of this chapter:
(a) “Affiliate” means a person controlling, controlled by, or under common control with a specified person, directly or indirectly, through one or more intermediaries.
(b) “Artificial intelligence model” means an engineered or machine-based system that varies in its level of autonomy and that can, for explicit or implicit objectives, infer from the input it receives how to generate outputs that can influence physical or virtual environments.
(c) (1) “Catastrophic risk” means a foreseeable and material risk that a frontier developer’s development, storage, use, or deployment of a frontier model will materially contribute to the death of, or serious injury to, more than 50 people or more than one billion dollars ($1,000,000,000) in damage to, or loss of, property arising from a single incident involving a frontier model doing any of the following:
(A) Providing expert-level assistance in the creation or release of a chemical, biological, radiological, or nuclear weapon.
(B) Engaging in conduct with no meaningful human oversight, intervention, or supervision that is either a cyberattack or, if the conduct had been committed by a human, would constitute the crime of murder, assault, extortion, or theft, including theft by false pretense.
(C) Evading the control of its frontier developer or user.
(2) “Catastrophic risk” does not include a foreseeable and material risk from any of the following:
(A) Information that a frontier model outputs if the information is otherwise publicly accessible in a substantially similar form from a source other than a foundation model.
(B) Lawful activity of the federal government.
(C) Harm caused by a frontier model in combination with other software if the frontier model did not materially contribute to the harm.
(d) “Critical safety incident” means any of the following:
(1) Unauthorized access to, modification of, or exfiltration of, the model weights of a frontier model that results in death or bodily injury.
(2) Harm resulting from the materialization of a catastrophic risk.
(3) Loss of control of a frontier model causing death or bodily injury.
(4) A frontier model that uses deceptive techniques against the frontier developer to subvert the controls or monitoring of its frontier developer outside of the context of an evaluation designed to elicit this behavior and in a manner that demonstrates materially increased catastrophic risk.
(e) (1) “Deploy” means to make a frontier model available to a third party for use, modification, copying, or combination with other software.
(2) “Deploy” does not include making a frontier model available to a third party for the primary purpose of developing or evaluating the frontier model.
(f) “Foundation model” means an artificial intelligence model that is all of the following:
(1) Trained on a broad data set.
(2) Designed for generality of output.
(3) Adaptable to a wide range of distinctive tasks.
(g) “Frontier AI framework” means documented technical and organizational protocols to manage, assess, and mitigate catastrophic risks.
(h) “Frontier developer” means a person who has trained, or initiated the training of, a frontier model, with respect to which the person has used, or intends to use, at least as much computing power to train the frontier model as would meet the technical specifications found in subdivision (i).
(i) (1) “Frontier model” means a foundation model that was trained using a quantity of computing power greater than 10^26 integer or floating-point operations.
(2) The quantity of computing power described in paragraph (1) shall include computing for the original training run and for any subsequent fine-tuning, reinforcement learning, or other material modifications the developer applies to a preceding foundation model.
(j) “Large frontier developer” means a frontier developer that together with its affiliates collectively had annual gross revenues in excess of five hundred million dollars ($500,000,000) in the preceding calendar year.
(k) “Model weight” means a numerical parameter in a frontier model that is adjusted through training and that helps determine how inputs are transformed into outputs.
(l) “Property” means tangible or intangible property.
22757.12. (a) A large frontier developer shall write, implement, comply with, and clearly and conspicuously publish on its internet website a frontier AI framework that applies to the large frontier developer’s frontier models and describes how the large frontier developer approaches all of the following:
(1) Incorporating national standards, international standards, and industry-consensus best practices into its frontier AI framework.
(2) Defining and assessing thresholds used by the large frontier developer to identify and assess whether a frontier model has capabilities that could pose a catastrophic risk, which may include multiple-tiered thresholds.
(3) Applying mitigations to address the potential for catastrophic risks based on the results of assessments undertaken pursuant to paragraph (2).
(4) Reviewing assessments and adequacy of mitigations as part of the decision to deploy a frontier model or use it extensively internally.
(5) Using third parties to assess the potential for catastrophic risks and the effectiveness of mitigations of catastrophic risks.
(6) Revisiting and updating the frontier AI framework, including any criteria that trigger updates and how the large frontier developer determines when its frontier models are substantially modified enough to require disclosures pursuant to subdivision (c).
(7) Cybersecurity practices to secure unreleased model weights from unauthorized modification or transfer by internal or external parties.
(8) Identifying and responding to critical safety incidents.
(9) Instituting internal governance practices to ensure implementation of these processes.
(10) Assessing and managing catastrophic risk resulting from the internal use of its frontier models, including risks resulting from a frontier model circumventing oversight mechanisms.
(b) (1) A large frontier developer shall review and, as appropriate, update its frontier AI framework at least once per year.
(2) If a large frontier developer makes a material modification to its frontier AI framework, the large frontier developer shall clearly and conspicuously publish the modified frontier AI framework and a justification for that modification within 30 days.
(c) (1) Before, or concurrently with, deploying a new frontier model or a substantially modified version of an existing frontier model, a frontier developer shall clearly and conspicuously publish on its internet website a transparency report containing all of the following:
(A) The internet website of the frontier developer.
(B) A mechanism that enables a natural person to communicate with the frontier developer.
(C) The release date of the frontier model.
(D) The languages supported by the frontier model.
(E) The modalities of output supported by the frontier model.
(F) The intended uses of the frontier model.
(G) Any generally applicable restrictions or conditions on uses of the frontier model.
(2) Before, or concurrently with, deploying a new frontier model or a substantially modified version of an existing frontier model, a large frontier developer shall include in the transparency report required by paragraph (1) summaries of all of the following:
(A) Assessments of catastrophic risks from the frontier model conducted pursuant to the large frontier developer’s frontier AI framework.
(B) The results of those assessments.
(C) The extent to which third-party evaluators were involved.
(D) Other steps taken to fulfill the requirements of the frontier AI framework with respect to the frontier model.
(3) A frontier developer that publishes the information described in paragraph (1) or (2) as part of a larger document, including a system card or model card, shall be deemed in compliance with the applicable paragraph.
(4) A frontier developer is encouraged, but not required, to make disclosures described in this subdivision that are consistent with, or superior to, industry best practices.
(d) A large frontier developer shall transmit to the Office of Emergency Services a summary of any assessment of catastrophic risk resulting from internal use of its frontier models every three months or pursuant to another reasonable schedule specified by the large frontier developer and communicated in writing to the Office of Emergency Services with written updates, as appropriate.
(e) (1) (A) A frontier developer shall not make a materially false or misleading statement about catastrophic risk from its frontier models or its management of catastrophic risk.
(B) A large frontier developer shall not make a materially false or misleading statement about its implementation of, or compliance with, its frontier AI framework.
(2) This subdivision does not apply to a statement that was made in good faith and was reasonable under the circumstances.
(f) (1) When a frontier developer publishes documents to comply with this section, the frontier developer may make redactions to those documents that are necessary to protect the frontier developer’s trade secrets, the frontier developer’s cybersecurity, public safety, or the national security of the United States or to comply with any federal or state law.
(2) If a frontier developer redacts information in a document pursuant to this subdivision, the frontier developer shall describe the character and justification of the redaction in any published version of the document to the extent permitted by the concerns that justify redaction and shall retain the unredacted information for five years.
22757.13. (a) The Office of Emergency Services shall establish a mechanism to be used by a frontier developer or a member of the public to report a critical safety incident that includes all of the following:
(1) The date of the critical safety incident.
(2) The reasons the incident qualifies as a critical safety incident.
(3) A short and plain statement describing the critical safety incident.
(4) Whether the incident was associated with internal use of a frontier model.
(b) (1) The Office of Emergency Services shall establish a mechanism to be used by a large frontier developer to confidentially submit summaries of any assessments of the potential for catastrophic risk resulting from internal use of its frontier models.
(2) The Office of Emergency Services shall take all necessary precautions to limit access to any reports related to internal use of frontier models to only personnel with a specific need to know the information and to protect the reports from unauthorized access.
(c) (1) Subject to paragraph (2), a frontier developer shall report any critical safety incident pertaining to one or more of its frontier models to the Office of Emergency Services within 15 days of discovering the critical safety incident.
(2) If a frontier developer discovers that a critical safety incident poses an imminent risk of death or serious physical injury, the frontier developer shall disclose that incident within 24 hours to an authority, including any law enforcement agency or public safety agency with jurisdiction, that is appropriate based on the nature of that incident and as required by law.
(3) A frontier developer that discovers information about a critical safety incident after filing the initial report required by this subdivision may file an amended report.
(4) A frontier developer is encouraged, but not required, to report critical safety incidents pertaining to foundation models that are not frontier models.
(d) The Office of Emergency Services shall review critical safety incident reports submitted by frontier developers and may review reports submitted by members of the public.
(e) (1) The Attorney General or the Office of Emergency Services may transmit reports of critical safety incidents and reports from covered employees made pursuant to Chapter 5.1 (commencing with Section 1107) of Part 3 of Division 2 of the Labor Code to the Legislature, the Governor, the federal government, or appropriate state agencies.
(2) The Attorney General or the Office of Emergency Services shall strongly consider any risks related to trade secrets, public safety, cybersecurity of a frontier developer, or national security when transmitting reports.
(f) A report of a critical safety incident submitted to the Office of Emergency Services pursuant to this section, a report of assessments of catastrophic risk from internal use pursuant to Section 22757.12, and a covered employee report made pursuant to Chapter 5.1 (commencing with Section 1107) of Part 3 of Division 2 of the Labor Code are exempt from the California Public Records Act (Division 10 (commencing with Section 7920.000) of Title 1 of the Government Code).
(g) (1) Beginning January 1, 2027, and annually thereafter, the Office of Emergency Services shall produce a report with anonymized and aggregated information about critical safety incidents that have been reviewed by the Office of Emergency Services since the preceding report.
(2) The Office of Emergency Services shall not include information in a report pursuant to this subdivision that would compromise the trade secrets or cybersecurity of a frontier developer, public safety, or the national security of the United States or that would be prohibited by any federal or state law.
(3) The Office of Emergency Services shall transmit a report pursuant to this subdivision to the Legislature, pursuant to Section 9795, and to the Governor.
(h) The Office of Emergency Services may adopt regulations designating one or more federal laws, regulations, or guidance documents that meet all of the following conditions for the purposes of subdivision (i):
(1) (A) The law, regulation, or guidance document imposes or states standards or requirements for critical safety incident reporting that are substantially equivalent to, or stricter than, those required by this section.
(B) The law, regulation, or guidance document described in subparagraph (A) does not need to require critical safety incident reporting to the State of California.
(2) The law, regulation, or guidance document is intended to assess, detect, or mitigate the catastrophic risk.
(i) (1) A frontier developer that intends to comply with this section by complying with the requirements of, or meeting the standards stated by, a federal law, regulation, or guidance document designated pursuant to subdivision (h) shall declare its intent to do so to the Office of Emergency Services.
(2) After a frontier developer has declared its intent pursuant to paragraph (1), both of the following apply:
(A) The frontier developer shall be deemed in compliance with this section to the extent that the frontier developer meets the standards of, or complies with the requirements imposed or stated by, the designated federal law, regulation, or guidance document until the frontier developer declares the revocation of that intent to the Office of Emergency Services or the Office of Emergency Services revokes a relevant regulation pursuant to subdivision (j).
(B) The failure by a frontier developer to meet the standards of, or comply with the requirements stated by, the federal law, regulation, or guidance document designated pursuant to subdivision (h) shall constitute a violation of this chapter.
(j) The Office of Emergency Services shall revoke a regulation adopted under subdivision (h) if the requirements of subdivision (h) are no longer met.
22757.14. (a) On or before January 1, 2027, and annually thereafter, the Department of Technology shall assess recent evidence and developments relevant to the purposes of this chapter and shall make recommendations about whether and how to update any of the following definitions for the purposes of this chapter to ensure that they accurately reflect technological developments, scientific literature, and widely accepted national and international standards:
(1) “Frontier model” so that it applies to foundation models at the frontier of artificial intelligence development.
(2) “Frontier developer” so that it applies to developers of frontier models who are themselves at the frontier of artificial intelligence development.
(3) “Large frontier developer” so that it applies to well-resourced frontier developers.
(b) In making recommendations pursuant to this section, the Department of Technology shall take into account all of the following:
(1) Similar thresholds used in international standards or federal law, guidance, or regulations for the management of catastrophic risk and shall align with a definition adopted in a federal law or regulation to the extent that it is consistent with the purposes of this chapter.
(2) Input from stakeholders, including academics, industry, the open-source community, and governmental entities.
(3) The extent to which a person will be able to determine, before beginning to train or deploy a foundation model, whether that person will be subject to the definition as a frontier developer or as a large frontier developer with an aim toward allowing earlier determinations if possible.
(4) The complexity of determining whether a person or foundation model is covered, with an aim toward allowing simpler determinations if possible.
(5) The external verifiability of determining whether a person or foundation model is covered, with an aim toward definitions that are verifiable by parties other than the frontier developer.
(c) Upon developing recommendations pursuant to this section, the Department of Technology shall submit a report to the Legislature, pursuant to Section 9795 of the Government Code, with those recommendations.
(d) (1) Beginning January 1, 2027, and annually thereafter, the Attorney General shall produce a report with anonymized and aggregated information about reports from covered employees made pursuant to Chapter 5.1 (commencing with Section 1107) of Part 3 of Division 2 of the Labor Code that have been reviewed by the Attorney General since the preceding report.
(2) The Attorney General shall not include information in a report pursuant to this subdivision that would compromise the trade secrets or cybersecurity of a frontier developer, confidentiality of a covered employee, public safety, or the national security of the United States or that would be prohibited by any federal or state law.
(3) The Attorney General shall transmit a report pursuant to this subdivision to the Legislature, pursuant to Section 9795 of the Government Code, and to the Governor.
22757.15. (a) A large frontier developer that fails to publish or transmit a compliant document required to be published or transmitted under this chapter, makes a statement in violation of subdivision (e) of Section 22757.12, fails to report an incident as required by Section 22757.13, or fails to comply with its own frontier AI framework shall be subject to a civil penalty in an amount dependent upon the severity of the violation that does not exceed one million dollars ($1,000,000) per violation.
(b) A civil penalty described in this section shall be recovered in a civil action brought only by the Attorney General.
22757.16. The loss of value of equity does not count as damage to or loss of property for the purposes of this chapter.
SEC. 3. Section 11546.8 is added to the Government Code, to read:
11546.8. (a) There is hereby established within the Government Operations Agency a consortium that shall develop, pursuant to this section, a framework for the creation of a public cloud computing cluster to be known as “CalCompute.”
(b) The consortium shall develop a framework for the creation of CalCompute that advances the development and deployment of artificial intelligence that is safe, ethical, equitable, and sustainable by doing, at a minimum, both of the following:
(1) Fostering research and innovation that benefits the public.
(2) Enabling equitable innovation by expanding access to computational resources.
(c) The consortium shall make reasonable efforts to ensure that CalCompute is established within the University of California to the extent possible.
(d) CalCompute shall include, but not be limited to, all of the following:
(1) A fully owned and hosted cloud platform.
(2) Necessary human expertise to operate and maintain the platform.
(3) Necessary human expertise to support, train, and facilitate the use of CalCompute.
(e) The consortium shall operate in accordance with all relevant labor and workforce laws and standards.
(f) (1) On or before January 1, 2027, the Government Operations Agency shall submit, pursuant to Section 9795, a report from the consortium to the Legislature with the framework developed pursuant to subdivision (b) for the creation and operation of CalCompute.
(2) The report required by this subdivision shall include all of the following elements:
(A) A landscape analysis of California’s current public, private, and nonprofit cloud computing platform infrastructure.
(B) An analysis of the cost to the state to build and maintain CalCompute and recommendations for potential funding sources.
(C) Recommendations for the governance structure and ongoing operation of CalCompute.
(D) Recommendations for the parameters for use of CalCompute, including, but not limited to, a process for determining which users and projects will be supported by CalCompute.
(E) An analysis of the state’s technology workforce and recommendations for equitable pathways to strengthen the workforce, including the role of CalCompute.
(F) A detailed description of any proposed partnerships, contracts, or licensing agreements with nongovernmental entities, including, but not limited to, technology-based companies, that demonstrates compliance with the requirements of subdivisions (c) and (d).
(G) Recommendations regarding how the creation and ongoing management of CalCompute can prioritize the use of the current public sector workforce.
(g) The consortium shall, consistent with state constitutional law, consist of 14 members as follows:
(1) Four representatives of the University of California and other public and private academic research institutions and national laboratories appointed by the Secretary of Government Operations.
(2) Three representatives of impacted workforce labor organizations appointed by the Speaker of the Assembly.
(3) Three representatives of stakeholder groups with relevant expertise and experience, including, but not limited to, ethicists, consumer rights advocates, and other public interest advocates appointed by the Senate Rules Committee.
(4) Four experts in technology and artificial intelligence to provide technical assistance appointed by the Secretary of Government Operations.
(h) The members of the consortium shall serve without compensation, but shall be reimbursed for all necessary expenses actually incurred in the performance of their duties.
(i) The consortium shall be dissolved upon submission of the report required by paragraph (1) of subdivision (f) to the Legislature.
(j) If CalCompute is established within the University of California, the University of California may receive private donations for the purposes of implementing CalCompute.
(k) This section shall become operative only upon an appropriation in a budget act, or other measure, for the purposes of this section.
SEC. 4. Chapter 5.1 (commencing with Section 1107) is added to Part 3 of Division 2 of the Labor Code, to read:
CHAPTER 5.1. Whistleblower Protections: Catastrophic Risks in AI Foundation Models
1107. For purposes of this chapter:
(a) (1) “Catastrophic risk” means a foreseeable and material risk that a frontier developer’s development, storage, use, or deployment of a foundation model will materially contribute to the death of, or serious injury to, more than 50 people or more than one billion dollars ($1,000,000,000) in damage to, or loss of, property arising from a single incident involving a foundation model doing any of the following:
(A) Providing expert-level assistance in the creation or release of a chemical, biological, radiological, or nuclear weapon.
(B) Engaging in conduct with no meaningful human oversight, intervention, or supervision that is either a cyberattack or, if committed by a human, would constitute the crime of murder, assault, extortion, or theft, including theft by false pretense.
(C) Evading the control of its frontier developer or user.
(2) “Catastrophic risk” does not include a foreseeable and material risk from any of the following:
(A) Information that a foundation model outputs if the information is otherwise publicly accessible in a substantially similar form from a source other than a foundation model.
(B) Lawful activity of the federal government.
(C) Harm caused by a foundation model in combination with other software where the foundation model did not materially contribute to the harm.
(b) “Covered employee” means an employee responsible for assessing, managing, or addressing risk of critical safety incidents.
(c) “Critical safety incident” means any of the following:
(1) Unauthorized access to, modification of, or exfiltration of the model weights of a foundation model that results in death, bodily injury, or damage to, or loss of, property.
(2) Harm resulting from the materialization of a catastrophic risk.
(3) Loss of control of a foundation model causing death or bodily injury.
(4) A foundation model that uses deceptive techniques against the frontier developer to subvert the controls or monitoring of its frontier developer outside of the context of an evaluation designed to elicit this behavior and in a manner that demonstrates materially increased catastrophic risk.
(d) “Foundation model” has the meaning defined in Section 22757.11 of the Business and Professions Code.
(e) “Frontier developer” has the meaning defined in Section 22757.11 of the Business and Professions Code.
(f) “Large frontier developer” has the meaning defined in Section 22757.11 of the Business and Professions Code.
1107.1. (a) A frontier developer shall not make, adopt, enforce, or enter into a rule, regulation, policy, or contract that prevents a covered employee from disclosing, or retaliates against a covered employee for disclosing, information to the Attorney General, a federal authority, a person with authority over the covered employee, or another covered employee who has authority to investigate, discover, or correct the reported issue, if the covered employee has reasonable cause to believe that the information discloses either of the following:
(1) The frontier developer’s activities pose a specific and substantial danger to the public health or safety resulting from a catastrophic risk.
(2) The frontier developer has violated Chapter 25.1 (commencing with Section 22757.10) of Division 8 of the Business and Professions Code.
(b) A frontier developer shall not enter into a contract that prevents a covered employee from making a disclosure protected under Section 1102.5.
(c) A covered employee may use the hotline described in Section 1102.7 to make reports described in subdivision (a).
(d) A frontier developer shall provide a clear notice to all covered employees of their rights and responsibilities under this section, including by doing either of the following:
(1) At all times posting and displaying within any workplace maintained by the frontier developer a notice to all covered employees of their rights under this section, ensuring that any new covered employee receives equivalent notice, and ensuring that any covered employee who works remotely periodically receives an equivalent notice.
(2) At least once each year, providing written notice to each covered employee of the covered employee’s rights under this section and ensuring that the notice is received and acknowledged by all of those covered employees.
(e) (1) A large frontier developer shall provide a reasonable internal process through which a covered employee may anonymously disclose information to the large frontier developer if the covered employee believes in good faith that the information indicates that the large frontier developer’s activities present a specific and substantial danger to the public health or safety resulting from a catastrophic risk or that the large frontier developer violated Chapter 25.1 (commencing with Section 22757.10) of Division 8 of the Business and Professions Code, including a monthly update to the person who made the disclosure regarding the status of the large frontier developer’s investigation of the disclosure and the actions taken by the large frontier developer in response to the disclosure.
(2) (A) Except as provided in subparagraph (B), the disclosures and responses of the process required by this subdivision shall be shared with officers and directors of the large frontier developer at least once each quarter.
(B) If a covered employee has alleged wrongdoing by an officer or director of the large frontier developer in a disclosure or response, subparagraph (A) shall not apply with respect to that officer or director.
(f) The court is authorized to award reasonable attorney’s fees to a plaintiff who brings a successful action for a violation of this section.
(g) In a civil action brought pursuant to this section, once it has been demonstrated by a preponderance of the evidence that an activity proscribed by this section was a contributing factor in the alleged prohibited action against the covered employee, the frontier developer shall have the burden of proof to demonstrate by clear and convincing evidence that the alleged action would have occurred for legitimate, independent reasons even if the covered employee had not engaged in activities protected by this section.
(h) (1) In a civil action or administrative proceeding brought pursuant to this section, a covered employee may petition the superior court in any county wherein the violation in question is alleged to have occurred, or wherein the person resides or transacts business, for appropriate temporary or preliminary injunctive relief.
(2) Upon the filing of the petition for injunctive relief, the petitioner shall cause notice thereof to be served upon the person, and thereupon the court shall have jurisdiction to grant temporary injunctive relief as the court deems just and proper.
(3) In addition to any harm resulting directly from a violation of this section, the court shall consider the chilling effect on other covered employees asserting their rights under this section in determining whether temporary injunctive relief is just and proper.
(4) Appropriate injunctive relief shall be issued on a showing that reasonable cause exists to believe a violation has occurred.
(5) An order authorizing temporary injunctive relief shall remain in effect until an administrative or judicial determination or citation has been issued, or until the completion of a review pursuant to subdivision (b) of Section 98.74, whichever is longer, or at a certain time set by the court. Thereafter, a preliminary or permanent injunction may be issued if it is shown to be just and proper. Any temporary injunctive relief shall not prohibit a frontier developer from disciplining or terminating a covered employee for conduct that is unrelated to the claim of the retaliation.
(i) Notwithstanding Section 916 of the Code of Civil Procedure, injunctive relief granted pursuant to this section shall not be stayed pending appeal.
(j) (1) This section does not impair or limit the applicability of Section 1102.5, including with respect to the rights of employees who are not covered employees to report violations of this chapter or Chapter 25.1 (commencing with Section 22757.10) of Division 8 of the Business and Professions Code.
(2) The remedies provided by this section are cumulative to each other and the remedies or penalties available under all other laws of this state.
1107.2. The loss of value of equity does not count as damage to or loss of property for the purposes of this chapter.
SEC. 5. (a) The provisions of this act are severable. If any provision of this act or its application is held invalid, that invalidity shall not affect other provisions or applications that can be given effect without the invalid provision or application.
(b) This act shall be liberally construed to effectuate its purposes.
(c) The duties and obligations imposed by this act are cumulative with any other duties or obligations imposed under other law and shall not be construed to relieve any party from any duties or obligations imposed under other law and do not limit any rights or remedies under existing law.
(d) This act shall not apply to the extent that it strictly conflicts with the terms of a contract between a federal government entity and a frontier developer.
(e) This act shall not apply to the extent that it is preempted by federal law.
(f) This act preempts any rule, regulation, code, ordinance, or other law adopted by a city, county, city and county, municipality, or local agency on or after January 1, 2025, specifically related to the regulation of frontier developers with respect to their management of catastrophic risk.
SEC. 6. The Legislature finds and declares that Section 2 of this act, which adds Chapter 25.1 (commencing with Section 22757.10) to Division 8 of the Business and Professions Code, imposes a limitation on the public’s right of access to the meetings of public bodies or the writings of public officials and agencies within the meaning of Section 3 of Article I of the California Constitution. Pursuant to that constitutional provision, the Legislature makes the following findings to demonstrate the interest protected by this limitation and the need for protecting that interest:
Information in critical safety incident reports, assessments of risks from internal use, and reports from covered employees may contain information that could threaten public safety or compromise the response to an incident if disclosed to the public.`
},

// Source: LegiScan, enrolled text, https://legiscan.com/TX/text/HB149/id/3249139. Struck language removed; signature block omitted.
"TX:HB 149": {
digest: { Chamber: "HOUSE", "House vote": "146–3", "Senate vote": "31–0", Effective: "JAN 1, 2026" },
title: "Texas Responsible AI Governance Act",
officialTitle: "An Act relating to regulation of the use of artificial intelligence systems in this state; providing civil penalties.",
gist: "Texas bans a short list of AI uses: manipulating people into self-harm or crime, intentional discrimination, government social scoring, and child sexual content. State agencies must tell people when they're talking to AI. The Attorney General enforces, with a 60-day chance to fix violations first.",
gistDetail: "It applies to anyone doing business in Texas or developing or deploying AI here. Most prohibitions turn on intent: a system built with the intent to discriminate, or the sole intent to infringe constitutional rights. Disparate impact alone does not prove intent. Consumers get no right to sue; complaints go to the Attorney General's online portal, which must be live by September 1, 2026. The Act also creates a 36-month regulatory sandbox run by the Department of Information Resources, a seven-member Texas Artificial Intelligence Council with no rulemaking power, and preempts city and county AI ordinances.",
policies: {
  gov: {
    summary: "Sets the first statewide limits on how Texas agencies use AI: disclose it to the public, no social scoring, no biometric identification without consent, plus AI inventories and a new advisory Council.",
    detail: "Agencies must disclose AI interactions and are barred from social scoring and scraping-based biometric identification. AI use enters existing IT inventories and Sunset reviews. The Texas Artificial Intelligence Council advises the Legislature but cannot adopt binding rules, and agency duties only bind when the Legislature funds them.",
    takeaways: [
      { title: "Agencies must say when you're talking to AI", text: "Disclosure comes before or at the start of the interaction, in plain language, even when it would be obvious.", ids: ["c552.051-b", "c552.051-c", "c552.051-d"] },
      { title: "No government social scoring", text: "Agencies can't use AI to rank people by behavior or characteristics in ways that lead to unfavorable treatment or infringe rights.", ids: ["c552.053"] },
      { title: "No biometric identification without consent", text: "Agencies can't deploy AI to identify people from biometric data or scraped images if doing so would infringe their rights.", ids: ["c552.054-b"] },
      { title: "A seven-member AI Council with no binding power", text: "It studies the regulatory environment, trains agencies, and recommends reforms. It can't adopt rules or override agencies.", ids: ["c554.001-a", "c554.002-a", "c554.103"] },
      { title: "AI shows up in inventories and Sunset reviews", text: "Each agency reports its AI use to the Department of Information Resources, and Sunset reviews assess how agencies use and oversee AI.", ids: ["s6-b-5", "s7-b-2", "c325.011-15"] }
    ]
  },
  transparency: {
    summary: "Requires government agencies and health care providers to disclose AI interactions, and routes all enforcement through the Attorney General with a cure period.",
    detail: "Private businesses outside health care have no general disclosure duty under this Act. The Attorney General can demand documentation about a system's purpose, training data, and safeguards, but must give 60 days to cure before suing. There is no private right of action.",
    takeaways: [
      { title: "Health care providers must disclose AI use", text: "Patients or their representatives are told no later than when the service is first provided, or as soon as possible in an emergency.", ids: ["c552.051-f"] },
      { title: "Complaints go to the Attorney General, not court", text: "The Act creates no private right of action. Consumers file through an online portal the Attorney General must launch by September 1, 2026.", ids: ["c552.101-a", "c552.101-b", "c552.102", "s8"] },
      { title: "60 days to fix a violation before penalties", text: "Curable violations cost $10,000–$12,000; uncurable ones $80,000–$200,000; continuing violations up to $40,000 a day.", ids: ["c552.104-b", "c552.105-a"] },
      { title: "A safe harbor for following NIST", text: "Substantial compliance with the NIST AI Risk Management Framework, or catching a violation through red-teaming or feedback, is a defense.", ids: ["c552.105-e"] }
    ]
  },
  discrimination: {
    summary: "Bans developing or deploying AI with the intent to unlawfully discriminate against a protected class, but disparate impact alone is not proof.",
    detail: "The intent standard makes this narrower than Colorado's duty of reasonable care. Insurers already regulated for unfair discrimination and federally insured banks are carved out. Enforcement is by the Attorney General only.",
    takeaways: [
      { title: "Intent to discriminate is illegal; disparate impact isn't enough", text: "A person can't build or deploy AI intending to discriminate against a protected class, but unequal outcomes by themselves don't show intent.", ids: ["c552.056-b", "c552.056-c"] },
      { title: "Insurers and banks are carved out", text: "Insurance entities under existing unfair-discrimination law and federally insured financial institutions following banking law are deemed compliant.", ids: ["c552.056-d", "c552.056-e"] }
    ]
  },
  chatbots: {
    summary: "Bans AI systems built to encourage self-harm or crime, and AI that simulates sexual conversation while posing as a child.",
    detail: "These are intent-based prohibitions on any AI system, not duties on companion chatbot operators. There is no disclosure, protocol, or minor-specific requirement like California's SB 243.",
    takeaways: [
      { title: "No AI that pushes people toward self-harm or crime", text: "Developing or deploying a system that intentionally aims to incite suicide, self-harm, harm to others, or criminal activity is prohibited.", ids: ["c552.052"] },
      { title: "No sexual chatbots impersonating children", text: "Intentionally distributing an AI that simulates or describes sexual conduct while imitating someone under 18 is prohibited.", ids: ["c552.057-2"] }
    ]
  },
  deepfakes: {
    summary: "Prohibits AI built solely to produce child sexual abuse material or unlawful deepfake videos and images.",
    detail: "It ties to existing Penal Code offenses for child pornography and deepfakes rather than creating new ones. Only systems with that sole intent are covered.",
    takeaways: [
      { title: "No AI built solely to make illegal deepfakes or CSAM", text: "Developing or distributing a system with the sole intent of producing material that violates the Penal Code's child pornography or deepfake sections is prohibited.", ids: ["c552.057-1"] }
    ]
  }
},
plain: {
  "s1": "Short title: the Texas Responsible Artificial Intelligence Governance Act.",
  "s2": "Biometric privacy law updated: a photo being online isn't consent, and training AI on biometric data is exempt unless the system identifies specific people.",
  "s3": "Data processors must help controllers secure personal data handled by AI systems.",
  "c551.002": "Who's covered: anyone doing business in Texas, serving Texans, or building or deploying AI here.",
  "c552.003": "Cities and counties can't pass their own AI rules.",
  "c552.051": "Government agencies, and health care providers, must disclose when someone is interacting with AI.",
  "c552.052": "No AI built to push people toward self-harm, harming others, or crime.",
  "c552.053": "No government social scoring.",
  "c552.054": "No government biometric identification from scraped images without consent.",
  "c552.056": "No AI built with the intent to discriminate. Disparate impact alone doesn't prove intent. Insurers and banks are carved out.",
  "c552.057": "No AI built solely for child sexual content or illegal deepfakes, and no sexual chatbots posing as children.",
  "c552.101": "The Attorney General enforces. No private lawsuits.",
  "c552.104": "60-day notice and chance to cure before any action.",
  "c552.105": "Penalties: $10,000–$12,000 for curable violations, $80,000–$200,000 for uncurable, up to $40,000 a day for continuing. Following NIST's framework is a defense.",
  "c553.051": "A regulatory sandbox: test AI for up to 36 months without licenses, but the core prohibitions still apply.",
  "c554.001": "The Texas Artificial Intelligence Council: seven appointees who study, advise, and train, with no binding authority.",
  "s8": "The Attorney General's complaint portal must be live by September 1, 2026.",
  "s9": "Agencies only have to act on their new duties if the Legislature funds them.",
  "s10": "Effective January 1, 2026."
},
text: `AN ACT relating to regulation of the use of artificial intelligence systems in this state; providing civil penalties.
BE IT ENACTED BY THE LEGISLATURE OF THE STATE OF TEXAS:
SECTION 1. This Act may be cited as the Texas Responsible Artificial Intelligence Governance Act.
SECTION 2. Section 503.001, Business & Commerce Code, is amended by amending Subsections (a) and (e) and adding Subsections (b-1) and (f) to read as follows:
(a) In this section:
(1) "Artificial intelligence system" has the meaning assigned by Section 551.001.
(2) "Biometric identifier" means a retina or iris scan, fingerprint, voiceprint, or record of hand or face geometry.
(b-1) For purposes of Subsection (b), an individual has not been informed of and has not provided consent for the capture or storage of a biometric identifier of an individual for a commercial purpose based solely on the existence of an image or other media containing one or more biometric identifiers of the individual on the Internet or other publicly available source unless the image or other media was made publicly available by the individual to whom the biometric identifiers relate.
(e) This section does not apply to:
(1) voiceprint data retained by a financial institution or an affiliate of a financial institution, as those terms are defined by 15 U.S.C. Section 6809;
(2) the training, processing, or storage of biometric identifiers involved in developing, training, evaluating, disseminating, or otherwise offering artificial intelligence models or systems, unless a system is used or deployed for the purpose of uniquely identifying a specific individual; or
(3) the development or deployment of an artificial intelligence model or system for the purposes of:
(A) preventing, detecting, protecting against, or responding to security incidents, identity theft, fraud, harassment, malicious or deceptive activities, or any other illegal activity;
(B) preserving the integrity or security of a system; or
(C) investigating, reporting, or prosecuting a person responsible for a security incident, identity theft, fraud, harassment, a malicious or deceptive activity, or any other illegal activity.
(f) If a biometric identifier captured for the purpose of training an artificial intelligence system is subsequently used for a commercial purpose not described by Subsection (e), the person possessing the biometric identifier is subject to:
(1) this section's provisions for the possession and destruction of a biometric identifier; and
(2) the penalties associated with a violation of this section.
SECTION 3. Section 541.104(a), Business & Commerce Code, is amended to read as follows:
(a) A processor shall adhere to the instructions of a controller and shall assist the controller in meeting or complying with the controller's duties or requirements under this chapter, including:
(1) assisting the controller in responding to consumer rights requests submitted under Section 541.051 by using appropriate technical and organizational measures, as reasonably practicable, taking into account the nature of processing and the information available to the processor;
(2) assisting the controller with regard to complying with requirements relating to the security of processing personal data, and if applicable, the personal data collected, stored, and processed by an artificial intelligence system, as that term is defined by Section 551.001, and to the notification of a breach of security of the processor's system under Chapter 521, taking into account the nature of processing and the information available to the processor; and
(3) providing necessary information to enable the controller to conduct and document data protection assessments under Section 541.105.
SECTION 4. Title 11, Business & Commerce Code, is amended by adding Subtitle D to read as follows:
SUBTITLE D. ARTIFICIAL INTELLIGENCE PROTECTION
CHAPTER 551. GENERAL PROVISIONS
Sec. 551.001. DEFINITIONS. In this subtitle:
(1) "Artificial intelligence system" means any machine-based system that, for any explicit or implicit objective, infers from the inputs the system receives how to generate outputs, including content, decisions, predictions, or recommendations, that can influence physical or virtual environments.
(2) "Consumer" means an individual who is a resident of this state acting only in an individual or household context. The term does not include an individual acting in a commercial or employment context.
(3) "Council" means the Texas Artificial Intelligence Council established under Chapter 554.
Sec. 551.002. APPLICABILITY OF SUBTITLE. This subtitle applies only to a person who:
(1) promotes, advertises, or conducts business in this state;
(2) produces a product or service used by residents of this state; or
(3) develops or deploys an artificial intelligence system in this state.
Sec. 551.003. CONSTRUCTION AND APPLICATION OF SUBTITLE. This subtitle shall be broadly construed and applied to promote its underlying purposes, which are to:
(1) facilitate and advance the responsible development and use of artificial intelligence systems;
(2) protect individuals and groups of individuals from known and reasonably foreseeable risks associated with artificial intelligence systems;
(3) provide transparency regarding risks in the development, deployment, and use of artificial intelligence systems; and
(4) provide reasonable notice regarding the use or contemplated use of artificial intelligence systems by state agencies.
CHAPTER 552. ARTIFICIAL INTELLIGENCE PROTECTION
SUBCHAPTER A. GENERAL PROVISIONS
Sec. 552.001. DEFINITIONS. In this chapter:
(1) "Deployer" means a person who deploys an artificial intelligence system for use in this state.
(2) "Developer" means a person who develops an artificial intelligence system that is offered, sold, leased, given, or otherwise provided in this state.
(3) "Governmental entity" means any department, commission, board, office, authority, or other administrative unit of this state or of any political subdivision of this state, that exercises governmental functions under the authority of the laws of this state. The term does not include:
(A) a hospital district created under the Health and Safety Code or Article IX, Texas Constitution; or
(B) an institution of higher education, as defined by Section 61.003, Education Code, including any university system or any component institution of the system.
Sec. 552.002. CONSTRUCTION OF CHAPTER. This chapter may not be construed to:
(1) impose a requirement on a person that adversely affects the rights or freedoms of any person, including the right of free speech; or
(2) authorize any department or agency other than the Department of Insurance to regulate or oversee the business of insurance.
Sec. 552.003. LOCAL PREEMPTION. This chapter supersedes and preempts any ordinance, resolution, rule, or other regulation adopted by a political subdivision regarding the use of artificial intelligence systems.
SUBCHAPTER B. DUTIES AND PROHIBITIONS ON USE OF ARTIFICIAL INTELLIGENCE
Sec. 552.051. DISCLOSURE TO CONSUMERS. (a) In this section, "health care services" means services related to human health or to the diagnosis, prevention, or treatment of a human disease or impairment provided by an individual licensed, registered, or certified under applicable state or federal law to provide those services.
(b) A governmental agency that makes available an artificial intelligence system intended to interact with consumers shall disclose to each consumer, before or at the time of interaction, that the consumer is interacting with an artificial intelligence system.
(c) A person is required to make the disclosure under Subsection (b) regardless of whether it would be obvious to a reasonable consumer that the consumer is interacting with an artificial intelligence system.
(d) A disclosure under Subsection (b):
(1) must be clear and conspicuous;
(2) must be written in plain language; and
(3) may not use a dark pattern, as that term is defined by Section 541.001.
(e) A disclosure under Subsection (b) may be provided by using a hyperlink to direct a consumer to a separate Internet web page.
(f) If an artificial intelligence system is used in relation to health care service or treatment, the provider of the service or treatment shall provide the disclosure under Subsection (b) to the recipient of the service or treatment or the recipient's personal representative not later than the date the service or treatment is first provided, except in the case of emergency, in which case the provider shall provide the required disclosure as soon as reasonably possible.
Sec. 552.052. MANIPULATION OF HUMAN BEHAVIOR. A person may not develop or deploy an artificial intelligence system in a manner that intentionally aims to incite or encourage a person to:
(1) commit physical self-harm, including suicide;
(2) harm another person; or
(3) engage in criminal activity.
Sec. 552.053. SOCIAL SCORING. A governmental entity may not use or deploy an artificial intelligence system that evaluates or classifies a natural person or group of natural persons based on social behavior or personal characteristics, whether known, inferred, or predicted, with the intent to calculate or assign a social score or similar categorical estimation or valuation of the person or group of persons that results or may result in:
(1) detrimental or unfavorable treatment of a person or group of persons in a social context unrelated to the context in which the behavior or characteristics were observed or noted;
(2) detrimental or unfavorable treatment of a person or group of persons that is unjustified or disproportionate to the nature or gravity of the observed or noted behavior or characteristics; or
(3) the infringement of any right guaranteed under the United States Constitution, the Texas Constitution, or state or federal law.
Sec. 552.054. CAPTURE OF BIOMETRIC DATA. (a) In this section, "biometric data" means data generated by automatic measurements of an individual's biological characteristics. The term includes a fingerprint, voiceprint, eye retina or iris, or other unique biological pattern or characteristic that is used to identify a specific individual. The term does not include a physical or digital photograph or data generated from a physical or digital photograph, a video or audio recording or data generated from a video or audio recording, or information collected, used, or stored for health care treatment, payment, or operations under the Health Insurance Portability and Accountability Act of 1996 (42 U.S.C. Section 1320d et seq.).
(b) A governmental entity may not develop or deploy an artificial intelligence system for the purpose of uniquely identifying a specific individual using biometric data or the targeted or untargeted gathering of images or other media from the Internet or any other publicly available source without the individual's consent, if the gathering would infringe on any right of the individual under the United States Constitution, the Texas Constitution, or state or federal law.
(c) A violation of Section 503.001 is a violation of this section.
Sec. 552.055. CONSTITUTIONAL PROTECTION. (a) A person may not develop or deploy an artificial intelligence system with the sole intent for the artificial intelligence system to infringe, restrict, or otherwise impair an individual's rights guaranteed under the United States Constitution.
(b) This section is remedial in purpose and may not be construed to create or expand any right guaranteed by the United States Constitution.
Sec. 552.056. UNLAWFUL DISCRIMINATION. (a) In this section:
(1) "Financial institution" has the meaning assigned by Section 201.101, Finance Code.
(2) "Insurance entity" means:
(A) an entity described by Section 82.002(a), Insurance Code;
(B) a fraternal benefit society regulated under Chapter 885, Insurance Code; or
(C) the developer of an artificial intelligence system used by an entity described by Paragraph (A) or (B).
(3) "Protected class" means a group or class of persons with a characteristic, quality, belief, or status protected from discrimination by state or federal civil rights laws, and includes race, color, national origin, sex, age, religion, or disability.
(b) A person may not develop or deploy an artificial intelligence system with the intent to unlawfully discriminate against a protected class in violation of state or federal law.
(c) For purposes of this section, a disparate impact is not sufficient by itself to demonstrate an intent to discriminate.
(d) This section does not apply to an insurance entity for purposes of providing insurance services if the entity is subject to applicable statutes regulating unfair discrimination, unfair methods of competition, or unfair or deceptive acts or practices related to the business of insurance.
(e) A federally insured financial institution is considered to be in compliance with this section if the institution complies with all federal and state banking laws and regulations.
Sec. 552.057. CERTAIN SEXUALLY EXPLICIT CONTENT AND CHILD PORNOGRAPHY. A person may not:
(1) develop or distribute an artificial intelligence system with the sole intent of producing, assisting or aiding in producing, or distributing:
(A) visual material in violation of Section 43.26, Penal Code; or
(B) deep fake videos or images in violation of Section 21.165, Penal Code; or
(2) intentionally develop or distribute an artificial intelligence system that engages in text-based conversations that simulate or describe sexual conduct, as that term is defined by Section 43.25, Penal Code, while impersonating or imitating a child younger than 18 years of age.
SUBCHAPTER C. ENFORCEMENT
Sec. 552.101. ENFORCEMENT AUTHORITY. (a) The attorney general has exclusive authority to enforce this chapter, except to the extent provided by Section 552.106.
(b) This chapter does not provide a basis for, and is not subject to, a private right of action for a violation of this chapter or any other law.
Sec. 552.102. INFORMATION AND COMPLAINTS. The attorney general shall create and maintain an online mechanism on the attorney general's Internet website through which a consumer may submit a complaint under this chapter to the attorney general.
Sec. 552.103. INVESTIGATIVE AUTHORITY. (a) If the attorney general receives a complaint through the online mechanism under Section 552.102 alleging a violation of this chapter, the attorney general may issue a civil investigative demand to determine if a violation has occurred. The attorney general shall issue demands in accordance with and under the procedures established under Section 15.10.
(b) The attorney general may request from the person reported through the online mechanism, pursuant to a civil investigative demand issued under Subsection (a):
(1) a high-level description of the purpose, intended use, deployment context, and associated benefits of the artificial intelligence system with which the person is affiliated;
(2) a description of the type of data used to program or train the artificial intelligence system;
(3) a high-level description of the categories of data processed as inputs for the artificial intelligence system;
(4) a high-level description of the outputs produced by the artificial intelligence system;
(5) any metrics the person uses to evaluate the performance of the artificial intelligence system;
(6) any known limitations of the artificial intelligence system;
(7) a high-level description of the post-deployment monitoring and user safeguards the person uses for the artificial intelligence system, including, if the person is a deployer, the oversight, use, and learning process established by the person to address issues arising from the system's deployment; or
(8) any other relevant documentation reasonably necessary for the attorney general to conduct an investigation under this section.
Sec. 552.104. NOTICE OF VIOLATION; OPPORTUNITY TO CURE. (a) If the attorney general determines that a person has violated or is violating this chapter, the attorney general shall notify the person in writing of the determination, identifying the specific provisions of this chapter the attorney general alleges have been or are being violated.
(b) The attorney general may not bring an action against the person:
(1) before the 60th day after the date the attorney general provides the notice under Subsection (a); or
(2) if, before the 60th day after the date the attorney general provides the notice under Subsection (a), the person:
(A) cures the identified violation; and
(B) provides the attorney general with a written statement that the person has:
(i) cured the alleged violation;
(ii) provided supporting documentation to show the manner in which the person cured the violation; and
(iii) made any necessary changes to internal policies to reasonably prevent further violation of this chapter.
Sec. 552.105. CIVIL PENALTY; INJUNCTION. (a) A person who violates this chapter and does not cure the violation under Section 552.104 is liable to this state for a civil penalty in an amount of:
(1) for each violation the court determines to be curable or a breach of a statement submitted to the attorney general under Section 552.104(b)(2), not less than $10,000 and not more than $12,000;
(2) for each violation the court determines to be uncurable, not less than $80,000 and not more than $200,000; and
(3) for a continued violation, not less than $2,000 and not more than $40,000 for each day the violation continues.
(b) The attorney general may bring an action in the name of this state to:
(1) collect a civil penalty under this section;
(2) seek injunctive relief against further violation of this chapter; and
(3) recover attorney's fees and reasonable court costs or other investigative expenses.
(c) There is a rebuttable presumption that a person used reasonable care as required under this chapter.
(d) A defendant in an action under this section may seek an expedited hearing or other process, including a request for declaratory judgment, if the person believes in good faith that the person has not violated this chapter.
(e) A defendant in an action under this section may not be found liable if:
(1) another person uses the artificial intelligence system affiliated with the defendant in a manner prohibited by this chapter; or
(2) the defendant discovers a violation of this chapter through:
(A) feedback from a developer, deployer, or other person who believes a violation has occurred;
(B) testing, including adversarial testing or red-team testing;
(C) following guidelines set by applicable state agencies; or
(D) if the defendant substantially complies with the most recent version of the "Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile" published by the National Institute of Standards and Technology or another nationally or internationally recognized risk management framework for artificial intelligence systems, an internal review process.
(f) The attorney general may not bring an action to collect a civil penalty under this section against a person for an artificial intelligence system that has not been deployed.
Sec. 552.106. ENFORCEMENT ACTIONS BY STATE AGENCIES. (a) A state agency may impose sanctions against a person licensed, registered, or certified by that agency for a violation of Subchapter B if:
(1) the person has been found in violation of this chapter under Section 552.105; and
(2) the attorney general has recommended additional enforcement by the applicable agency.
(b) Sanctions under this section may include:
(1) suspension, probation, or revocation of a license, registration, certificate, or other authorization to engage in an activity; and
(2) a monetary penalty not to exceed $100,000.
CHAPTER 553. ARTIFICIAL INTELLIGENCE REGULATORY SANDBOX PROGRAM
SUBCHAPTER A. GENERAL PROVISIONS
Sec. 553.001. DEFINITIONS. In this chapter:
(1) "Applicable agency" means a department of this state established by law to regulate certain types of business activity in this state and the people engaging in that business, including the issuance of licenses and registrations, that the department determines would regulate a program participant if the person were not operating under this chapter.
(2) "Department" means the Texas Department of Information Resources.
(3) "Program" means the regulatory sandbox program established under this chapter that allows a person, without being licensed or registered under the laws of this state, to test an artificial intelligence system for a limited time and on a limited basis.
(4) "Program participant" means a person whose application to participate in the program is approved and who may test an artificial intelligence system under this chapter.
SUBCHAPTER B. SANDBOX PROGRAM FRAMEWORK
Sec. 553.051. ESTABLISHMENT OF SANDBOX PROGRAM. (a) The department, in consultation with the council, shall create a regulatory sandbox program that enables a person to obtain legal protection and limited access to the market in this state to test innovative artificial intelligence systems without obtaining a license, registration, or other regulatory authorization.
(b) The program is designed to:
(1) promote the safe and innovative use of artificial intelligence systems across various sectors including healthcare, finance, education, and public services;
(2) encourage responsible deployment of artificial intelligence systems while balancing the need for consumer protection, privacy, and public safety;
(3) provide clear guidelines for a person who develops an artificial intelligence system to test systems while certain laws and regulations related to the testing are waived or suspended; and
(4) allow a person to engage in research, training, testing, or other pre-deployment activities to develop an artificial intelligence system.
(c) The attorney general may not file or pursue charges against a program participant for violation of a law or regulation waived under this chapter that occurs during the testing period.
(d) A state agency may not file or pursue punitive action against a program participant, including the imposition of a fine or the suspension or revocation of a license, registration, or other authorization, for violation of a law or regulation waived under this chapter that occurs during the testing period.
(e) Notwithstanding Subsections (c) and (d), the requirements of Subchapter B, Chapter 552, may not be waived, and the attorney general or a state agency may file or pursue charges or action against a program participant who violates that subchapter.
Sec. 553.052. APPLICATION FOR PROGRAM PARTICIPATION. (a) A person must obtain approval from the department and any applicable agency before testing an artificial intelligence system under the program.
(b) The department by rule shall prescribe the application form. The form must require the applicant to:
(1) provide a detailed description of the artificial intelligence system the applicant desires to test in the program, and its intended use;
(2) include a benefit assessment that addresses potential impacts on consumers, privacy, and public safety;
(3) describe the applicant's plan for mitigating any adverse consequences that may occur during the test; and
(4) provide proof of compliance with any applicable federal artificial intelligence laws and regulations.
Sec. 553.053. DURATION AND SCOPE OF PARTICIPATION. (a) A program participant approved by the department and each applicable agency may test and deploy an artificial intelligence system under the program for a period of not more than 36 months.
(b) The department may extend a test under this chapter if the department finds good cause for the test to continue.
Sec. 553.054. EFFICIENT USE OF RESOURCES. The department shall coordinate the activities under this subchapter and any other law relating to artificial intelligence systems to ensure efficient system implementation and to streamline the use of department resources, including information sharing and personnel.
SUBCHAPTER C. OVERSIGHT AND COMPLIANCE
Sec. 553.101. COORDINATION WITH APPLICABLE AGENCY. (a) The department shall coordinate with all applicable agencies to oversee the operation of a program participant.
(b) The council or an applicable agency may recommend to the department that a program participant be removed from the program if the council or applicable agency finds that the program participant's artificial intelligence system:
(1) poses an undue risk to public safety or welfare;
(2) violates any federal law or regulation; or
(3) violates any state law or regulation not waived under the program.
Sec. 553.102. PERIODIC REPORT BY PROGRAM PARTICIPANT. (a) A program participant shall provide a quarterly report to the department.
(b) The report shall include:
(1) metrics for the artificial intelligence system's performance;
(2) updates on how the artificial intelligence system mitigates any risks associated with its operation; and
(3) feedback from consumers and affected stakeholders that are using an artificial intelligence system tested under this chapter.
(c) The department shall maintain confidentiality regarding the intellectual property, trade secrets, and other sensitive information it obtains through the program.
Sec. 553.103. ANNUAL REPORT BY DEPARTMENT. (a) The department shall submit an annual report to the legislature.
(b) The report shall include:
(1) the number of program participants testing an artificial intelligence system in the program;
(2) the overall performance and impact of artificial intelligence systems tested in the program; and
(3) recommendations on changes to laws or regulations for future legislative consideration.
CHAPTER 554. TEXAS ARTIFICIAL INTELLIGENCE COUNCIL
SUBCHAPTER A. CREATION AND ORGANIZATION OF COUNCIL
Sec. 554.001. CREATION OF COUNCIL. (a) The Texas Artificial Intelligence Council is created to:
(1) ensure artificial intelligence systems in this state are ethical and developed in the public's best interest;
(2) ensure artificial intelligence systems in this state do not harm public safety or undermine individual freedoms by finding issues and making recommendations to the legislature regarding the Penal Code and Chapter 82, Civil Practice and Remedies Code;
(3) identify existing laws and regulations that impede innovation in the development of artificial intelligence systems and recommend appropriate reforms;
(4) analyze opportunities to improve the efficiency and effectiveness of state government operations through the use of artificial intelligence systems;
(5) make recommendations to applicable state agencies regarding the use of artificial intelligence systems to improve the agencies' efficiency and effectiveness;
(6) evaluate potential instances of regulatory capture, including undue influence by technology companies or disproportionate burdens on smaller innovators caused by the use of artificial intelligence systems;
(7) evaluate the influence of technology companies on other companies and determine the existence or use of tools or processes designed to censor competitors or users through the use of artificial intelligence systems;
(8) offer guidance and recommendations to the legislature on the ethical and legal use of artificial intelligence systems;
(9) conduct and publish the results of a study on the current regulatory environment for artificial intelligence systems;
(10) receive reports from the Department of Information Resources regarding the regulatory sandbox program under Chapter 553; and
(11) make recommendations for improvements to the regulatory sandbox program under Chapter 553.
(b) The council is administratively attached to the Department of Information Resources, and the department shall provide administrative support to the council as provided by this section.
(c) The Department of Information Resources and the council shall enter into a memorandum of understanding detailing:
(1) the administrative support the council requires from the department to fulfill the council's purposes;
(2) the reimbursement of administrative expenses to the department; and
(3) any other provisions necessary to ensure the efficient operation of the council.
Sec. 554.002. COUNCIL MEMBERSHIP. (a) The council is composed of seven members as follows:
(1) three members of the public appointed by the governor;
(2) two members of the public appointed by the lieutenant governor; and
(3) two members of the public appointed by the speaker of the house of representatives.
(b) Members of the council serve staggered four-year terms, with the terms of three or four members expiring every two years.
(c) The governor shall appoint a chair from among the members, and the council shall elect a vice chair from its membership.
(d) The council may establish an advisory board composed of individuals from the public who possess expertise directly related to the council's functions, including technical, ethical, regulatory, and other relevant areas.
Sec. 554.003. QUALIFICATIONS. Members of the council must be Texas residents and have knowledge or expertise in one or more of the following areas:
(1) artificial intelligence systems;
(2) data privacy and security;
(3) ethics in technology or law;
(4) public policy and regulation;
(5) risk management related to artificial intelligence systems;
(6) improving the efficiency and effectiveness of governmental operations; or
(7) anticompetitive practices and market fairness.
Sec. 554.004. STAFF AND ADMINISTRATION. The council may hire an executive director and other personnel as necessary to perform its duties.
SUBCHAPTER B. POWERS AND DUTIES OF COUNCIL
Sec. 554.101. ISSUANCE OF REPORTS. (a) The council may issue reports to the legislature regarding the use of artificial intelligence systems in this state.
(b) The council may issue reports on:
(1) the compliance of artificial intelligence systems in this state with the laws of this state;
(2) the ethical implications of deploying artificial intelligence systems in this state;
(3) data privacy and security concerns related to artificial intelligence systems in this state; or
(4) potential liability or legal risks associated with the use of artificial intelligence systems in this state.
Sec. 554.102. TRAINING AND EDUCATIONAL OUTREACH. The council shall conduct training programs for state agencies and local governments on the use of artificial intelligence systems.
Sec. 554.103. LIMITATION OF AUTHORITY. The council may not:
(1) adopt rules or promulgate guidance that is binding for any entity;
(2) interfere with or override the operation of a state agency; or
(3) perform a duty or exercise a power not granted by this chapter.
SECTION 5. Section 325.011, Government Code, is amended to read as follows:
Sec. 325.011. CRITERIA FOR REVIEW. The commission and its staff shall consider the following criteria in determining whether a public need exists for the continuation of a state agency or its advisory committees or for the performance of the functions of the agency or its advisory committees:
(1) the efficiency and effectiveness with which the agency or the advisory committee operates;
(2) (A) an identification of the mission, goals, and objectives intended for the agency or advisory committee and of the problem or need that the agency or advisory committee was intended to address; and
(B) the extent to which the mission, goals, and objectives have been achieved and the problem or need has been addressed;
(3) (A) an identification of any activities of the agency in addition to those granted by statute and of the authority for those activities; and
(B) the extent to which those activities are needed;
(4) an assessment of authority of the agency relating to fees, inspections, enforcement, and penalties;
(5) whether less restrictive or alternative methods of performing any function that the agency performs could adequately protect or provide service to the public;
(6) the extent to which the jurisdiction of the agency and the programs administered by the agency overlap or duplicate those of other agencies, the extent to which the agency coordinates with those agencies, and the extent to which the programs administered by the agency can be consolidated with the programs of other state agencies;
(7) the promptness and effectiveness with which the agency addresses complaints concerning entities or other persons affected by the agency, including an assessment of the agency's administrative hearings process;
(8) an assessment of the agency's rulemaking process and the extent to which the agency has encouraged participation by the public in making its rules and decisions and the extent to which the public participation has resulted in rules that benefit the public;
(9) the extent to which the agency has complied with:
(A) federal and state laws and applicable rules regarding equality of employment opportunity and the rights and privacy of individuals; and
(B) state law and applicable rules of any state agency regarding purchasing guidelines and programs for historically underutilized businesses;
(10) the extent to which the agency issues and enforces rules relating to potential conflicts of interest of its employees;
(11) the extent to which the agency complies with Chapters 551 and 552 and follows records management practices that enable the agency to respond efficiently to requests for public information;
(12) the effect of federal intervention or loss of federal funds if the agency is abolished;
(13) the extent to which the purpose and effectiveness of reporting requirements imposed on the agency justifies the continuation of the requirement;
(14) an assessment of the agency's cybersecurity practices using confidential information available from the Department of Information Resources or any other appropriate state agency; and
(15) an assessment of the agency's use of artificial intelligence systems, as that term is defined by Section 551.001, Business & Commerce Code, in its operations and its oversight of the use of artificial intelligence systems by persons under the agency's jurisdiction, and any related impact on the agency's ability to achieve its mission, goals, and objectives, made using information available from the Department of Information Resources, the attorney general, or any other appropriate state agency.
SECTION 6. Section 2054.068(b), Government Code, is amended to read as follows:
(b) The department shall collect from each state agency information on the status and condition of the agency's information technology infrastructure, including information regarding:
(1) the agency's information security program;
(2) an inventory of the agency's servers, mainframes, cloud services, and other information technology equipment;
(3) identification of vendors that operate and manage the agency's information technology infrastructure;
(4) any additional related information requested by the department; and
(5) an evaluation of the use or considered use of artificial intelligence systems, as defined by Section 551.001, Business & Commerce Code, by each state agency.
SECTION 7. Section 2054.0965(b), Government Code, is amended to read as follows:
(b) Except as otherwise modified by rules adopted by the department, the review must include:
(1) an inventory of the agency's major information systems, as defined by Section 2054.008, and other operational or logistical components related to deployment of information resources as prescribed by the department;
(2) an inventory of the agency's major databases, artificial intelligence systems, as defined by Section 551.001, Business & Commerce Code, and applications;
(3) a description of the agency's existing and planned telecommunications network configuration;
(4) an analysis of how information systems, components, databases, applications, and other information resources have been deployed by the agency in support of:
(A) applicable achievement goals established under Section 2056.006 and the state strategic plan adopted under Section 2056.009;
(B) the state strategic plan for information resources; and
(C) the agency's business objectives, mission, and goals;
(5) agency information necessary to support the state goals for interoperability and reuse; and
(6) confirmation by the agency of compliance with state statutes, rules, and standards relating to information resources.
SECTION 8. Not later than September 1, 2026, the attorney general shall post on the attorney general's Internet website the information and online mechanism required by Section 552.102, Business & Commerce Code, as added by this Act.
SECTION 9. (a) Notwithstanding any other section of this Act, in a state fiscal year, a state agency to which this Act applies is not required to implement a provision found in another section of this Act that is drafted as a mandatory provision imposing a duty on the agency to take an action unless money is specifically appropriated to the agency for that fiscal year to carry out that duty. The agency may implement the provision in that fiscal year to the extent other funding is available to the agency to do so.
(b) If, as authorized by Subsection (a) of this section, the state agency does not implement the mandatory provision in a state fiscal year, the state agency, in its legislative budget request for the next state fiscal biennium, shall certify that fact to the Legislative Budget Board and include a written estimate of the costs of implementing the provision in each year of that next state fiscal biennium.
SECTION 10. This Act takes effect January 1, 2026.`
}
};

// Parse raw bill text into flat lines with structure: kind, depth, label, text, section id.
// Levels: (a) → 1, (1) → 2, (A) → 3. Section headings like "22601." or "SECTION 1." / "SEC. 2." → 0.
// Flatten a bill's policies into a list of takeaways tagged with their policy key.
export function takeawaysOf(src){ return Object.entries(src.policies || {}).flatMap(([k, p]) => (p.takeaways || []).map(t => ({ ...t, k }))); }

const titleCase = s => s ? s.charAt(0) + s.slice(1).toLowerCase() : s;
export function parseBill(raw){
  const out = []; let sec = null; let path = [];
  const LEAD = /^\(([\w-]+)\)\s*/;
  // Track the enclosing (a) → (1) → (A) path so "(2)" after "(b) (1)" resolves to b-2.
  const subId = subs => { const d0 = depthOf(subs[0]); path = path.slice(0, d0 - 1); while(path.length < d0 - 1) path.push(null); subs.forEach(s => path.push(s)); return (sec || "x") + "-" + path.filter(Boolean).join("-"); };
  // (i) is a roman numeral when nested under (A), otherwise the letter after (h).
  const depthOf = l => /^[ivx]+$/.test(l) && path.length >= 3 ? 4 : /^[a-z]$/.test(l) ? 1 : /^\d+$/.test(l) ? 2 : /^[A-Z]$/.test(l) ? 3 : /^[ivx]+$/.test(l) ? 4 : 1;
  for(let line of raw.split("\n")){
    line = line.trim(); if(!line) continue;
    let m;
    if((m = line.match(/^(SECTION|SEC\.)\s+(\d+)\.\s*(.*)$/))){
      sec = "s" + m[2]; out.push({ id: sec, kind: "act", depth: 0, label: "Sec. " + m[2], text: m[3], nav: "Sec. " + m[2], navText: m[3] }); continue; }
    if((m = line.match(/^(CHAPTER|SUBCHAPTER|SUBTITLE)\s+([\w.]+)\.\s*(.*)$/))){
      const kind = m[1].charAt(0) + m[1].slice(1).toLowerCase(), short = m[1] === "CHAPTER" ? "Ch." : m[1] === "SUBCHAPTER" ? "Subch." : "Subtitle";
      out.push({ id: m[1].toLowerCase() + m[2] + "-" + out.length, kind: "chapter", depth: 0, label: kind + " " + m[2], text: titleCase(m[3]), nav: short + " " + m[2], navText: titleCase(m[3]) }); continue; }
    // Code sections: California "22757.12. (a) …", Texas "Sec. 552.051.  HEADING. (a) …". Dotted numbers stay in the id (c22757.12-a-1).
    if((m = line.match(/^(?:Sec\.\s+)?(\d{3,6}(?:\.\d+)?)\.\s*(.*)$/))){
      sec = "c" + m[1]; path = []; let rest = m[2]; const subs = []; let head = "";
      const hm = rest.match(/^([A-Z][A-Z0-9 ,;:&'’()-]*?\.)\s*(.*)$/);
      if(hm && !/[a-z]/.test(hm[1])){ head = titleCase(hm[1]); rest = hm[2]; }
      while((rest.match(LEAD))){ const s = rest.match(LEAD); subs.push(s[1]); rest = rest.slice(s[0].length); }
      const first = subs.length ? subs.map(s => `(${s})`).join(" ") : "";
      const secText = head || (subs.length ? "" : rest);
      out.push({ id: sec, kind: "section", depth: 0, label: "§ " + m[1], text: secText, nav: "§ " + m[1], navText: secText });
      if(subs.length) out.push({ id: subId(subs), kind: "sub", depth: depthOf(subs[subs.length - 1]), label: first, text: rest });
      else if(head && rest) out.push({ id: sec + "-p", kind: "prose", depth: 0, label: "", text: rest });
      continue; }
    if(line.match(LEAD)){
      let rest = line; const subs = [];
      while(rest.match(LEAD)){ const s = rest.match(LEAD); subs.push(s[1]); rest = rest.slice(s[0].length); }
      out.push({ id: subId(subs), kind: "sub", depth: depthOf(subs[0]), label: subs.map(s => `(${s})`).join(" "), text: rest }); continue; }
    out.push({ id: "p" + out.length, kind: "prose", depth: 0, label: "", text: line });
  }
  // Prose sections (22604, 22606) get the first sentence as nav text
  for(const l of out) if(l.kind === "section" && !l.navText){ const nxt = out[out.indexOf(l) + 1]; l.navText = nxt && nxt.kind === "sub" ? nxt.text : ""; }
  return out;
}
