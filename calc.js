var eveShippingCalc = angular.module('eveShippingCalc',[]);

var params = ["route", "pickup", "dest", "vol", "val", "cntr", "credit"];
var param_map = {
  "route": "form_route",
  "pickup": "form_pickup",
  "dest": "form_dest",
  "vol": "form_vol",
  "val": "form_val",
  "cntr": "form_container",
  "credit": "creditDiscount",
};
var tradeHubs = ["Amarr"];

eveShippingCalc.controller("CalcCtrl", ['$scope', '$window', '$location', function($scope, $window, $location) {
  $scope.location = $location
  $scope.cfg = $window.ESCconfig;
  $scope.routes = $scope.cfg.routes;
  $scope.stations = $scope.cfg.stations;
  $scope.formRoute = $scope.routes[0];

  $scope.status = "Initial";
  $scope.totalCost = undefined;
  $scope.form_pickup = "";
  $scope.form_dest = "";
  $scope.form_vol = 50;
  $scope.form_val = 100;
  $scope.form_container = false;
  $scope.creditDiscount = 0;
  $scope.oldSavedState = {};
  $scope.permaLink = undefined;
  $scope.desc = "";
  $scope.inEve = typeof CCPEVE === "object";
  $scope.destStations = null;
  $scope.maxVolume = 320;
  $scope.maxValue = 1000;

  if($scope.inEve) {
    $scope.status = "requesting trust";
    CCPEVE.requestTrust("http://diamond.ichbinn.net/knees-calc/*");
  };

  $scope.showStn = function(id) {
    CCPEVE.showInfo(3867, id);
  };

  $scope.showCorp = function() {
    CCPEVE.showInfo(2, 98237970)
  };

  $scope.createContract = function() {
    CCPEVE.createContract(3, $scope.form_pickup.id);
  };

  $scope.$watch('formRoute', function() {
    $scope.pickupStations = $scope.filterStations($scope.formRoute, $scope.stations);

    // If the current pickup value is already a valid station, then don't change it.
    if (!$scope.findStation($scope.formPickup.id, $scope.pickupStations)) {
      $scope.formPickup = $scope.pickupStations[0];
    };
  });

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
    console.log("findStation: id:"+id);
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

  $scope.filterStations = function(route, stations) {
    if (route.name === "unset") {
      return [$scope.findStation("none", stations)];
    }
    var stns = [];

    for(var i in stations) {
      var stn = stations[i];
      if(stn.id === "none") {
        continue;
      } else if(stn.id === "unset") {
        stns.push(stn);
        continue
      } else if(!stn.routes.hasOwnProperty(route.name)) {
        continue;
      } else {
        stns.push(stn);
        continue;
      }
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
    return stns
    /*
    $scope.pickupStations = pickupStations;
    $scope.destStations = destStations;
    if(pickupStations.length  == 1)
      $scope.form_pickup = pickupStations[0];
    if(destStations.length == 1)
      $scope.form_dest = destStations[0];
      */
  }
  $scope.pickupStations = $scope.findStation("none", $scope.stations);
  $scope.formPickup = $scope.findStation("none", $scope.stations);
}]);
