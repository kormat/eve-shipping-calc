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

    //If there's only one route to choose (not counting the "unset" placeholder),
    //just set the route directly to that
    if ($scope.routes.length == 2)
      $scope.formRoute = $scope.routes[1];
    else
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
  });

  $scope.$watch('formDest.id', function(newVal, oldVal) {
    $scope.logStationChange("Destination", newVal, oldVal);
    $scope.routeType();
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


  //******************************************************
  // Routes and stations
  //******************************************************

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
    };

    if (stns.length === 0) {
      return [$scope.noneStation];
    } else {
      // Prepend the "unset" station to the start of the list
      stns.unshift($scope.unsetStation);
      return stns;
    }
  }

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

    // If there's only one station to choose (not counting the "unset"
    // placeholder), just set destination directly to that
    if ($scope.destStations.length === 2) {
      $scope.formDest = $scope.destStations[1];
    };

    $scope.routeType();
  };

  $scope.findStation = function(id, stations) {
    //console.log("findStation: id:"+id);
    var index = $scope.stationIndex(id, stations)
    return stations[index]
  };

  $scope.stationIndex = function(id, stations) {
    //console.log("stationIndex: id:"+id);
    for(var i=0; i < stations.length; i++) {
      var stn = stations[i];
      if(stn.id === id)
        return i;
    };
    return -1;
  };

  $scope.routeType = function() {
    var types = [];
    var curRouteStations = $scope.routeStations[$scope.formRoute.name].stns;
    var pickupIdx = $scope.stationIndex($scope.formPickup.id, curRouteStations);
    var destIdx = $scope.stationIndex($scope.formDest.id, curRouteStations);
    console.log(
        "routeType: pickup Id:"
        +$scope.formPickup.id
        +" index:"
        +pickupIdx
        +" destination Id:"
        +$scope.formDest.id
        +" index:"
        +destIdx);
    if(pickupIdx < 0 || destIdx < 0)
      return "incomplete";

    var step = 1;
    var start = pickupIdx;
    var end = destIdx + 1; //So we include the destIdx in the loop
    if (pickupIdx > destIdx) {
      step = -1;
      start = pickupIdx;
      end = destIdx -1; //So we include the pickupIdx in the loop
    };

    for(var i=start; i!=end; i+=step) {
      var stnId = curRouteStations[i].id;
      var name = $scope.stations[stnId].name;
      types.push($scope.stations[stnId].sec);
      console.log("Station:"+name);
    };
    console.log("Sec types:"+types);
    return types;
  }


  //******************************************************
  // Cost calculations
  //******************************************************

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


  //******************************************************
  // Utility functions
  //******************************************************

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


  //Now that everything is defined, finally call init()
  $scope.init();
}]);
