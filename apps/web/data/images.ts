/**
 * Central image registry.
 * `supplied` = photographs provided by LUXICHIC.
 * `supplementary` = generated stand-ins — replace with real LUXICHIC photos when available.
 */
const supplied = {
  heroModel: '/images/IMG_5963.jpg',
  nails: '/images/IMG_0583.jpg',
  braids: '/images/IMG_6630.jpg',
  bodyWaveWig: '/images/IMG_5595.jpg',
  curlyWig: '/images/IMG_0601.jpg',
  nailLamp: '/images/2C7FFE57-8665-4ED2-B208-1A60A1A63FA6.jpg',
  hoodDryer: '/images/173750BC-6A14-4480-AFA7-BB6F34972FDE.jpg',
  ledLamp: '/images/E52EFBB8-DF3D-41F3-AB3A-98EB7CC56BB3.jpg',
  hotComb: '/images/F5DADA41-BA4D-458B-BB66-F595D6CC8BAB.jpg',
};

const supplementary = {
  facial: '/images/3a869bc1-c3ab-4d5c-9261-ec9ef6fb743d.jpg',
  lashes: '/images/2f8cdeea-d3b1-4b07-bd6f-45f86a15f53a.jpg',
  barbing: '/images/47faf034-028d-41b0-841b-ad19161c5923.jpg',
  pedicure: '/images/55eaee2a-8038-4d6c-9e92-e90c0f1d39cf.jpg',
  salonInterior: '/images/8e18a6df-0563-4c88-87e1-77919bc2be1d.jpg',
  canvasHead: '/images/6fcad1e4-e916-4a55-87e8-cb1c7fca7759.jpg',
  braidingHair: '/images/1c47e562-5253-430e-bd43-7c29edb53e9e.jpg',
  haircare: '/images/e1f02f90-f557-4bdf-9717-59a7bf0a669e.jpg',
  clippers: '/images/f15dc917-4b37-40df-aba4-21edb63a4610.jpg',
  stylingTools: '/images/b4fe1fc4-bd3e-4f8f-94fe-b34c76bb1897.jpg',
  boneStraight: '/images/c9e10304-9ce3-41b7-a8ee-de96a67ffde2.jpg',
  deepWave: '/images/cca2988f-a237-4db7-ad96-f86449c4889a.jpg',
  bundles: '/images/9e0f1130-8273-4ef9-aa9a-7a0945eaf8b9.jpg',
  wigAccessories: '/images/df9f6e86-c596-4606-882b-4d1804211069.jpg',
  kinkyStraight: '/images/a5113c32-c0b2-45fb-a98a-70ef7eb7983a.jpg',
};

export const images = { ...supplied, ...supplementary };

export const logos = {
  main: '/images/92135B3F-01AA-4C07-8CAB-2C347F381A4D.png',
  hairs: '/images/B60DD6AA-B29B-460B-A8E7-E27DB940BA30.png',
  salon: '/images/5a763630-1a5f-4aa7-81c1-dfb6361af358.jpg',
  tools: '/images/723586224_18106312039985822_8694572827319320851_n.jpg',
};
