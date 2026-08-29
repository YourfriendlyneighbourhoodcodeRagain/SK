import fs from 'node:fs/promises';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const root = 'C:/Users/adity/OneDrive/Desktop/ENDSEM/JAVA/SK';
const source = `${root}/.ppt-build/source-template.pptx`;
const finalPath = `${root}/SurakshaKhadya_SIH2026_Idea.pptx`;
const qaDir = `${root}/.ppt-build/final-render`;
const deck = await PresentationFile.importPptx(await FileBlob.load(source));

const replace = (id, text) => { deck.resolve(id).text = text; };

replace('sh/7qp4be9c', 'SURAKSHAKHADYA');
replace('sh/wn6dc7eh', [
  'Problem Statement ID – To be filled on portal',
  'Problem Statement Title – Farm-to-Fork Food Safety Traceability',
  'Theme – Agriculture & Food Safety',
  'PS Category – Software',
  'Team ID – To be filled on portal',
  'Team Name – SurakshaKhadya',
].join('\n'));

replace('sh/dkvmpszm', 'IDEA TITLE');
replace('sh/qx4nud0b', [
  'SurakshaKhadya — trusted food traceability from farm to fork',
  '',
  '• Registers every harvest as a unique batch with location, date, crop and quantity',
  '• Creates a public QR trace link for shoppers to scan at the point of purchase',
  '• Records aggregation, logistics and retail handoffs in an ordered tamper-evident ledger',
  '• Shows pesticide-residue lab status, certificates and recall flags before consumption',
  '• Gives farmers, aggregators, distributors, retailers and regulators role-specific workflows',
].join('\n'));
replace('sh/ove9o7yd', 'SurakshaKhadya');

replace('sh/j6dgf6tk', 'TECHNICAL APPROACH');
replace('sh/1k3214v2', [
  'Next.js + TypeScript web application with Supabase authentication and PostgreSQL.',
  '',
  'FLOW: Farmer creates batch → QR trace link → Aggregator receives / tests → Distributor handoff → Retailer updates → Consumer scans → Regulator audits.',
  '',
  'Each handoff stores actor, stage, location, notes, time, previous hash and SHA-256 hash. The app verifies the complete ledger chain; Polygon anchoring is kept as an optional future integration point.',
].join('\n'));
replace('sh/m1c3mlsn', 'SurakshaKhadya');

replace('sh/ud8fyt4z', 'FEASIBILITY AND VIABILITY');
replace('sh/sjad83id', [
  '• Working role-based dashboards already cover farmer, aggregator, distributor, retailer and regulator journeys.',
  '• QR lookup and scanner provide a simple consumer entry point; no app installation is required.',
  '• Supabase provides deployable authentication, database and row-level access control foundations.',
  '• Lab results and recall status are explicit safety signals, not hidden inside supply-chain records.',
  '• Risks: incomplete field data, low onboarding and connectivity. Mitigation: short forms, mandatory stage checks and QR-first public access.',
].join('\n'));
replace('sh/i94r6xgz', 'SurakshaKhadya');

replace('sh/y1g7ylcj', 'IMPACT AND BENEFITS');
replace('sh/g7alsnu1', [
  'Consumers — scan once to see source, journey, safety status and recalls.',
  'Farmers — receive verifiable identity for responsible produce and transparent batch history.',
  'Supply chain — improve accountability at each custody transfer and simplify issue tracing.',
  'Regulators — monitor lab failures, recalls and ledger integrity from one compliance dashboard.',
  'Outcome — safer purchase decisions, faster response to unsafe batches and greater trust in perishables.',
].join('\n'));
replace('sh/ahkvi1cb', 'SurakshaKhadya');

replace('sh/1kj2p0ve', 'RESEARCH AND REFERENCES');
replace('sh/vq5cve1s', [
  'Implemented project evidence:',
  '• Role-based Next.js application with Supabase data model for batches, handoffs and lab tests',
  '• SHA-256 canonical handoff payload and ledger-chain verification in src/lib/ledger-core.ts',
  '• Public QR trace route and dashboard workflows in the source repository',
  '',
  'Supporting standards / reference areas:',
  '• Food traceability practices • pesticide residue testing • recall management',
].join('\n'));
replace('sh/pc76hkr2', 'SurakshaKhadya');

// The supplied template specifies a six-slide maximum; remove its instruction slide.
deck.slides.getItem(6).delete();

for (let i = 0; i < deck.slides.items.length; i += 1) {
  const slide = deck.slides.getItem(i);
  const notes = slide.notes;
  if (notes) notes.setText('[Sources]\nProject source code: SurakshaKhadya repository.\n[/Sources]');
}

await fs.mkdir(qaDir, { recursive: true });
for (let i = 0; i < deck.slides.items.length; i += 1) {
  const png = await deck.export({ slide: deck.slides.getItem(i), format: 'png', scale: 1 });
  await fs.writeFile(`${qaDir}/slide-${i + 1}.png`, new Uint8Array(await png.arrayBuffer()));
}
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(finalPath);
console.log(finalPath);
