var eveShippingCalc = angular.module('eveShippingCalc',[]);

var tradeHubs = ["Amarr"];

eveShippingCalc.controller("CalcCtrl", ['$scope', '$window', '$location', function($scope, $window, $location) {
  $scope.location = $location
  $scope.cfg = $window.ESCconfig;

  $scope.init = function() {
    //Useful aliases:
    $scope.routes = $scope.cfg.routes;
    $scope.stations = $scope.cfg.stations;
    $scope.routesMeta = $scope.cfg.routesMeta;
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
    $scope.routeInfo = {};
    $scope.routeSecTypes = [];

    $scope.formVol = "";
    $scope.formVal = "";
    $scope.formCredit = "";
    $scope.errors = [];
    $scope.volPrice = undefined;
    $scope.volPriceDesc = "";
    $scope.valPrice = undefined;
    $scope.valPriceDesc = "";
    $scope.containerPrice = undefined;
    $scope.totalPrice = undefined;

    $scope.contractDesc = "";
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

  $scope.$watch('formRoute.name',
      function(newVal, oldVal) {
        console.log("formRoute changed from "+oldVal+" to "+newVal);
        $scope.pickupStations = $scope.filterStations(null);
        $scope.updateStations();
      });

  $scope.$watch('formPickup.id',
      function(newVal, oldVal) {
        $scope.logStationChange("Pickup", newVal, oldVal);
        $scope.updateStations();
      });

  $scope.$watch('formDest.id',
      function(newVal, oldVal) {
        $scope.logStationChange("Destination", newVal, oldVal);
        // Changing the destination station can't change the valid stations, so no
        // need to call updateStations()
        $scope.updateRouteInfo();
      });

  $scope.$watch('[calcForm.vol_input.$error, calcForm.val_input.$error, calcForm.credit_input.$error]',
      function(newVal, oldVal) {
        //console.log("Inputs changed validity:" + JSON.stringify(newVal))
        $scope.updateErrors(newVal, ["Volume", "Value", "Credit"]);
      }, true);

  // Keep the Volume price updated
  $scope.$watch('[routeInfo.volUnit, routeInfo.volCost, formVol, calcForm.vol_input.$valid]',
      function(newVal, oldVal) {
        $scope.updatePrice(
          $scope.routeInfo.volUnit,
          $scope.routeInfo.volCost,
          $scope.calcForm.vol_input,
          "volPrice",
          "volPriceDesc",
          "k m^3");
      }, true);

  // Keep the Value price updated
  $scope.$watch('[routeInfo.valUnit, routeInfo.valCost, formVal, calcForm.val_input.$valid]',
      function(newVal, oldVal) {
        $scope.updatePrice(
          $scope.routeInfo.valUnit,
          $scope.routeInfo.valCost,
          $scope.calcForm.val_input,
          "valPrice",
          "valPriceDesc",
          "Mil ISK");
      }, true);

  // Keep container price updated
  $scope.$watch('formContainer',
      function(newVal, oldVal) {
        console.log("Containers changed: " + newVal);
        $scope.updateContainerPrice();
      });

  // Keep total price updated
  $scope.$watch('[volPrice, valPrice, containerPrice, formCredit]',
      function(newVal, oldVal) {
        $scope.updateTotalPrice();
      }, true);

  // Keep contract description updated
  $scope.$watch('[formVal, formCredit, formContainer]',
      function(newVal, oldVal) {
        $scope.updateDescription();
      }, true);

  //******************************************************
  // Routes and stations
  //******************************************************

  $scope.filterStations = function(skip) {
    var stns = [];
    var routeStns = $scope.routesMeta[$scope.formRoute.name].stns;

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

    $scope.updateRouteInfo();
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

  $scope.updateRouteInfo = function() {
    var routeInfo = {};
    $scope.routeSecTypes = [];

    var curRouteMeta = $scope.routesMeta[$scope.formRoute.name];
    var pickupIdx = $scope.stationIndex($scope.formPickup.id, curRouteMeta.stns);
    var destIdx = $scope.stationIndex($scope.formDest.id, curRouteMeta.stns);

    console.log(
        "updateRouteInfo: pickup Id:"
        +$scope.formPickup.id
        +" index:"
        +pickupIdx
        +" destination Id:"
        +$scope.formDest.id
        +" index:"
        +destIdx);
    if(pickupIdx < 0 || destIdx < 0) {
      $scope.routeInfo = {};
      return;
    }

    routeInfo.volUnit = curRouteMeta["volUnit"];
    routeInfo.volCost = 0;
    routeInfo.valUnit = curRouteMeta["valUnit"];
    routeInfo.valCost = 0;

    var step = 1;
    var start = pickupIdx;
    var end = destIdx + 1; //So we include the destIdx in the loop
    var valCostName = "valCostNext";
    var volCostName = "volCostNext";
    if (pickupIdx > destIdx) {
      step = -1;
      start = pickupIdx;
      end = destIdx -1; //So we include the pickupIdx in the loop
      valCostName = "valCostPrev";
      volCostName = "volCostPrev";
    };

    for(var i=start; i!=end; i+=step) {
      var stnId = curRouteMeta.stns[i].id;
      var name = $scope.stations[stnId].name;
      $scope.routeSecTypes.push($scope.stations[stnId].sec);
      console.log("Station:"+name);
      if(i !== destIdx) { // Don't include cost of final station.
        if(routeInfo.volUnit) {
          var cost = curRouteMeta.stns[i][volCostName] ||  curRouteMeta.stns[i]["volCost"];
          if(cost !== undefined)
            routeInfo.volCost += cost;
        }
        if(routeInfo.valUnit) {
          var cost = curRouteMeta.stns[i][valCostName] || curRouteMeta.stns[i]["valCost"];
          if(cost !== undefined)
            routeInfo.valCost += cost;
        }
      }
    };

    if(routeInfo.volCost === 0)
      routeInfo.volCost = undefined;
    if(routeInfo.valCost === 0)
      routeInfo.valCost = undefined;
    $scope.routeInfo = routeInfo;

    console.log("route info: "+JSON.stringify($scope.routeInfo));
    console.log("Sec types:"+$scope.routeSecTypes);
  };

  // TODO(kormat): can probably just remove this
  $scope.hasHighsecSection = function() {
    var highsec = 0;
    for(var i=0; i < $scope.routeSecTypes.length; i++) {
      if($scope.routeSecTypes[i] !== "high") {
        highsec = 0;
        continue;
      };
      highsec++;
      if(highsec > 1)
        return true;
    };
    return false;
  };


  //******************************************************
  // Cost calculations
  //******************************************************

  $scope.updatePrice = function(unit, cost, input, price, desc, unitDesc) {
    if(unit === undefined
       || cost === undefined) {
      $scope[price] = undefined;
      $scope[desc] = "";
    } else if(input.$valid === false) {
      $scope[price] = undefined;
    } else {
      $scope[price] = Math.max(1, Math.ceil(input.$modelValue / unit)) * cost;
      $scope[desc] = cost.toFixed(2)
             +"Mil per "
             +unit.toFixed(0)
             +unitDesc;
    };
  };

  $scope.updateContainerPrice = function() {
    if($scope.formContainer)
      $scope.containerPrice = $scope.cfg.rules.containerSurcharge;
    else
      $scope.containerPrice = 0;
  };

  $scope.updateTotalPrice = function() {
    if($scope.errors.length === 0) {
      var price = 0;
      var inputs = [$scope.volPrice, $scope.valPrice, $scope.containerPrice, -$scope.formCredit];
      for(var i=0; i<inputs.length; i++) {
        if(angular.isNumber(inputs[i]))
          price += inputs[i];
      };
      $scope.totalPrice = price;
    } else {
      $scope.totalPrice = undefined;
    };
  };

  $scope.updateDescription = function() {
    var desc = []
    if($scope.formVal)
      desc.push($scope.formVal.toFixed()+"M value");
    if($scope.formCredit)
      desc.push($scope.formCredit.toFixed(2)+"M credit");
    if($scope.formContainer)
      desc.push("container");
    $scope.contractDesc = desc.join(", ");
  };


  //******************************************************
  // IGB (In-Game Browser) utility functions
  //******************************************************

  $scope.showStn = function(id) {
    CCPEVE.showInfo(3867, id);
  };

  $scope.showCorp = function() {
    CCPEVE.showInfo(2, $scope.cfg.meta.corpId)
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

  $scope.updateErrors = function(inputErrors, inputNames) {
    $scope.errors = [];
    for (var i=0; i<inputErrors.length; i++) {
      var inputError = inputErrors[i];
      var inputName = inputNames[i];
      if (inputError['number']) {
        $scope.errors.push(inputName+": not a valid number");
      } else if (inputError['min']) {
        $scope.errors.push(inputName+": too small");
      } else if (inputError['max']) {
        $scope.errors.push(inputName+": too large");
      }
    };
  }


  //Now that everything is defined, finally call init()
  $scope.init();
}]);
