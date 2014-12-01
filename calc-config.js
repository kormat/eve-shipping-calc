var ESCconfig = {
  meta: {
    title: "ACME",
    header: "ACME Shipping Company",
    shorturl: "http://tinyurl.com/eveShipCalc",
    docs: "http://lmgtfy.com/?q=ACME+docs",
  },
  rules: {
    maxVolume: 320,
    egVolume: "25 (low/nullsec only)",
    maxValue: 1000,
    egValue: "95 (highsec only)",
    containersAllowed: true,
    containerSurcharge: 5,
    credit: 10,
    egCredit: 5,
    creditText: "per month",
  },
  routes: [
    { name:"unset", text:"Pick a route..." }, // Do Not Remove
    { name:"highway", text:"Market Highway" }, // Jita, Amarr
    { name:"lesserHubs", text:"Lesser hubs" }, // Amarr, Rens, Hek
    { name:"suicide", text:"Suicide route" }, // Jita, Amamake, Poitot
  ],
  stations: {
    none: { // Do Not Remove
      id: "none",
      name: "",
    },
    unset: { // Do Not Remove
      id: "unset",
      name: "Pick a station...",
    },
    60008494: {
      id: 60008494,
      name: 'Amarr',
      full: 'Amarr VIII (Oris) - Emperor Family Academy',
      url: 'http://evemaps.dotlan.net/station/Amarr_VIII_(Oris)_-_Emperor_Family_Academy',
      sec: "high",
    },
    60003760: {
      id: 60003760,
      name: 'Jita',
      full: 'Jita IV - Moon 4 - Caldari Navy Assembly Plant',
      url: 'http://evemaps.dotlan.net/station/Jita_IV_-_Moon_4_-_Caldari_Navy_Assembly_Plant',
      sec: "high",
    },
    60004588: {
      id: 60004588,
      name: 'Rens',
      full: 'Rens VI - Moon 8 - Brutor tribe Treasury',
      url: 'http://evemaps.dotlan.net/station/Rens_VI_-_Moon_8_-_Brutor_tribe_Treasury',
      sec: "high",
    },
    60005686: {
      id: 60005686,
      name: 'Hek',
      full: 'Hek VIII - Moon 12 - Boundless Creation Factory',
      url: 'http://evemaps.dotlan.net/station/Hek_VIII_-_Moon_12_-_Boundless_Creation_Factory',
      sec: "high",
    },
    60007339: {
      id: 60007339,
      name: 'Amamake',
      full: 'Amamake II - Moon 1 - Joint Harvesting Food Packaging',
      url: 'http://evemaps.dotlan.net/station/Amamake_II_-_Moon_1_-_Joint_Harvesting_Food_Packaging',
      sec: "low",
    },
    60013465: {
      id: 60013465,
      name: 'Poitot',
      full: 'Poitot V - Moon 14 - Intaki Syndicate Bureau',
      url: 'http://evemaps.dotlan.net/station/Poitot_V_-_Moon_14_-_Intaki_Syndicate_Bureau',
      sec: "null",
    },
  },
  routesMeta: {
    "unset": { // Do not change
      stns: [], 
    },
    "highway": {
      valUnit: 100, // prices are per 100Mil ISK value
      // Higher costs because of going through Niarja.
      stns: [
        { // Jita
          id: 60003760, 
          valCost: 3, // 3Mil ISK charge per 100M ISK value
        },
        { // Amarr
          id: 60008494,
          valCost: 3, // 3MIl ISK charge per 100M ISK value
        },
      ],
    },
    "lesserHubs": {
      valUnit: 100, // prices are per 100Mil ISK value
      stns: [
        { // Amarr
          id: 60008494,
          valCost: 2.1, // 2.1M charge per 100M ISK value
        },
        { // Rens
          id: 60004588,
          valCostPrev: 2.1, // 2.1M charge per 100M ISK value
          valCostNext: 0.7, // 0.7M charge per 100M ISK value
        },
        { // Hek
          id: 60005686,
          valCost: 0.7, // 0.7M charge per 100M ISK value
        },
      ],
    },
    "suicide": {
      volUnit: 10, // prices are per 10k m^3 ISK volume
      stns: [
        { // Rens
          id: 60004588,
          volCost: 1.6, // 1.6Mil per 10k m^3 volume
        },
        { // Amamake
          id: 60007339,
          volCostPrev: 1.6, // 1.6Mil per 10k m^3 volume
          volCostNext: 11.2, // 11.2Mil per 10k m^3 volume
        },
        { // Poitot
          id: 60013465,
          volCost: 11.2, // 11.2Mil per 10k m^3 volume
        }, 
      ],
    },
  },
}
