// Lateral ankle outlines for AnatomyView's posterior malleolus inset.
// Adapted from "Ankle.svg" (Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Ankle.svg),
// an SVG version by Jak of a U.S. federal government drawing; public domain (PD-USGov).
// Changes: only the tibia, fibula and talus outlines kept; ligaments, tendon, foot bones and labels
// removed; coordinates rounded to 1 decimal. The distal tibial articular surface with the posterior
// lip, the talar dome and the posterior talus are hidden under ligaments and the fibula in the
// original and are completed here as simple curves. Source units, cropped by the viewBox.

// Anterior border, distal articular surface and posterior border, as one open stroke.
export const LAT_TIBIA =
  'M203.5,60 C203.8,64.1 204.2,91.5 209,116.6 C210,122.2 213.4,126.4 214.5,130.1 C216.1,136.2 213.7,147.2 212.1,150.8 C207.9,160.5 210.1,173.5 196.2,176.6 C188,173.8 177,171.8 163,172.4 C151,173 141,179 132.5,186.5 C127.5,175 126.6,160 128.3,149.3 C132.5,127.1 130.8,102.8 131.1,80.1 C131.9,74.4 131.8,68.6 131.8,62.8';

// Head, neck, dome and the subtalar border.
export const LAT_TALUS =
  'M235.3,208.3 C231.2,197.2 216.1,201.3 212,190.6 C209.6,184.4 208.2,173.9 198,176.3 C191.3,177 173.2,182.4 170.1,180.5 C164,178 158,176 151,177.5 C144,179 139,184 137,190 C135.2,196 135.6,201 136.6,205 C138,214 142,226 147.8,232.3 C163.5,237.8 169.1,261.7 188.3,257.3 C196.3,258.3 204.6,256.7 212.3,259.3 C212.8,239.4 236.5,229 235.3,208.3 Z';

// Posterior border and the lateral malleolus tip; it overlies the tibia, so it is drawn faint.
export const LAT_FIBULA =
  'M131.8,62.8 C131.8,68.6 131.9,74.4 131.1,80.1 C124,103.2 119.4,127.8 112.3,151.3 C109.9,160.7 110.2,176.8 111.6,180.8 C113.1,184.9 116,193.2 125,195.2 M119.2,192.3 C109.5,191.9 110.7,199.1 109.1,205.9 C108.2,210 105.5,212.4 100.1,216.1 C99.5,219 99,222.8 102.1,224.5 C103,224.9 104.4,224.9 105.3,225.3 M105.3,225.7 C118.6,228.2 117.6,225.2 131.9,228.2 M134.9,201.3 C133.7,201.3 124.8,199.8 124.3,187.8';

// Posterior lip of the distal tibia (the posterior malleolus): the lower posterior border and the
// back of the articular surface, a slice of LAT_TIBIA. Its extent is schematic, not a fragment.
export const LAT_POSTERIOR_LIP =
  'M151,173.4 C143,175.5 137,180 132.5,186.5 C127.5,175 126.6,160 128.3,149.3';
