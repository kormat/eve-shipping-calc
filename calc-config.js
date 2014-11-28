var ESCconfig = {
  meta: {
    title: "ACME",
    header: "ACME Shipping Company",
    shorturl: "http://tinyurl.com/eveShipCalc",
    docs: "http://lmgtfy.com/?q=ACME+docs",
  },
  rules: {
    maxVolume: 320,
    egVolume: 25,
    maxValue: 1000,
    egValue: 95,
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
  },
  routeStations: {
    "unset": { // Do not change
      stns: [
        { id: "none", },
      ], 
    },
    "highway": {
      stns: [
        { id: 60003760, }, // Jita
        { id: 60008494, }, // Amarr
      ],
    },
    "lesserHubs": {
      stns: [
        { id: 60008494, }, // Amarr
        { id: 60005686, }, // Hek
        { id: 60004588, }, // Rens
      ],
    },
  },
}
