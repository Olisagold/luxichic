/**
 * Central image registry.
 * `supplied` = photographs provided by LUXICHIC.
 * `supplementary` = generated stand-ins — replace with real LUXICHIC photos when available.
 */
const supplied = {
  heroModel: "/IMG_5963.jpg",
  nails: "/IMG_0583.jpg",
  braids: "/IMG_6630.jpg",
  bodyWaveWig: "/IMG_5595.jpg",
  curlyWig: "/IMG_0601.png",
  nailLamp: "/2C7FFE57-8665-4ED2-B208-1A60A1A63FA6.png",
  hoodDryer: "/173750BC-6A14-4480-AFA7-BB6F34972FDE.png",
  ledLamp: "/E52EFBB8-DF3D-41F3-AB3A-98EB7CC56BB3.png",
  hotComb: "/F5DADA41-BA4D-458B-BB66-F595D6CC8BAB.png"
};

const supplementary = {
  facial: "/3a869bc1-c3ab-4d5c-9261-ec9ef6fb743d.jpg",
  lashes: "/2f8cdeea-d3b1-4b07-bd6f-45f86a15f53a.jpg",
  barbing: "/47faf034-028d-41b0-841b-ad19161c5923.jpg",
  pedicure: "/55eaee2a-8038-4d6c-9e92-e90c0f1d39cf.jpg",
  salonInterior: "/8e18a6df-0563-4c88-87e1-77919bc2be1d.jpg",
  canvasHead: "/6fcad1e4-e916-4a55-87e8-cb1c7fca7759.jpg",
  braidingHair: "/1c47e562-5253-430e-bd43-7c29edb53e9e.jpg",
  haircare: "/e1f02f90-f557-4bdf-9717-59a7bf0a669e.jpg",
  clippers: "/f15dc917-4b37-40df-aba4-21edb63a4610.jpg",
  stylingTools: "/b4fe1fc4-bd3e-4f8f-94fe-b34c76bb1897.jpg",
  boneStraight: "/c9e10304-9ce3-41b7-a8ee-de96a67ffde2.jpg",
  deepWave: "/cca2988f-a237-4db7-ad96-f86449c4889a.jpg",
  bundles: "/9e0f1130-8273-4ef9-aa9a-7a0945eaf8b9.jpg",
  wigAccessories: "/df9f6e86-c596-4606-882b-4d1804211069.jpg",
  kinkyStraight: "/a5113c32-c0b2-45fb-a98a-70ef7eb7983a.jpg"
};

export const images = { ...supplied, ...supplementary };

export const logos = {
  main: "/92135B3F-01AA-4C07-8CAB-2C347F381A4D.png",
  hairs: "/B60DD6AA-B29B-460B-A8E7-E27DB940BA30.png",
  salon: "/5a763630-1a5f-4aa7-81c1-dfb6361af358.jpg",
  tools: "/723586224_18106312039985822_8694572827319320851_n.jpg"
};