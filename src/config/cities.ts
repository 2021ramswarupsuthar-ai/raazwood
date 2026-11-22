// South India SEO landing pages. IMPORTANT: before publishing, enrich each city with real local information
// (areas you deliver to, typical delivery experience, customer reviews from that city). Thin, copy-paste city
// pages can hurt SEO. Pages with empty `notes` still render but add only the shared helpful content.
export type City = { slug: string; name: string; stateCode: string; stateName: string; notes?: string };

export const CITIES: City[] = [
  { slug: 'hyderabad', name: 'Hyderabad', stateCode: 'TS', stateName: 'Telangana' },
  { slug: 'bengaluru', name: 'Bengaluru', stateCode: 'KA', stateName: 'Karnataka' },
  { slug: 'chennai', name: 'Chennai', stateCode: 'TN', stateName: 'Tamil Nadu' },
  { slug: 'kochi', name: 'Kochi', stateCode: 'KL', stateName: 'Kerala' },
  { slug: 'coimbatore', name: 'Coimbatore', stateCode: 'TN', stateName: 'Tamil Nadu' },
  { slug: 'visakhapatnam', name: 'Visakhapatnam', stateCode: 'AP', stateName: 'Andhra Pradesh' },
  { slug: 'vijayawada', name: 'Vijayawada', stateCode: 'AP', stateName: 'Andhra Pradesh' },
  { slug: 'mysuru', name: 'Mysuru', stateCode: 'KA', stateName: 'Karnataka' },
  { slug: 'madurai', name: 'Madurai', stateCode: 'TN', stateName: 'Tamil Nadu' },
  { slug: 'thiruvananthapuram', name: 'Thiruvananthapuram', stateCode: 'KL', stateName: 'Kerala' },
];
