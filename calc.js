var eveShippingCalc = angular.module('eveShippingCalc',[]);

var tradeHubs = ["Amarr"];

eveShippingCalc.controller("CalcCtrl", ['$scope', '$window', '$location', function($scope, $window, $location) {
  $scope.location = $location
  $scope.cfg = $window.ESCconfig;

  $scope.init = function() {
    //Useful aliases:
    $scope.routes = $scope.cfg.routes;
    $scope.stations = $scope.cfg.stations;
    $scope.routeStations = $scope.cfg.routeStations;
    $scope.noneStation = $scope.stations["none"];
    $scope.unsetStation = $scope.stations["unset"];

    //Initialise routes/stations:
    $scope.formRoute = $scope.routes[0];
    $scope.pickupStations = [$scope.noneStation];
    $scope.destStations = [$scope.noneStation];
    $scope.formPickup = $scope.pickupStations[0];
    $scope.formDest = $scope.destStations[0];

    $scope.formVol = "";
    $scope.formVal = "";
    $scope.formCredit = "";
    $scope.errors = [];
    $scope.status = "Initial";
    $scope.totalCost = undefined;
    $scope.desc = "";
    $scope.inEve = typeof CCPEVE === "object";

    var url = $scope.location.absUrl();
    var trustUrl = url.substring(0, url.lastIndexOf('/')) + "/*";

    if($scope.inEve) {
      console.log("requesting trust for " + trustUrl);
      var ret = CCPEVE.requestTrust(trustUrl);
    };

  };

  //******************************************************
  // Watches - react to model changes
  //******************************************************

  $scope.$watch('formRoute.name', function(newVal, oldVal) {
    console.log("formRoute changed from "+oldVal+" to "+newVal);
    $scope.pickupStations = $scope.filterStations(null);
    $scope.updateStations();
  });

  $scope.$watch('formPickup.id', function(newVal, oldVal) {
    $scope.logStationChange("Pickup", newVal, oldVal);
    $scope.updateStations();

    // If the current dest value is already a valid station, then don't change it.
    if (!$scope.findStation($scope.formDest.id, $scope.destStations)) {
      $scope.formDest = $scope.destStations[0];
    };
    // If there's only one station to choose (not counting the "unset"
    // placeholder), just set destination directly to that
    if ($scope.destStations.length === 2) {
      $scope.formDest = $scope.destStations[1];
    };
  });

  $scope.$watch('formDest.id', function(newVal, oldVal) {
    $scope.logStationChange("Destination", newVal, oldVal);
  });

  $scope.$watch('[calcForm.vol_input.$error, calcForm.val_input.$error, calcForm.credit_input.$error]', function(newVal, oldVal) {
    //console.log("Inputs changed validity:" + JSON.stringify(newVal))
    $scope.errors = [];
    var inputNames = ["Volume", "Value", "Credit"]
    for (var i = 0; i< newVal.length; i++) {
      var inputError = newVal[i];
      var inputName = inputNames[i];
      if (inputError['number']) {
        $scope.errors.push(inputName+": not a valid number");
      } else if (inputError['min']) {
        $scope.errors.push(inputName+": too small");
      } else if (inputError['max']) {
        $scope.errors.push(inputName+": too large");
      }
    };
  }, true);

  $scope.logStationChange = function(name, newVal, oldVal) {
    console.log(name+" changed from "
      +oldVal
      +"("
      +($scope.stations[oldVal].name || "none")
      +") to "
      +newVal
      +"("
      +($scope.stations[newVal].name || "none")
      +")");
  };


  $scope.updateStations = function() {
    if (!$scope.findStation($scope.formPickup.id, $scope.pickupStations)) {
      // Only change the current pickup station if it isn't valid for the current route
      $scope.formPickup = $scope.pickupStations[0];
    };
    // Recalculate the valid destination stations
    $scope.destStations = $scope.filterStations($scope.formPickup);
    if (!$scope.findStation($scope.formDest.id, $scope.destStations)) {
      // Only change the current pickup station if it isn't valid for the current route
      $scope.formDest = $scope.destStations[0];
    };
  };

  $scope.routeType = function(pickup, dest) {
    if(pickup == "" || dest == "")
      return "incomplete";
    if(pickup.sec == "high" && dest.sec == "high")
      return "high";
    if(pickup.sec == "null" && dest.sec == "null")
      return "null";
    return "highnull";
  }

  $scope.updateCosts = function() {
    $scope.status = "updateCosts()";
    $scope.calcHighsecCost($scope.form_route, $scope.form_pickup, $scope.form_dest);
    $scope.calcNullsecCost($scope.form_route, $scope.form_pickup, $scope.form_dest);
    $scope.calcContainerCost();
    $scope.calcTotalCost($scope.form_pickup, $scope.form_dest);
    $scope.calcDescription();
  }

  $scope.calcHighsecCost = function(route, pickup, dest) {
    $scope.status = "calcHighsecCost()";
    if($scope.routeType(pickup, dest) != "incomplete") {
      if((tradeHubs.indexOf(pickup.name) > -1) ||
          (tradeHubs.indexOf(dest.name) > -1)) {
        $scope.highsecCost = Math.ceil($scope.form_val / 100);
        $scope.highsecRate = "1M per 100M ISK";
        return;
      }
    }
    $scope.highsecCost = 0;
    $scope.highsecRate = "";
  };

  $scope.calcNullsecCost = function(route, pickup, dest) {
    $scope.status = "calcNullsecCost()";
    switch($scope.routeType(pickup, dest)) {
      case "incomplete":
      case "high":
        $scope.nullsecCost = 0;
        $scope.nullsecRate = "";
        return;
    }

    if(route == "catch") {
      $scope.status = "calcNullsecCost() catch";
      if(pickup.sec == "high") {
        $scope.status = "calcNullsecCost() inbound to 4-07";
        $scope.nullsecCost = Math.ceil($scope.form_vol / 10) * 1.85;
        $scope.nullsecRate = "1.85M per 10k m^3";
      } else if (dest.sec == "high") {
        $scope.status = "calcNullsecCost() outbound from 4-07";
        $scope.nullsecCost = Math.ceil($scope.form_vol / 10) * 0.9;
        $scope.nullsecRate = "0.9M per 10k m^3";
      } else {
        $scope.nullsecCost = 1;
        $scope.nullsecRate = [
          "Error: unknown source/dest pair: ",
          $scope.form_pickup.name,
          $scope.form_dest.name].join(",");
      }
    }
  };

  $scope.calcContainerCost = function() {
    $scope.status = "calcContainerCost()";
    if($scope.form_container == true)
      $scope.containerCost = 5;
    else
      $scope.containerCost = 0;
  };

  $scope.calcTotalCost = function(pickup, dest) {
    $scope.status = "calcTotalCost()"
    if($scope.routeType(pickup, dest) != "incomplete")
      $scope.totalCost = $scope.highsecCost + $scope.nullsecCost + $scope.containerCost - $scope.creditDiscount;
    else
      $scope.totalCost = "";
  };

  $scope.calcDescription = function() {
    $scope.status = "calcDescription()";
    var desc = []
    if($scope.form_val)
      desc.push($scope.form_val+"M value");
    if($scope.creditDiscount)
      desc.push($scope.creditDiscount+"M credit");
    if($scope.form_container)
      desc.push("container");
    $scope.desc = desc.join(", ");
  };

  $scope.findStation = function(id, stations) {
    //console.log("findStation: id:"+id);
    for(var i in stations) {
      var stn = stations[i];
      if(stn.id === id)
        return stn;
    };
    return null;
  };

/*
  $scope.stations = [
    {
      id: 60008494,
      name: 'Amarr',
      full: 'Amarr VIII (Oris) - Emperor Family Academy',
      url: 'http://evemaps.dotlan.net/station/Amarr_VIII_(Oris)_-_Emperor_Family_Academy',
      route: "catch",
      sec: "high",
    },
    {
      id: 60003616,
      name: 'Dabrid',
      full: 'Dabrid V - Moon 1 - Caldari Business Tribunal Accounting',
      url: 'http://evemaps.dotlan.net/station/Dabrid_V_-_Moon_1_-_Caldari_Business_Tribunal_Accounting',
      route: "catch",
      sec: "high",
    },
    {
      id: 61000744,
      name: '4-07MU',
      full: '4-07MU V - The Thalamus',
      url: 'http://evemaps.dotlan.net/outpost/4-07MU',
      route: "catch",
      sec: "null",
    },
    ];
  */

  $scope.filterStations = function(skip) {
    var stns = [];
    var routeStns = $scope.routeStations[$scope.formRoute.name].stns;

    for(var i in routeStns) {
      var routeStn = routeStns[i];
      var stn = $scope.stations[routeStn.id];
      if (skip !== null && skip.id !== "unset" && stn.id === skip.id) {
        continue;
      }
      stns.push(stn);
      /*
      if(!stn.destOnly)
        pickupStations.push(stn);
      if(!stn.pickupOnly && stn != $scope.form_pickup) {
        if(angular.isUndefined(pickup.validDests) ||
            (pickup.validDests.indexOf(stn.name) > -1))
          destStations.push(stn);
        };
      */
    };
    if (stns.length === 0) {
      return [$scope.noneStation];
    } else {
      // Prepend the "unset" station to the start of the list
      stns.unshift($scope.unsetStation);
      return stns;
    }
  }

  //******************************************************
  // IGB (In-Game Browser) utility functions
  //******************************************************

  $scope.showStn = function(id) {
    CCPEVE.showInfo(3867, id);
  };

  $scope.showCorp = function() {
    //FIXME(kormat): un-hardcode corp id
    CCPEVE.showInfo(2, 98237970)
  };

  $scope.createContract = function() {
    CCPEVE.createContract(3, $scope.formPickup.id);
  };


  //Now that everything is defined, finally call init()
  $scope.init();
}]);
